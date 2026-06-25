import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { getClient } from "../utils/api";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  ShoppingBag,
  Send,
  Star,
  CreditCard,
} from "lucide-react";
import { Info } from "../components/Info";
import { CRMEmailModal } from "../components/CRMEmailModal";
import { openClientCardPdf } from "../utils/clientCardPdf";
import { showToast } from "../utils/toast.js";

export function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    getClient(id)
      .then((res) => setClient(res.data))
      .catch(() => setClient(null));
  }, [id]);

  if (!client) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[#1E293B] mb-2">Client introuvable</h2>
          <button
            onClick={() => navigate("/clients")}
            className="text-[#2563EB] hover:underline"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  const getInitials = (name) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase();

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatHumanDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const time = date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (diffDays === 0) {
      return `Aujourd’hui — ${time}`;
    }
    if (diffDays === 1) {
      return `Hier — ${time}`;
    }
    if (diffDays < 7) {
      return `Il y a ${diffDays} jours — ${time}`;
    }

    return (
      date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) +
      " — " +
      time
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-[#E2E8F0] px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/clients")}
            className="flex items-center gap-2 text-[#64748B] hover:text-[#1E293B]"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openClientCardPdf(client)}
              className="px-5 py-2.5 rounded-lg bg-white border border-[#CBD5E1] text-[#1E293B] hover:bg-slate-50 flex items-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Carte fidélité
            </button>

            <button
              onClick={() => setShowEmailModal(true)}
              className="px-5 py-2.5 rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              Envoyer un email
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl"
            style={{ backgroundColor: "#2563EB" }}
          >
            {getInitials(client.nom_complet)}
          </div>
          <div>
            <h1 className="text-[#1E293B] mb-1">{client.nom_complet}</h1>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
              <h3 className="text-[#1E293B] mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations personnelles
              </h3>

              <div className="space-y-4 space-x-2">
                <Info label="Email" icon={<Mail />} value={client.email} />
                <Info label="Téléphone" icon={<Phone />} value={client.telephone} />
                <Info
                  label="Date de naissance"
                  icon={<Calendar />}
                  value={formatDate(client.date_anniversaire)}
                />
                <Info label="Sexe" value={client.sexe} />
                <Info
                  label="Adresse"
                  icon={<MapPin />}
                  value={
                    client.adresse ? (
                      <>
                        {client.adresse} <br />
                        {client.code_postal} {client.ville} <br />
                        {client.pays}
                      </>
                    ) : (
                      "—"
                    )
                  }
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-6 h-6 fill-white" />
                <h3>Points de fidélité</h3>
              </div>
              <div className="text-4xl mb-2">{client.points_fidelite ?? 0}</div>
              <div className="text-sm opacity-90">
                {((client.points_fidelite ?? 0) / 100).toFixed(2)} € de réduction disponible
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
                <div className="text-[#64748B] text-sm mb-2">Total achats</div>
                <div className="text-2xl text-[#1E293B] mb-1">
                  {client.total_achats ?? 0} €
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
                <div className="text-[#64748B] text-sm mb-2">Panier moyen</div>
                <div className="text-2xl text-[#1E293B] mb-1">
                  {client.panier_moyen ?? "-"} €
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
                <div className="text-[#64748B] text-sm mb-2">Catégorie préférée</div>
                <div className="text-sm text-[#1E293B] mt-2">
                  {client.categorie_preferee || "-"}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
              <h3 className="text-[#1E293B] mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Historique des achats
              </h3>

              {client.ventes && client.ventes.length > 0 ? (
                <div className="space-y-6 max-h-[500px] overflow-y-auto">
                  {client.ventes.map((vente) => (
                    <div
                      key={vente.id}
                      className="p-4 border border-slate-200 rounded-lg shadow-sm"
                    >
                      <div className="font-semibold text-slate-800 mb-1">
                        {formatHumanDate(vente.date_vente)}
                      </div>

                      <div className="text-sm text-slate-700 mb-2">
                        {vente.lignes && vente.lignes.length > 0 ? (
                          vente.lignes
                            .map(
                              (ligne) =>
                                `${ligne.quantite}x ${ligne.produit_nom}`
                            )
                            .join(", ")
                        ) : (
                          <span className="italic text-slate-400">
                            Articles non disponibles
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-slate-900 mb-1">
                        Total : {Number(vente.total_ttc).toFixed(2)} €
                      </div>

                      <div className="text-sm text-slate-500">
                        Paiement : {vente.mode}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#64748B] text-sm">Aucun achat enregistré.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <CRMEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        client={client}
        showToast={showToast}
      />
    </div>
  );
}