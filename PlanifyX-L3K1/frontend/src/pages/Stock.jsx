import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Package, Search, TrendingDown } from "lucide-react";
import { getProducts } from "../utils/api";
import { getErrorMessage } from "../utils/axios";
import { getStockStatusTag } from "../utils/functions.js";

// Normalise la réponse API pour ne garder que les champs utiles à l'écran stock.
// On convertit aussi les valeurs numériques pour éviter les comparaisons ambiguës.
const mapProductFromApi = (p) => ({
  id: p.id,
  nom: p.nom,
  categorie: p.categorie,
  stock: Number(p.quantite_stock),
  stockInitial: Number(p.stock_initial),
  seuilMinimum: Number(p.seuil_minimum),
  seuilCritique: Number(p.seuil_critique),
});

export function Stock() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Chargement initial des produits au montage de la page.
  useEffect(() => {
    fetchProducts();
  }, []);

  // Récupère les produits depuis l'API puis les adapte au format attendu par l'UI.
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await getProducts();
      setProducts(response.data.map(mapProductFromApi));
    } catch (error) {
      console.error(error);
      console.error(getErrorMessage(error));
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Filtre côté frontend sur le nom ou la catégorie.
  // useMemo évite de recalculer le filtre à chaque render si products/search ne changent pas.
  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return products;

    return products.filter((product) => {
      return (
        product.nom.toLowerCase().includes(normalizedSearch) ||
        product.categorie.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [products, search]);

  // Stock critique : produit critique ou en rupture.
  const criticalProducts = useMemo(() => {
    return filteredProducts.filter((product) => {
      const stockStatus = getStockStatusTag(
        product.stock,
        product.seuilMinimum,
        product.seuilCritique
      );

      return stockStatus.label === "Critique" || stockStatus.label === "En rupture";
    });
  }, [filteredProducts]);

  // Stock faible : produit entre le seuil minimum et le seuil critique.
  const lowProducts = useMemo(() => {
    return filteredProducts.filter((product) => {
      const stockStatus = getStockStatusTag(
        product.stock,
        product.seuilMinimum,
        product.seuilCritique
      );

      return stockStatus.label === "Faible";
    });
  }, [filteredProducts]);

  // Calcule une largeur de barre simple pour visualiser le niveau de stock.
  // Le seuil minimum sert ici de repère visuel, pas de stock max réel.
  const getStockPercentage = (stock, stockInitial) => {
    const currentStock = Number(stock);
    const initialStock = Number(stockInitial);

    if (!initialStock || initialStock <= 0) {
      return currentStock > 0 ? 100 : 0;
    }

    return Math.min(100, Math.max(0, (currentStock / initialStock) * 100));
  };

  const getStockBarColor = (percentage) => {
    const clampedPercentage = Math.min(100, Math.max(0, Number(percentage)));

    if (clampedPercentage >= 80) {
      return "#16a34a";
    }

    if (clampedPercentage >= 60) {
      return "#8ce75f";
    }

    if (clampedPercentage >= 40) {
      return "#eab308";
    }

    if (clampedPercentage >= 20) {
      return "#f97316";
    }

    return "#dc2626";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="text-xl font-bold">Stock</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="space-y-6 px-6 py-6 mb-7">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Stock critique</p>
                  <p className="text-3xl font-semibold text-red-600">
                    {criticalProducts.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Stock faible</p>
                  <p className="text-3xl font-semibold text-orange-600">
                    {lowProducts.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total produits</p>
                  <p className="text-3xl font-semibold text-green-600">
                    {filteredProducts.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="flex items-center justify-between border border-slate-300 shadow-sm bg-white rounded-xl px-3 py-4 mb-8">
          <div className="relative flex-grow mr-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-slate-300 shadow-sm pl-10 pr-4 py-2 rounded-xl w-full"
            />
          </div>
        </section>

        {isLoading && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500">
            Chargement du stock...
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 mb-8">
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && criticalProducts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">
                  Attention : Stock critique
                </h3>
                <p className="text-sm text-red-700">
                  {criticalProducts.length} produit(s) nécessitent un réapprovisionnement urgent
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {criticalProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{product.nom}</p>
                    <p className="text-sm text-slate-500">{product.categorie}</p>
                  </div>
                  <span className="text-red-600 font-semibold">
                    {product.stock} unités
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && !errorMessage && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold">Gestion des stocks</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Produit
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Catégorie
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Stock actuel
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Stock initial
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Seuil min.
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Seuil critique
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Niveau
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Statut
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatusTag(
                      product.stock,
                      product.seuilMinimum,
                      product.seuilCritique
                    );

                    const percentage = getStockPercentage(
                      product.stock,
                      product.stockInitial
                    );

                    return (
                      <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium">{product.nom}</p>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-xs px-2 py-1 bg-blue-50 rounded">
                            {product.categorie}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-semibold">{product.stock}</span> unités
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {product.stockInitial}
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {product.seuilMinimum}
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {product.seuilCritique}
                        </td>

                        <td className="px-6 py-4">
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${percentage}%`,
                                background: getStockBarColor(percentage),
                              }}
                            />
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`text-xs px-3 py-1 rounded-full ${stockStatus.color}`}>
                            {stockStatus.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!filteredProducts.length && (
                <div className="p-6 text-center text-slate-500">
                  Aucun produit trouvé.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}