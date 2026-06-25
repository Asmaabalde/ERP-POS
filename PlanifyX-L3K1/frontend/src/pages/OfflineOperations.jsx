import React, { useEffect, useMemo, useState } from "react";
import { Check, Trash2, Receipt, WifiOff } from "lucide-react";
import { createSale, envoyerTicket } from "../utils/api";
import {
  getOfflineSales,
  deleteOfflineSale,
  clearOfflineSales,
} from "../utils/offlineDb";
import { getErrorMessage } from "../utils/axios";
import { useOfflineOperationsStore } from "../stores/useOfflineOperationsStore.js";

const formatDate = (value) => {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return value;
  }
};

const formatPrice = (value) => `${Number(value || 0).toFixed(2)} €`;

const getSaleItems = (sale) => sale.items || sale.panier || [];

const getItemsCount = (sale) =>
  getSaleItems(sale).reduce((total, item) => total + Number(item.quantite || 0), 0);

const getItemPrice = (item) => Number((item.prixUnitaire ?? item.prix) || 0);

const getSaleClient = (sale) => {
  if (sale.ticket?.client) return sale.ticket.client;
  if (sale.client) return sale.client;

  if (sale.client_nom) {
    return {
      nom_complet: sale.client_nom,
      email: sale.client_email || null,
      points_fidelite: sale.client_points_fidelite || 0,
    };
  }

  return null;
};

const buildSalePayload = (sale) => ({
  panier: getSaleItems(sale).map((item) => ({
    id: item.productId ?? item.id,
    nom: item.nom || "Produit",
    quantite: Number(item.quantite || 0),
    prix: getItemPrice(item),
  })),
  total: Number(sale.total || sale.ticket?.total || 0),
  donne: Number(sale.donne || sale.ticket?.donne || 0),
  rendu: Number(sale.rendu || sale.ticket?.rendu || 0),
  client_id: sale.client_id || sale.ticket?.client?.id || null,
  client_nom: sale.client_nom || sale.ticket?.client?.nom_complet || null,
  client_email: sale.client_email || sale.ticket?.client?.email || null,
  mode: sale.mode || sale.ticket?.modePaiement || "Espèces",
  remisePoints: Number(sale.remisePoints || sale.ticket?.remisePoints || 0),
  remisePromo: Number(sale.remisePromo || sale.ticket?.remisePromo || 0),
  bon_id: sale.bon_id || sale.ticket?.bon_id || null,
  codePromo: sale.codePromo || sale.ticket?.codePromo || null,
});

const buildTicketData = (sale) => {
  if (sale.ticket) {
    return {
      entreprise: sale.ticket.entreprise || "Entreprise",
      date: sale.ticket.date || formatDate(sale.createdAt),
      articles: sale.ticket.articles || getSaleItems(sale),
      sousTotal: Number(sale.ticket.sousTotal || sale.ticket.total || sale.total || 0),
      total: Number(sale.ticket.total || sale.total || 0),
      donne: Number(sale.ticket.donne || sale.donne || 0),
      rendu: Number(sale.ticket.rendu || sale.rendu || 0),
      modePaiement: sale.ticket.modePaiement || sale.mode || "Espèces",
      remisePoints: Number(sale.ticket.remisePoints || sale.remisePoints || 0),
      remisePromo: Number(sale.ticket.remisePromo || sale.remisePromo || 0),
      codePromo: sale.ticket.codePromo || sale.codePromo || null,
      client: sale.ticket.client || getSaleClient(sale),
    };
  }

  return {
    entreprise: sale.entreprise || "Entreprise",
    date: formatDate(sale.createdAt),
    articles: getSaleItems(sale).map((item) => ({
      nom: item.nom || "Produit",
      quantite: Number(item.quantite || 0),
      prix: getItemPrice(item),
    })),
    sousTotal: Number(sale.total || 0),
    total: Number(sale.total || 0),
    donne: Number(sale.donne || 0),
    rendu: Number(sale.rendu || 0),
    modePaiement: sale.mode || "Espèces",
    remisePoints: Number(sale.remisePoints || 0),
    remisePromo: Number(sale.remisePromo || 0),
    codePromo: sale.codePromo || null,
    client: getSaleClient(sale),
  };
};

export function OfflineOperations() {
  const [operations, setOperations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [ticketData, setTicketData] = useState(null);
  const refreshOfflineOperationsCount = useOfflineOperationsStore(
    (state) => state.refreshOfflineOperationsCount
  );

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast({ message: "", type: "" });
    }, 3000);
  };

  const loadOperations = async () => {
    try {
      setIsLoading(true);
      const sales = await getOfflineSales();
      setOperations(sales);
    } catch (error) {
      showToast("Impossible de charger les opérations hors ligne.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOperations();
  }, []);

  const totalMontant = useMemo(() => {
    return operations.reduce(
      (sum, operation) => sum + Number(operation.total || operation.ticket?.total || 0),
      0
    );
  }, [operations]);

  const handleOpenTicket = (operation) => {
    setTicketData(buildTicketData(operation));
  };

  const handleAcceptOne = async (operation) => {
    try {
      setProcessingIds((prev) => [...prev, operation.localId]);

      await createSale(buildSalePayload(operation));
      await deleteOfflineSale(operation.localId);

      setOperations((prev) => prev.filter((item) => item.localId !== operation.localId));
      await refreshOfflineOperationsCount();
      showToast("Opération envoyée avec succès.");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== operation.localId));
    }
  };

  const handleRejectOne = async (operation) => {
    try {
      await deleteOfflineSale(operation.localId);
      setOperations((prev) => prev.filter((item) => item.localId !== operation.localId));
      await refreshOfflineOperationsCount();
      showToast("Opération refusée et supprimée.");
    } catch (error) {
      showToast("Impossible de supprimer cette opération.", "error");
    }
  };

  const handleAcceptAll = async () => {
    if (!operations.length) return;

    setIsProcessingAll(true);

    let successCount = 0;

    for (const operation of operations) {
      try {
        await createSale(buildSalePayload(operation));
        await deleteOfflineSale(operation.localId);
        successCount += 1;
      } catch (error) {
        showToast(`Erreur sur une opération : ${getErrorMessage(error)}`, "error");
      }
    }

    await loadOperations();
    await refreshOfflineOperationsCount();

    if (successCount > 0) {
      showToast(`${successCount} opération(s) envoyée(s) avec succès.`);
    }

    setIsProcessingAll(false);
  };

  const handleRejectAll = async () => {
    try {
      await clearOfflineSales();
      setOperations([]);
      await refreshOfflineOperationsCount();
      showToast("Toutes les opérations hors ligne ont été supprimées.");
    } catch (error) {
      showToast("Impossible de supprimer toutes les opérations.", "error");
    }
  };

  const imprimerTicket = () => {
    window.print();
  };

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

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="text-xl font-bold">Opérations hors-ligne</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="mb-8 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-3">
              <WifiOff className="h-5 w-5 text-amber-700" />
            </div>

            <div>
              <h2 className="font-semibold text-amber-900">
                Ventes enregistrées localement
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                Ces opérations attendent une validation manuelle avant envoi au serveur.
              </p>
              <p className="mt-2 text-sm font-medium text-amber-900">
                {operations.length} opération(s) • {formatPrice(totalMontant)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAcceptAll}
              disabled={!operations.length || isProcessingAll}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isProcessingAll ? "Validation..." : "Valider toutes"}
            </button>

            <button
              onClick={handleRejectAll}
              disabled={!operations.length || isProcessingAll}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Tout refuser
            </button>
          </div>
        </section>

        <section>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      Client
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      Articles
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      Montant total
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      Ticket
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                        Chargement des opérations...
                      </td>
                    </tr>
                  ) : operations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                        Aucune opération hors ligne en attente.
                      </td>
                    </tr>
                  ) : (
                    operations.map((operation) => {
                      const isProcessing = processingIds.includes(operation.localId);
                      const client = getSaleClient(operation);

                      return (
                        <tr
                          key={operation.localId}
                          className="transition-colors hover:bg-slate-50"
                        >
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {operation.ticket?.date || formatDate(operation.createdAt)}
                          </td>

                          <td className="px-6 py-4 text-sm font-medium text-slate-800">
                            {client?.nom_complet || "Anonyme"}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-700">
                            {getItemsCount(operation)} article(s)
                          </td>

                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            {formatPrice(operation.total || operation.ticket?.total)}
                          </td>

                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleOpenTicket(operation)}
                              className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                            >
                              <Receipt className="h-4 w-4" />
                              Ouvrir
                            </button>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleAcceptOne(operation)}
                                disabled={isProcessing || isProcessingAll}
                                className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Check className="h-4 w-4" />
                                {isProcessing ? "Envoi..." : "Valider"}
                              </button>

                              <button
                                onClick={() => handleRejectOne(operation)}
                                disabled={isProcessing || isProcessingAll}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Refuser
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {ticketData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="flex max-h-[90vh] flex-col items-center overflow-y-auto px-4 py-6">
            <div
              id="printable-ticket"
              className="w-[300px] bg-white p-6 font-mono text-black shadow-xl"
            >
              <div className="ticket-section mb-3 border-b border-dashed border-gray-300 pb-3 text-center">
                <div className="text-[18px] font-bold tracking-[2px]">
                  {ticketData.entreprise || "Entreprise"}
                </div>
                <div className="mt-1 text-[11px]">{ticketData.date}</div>
              </div>

              {ticketData.client && (
                <div className="ticket-section mb-2 border-b border-dashed border-gray-300 pb-2 text-[11px]">
                  <div className="font-bold">
                    CLIENT : {ticketData.client.nom_complet.toUpperCase()}
                  </div>
                  <div className="text-gray-500">
                    Points avant : {ticketData.client.points_fidelite || 0}
                  </div>
                  <div className="text-gray-500">
                    Points gagnés : +{Math.floor(ticketData.total)}
                  </div>
                  <div className="font-bold">
                    Nouveau solde :{" "}
                    {Number(ticketData.client.points_fidelite || 0) +
                      Math.floor(ticketData.total)}{" "}
                    pts
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
                    <div className="max-w-[200px] truncate">{item.nom || "Produit"}</div>
                    <div className="flex justify-between text-gray-600">
                      <span>
                        {Number(item.quantite || 0)} x{" "}
                        {Number(item.prix || 0).toFixed(2)} €
                      </span>
                      <span className="font-bold">
                        {(Number(item.prix || 0) * Number(item.quantite || 0)).toFixed(2)} €
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
                  <span>{(ticketData.total / 1.2).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between mb-1 text-gray-500">
                  <span>TVA (20%)</span>
                  <span>
                    {(ticketData.total - ticketData.total / 1.2).toFixed(2)} €
                  </span>
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

              {ticketData.client?.email && (
                <button
                  onClick={envoyerTicketParEmail}
                  className="rounded-full bg-emerald-500 px-6 py-3 font-bold text-white hover:bg-emerald-600"
                >
                  Envoyer par email
                </button>
              )}

              <button
                onClick={() => setTicketData(null)}
                className="rounded-full border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.message && (
        <div
          className={`fixed bottom-6 right-6 rounded-xl px-4 py-3 text-white shadow-lg ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}