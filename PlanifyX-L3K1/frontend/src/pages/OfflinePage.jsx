import { Link } from "react-router";
import { WifiOff, CreditCard, RefreshCcw } from "lucide-react";
import { useUserStore } from "../stores/useUserStore";

export function OfflinePage() {
  const lastProductsSyncAt = useUserStore((state) => state.lastProductsSyncAt);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100">
            <WifiOff className="h-7 w-7 text-orange-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Vous êtes hors ligne
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Certaines parties de l’application ne sont pas disponibles sans connexion.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-6">
          <p className="text-sm text-slate-700">
            Vous pouvez continuer à utiliser le point de vente avec les produits déjà
            synchronisés sur cet appareil.
          </p>

          {lastProductsSyncAt && (
            <p className="mt-3 text-xs text-slate-500">
              Dernière synchronisation produits :{" "}
              {new Date(lastProductsSyncAt).toLocaleString("fr-FR")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/offline/pos"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-500 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Accéder au POS hors ligne
          </Link>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCcw className="h-4 w-4" />
            Réessayer
          </button>
        </div>
      </div>
    </div>
  );
}