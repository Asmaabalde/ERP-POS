import React, { useState, useEffect, useRef } from "react";
import {
  Barcode,
  CornerDownLeft,
  Package,
  Search,
  User,
  Wallet,
  CreditCard,
  Star,
  RotateCcw,
} from "lucide-react";
import {
  getProducts,
  createSale,
  getClients,
  getClientBons,
  envoyerTicket,
} from "../utils/api";
import { getErrorMessage } from "../utils/axios";
import { showToast } from "../utils/toast";
import { ProductBarcode } from "../components/ProductBarcode.jsx";
import { BarcodeScannerPreview } from "../components/BarcodeScannerPreview.jsx";
import { openBarcodeSheetPdf } from "../utils/barcodePdf";
import { useUserStore } from "../stores/useUserStore";
import {
  getOfflineProducts,
  getOfflineClients,
  saveOfflineSale,
  updateOfflineProductStocksFromSale,
  mapProductForOffline,
  saveOfflineProducts,
  mapClientForOffline,
  saveOfflineClients,
} from "../utils/offlineDb";

const POS_CACHE_KEY = "pos-current-order";

export default function Caisse({ offlineMode = false }) {
  const user = useUserStore((state) => state.user);
  const entrepriseNom = user?.entreprise || "Entreprise";

  const [produitsDispos, setProduitsDispos] = useState([]);
  const [panier, setPanier] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [categorieActive, setCategorieActive] = useState("Toutes");
  const [statutPaiement, setStatutPaiement] = useState("attente");
  const [clientActif, setClientActif] = useState(null);
  const [isLoadingProduits, setIsLoadingProduits] = useState(true);
  const [showModalPaiement, setShowModalPaiement] = useState(false);
  const [montantDonne, setMontantDonne] = useState("");
  const [ticketData, setTicketData] = useState(null);

  const [clientRecherche, setClientRecherche] = useState("");
  const [clientsSuggestions, setClientsSuggestions] = useState([]);
  const [loadingClient, setLoadingClient] = useState(false);

  const [remisePoints, setRemisePoints] = useState(0);
  const [remisePromo, setRemisePromo] = useState(0);

  const [isScanMode, setIsScanMode] = useState(false);
  const [scanCode, setScanCode] = useState("");

  const scanInputRef = useRef(null);
  const scanSoundRef = useRef(null);
  const hasLoadedCache = useRef(false);

  const [modePaiement, setModePaiement] = useState("");
  const [bonsDisponibles, setBonsDisponibles] = useState([]);
  const [bonSelectionne, setBonSelectionne] = useState(null);

  const panierVide = panier.length === 0;

  const formaterProduit = (p) => {
    const prixHT = Number(p.prix_vente_ht ?? p.prix_ht ?? p.prix ?? 0);
    const tauxTVA = Number(p.taux_tva ?? p.tva ?? 20);
    const prixTTC =
      p.prix_ttc !== undefined && p.prix_ttc !== null
        ? Number(p.prix_ttc)
        : prixHT * (1 + tauxTVA / 100);

    return {
      id: p.id,
      nom: p.nom,
      prix: prixTTC,
      prixHT,
      tauxTVA,
      categorie: p.categorie || "Autre",
      stock: Number(p.quantite_stock || p.stock || 0),
      image: p.image || null,
      codeBarres: p.codeBarres || p.code_barre || "",
    };
  };

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(POS_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        setPanier(data.panier || []);
        setClientActif(data.clientActif || null);
        setRemisePoints(data.remisePoints || 0);
        setRemisePromo(data.remisePromo || 0);
        setBonSelectionne(data.bonSelectionne || null);
      }
    } catch {
      sessionStorage.removeItem(POS_CACHE_KEY);
    } finally {
      hasLoadedCache.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedCache.current) return;

    const hasOrder =
      panier.length > 0 ||
      clientActif ||
      remisePoints > 0 ||
      remisePromo > 0 ||
      bonSelectionne;

    if (!hasOrder) {
      sessionStorage.removeItem(POS_CACHE_KEY);
      return;
    }

    sessionStorage.setItem(
      POS_CACHE_KEY,
      JSON.stringify({
        panier,
        clientActif,
        remisePoints,
        remisePromo,
        bonSelectionne,
      })
    );
  }, [panier, clientActif, remisePoints, remisePromo, bonSelectionne]);

  const viderCommande = () => {
    setPanier([]);
    setClientActif(null);
    setClientRecherche("");
    setClientsSuggestions([]);
    setRemisePoints(0);
    setRemisePromo(0);
    setBonSelectionne(null);
    setBonsDisponibles([]);
    sessionStorage.removeItem(POS_CACHE_KEY);
  };

  const reinitialiserPOS = () => {
    setTicketData(null);
    viderCommande();
  };

  const chargerProduits = async () => {
    try {
      setIsLoadingProduits(true);

      if (offlineMode) {
        const produitsOffline = await getOfflineProducts();
        const produitsFormates = produitsOffline.map(formaterProduit);
        setProduitsDispos(produitsFormates);
        return;
      }

      const res = await getProducts();
      const produitsFormates = res.data.map(formaterProduit);

      setProduitsDispos(produitsFormates);

      const offlineProducts = res.data.map(mapProductForOffline);
      await saveOfflineProducts(offlineProducts);
    } catch (error) {
      console.error("Erreur lors du chargement des produits :", error);
      setProduitsDispos([]);
    } finally {
      setIsLoadingProduits(false);
    }
  };

  useEffect(() => {
    chargerProduits();
  }, [offlineMode]);

  useEffect(() => {
    if (isScanMode) {
      scanInputRef.current?.focus();
    }
  }, [isScanMode]);

  useEffect(() => {
    const rechercherClients = async () => {
      const query = clientRecherche.trim().toLowerCase();

      if (query.length < 1 || clientActif) {
        setClientsSuggestions([]);
        return;
      }

      try {
        setLoadingClient(true);

        let data = [];

        if (offlineMode || !window.navigator.onLine) {
          data = await getOfflineClients();
        } else {
          const response = await getClients();
          data = Array.isArray(response.data)
            ? response.data
            : response.data.results || [];

          const offlineClients = data.map(mapClientForOffline);
          await saveOfflineClients(offlineClients);
        }

        const results = data
          .filter((client) => {
            const nom = String(client.nom_complet || "").toLowerCase();
            const email = String(client.email || "").toLowerCase();

            return nom.includes(query) || email.includes(query);
          })
          .slice(0, 5);

        setClientsSuggestions(results);
      } catch (error) {
        console.error("Erreur recherche client :", error);
        setClientsSuggestions([]);
      } finally {
        setLoadingClient(false);
      }
    };

    const timeoutId = setTimeout(rechercherClients, 250);

    return () => clearTimeout(timeoutId);
  }, [clientRecherche, clientActif, offlineMode]);

  const categories = ["Toutes", ...new Set(produitsDispos.map((p) => p.categorie))];

  const produitsFiltres = produitsDispos.filter((p) => {
    const rechercheNormalisee = recherche.toLowerCase();

    const matchRecherche =
      p.nom.toLowerCase().includes(rechercheNormalisee) ||
      String(p.codeBarres || "").includes(rechercheNormalisee);

    const matchCategorie =
      categorieActive === "Toutes" || p.categorie === categorieActive;

    return matchRecherche && matchCategorie;
  });

  const playScanSound = () => {
    if (!scanSoundRef.current) return;
    scanSoundRef.current.currentTime = 0;
    scanSoundRef.current.play().catch(() => {});
  };

  const ajouterAuPanier = (produit) => {
    if (produit.stock <= 0) {
      showToast("Produit en rupture de stock.", "error");
      return;
    }

    const itemExistant = panier.find((item) => item.id === produit.id);

    if (itemExistant) {
      if (itemExistant.quantite >= produit.stock) {
        showToast("Stock maximum atteint pour ce produit.", "error");
        return;
      }

      setPanier(
        panier.map((item) =>
          item.id === produit.id
            ? { ...item, quantite: item.quantite + 1 }
            : item
        )
      );
    } else {
      setPanier([...panier, { ...produit, quantite: 1 }]);
    }
  };

  const ajouterClientParCodeBarres = async (code) => {
    const codeNormalise = String(code || "").trim();

    if (!codeNormalise.startsWith("1")) return false;

    try {
      let data = [];

      if (offlineMode || !window.navigator.onLine) {
        data = await getOfflineClients();
      } else {
        const response = await getClients();
        data = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];

        const offlineClients = data.map(mapClientForOffline);
        await saveOfflineClients(offlineClients);
      }

      const client = data.find(
        (c) =>
          String(c.code_barre || c.codeBarres || "").trim() === codeNormalise
      );

      if (!client) {
        showToast(`Aucun client trouvé pour le code ${codeNormalise}.`, "error");
        return true;
      }

      setClientActif(client);
      setClientRecherche("");
      setClientsSuggestions([]);
      return true;
    } catch (error) {
      console.error(error);
      showToast("Erreur lors de la recherche client.", "error");
      return true;
    }
  };

  const ajouterProduitParCodeBarres = async (code) => {
    const codeNormalise = String(code || "").trim();

    if (!codeNormalise) return;

    const isClientCode = await ajouterClientParCodeBarres(codeNormalise);

    if (isClientCode) return;

    const produit = produitsDispos.find(
      (p) => String(p.codeBarres || "").trim() === codeNormalise
    );

    if (!produit) {
      showToast(`Aucun produit trouvé pour le code ${codeNormalise}.`, "error");
      return;
    }

    ajouterAuPanier(produit);
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();

    await ajouterProduitParCodeBarres(scanCode);
    setScanCode("");

    setTimeout(() => {
      scanInputRef.current?.focus();
    }, 0);
  };

  const modifierQuantite = (id, delta) => {
    setPanier(
      panier
        .map((item) => {
          if (item.id === id) {
            const produitBase = produitsDispos.find((p) => p.id === id);
            const nvQuantite = item.quantite + delta;

            if (produitBase && nvQuantite > produitBase.stock) {
              showToast("Stock maximum atteint pour ce produit.", "error");
              return item;
            }

            return { ...item, quantite: nvQuantite };
          }

          return item;
        })
        .filter((item) => item.quantite > 0)
    );
  };

  const supprimerDuPanier = (id) => {
    setPanier(panier.filter((item) => item.id !== id));
  };

  const sousTotal = panier.reduce(
    (total, item) => total + item.prix * item.quantite,
    0
  );

  const totalTTC = Math.max(0, sousTotal - remisePoints - remisePromo);

  const calculerTotauxTVA = (articles, totalApresRemises) => {
    const totalTTCAvantRemises = articles.reduce(
      (total, item) => total + Number(item.prix || 0) * Number(item.quantite || 0),
      0
    );

    const totalHTAvantRemises = articles.reduce((total, item) => {
      const tauxTVA = Number(item.tauxTVA ?? 20);
      const prixTTC = Number(item.prix || 0);
      const quantite = Number(item.quantite || 0);

      return total + (prixTTC / (1 + tauxTVA / 100)) * quantite;
    }, 0);

    const ratio =
      totalTTCAvantRemises > 0
        ? Number(totalApresRemises || 0) / totalTTCAvantRemises
        : 1;

    const totalHT = totalHTAvantRemises * ratio;
    const tva = Number(totalApresRemises || 0) - totalHT;

    return {
      totalHT,
      tva,
    };
  };

  const construireDonneesTicket = ({ mode, donne = 0, rendu = 0 }) => {
    const totauxTVA = calculerTotauxTVA(panier, totalTTC);

    return {
      entreprise: entrepriseNom,
      date: new Date().toLocaleString("fr-FR"),
      articles: [...panier],
      sousTotal,
      total: totalTTC,
      totalHT: totauxTVA.totalHT,
      tva: totauxTVA.tva,
      donne: Number(donne),
      rendu: Number(rendu),
      modePaiement: mode,
      remisePoints,
      remisePromo,
      codePromo: bonSelectionne ? bonSelectionne.code : null,
      bon_id: bonSelectionne ? bonSelectionne.id : null,
      client: clientActif
        ? {
            id: clientActif.id,
            nom_complet: clientActif.nom_complet,
            email: clientActif.email,
            points_fidelite: clientActif.points_fidelite,
            code_barre: clientActif.code_barre,
          }
        : null,
    };
  };

  const construirePayloadVente = ({ mode, donne = 0, rendu = 0 }) => {
    const ticket = construireDonneesTicket({ mode, donne, rendu });

    return {
      panier: panier.map((item) => ({
        id: item.id,
        nom: item.nom,
        quantite: Number(item.quantite || 0),
        prix: Number(item.prix || 0),
        prix_ht: Number(item.prixHT || 0),
        taux_tva: Number(item.tauxTVA || 20),
      })),
      total: Number(totalTTC || 0),
      donne: Number(donne),
      rendu: Number(rendu),
      client_id: clientActif ? clientActif.id : null,
      client_nom: clientActif ? clientActif.nom_complet : null,
      client_email: clientActif ? clientActif.email : null,
      mode,
      remisePoints,
      remisePromo,
      bon_id: bonSelectionne ? bonSelectionne.id : null,
      codePromo: bonSelectionne ? bonSelectionne.code : null,
      ticket,
    };
  };

  const appliquerMiseAJourStockLocale = () => {
    setProduitsDispos((prevProduits) =>
      prevProduits.map((produit) => {
        const itemPanier = panier.find((item) => item.id === produit.id);

        if (!itemPanier) return produit;

        return {
          ...produit,
          stock: Math.max(
            0,
            Number(produit.stock || 0) - Number(itemPanier.quantite || 0)
          ),
        };
      })
    );
  };

  const finaliserCommande = (donneesTicket) => {
    setStatutPaiement("attente");
    setShowModalPaiement(false);
    setPanier([]);
    setBonSelectionne(null);
    setRemisePromo(0);
    setRemisePoints(0);
    setTicketData(donneesTicket);
    sessionStorage.removeItem(POS_CACHE_KEY);
  };

  const initierPaiement = (mode) => {
    if (panier.length === 0) return;

    setModePaiement(mode);

    if (mode === "Espèces") {
      setMontantDonne(totalTTC.toFixed(2));
      setShowModalPaiement(true);
    } else {
      confirmerPaiementAvecMode(mode);
    }
  };

  const confirmerPaiementAvecMode = async (mode) => {
    try {
      setStatutPaiement("chargement");

      const salePayload = construirePayloadVente({
        mode,
        donne: 0,
        rendu: 0,
      });

      if (offlineMode || !window.navigator.onLine) {
        await saveOfflineSale(salePayload);
        await updateOfflineProductStocksFromSale(salePayload.panier);
        appliquerMiseAJourStockLocale();
        finaliserCommande(salePayload.ticket);
        return;
      }

      await createSale(salePayload);

      await chargerProduits();
      finaliserCommande(salePayload.ticket);
    } catch (error) {
      console.error(error);
      setStatutPaiement("erreur");
      showToast(getErrorMessage(error) || "Erreur lors de l'encaissement.", "error");
    }
  };

  const confirmerPaiement = async () => {
    const rendu = Number(montantDonne) - totalTTC;

    if (rendu < 0) return;

    try {
      setStatutPaiement("chargement");

      const salePayload = construirePayloadVente({
        mode: "Espèces",
        donne: montantDonne,
        rendu,
      });

      if (offlineMode || !window.navigator.onLine) {
        await saveOfflineSale(salePayload);
        await updateOfflineProductStocksFromSale(salePayload.panier);
        appliquerMiseAJourStockLocale();
        finaliserCommande(salePayload.ticket);
        return;
      }

      await createSale(salePayload);
      await chargerProduits();
      finaliserCommande(salePayload.ticket);
    } catch (error) {
      console.error(error);
      console.error(getErrorMessage(error));
      setStatutPaiement("erreur");
      showToast(getErrorMessage(error) || "Erreur lors de l'encaissement.", "error");
    }
  };

  const imprimerTicket = () => {
    window.print();
  };

  const pointsDisponibles = clientActif ? clientActif.points_fidelite / 100 : 0;
  const peutUtiliserPoints = clientActif && pointsDisponibles > 0;

  useEffect(() => {
    const chargerBons = async () => {
      if (!clientActif) {
        setBonsDisponibles([]);
        return;
      }

      try {
        const res = await getClientBons(clientActif.id);
        setBonsDisponibles(res.data || []);
      } catch (error) {
        console.error(error);
        setBonsDisponibles([]);
      }
    };

    chargerBons();
  }, [clientActif]);

  const envoyerTicketParEmail = async () => {
    if (!ticketData?.client?.email) {
      showToast("Aucun email client disponible.", "error");
      return;
    }

    try {
      await envoyerTicket({
        email: ticketData.client.email,
        nom: ticketData.client.nom_complet,
        articles: ticketData.articles,
        total: ticketData.total,
        date: ticketData.date,
        modePaiement: ticketData.modePaiement,
        remisePromo: ticketData.remisePromo,
        codePromo: ticketData.codePromo,
      });

      showToast("Ticket envoyé par email !");
    } catch (error) {
      console.error(error);
      showToast("Erreur lors de l'envoi.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>
        {`
@media print {
  html, body {
    background: white !important;
    height: auto !important;
    overflow: visible !important;
  }

  body * {
    visibility: hidden;
  }

  #printable-ticket,
  #printable-ticket * {
    visibility: visible;
  }

  #printable-ticket {
    position: absolute;
    left: 50%;
    top: 0;
    transform: translateX(-50%);
    width: 80mm;
    margin: 0;
    padding: 10px;
    box-shadow: none;
    background: white;
    overflow: visible;
    height: auto;
  }

  .ticket-row,
  .ticket-section {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .no-print {
    display: none !important;
  }
}
`}
      </style>

      <audio ref={scanSoundRef} src="/sounds/beep.mp3" preload="auto" />

      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold">Point de Vente (POS)</h1>

          <button
            onClick={reinitialiserPOS}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </button>
        </div>
      </header>

      <main className="no-print mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-5">
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-300 bg-white px-3 py-4 shadow-sm">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un article..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 shadow-sm outline-none focus:border-blue-500"
              />
            </div>
          </section>

          <section className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategorieActive(cat)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  categorieActive === cat
                    ? "bg-blue-600 text-white"
                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </section>

          <section>
            {isLoadingProduits ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
                {offlineMode
                  ? "Chargement des produits depuis le cache local..."
                  : "Chargement des produits..."}
              </div>
            ) : produitsFiltres.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
                Aucun produit disponible.
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {produitsFiltres.map((produit) => (
                  <div
                    key={produit.id}
                    onClick={() => ajouterAuPanier(produit)}
                    className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                      produit.stock > 0
                        ? "cursor-pointer border-slate-200 hover:border-blue-600 hover:shadow-md"
                        : "cursor-not-allowed border-slate-200 opacity-50"
                    }`}
                  >
                    {produit.image ? (
                      <img
                        src={produit.image}
                        alt={produit.nom}
                        className="h-32 w-full bg-blue-50 object-contain"
                      />
                    ) : (
                      <div className="flex h-32 w-full items-center justify-center bg-blue-50">
                        <Package className="h-16 w-16 text-blue-300" />
                      </div>
                    )}

                    <div className="p-4">
                      <span className="text-xs uppercase text-slate-400">
                        {produit.categorie}
                      </span>

                      <h3 className="mt-1 min-h-[40px] text-sm font-semibold leading-tight text-slate-900">
                        {produit.nom}
                      </h3>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-lg font-bold text-blue-600">
                          {produit.prix.toFixed(2)} € TTC
                        </p>

                        <p
                          className={`text-xs font-bold ${
                            produit.stock > 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {produit.stock > 0 ? `Stock: ${produit.stock}` : "Rupture"}
                        </p>
                      </div>

                      {produit.codeBarres && (
                        <div
                          className="mt-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            openBarcodeSheetPdf(produit);
                          }}
                        >
                          <ProductBarcode value={produit.codeBarres} compact />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>

        <aside className="space-y-3">
          <section className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <h2 className="text-base font-bold text-slate-900">Client</h2>
            </div>

            {clientActif ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800">
                      {clientActif.nom_complet}
                    </p>
                    <p className="text-xs text-slate-500">{clientActif.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      ⭐ {clientActif.points_fidelite} points
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setClientActif(null);
                      setClientRecherche("");
                      setClientsSuggestions([]);
                      setRemisePoints(0);
                      setRemisePromo(0);
                      setBonSelectionne(null);
                    }}
                    className="text-xl font-bold text-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nom ou email du client..."
                  value={clientRecherche}
                  onChange={(e) => setClientRecherche(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />

                {clientRecherche.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {loadingClient ? (
                      <div className="p-3 text-sm text-slate-500">
                        Recherche...
                      </div>
                    ) : clientsSuggestions.length > 0 ? (
                      clientsSuggestions.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setClientActif(client);
                            setClientRecherche("");
                            setClientsSuggestions([]);
                          }}
                          className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                        >
                          <p className="text-sm font-semibold text-slate-800">
                            {client.nom_complet}
                          </p>
                          <p className="text-xs text-slate-500">{client.email}</p>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-slate-500">
                        Aucun client trouvé.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Code-barres</h2>
                <p className="text-xs text-slate-500">Produit ou client</p>
              </div>

              <button
                type="button"
                onClick={() => setIsScanMode((value) => !value)}
                title="Activer le mode code-barres"
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                  isScanMode
                    ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Barcode className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleScanSubmit} className="flex gap-2">
              <input
                ref={scanInputRef}
                type="text"
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                placeholder="Code-barres..."
                disabled={!isScanMode}
                className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none ${
                  isScanMode
                    ? "border-slate-300 bg-white focus:border-blue-500"
                    : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                }`}
              />

              <button
                type="submit"
                disabled={!isScanMode || !scanCode.trim()}
                title="Entrée"
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-white transition ${
                  !isScanMode || !scanCode.trim()
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <CornerDownLeft className="h-5 w-5" />
              </button>
            </form>

            <div
              className={`mt-3 h-28 overflow-hidden rounded-xl border border-dashed ${
                isScanMode
                  ? "border-blue-300 bg-blue-50"
                  : "border-slate-300 bg-slate-50"
              }`}
            >
              <BarcodeScannerPreview
                isActive={isScanMode}
                facingMode="user"
                onScan={(code) => {
                  playScanSound();
                  ajouterProduitParCodeBarres(code);
                  setScanCode("");
                }}
                onCameraError={() => {
                  showToast("Impossible d'accéder à la caméra.", "error");
                }}
              />
            </div>
          </section>

          <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-base font-bold text-slate-900">Ticket Courant</h2>

              {panier.length > 0 && (
                <button
                  onClick={viderCommande}
                  className="text-sm font-medium text-red-600 underline"
                >
                  Vider
                </button>
              )}
            </div>

            <div className="mt-2">
              {panier.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">
                  Le panier est vide.
                </p>
              )}

              {panier.map((item) => (
                <div
                  key={item.id}
                  className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3"
                >
                  <div className="min-w-0 flex-1 pr-2 text-sm font-medium">
                    <p className="truncate">{item.nom}</p>
                    <p className="text-xs text-slate-400">
                      {item.prix.toFixed(2)} € TTC / unité
                    </p>
                  </div>

                  <div className="mr-2 flex items-center gap-1">
                    <button
                      onClick={() => modifierQuantite(item.id, -1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white font-bold hover:bg-slate-100"
                    >
                      -
                    </button>

                    <span className="w-5 text-center text-sm font-bold">
                      {item.quantite}
                    </span>

                    <button
                      onClick={() => modifierQuantite(item.id, 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 font-bold hover:bg-slate-300"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex w-20 items-center justify-end gap-1 text-right text-sm font-bold">
                    <span>{(item.prix * item.quantite).toFixed(2)} €</span>

                    <button
                      onClick={() => supprimerDuPanier(item.id)}
                      className="text-base font-bold text-red-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-3">
              {remisePoints > 0 && (
                <div className="mb-1 flex justify-between text-sm text-slate-600">
                  <span>Remise points :</span>
                  <span>-{remisePoints.toFixed(2)} €</span>
                </div>
              )}

              {remisePromo > 0 && (
                <div className="mb-1 flex justify-between text-sm text-slate-600">
                  <span>Code promo :</span>
                  <span>-{remisePromo.toFixed(2)} €</span>
                </div>
              )}

              {clientActif && bonsDisponibles.length > 0 && (
                <div className="space-y-2 mb-3">
                  <label className="font-semibold text-sm text-slate-700">
                    Bon de réduction :
                  </label>

                  <select
                    disabled={panierVide}
                    onChange={(e) => {
                      setBonSelectionne(null);
                      setRemisePromo(0);

                      const bon = bonsDisponibles.find(
                        (b) => b.id === parseInt(e.target.value)
                      );

                      if (!bon) return;

                      if (bon.montant) {
                        setRemisePromo(parseFloat(bon.montant));
                        setBonSelectionne(bon);
                        showToast(`Remise de ${bon.montant} € appliquée.`);
                      } else if (bon.pourcentage) {
                        const remise = sousTotal * (bon.pourcentage / 100);
                        setRemisePromo(remise);
                        setBonSelectionne(bon);
                        showToast(`Remise de ${bon.pourcentage}% appliquée.`);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un bon</option>

                    {bonsDisponibles.map((bon) => (
                      <option key={bon.id} value={bon.id}>
                        {bon.code} —{" "}
                        {bon.montant ? `${bon.montant} €` : `${bon.pourcentage}%`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mb-3 flex justify-between text-xl font-bold">
                <span>Total TTC :</span>
                <span>{totalTTC.toFixed(2)} €</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <button
                  onClick={() => initierPaiement("Espèces")}
                  disabled={panier.length === 0}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white ${
                    panier.length === 0
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  Espèces
                </button>

                <button
                  onClick={() => initierPaiement("Carte")}
                  disabled={panier.length === 0}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white ${
                    panier.length === 0
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Carte
                </button>

                <button
                  onClick={() => {
                    if (remisePoints > 0) {
                      setRemisePoints(0);
                    } else {
                      setRemisePoints(pointsDisponibles);
                    }
                  }}
                  disabled={panier.length === 0 || !peutUtiliserPoints}
                  title={
                    panier.length === 0
                      ? "Le panier est vide"
                      : !peutUtiliserPoints
                      ? "Aucun point disponible"
                      : ""
                  }
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white ${
                    panier.length === 0 || !peutUtiliserPoints
                      ? "cursor-not-allowed bg-slate-300"
                      : remisePoints > 0
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-yellow-500 hover:bg-yellow-600"
                  }`}
                >
                  <Star className="h-5 w-5" />
                  {remisePoints > 0
                    ? "Annuler points"
                    : `Utiliser ${pointsDisponibles.toFixed(2)} €`}
                </button>
              </div>
            </div>
          </section>
        </aside>
      </main>

      {showModalPaiement && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[400px] rounded-xl bg-white p-8 shadow-2xl">
            <h2 className="mb-5 text-center text-2xl font-bold text-slate-900">
              Paiement
            </h2>

            <div className="mb-5 flex justify-between text-xl font-bold">
              <span>Total à payer:</span>
              <span className="text-blue-600">{totalTTC.toFixed(2)} €</span>
            </div>

            <div className="mb-5">
              <label className="mb-2 block font-bold text-slate-600">
                Montant donné par le client (€):
              </label>

              <input
                type="number"
                value={montantDonne}
                onChange={(e) => setMontantDonne(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-300 px-3 py-3 text-lg outline-none focus:border-blue-500"
              />
            </div>

            <div className="mb-5 rounded-lg bg-slate-100 p-4">
              <div className="flex justify-between text-lg font-bold">
                <span>À rendre :</span>
                <span
                  className={
                    Number(montantDonne) - totalTTC >= 0
                      ? "text-emerald-500"
                      : "text-red-600"
                  }
                >
                  {((Number(montantDonne) || 0) - totalTTC).toFixed(2)} €
                </span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowModalPaiement(false)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 font-bold hover:bg-slate-100"
              >
                Annuler
              </button>

              <button
                onClick={confirmerPaiement}
                disabled={
                  Number(montantDonne) < totalTTC ||
                  statutPaiement === "chargement"
                }
                className={`flex-[2] rounded-lg px-4 py-3 font-bold text-white ${
                  Number(montantDonne) < totalTTC ||
                  statutPaiement === "chargement"
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-emerald-500 hover:bg-emerald-600"
                }`}
              >
                {statutPaiement === "chargement"
                  ? "En cours..."
                  : "Valider le paiement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {ticketData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="flex max-h-[90vh] flex-col items-center overflow-y-auto px-4 py-6">
            <div
              id="printable-ticket"
              className="w-[300px] bg-white p-6 font-mono text-black shadow-xl"
            >
              <div className="ticket-section mb-3 border-b border-dashed border-gray-300 pb-3 text-center">
                <div className="text-[18px] font-bold tracking-[2px]">
                  {ticketData.entreprise || entrepriseNom}
                </div>
                <div className="mt-1 text-[11px]">{ticketData.date}</div>
              </div>

              {ticketData.client && (
                <div className="ticket-section mb-2 border-b border-dashed border-gray-300 pb-2 text-[11px]">
                  <div className="font-bold">
                    CLIENT : {ticketData.client.nom_complet.toUpperCase()}
                  </div>
                  <div className="text-gray-500">
                    Points avant : {ticketData.client.points_fidelite}
                  </div>
                  <div className="text-gray-500">
                    Points gagnés : +{Math.floor(ticketData.total)}
                  </div>
                  <div className="font-bold">
                    Nouveau solde :{" "}
                    {ticketData.client.points_fidelite + Math.floor(ticketData.total)} pts
                  </div>
                </div>
              )}

              <div className="ticket-section mb-2 border-b border-dashed border-gray-300 pb-2">
                <div className="mb-1 flex justify-between text-[10px] text-gray-400">
                  <span>ARTICLE</span>
                  <span>QTÉ PRIX TOTAL</span>
                </div>

                {ticketData.articles.map((item, index) => (
                  <div key={index} className="ticket-row mb-1 text-[12px]">
                    <div className="max-w-[200px] truncate">{item.nom}</div>
                    <div className="flex justify-between text-gray-600">
                      <span>
                        {item.quantite} x {item.prix.toFixed(2)} €
                      </span>
                      <span className="font-bold">
                        {(item.prix * item.quantite).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {(ticketData.remisePoints > 0 || ticketData.remisePromo > 0) && (
                <div className="ticket-section mb-2 border-b border-dashed border-gray-300 pb-2 text-[12px]">
                  {ticketData.remisePoints > 0 && (
                    <div className="flex justify-between text-emerald-500">
                      <span>Remise points fidélité</span>
                      <span>-{ticketData.remisePoints.toFixed(2)} €</span>
                    </div>
                  )}
                  {ticketData.remisePromo > 0 && (
                    <div className="flex justify-between text-emerald-500">
                      <span>Code promo</span>
                      <span>-{ticketData.remisePromo.toFixed(2)} €</span>
                    </div>
                  )}
                </div>
              )}

              <div className="ticket-section mb-2 border-b border-dashed border-gray-300 pb-2 text-[12px]">
                <div className="flex justify-between mb-1">
                  <span>Sous-total HT</span>
                  <span>{Number(ticketData.totalHT || 0).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between mb-1 text-gray-500">
                  <span>TVA incluse</span>
                  <span>{Number(ticketData.tva || 0).toFixed(2)} €</span>
                </div>
                <div className="mt-1 flex justify-between text-[16px] font-bold">
                  <span>TOTAL TTC</span>
                  <span>{ticketData.total.toFixed(2)} €</span>
                </div>
              </div>

              <div className="ticket-section mb-3 border-b border-dashed border-gray-300 pb-2 text-[12px]">
                <div className="flex justify-between mb-1">
                  <span>Mode de paiement</span>
                  <span className="font-bold">{ticketData.modePaiement}</span>
                </div>

                {ticketData.modePaiement === "Espèces" && (
                  <>
                    <div className="flex justify-between mb-1">
                      <span>Espèces remises</span>
                      <span>{ticketData.donne.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rendu monnaie</span>
                      <span className="font-bold">{ticketData.rendu.toFixed(2)} €</span>
                    </div>
                  </>
                )}
              </div>

              <div className="ticket-section text-center text-[10px] text-gray-500">
                Généré par PlanifyX
              </div>
            </div>

            <div className="no-print mt-5 flex gap-4">
              <button
                onClick={imprimerTicket}
                className="rounded-full bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
              >
                Imprimer
              </button>

              {ticketData.client && (
                <button
                  onClick={() => envoyerTicketParEmail()}
                  className="rounded-full bg-emerald-500 px-6 py-3 font-bold text-white hover:bg-emerald-600"
                >
                  Envoyer par email
                </button>
              )}

              <button
                onClick={reinitialiserPOS}
                className="rounded-full border border-gray-300 bg-white px-6 py-3 font-bold text-gray-800"
              >
                Nouveau client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}