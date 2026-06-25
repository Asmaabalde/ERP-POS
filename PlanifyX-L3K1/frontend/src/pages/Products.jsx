import { Search, Filter, Package, Barcode, Tag, Edit2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "../components/Input.jsx";
import { ProductBarcode } from "../components/ProductBarcode.jsx";
import { getProducts, addProduct, updateProduct, deleteProduct } from "../utils/api";
import { getErrorMessage } from "../utils/axios.js";
import { openBarcodeSheetPdf } from "../utils/barcodePdf";
import { mapProductForOffline, saveOfflineProducts } from "../utils/offlineDb";
import { getStockStatusTag } from "../utils/functions.js";


// TODO: Pagination des produits (si il y a trop de produits, les fetch du backend pourra prendre du temps)

const mapProductFromApi = (p) => ({
    /**
     * Adapte la structure renvoyée par l'API
     * au format utilisé dans le composant.
     */
    id: p.id,
    nom: p.nom,
    codeBarres: p.code_barre,
    description: p.description,
    categorie: p.categorie,
    sousCategorie: p.sous_categorie,
    famille: p.famille,
    prixVente: Number(p.prix_vente_ht),
    tva: Number(p.taux_tva),
    stock: p.quantite_stock,
    stockInitial: p.stock_initial,
    seuilCritique: p.seuil_critique,
    minStock: p.seuil_minimum,
    image: p.image,
});

const mapFormDataToApiPayload = (formData, isEditing = false) => {
    /**
     * Prépare les données du formulaire au format attendu par l'API.
     * On utilise FormData pour pouvoir envoyer une image.
     */
    const payload = new FormData();

    payload.append("categorie", formData.category);
    payload.append("nom", formData.name);
    payload.append("description", formData.description || "");
    payload.append("sous_categorie", formData.subcategory || "");
    payload.append("famille", formData.family || "");
    payload.append("prix_achat_ht", formData.price);
    payload.append("prix_vente_ht", formData.price);
    payload.append("taux_tva", formData.tva);

    if (!isEditing) {
        payload.append("stock_initial", formData.stock);
    }

    payload.append("quantite_stock", formData.stock);
    payload.append("seuil_minimum", formData.minStock);
    payload.append("seuil_critique", formData.criticalStock);

    if (formData.image instanceof File) {
        payload.append("image_file", formData.image);
    }

    payload.append("remove_image", formData.removeImage ? "true" : "false");

    return payload;
};

export function Products() {
    const [productsList, setProductsList] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [viewMode, setViewMode] = useState("grid");
    const [errors, setErrors] = useState({});
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [toast, setToast] = useState({ message: "", type: "" });

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        /**
         * Charge les produits depuis le backend
         * puis les convertit pour l'affichage front.
         */
        try {
            const res = await getProducts();
            setProductsList(res.data.map(mapProductFromApi));

            // On enregistre également pour IndexedDB
            const offlineProducts = res.data.map(mapProductForOffline);
            await saveOfflineProducts(offlineProducts);

        } catch (error) {
            console.error(error);
            console.error(getErrorMessage(error), error);
        }
    };

    const initialFormData = {
        name: "",
        description: "",
        category: "",
        subcategory: "",
        family: "",
        price: "",
        tva: "20",
        stock: "",
        minStock: "",
        criticalStock: "",
        image: null,
        removeImage: false,
    };

    const [formData, setFormData] = useState(initialFormData);

    const resetForm = () => {
        /**
         * Remet le formulaire dans son état initial
         * après une création, une modification ou une fermeture.
         */
        setFormData(initialFormData);
    };

    const [filters, setFilters] = useState({
        category: "",
        stockStatus: "",
        minPrice: "",
        maxPrice: "",
    });

    const handleSubmit = async (e) => {
        /**
         * Gère la création ou la modification d'un produit
         * selon qu'on est en mode édition ou non.
         */
        e.preventDefault();

        if (!validateForm()) return;

        const payload = mapFormDataToApiPayload(formData, Boolean(editingProduct));

        try {
            if (editingProduct) {
                await updateProduct(editingProduct.id, payload);
                showToast("Produit modifié avec succès !");
            } else {
                await addProduct(payload);
                showToast("Produit ajouté avec succès !");
            }

            await fetchProducts();

            setIsFormOpen(false);
            setEditingProduct(null);
            resetForm();
        } catch (error) {
            console.error(error);
            console.error(getErrorMessage(error));
            showToast(getErrorMessage(error), "error");
        }
    };

    const handleEditProduct = (product) => {
        /**
         * Pré-remplit le formulaire avec les données du produit
         * pour passer en mode modification.
         */
        setFormData({
            name: product.nom,
            description: product.description || "",
            category: product.categorie,
            subcategory: product.sousCategorie || "",
            family: product.famille || "",
            price: product.prixVente,
            tva: product.tva,
            stock: product.stock,
            minStock: product.minStock,
            criticalStock: product.seuilCritique,
            image: product.image || null,
            removeImage: false,
        });

        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const handleDeleteProduct = async (id) => {
        /**
         * Supprime un produit puis recharge la liste
         * pour garder l'affichage à jour.
         */
        try {
            await deleteProduct(id);
            await fetchProducts();
            showToast("Produit supprimé !");
        } catch (error) {
            console.error(error);
            console.error(getErrorMessage(error));
            showToast(getErrorMessage(error), "error");
        }
    };

    const filteredProducts = productsList.filter((p) => {
        /**
         * Applique les filtres saisis dans l'interface
         * avant l'affichage en grille ou en tableau.
         */
        if (filters.category && p.categorie !== filters.category) {
            return false;
        }

        if (filters.minPrice && p.prixVente < Number(filters.minPrice)) {
            return false;
        }

        if (filters.maxPrice && p.prixVente > Number(filters.maxPrice)) {
            return false;
        }

        const stockStatus = getStockStatusTag(
            p.stock,
            p.minStock,
            p.seuilCritique
        );

        switch (filters.stockStatus) {
            case "rupture":
                if (stockStatus.label !== "En rupture") return false;
                break;

            case "faible":
                if (stockStatus.label !== "Faible") return false;
                break;

            case "critique":
                if (stockStatus.label !== "Critique") return false;
                break;

            case "ok":
                if (stockStatus.label !== "Bon") return false;
                break;

            default:
                break;
        }

        return true;
    });

    const validateForm = () => {
        /**
         * Vérifie les champs du formulaire avant l'envoi
         * et construit les messages d'erreur affichés au front.
         */
        const newErrors = {};

        for (const field in formData) {
            const value = formData[field];

            switch (field) {
                case "price":
                    if (Number(value) <= 0) {
                        newErrors.price = "Le prix doit être supérieur à 0.";
                    }
                    break;

                case "stock":
                    if (Number(value) < 0) {
                        newErrors.stock = "Le stock ne peut pas être négatif.";
                    }
                    break;

                case "minStock":
                    if (Number(value) < 0) {
                        newErrors.minStock = "Le seuil minimum ne peut pas être négatif.";
                    }
                    break;

                case "criticalStock":
                    if (Number(value) < 0) {
                        newErrors.criticalStock = "Le seuil critique ne peut pas être négatif.";
                    }
                    break;

                case "name":
                    if (value.trim().length < 3) {
                        newErrors.name = "Le nom du produit doit contenir au moins 3 caractères.";
                    }
                    break;

                case "subcategory":
                    if (value.trim().length > 0 && value.trim().length < 3) {
                        newErrors.subcategory = "La sous-catégorie doit contenir au moins 3 caractères.";
                    }
                    break;

                case "family":
                    if (value.trim().length > 0 && value.trim().length < 3) {
                        newErrors.family = "La famille doit contenir au moins 3 caractères.";
                    }
                    break;

                default:
                    break;
            }
        }

        if (Number(formData.criticalStock) > Number(formData.minStock)) {
            newErrors.criticalStock = "Le seuil critique doit être ≤ au seuil minimum.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const sanitizeText = (value) => {
        /**
         * Nettoie certains champs texte pour éviter
         * les caractères non souhaités dans le formulaire.
         */
        return value.replace(/[^a-zA-Z0-9À-ÿ .'-]/g, "");
    };

    const showToast = (message, type = "success") => {
        /**
         * Affiche un toast temporaire pour confirmer une action
         * ou remonter une erreur à l'utilisateur.
         */
        setToast({ message, type });

        setTimeout(() => {
            setToast({ message: "", type: "" });
        }, 3000);
    };


  return (

    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="text-xl font-bold">Produits & Catalogue</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">

        <section className="flex items-center gap-3 mb-8">
            <button
                onClick={() => setViewMode("grid")}
                className={`px-4 py-2 rounded-xl border font-medium cursor-pointer
                ${viewMode === "grid"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                }`}
            >
                Grille
            </button>

            <button
                onClick={() => setViewMode("table")}
                className={`px-4 py-2 rounded-xl border font-medium cursor-pointer
                ${viewMode === "table"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                }`}
            >
                Tableau
            </button>

            <button
                onClick={() => setIsFormOpen(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 ml-auto cursor-pointer"
            >
                + Ajouter un produit
            </button>
        </section>


        <section className="mb-3 flex items-center justify-between border border-slate-300 shadow-sm bg-white rounded-xl px-3 py-4">
          <div className="relative flex-grow mr-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              className="bg-white border border-slate-300 shadow-sm pl-10 pr-4 py-2 rounded-xl w-full"
            />
          </div>

          {/* Bouton filtres */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer border 
                ${isFilterOpen 
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" 
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                }`}
            >
              <Filter className="h-4 w-4" />
              Filtres
            </button>

        </section>
        {/*Formulairr de filtre*/}
        {isFilterOpen && (
          <div className="mt-0 mx-auto w-full justify-between max-w-5xl p-4 bg-white border border-slate-300 rounded-xl shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-4">Filtres avancés</h3>

            <div className="grid grid-cols-4 gap-4">
              <div>
                  <label className="block text-sm font-medium mb-1">Catégorie</label>
                  <select
                      value={filters.category}
                      onChange={(e) =>
                          setFilters({...filters, category: e.target.value})
                      }
                      className="w-full border border-slate-300 px-3 py-2 rounded-xl"
                  >
                      <option value="">Toutes les catégories</option>
                      <option>Électronique</option>
                      <option>Mobilier</option>
                      <option>Vêtements</option>
                      <option>Alimentaire</option>
                      <option>Autre</option>
                  </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Statut de stock</label>
                  <select
                      value={filters.stockStatus}
                      onChange={(e) =>
                          setFilters({...filters, stockStatus: e.target.value})
                      }
                      className="w-full border border-slate-300 px-3 py-2 rounded-xl"
                  >
                      <option value="">Tous les statuts</option>
                      <option value="ok">En stock</option>
                      <option value="faible">Faible</option>
                      <option value="critique">Critique</option>
                      <option value="rupture">Rupture</option>
                  </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Prix minimum (€)</label>
                  <input
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) =>
                          setFilters({...filters, minPrice: e.target.value})
                      }
                      className="w-full border border-slate-300 px-3 py-2 rounded-xl"
                      placeholder="0.00"
                  />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Prix maximum (€)</label>
                  <input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) =>
                          setFilters({...filters, maxPrice: e.target.value})
                      }
                      className="w-full border border-slate-300 px-3 py-2 rounded-xl"
                      placeholder="0.00"
                  />
              </div>
            </div>

            <div className="mt-4 text-right">
              <button
                  onClick={() =>
                      setFilters({
                          category: "",
                          stockStatus: "",
                          minPrice: "",
                          maxPrice: "",
                      })
                  }
                  className="text-blue-600 hover:underline">Réinitialiser</button>
            </div>
          </div>
)}

      {/* Grille de prod*/}
      {viewMode === "grid" && (
          <section>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
                  {filteredProducts.map((product) => {
                      const stockStatus = getStockStatusTag(
                          product.stock,
                          product.minStock,
                          product.seuilCritique
                      );

                      return (
                          <div
                              key={product.id}
                              onClick={() => setSelectedProduct(product)}
                              className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group"
                          >
                              {/*Affichae de l'icône de prod*/}
                              <div className="h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-t-xl flex items-center justify-center overflow-hidden">
                                  {product.image ? (
                                      <img
                                          src={product.image}
                                          alt={product.nom}
                                          className="w-full h-full object-contain"
                                      />
                                  ) : (
                                      <Package className="w-20 h-20 text-blue-300" />
                                  )}
                              </div>

                              {/* Les détails du produit */}
                              <div className="p-6">
                                  <div className="flex items-start justify-between mb-3">
                                      <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                          {product.nom}
                                      </h3>
                                      <span className={`text-xs px-2 py-1 rounded-full ${stockStatus.color}`}>
                                         {stockStatus.label}
                                     </span>
                                  </div>

                                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                                      {product.description}
                                  </p>

                                  <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                          <span className="text-slate-500">Prix de vente</span>
                                          <span className="font-semibold">{product.prixVente} €</span>
                                      </div>

                                      <div className="flex justify-between">
                                          <span className="text-slate-500">Stock</span>
                                          <span className="font-semibold">{product.stock} unités</span>
                                      </div>

                                      <div className="flex justify-between">
                                          <span className="text-slate-500">Catégorie</span>
                                          <span className="text-xs px-2 py-1 bg-slate-100 rounded">
                                             {product.categorie}
                                          </span>
                                      </div>
                                  </div>
                              </div>

                              <div className="px-5 pb-4">
                                  <ProductBarcode value={product.codeBarres} compact onClick={() => openBarcodeSheetPdf(product)} />
                              </div>

                              {/*Boutons modifier et supprimer*/}
                              <div className="flex gap-2 pt-4 border-t text-slate-100 border-border pl-5 pr-5 pb-5">
                                  <button
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditProduct(product);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                  >
                                      <Edit2 className="w-4 h-4"/>
                                      Modifier
                                  </button>

                                  <button
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteTarget(product);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                  >
                                      <Trash2 className="w-4 h-4"/>
                                      Supprimer
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </section>
      )}

          {/*Affichage sous forme de table*/}
      {viewMode === "table" && (
        <section>
          {/* Tableau de produits */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-250 overflow-hidden mt-10">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Produit</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Catégorie</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Prix vente</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Stock</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Statut</th>
                        <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">Code-barres</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {filteredProducts.map((product) => {
                      const stockStatus = getStockStatusTag(
                          product.stock,
                          product.minStock,
                          product.seuilCritique
                      );

                      return (
                        <tr
                          key={product.id}
                          onClick={() => setSelectedProduct(product)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          {/* Produit */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center overflow-hidden p-1">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.nom}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{product.nom}</p>
                                <p className="text-xs text-slate-500">{product.sousCategorie}</p>
                              </div>
                            </div>
                          </td>

                          {/* Catégorie */}
                          <td className="px-6 py-4">
                            <span className="text-xs px-2 py-1 bg-slate-100 rounded">
                              {product.categorie}
                            </span>
                          </td>

                          {/* Prix vente */}
                          <td className="px-6 py-4 font-semibold">{product.prixVente} €</td>

                          {/* Stock */}
                          <td className="px-6 py-4 text-sm">{product.stock} unités</td>

                          {/* Statut */}
                          <td className="px-6 py-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${stockStatus.color}`}>
                              {stockStatus.label}
                            </span>
                          </td>

                          {/* Code-barres */}
                          <td className="px-6 py-4 min-w-[220px]">
                            <ProductBarcode value={product.codeBarres} compact onClick={() => openBarcodeSheetPdf(product)} />
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {/* Bouton Modifier */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditProduct(product);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Modifier"
                              >
                                <Edit2 className="w-4 h-4"/>
                              </button>

                              {/* Bouton Supprimer */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget(product);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4"/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
        </section>
      )}

      </main>
        {/*Form de création de prod*/}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
              onClick={() => setIsFormOpen(false)}
        >
          <form
              onSubmit={handleSubmit}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-3xl rounded-xl p-7 overflow-y-auto max-h-[90vh] "
          >

              <h2 className="text-2xl font-semibold mb-1">
                  {editingProduct ? "Modifier le produit" : "Ajouter un nouveau produit"}
              </h2>

              <p className="text-slate-500 mb-6">Remplissez les informations du produit</p>

              {/* Infos générales */}
              <div className="mb-6">
                <h3 className="font-semibold text-slate-700 mb-3">Informations générales</h3>

                <div className="space-y-4">
                  <div className=" grid grid-cols-2 gap-4">
                    <Input
                        label="Nom du produit"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: sanitizeText(e.target.value)})}
                        error={errors.name}
                        placeholder="Ex : MacBook Pro 14"
                    />
                  </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            className="w-full border border-slate-300 px-4 py-2 rounded-xl h-24"
                            placeholder="Description détaillée du produit..."
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: sanitizeText(e.target.value)})}
                        />
                    </div>

                </div>
              </div>

              {/* Catégorie du produit */}
              <div className="mb-6">
                <h3 className="font-semibold text-slate-700 mb-3">Catégorisation</h3>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Catégorie *</label>
                      <select
                          id="category"
                          required
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full border border-slate-300 px-4 py-2 rounded-xl"
                      >
                     <option value="">Sélectionner...</option>
                          <option>Électronique</option>
                          <option>Mobilier</option>
                          <option>Vêtements</option>
                          <option>Alimentaire</option>
                          <option>Autre</option>
                    </select>
                  </div>

                  <Input
                      label="Sous-catégorie"
                      id="subcategory"
                      value={formData.subcategory}
                      onChange={(e) => setFormData({...formData, subcategory: sanitizeText(e.target.value)})}
                      error={errors.subcategory}
                      placeholder="Ex : Ordinateurs portables"

                  />

                  <Input
                      label="Famille"
                      id="family"
                      value={formData.family}
                      onChange={(e) => setFormData({...formData, family: sanitizeText(e.target.value)})}
                      error={errors.family}
                      placeholder="Ex : Apple"
                  />
                </div>
              </div>

              {/* Prix */}
              <div className="mb-6">
                <h3 className="font-semibold text-slate-700 mb-3">Prix</h3>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                      label={"Prix de vente (€)"}
                      id={"price"}
                      type={"number"}
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      placeholder={"0.00"}
                      required
                      error={errors.price}
                  />
                  <Input
                      label={"TVA (%)"}
                      id={"tva"}
                      type={"number"}
                      value={formData.tva}
                      onChange={(e) => setFormData({...formData, tva: e.target.value})}
                      required
                  />
                </div>
              </div>

              {/* Détail Stock */}
              <div className="mb-6">
                <h3 className="font-semibold text-slate-700 mb-3">Stock</h3>

                <div className="grid grid-cols-3 gap-4">
                  <Input
                      label={"Stock"}
                      id={"stock"}
                      type={"number"}
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                      required
                      placeholder={"0"}
                      error={errors.stock}
                      tooltip="Quantité disponible dès l’ajout du produit."
                  />
                  <Input
                      label={"Seuil minimum"}
                      id={"minStock"}
                      type={"number"}
                      value={formData.minStock}
                      onChange={(e) => setFormData({...formData, minStock: e.target.value})}
                      required
                      placeholder={"0"}
                      error={errors.minStock}
                      tooltip="Niveau de stock à partir duquel le produit est considéré comme faible."
                  />
                  <Input
                      label={"Stock critique"}
                      id={"criticalStock"}
                      type={"number"}
                      value={formData.criticalStock}
                      onChange={(e) => setFormData({...formData, criticalStock: e.target.value})}
                      required
                      placeholder={"0"}
                      error={errors.criticalStock}
                      tooltip="Niveau de stock très bas nécessitant un réapprovisionnement urgent."
                  />
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-slate-700 mb-3">Image du produit</h3>

                <div className="space-y-3">
                    <label className="flex items-center gap-4 rounded-xl border border-slate-300 bg-white px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                        <span className="inline-flex items-center rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                            Choisir un fichier
                        </span>

                        <span className="text-sm text-slate-500 truncate">
                            {formData.image
                                ? formData.image instanceof File
                                    ? formData.image.name
                                    : "Image actuelle"
                                : "Aucun fichier choisi"}
                        </span>

                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    image: e.target.files?.[0] || null,
                                    removeImage: false,
                                })
                            }
                            className="hidden"
                        />
                    </label>

                    {formData.image && (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-sm text-slate-500">
                                {formData.image instanceof File ? formData.image.name : "Image actuelle"}
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({
                                        ...formData,
                                        image: null,
                                        removeImage: true,
                                    })
                                }
                                className="text-sm font-medium text-red-600 hover:text-red-700"
                            >
                                Retirer l’image
                            </button>
                        </div>
                    )}
                </div>
            </div>

              {/* Les boutons*/}
              <div className="flex justify-end gap-3 mt-6">
                  <button
                      type="button"
                      onClick={() => {
                          setIsFormOpen(false);
                          resetForm();
                          setEditingProduct(null);
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100"
                  >
                      Annuler
                  </button>
                  <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                  >
                      {editingProduct ? "Modifier le produit" : "Ajouter le produit"}
                  </button>

              </div>
          </form>
        </div>
      )}

        {/*Modal pour afficher prod*/}
        {selectedProduct && (
            <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
                onClick={() => setSelectedProduct(null)}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-semibold">
                                {selectedProduct.nom}
                            </h2>
                            <p className="text-sm text-slate-500">
                                {selectedProduct.description}
                            </p>
                        </div>

                        <button
                            onClick={() => setSelectedProduct(null)}
                            className="p-2 rounded-lg hover:bg-slate-100"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">

                        {/* Image */}
                        <div className="h-56 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center overflow-hidden">
                            {selectedProduct.image ? (
                                <img
                                    src={selectedProduct.image}
                                    alt={selectedProduct.nom}
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <Package className="w-24 h-24 text-blue-300" />
                            )}
                        </div>

                        {/* Prix */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-4 rounded-xl">
                                <p className="text-sm text-blue-600">Prix vente</p>
                                <p className="text-2xl font-semibold text-blue-600">
                                    {selectedProduct.prixVente} €
                                </p>
                            </div>

                            <div className="bg-purple-50 p-4 rounded-xl">
                                <p className="text-sm text-purple-600">TVA</p>
                                <p className="text-2xl font-semibold text-purple-600">
                                    {selectedProduct.tva} %
                                </p>
                            </div>
                        </div>

                        {/* Infos produit */}
                        <div className="bg-slate-100 rounded-xl p-4 space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Tag className="w-4 h-4"/>
                                    <span>Catégorie</span>
                                </div>
                                <span className="font-medium">{selectedProduct.categorie}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">Sous-catégorie</span>
                                <span className="font-medium">{selectedProduct.sousCategorie}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">Famille</span>
                                <span className="font-medium">{selectedProduct.famille}</span>
                            </div>
                        </div>

                        {/* Stock */}
                        <div className="bg-orange-50 rounded-xl p-4">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <Package className="w-5 h-5 text-orange-500"/>
                                Informations de stock
                            </h3>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Stock actuel</span>
                                    <span className="font-semibold">{selectedProduct.stock} unités</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-slate-500">Seuil minimum</span>
                                    <span>{selectedProduct.minStock}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-slate-500">Seuil critique</span>
                                    <span className="text-red-600 font-medium">{selectedProduct.seuilCritique}</span>
                                </div>
                            </div>
                        </div>
                        {/*tailles */}
                        {selectedProduct.variantes && selectedProduct.variantes.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-3">Variantes disponibles</h3>

                                <div className="flex gap-2 flex-wrap">
                                    {selectedProduct.variantes.map((v, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 rounded-full border text-sm bg-slate-100"
                                        >
                                            {v.type} : {v.valeur}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Code-barres */}
                        <div className="bg-slate-100 rounded-xl p-4">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <Barcode className="w-5 h-5 text-slate-500" />
                                Code-barres
                            </h3>

                            <ProductBarcode value={selectedProduct.codeBarres} onClick={() => openBarcodeSheetPdf(selectedProduct)} />
                        </div>

                        {/*Closing the modal*/}
                        <div className="text-right">
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        {toast.message && (
            <div
                className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-white 
      ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
            >
                {toast.message}
            </div>
        )}

        {deleteTarget && (
            <div
                className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
                onClick={() => setDeleteTarget(null)}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl"
                >
                    <h3 className="text-lg font-semibold mb-2">Supprimer le produit</h3>
                    <p className="text-slate-600 mb-6">
                        Voulez-vous vraiment supprimer <strong>{deleteTarget.nom}</strong> ?
                    </p>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setDeleteTarget(null)}
                            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100"
                        >
                            Annuler
                        </button>

                        <button
                            onClick={async () => {
                                await handleDeleteProduct(deleteTarget.id);
                                setDeleteTarget(null);
                            }}
                            className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
                        >
                            Supprimer
                        </button>

                    </div>
                </div>
            </div>
        )}

   </div>
  );
}