import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  ShoppingCart,
  Package,
  Warehouse,
  FileText,
  BarChart3,
  CreditCard,
  Truck,
  ClipboardList,
  UserCog,
  WifiOff,
  AlertTriangle,
  ArrowRight,
  Euro,
  Star,
  Activity,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getAnalytics, getProducts } from "../utils/api";
import { useUserStore } from "../stores/useUserStore";
import {
  getAllowedSidebarItems,
  canAccessPath,
  getStockStatusTag,
} from "../utils/functions";

const quickLinks = [
  {
    icon: CreditCard,
    label: "POS",
    path: "/pos",
    color: "bg-blue-500",
    desc: "Caisse rapide",
  },
  {
    icon: Package,
    label: "Produits",
    path: "/products",
    color: "bg-indigo-500",
    desc: "Catalogue",
  },
  {
    icon: Warehouse,
    label: "Stocks",
    path: "/stock",
    color: "bg-violet-500",
    desc: "Inventaire & seuils",
  },
  {
    icon: FileText,
    label: "Factures",
    path: "/factures",
    color: "bg-sky-500",
    desc: "Historique",
  },
  {
    icon: Users,
    label: "Clients",
    path: "/clients",
    color: "bg-teal-500",
    desc: "CRM & fidélité",
  },
  {
    icon: Truck,
    label: "Fournisseurs",
    path: "/fournisseurs",
    color: "bg-emerald-500",
    desc: "Gestion achats",
  },
  {
    icon: ClipboardList,
    label: "Commandes",
    path: "/commandes-fournisseurs",
    color: "bg-amber-500",
    desc: "Suivi commandes",
  },
  {
    icon: BarChart3,
    label: "Analytics",
    path: "/analytics",
    color: "bg-rose-500",
    desc: "Statistiques",
  },
  {
    icon: UserCog,
    label: "Employés",
    path: "/employes",
    color: "bg-orange-500",
    desc: "Gestion équipe",
  },
  {
    icon: WifiOff,
    label: "Hors-ligne",
    path: "/offline-operations",
    color: "bg-slate-500",
    desc: "Opérations en attente",
  },
];

function KpiCard({ icon: Icon, label, value, sub, color, loading }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${color}`}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500">{label}</p>

        {loading ? (
          <div className="mt-1 h-7 w-24 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        )}

        {sub && !loading && (
          <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
        )}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white px-4 py-2.5 text-sm shadow-lg">
        <p className="font-semibold text-slate-700">{label}</p>
        <p className="font-bold text-blue-600">
          {Number(payload[0].value).toFixed(2)} €
        </p>
      </div>
    );
  }

  return null;
}

export function Dashboard() {
  const user = useUserStore((state) => state.user);

  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [period, setPeriod] = useState("week");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const displayName =
    [user?.prenom || user?.first_name, user?.nom || user?.last_name]
      .filter(Boolean)
      .join(" ") ||
    user?.email ||
    "Utilisateur";

  const hour = new Date().getHours();

  const greeting =
    hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const periodLabels = {
    day: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
  };

  const visibleQuickLinks = useMemo(() => {
    return getAllowedSidebarItems(user?.role, quickLinks);
  }, [user?.role]);

  const canSeeTeamPerformance = ["ADMIN", "MANAGER"].includes(user?.role);
  const canOpenEmployeesModule = canAccessPath(user?.role, "/employes");

  const fetchData = async (selectedPeriod = period, silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [analyticsRes, productsRes] = await Promise.all([
        getAnalytics(selectedPeriod),
        getProducts(),
      ]);

      setAnalytics(analyticsRes.data || {});
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error("Erreur chargement dashboard :", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePeriodChange = (selectedPeriod) => {
    setPeriod(selectedPeriod);
    fetchData(selectedPeriod, true);
  };

  const lowStockProducts = useMemo(() => {
    return products
      .filter((product) => {
        const tag = getStockStatusTag(
          product.quantite_stock,
          product.seuil_minimum,
          product.seuil_critique
        );

        return tag.label !== "Bon";
      })
      .slice(0, 5);
  }, [products]);

  const topProducts = analytics?.top_products || [];
  const employees = analytics?.employees || analytics?.employee_performance || [];

  const revenue = Number(analytics?.revenue ?? 0);
  const avgBasket = Number(analytics?.average_basket ?? 0);
  const activeClients = Number(analytics?.active_clients ?? 0);
  const loyaltyRate = Number(analytics?.loyalty_rate ?? 0);

  const totalTeamRevenue = employees.reduce(
    (sum, employee) => sum + Number(employee.total || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>

            <div>
              <h1 className="text-lg font-bold leading-none text-slate-900">
                Dashboard
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                {greeting}, {displayName} 👋
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm">
              {Object.entries(periodLabels).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePeriodChange(key)}
                  className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                    period === key
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fetchData(period, true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:text-blue-600"
              title="Actualiser"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-6 pt-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            icon={Euro}
            label={`CA — ${periodLabels[period]}`}
            value={`${revenue.toFixed(2)} €`}
            sub="Toutes ventes confondues"
            color="bg-blue-500"
            loading={loading}
          />

          <KpiCard
            icon={ShoppingCart}
            label="Panier moyen"
            value={`${avgBasket.toFixed(2)} €`}
            sub="Par transaction"
            color="bg-indigo-500"
            loading={loading}
          />

          <KpiCard
            icon={Users}
            label="Clients actifs"
            value={`${activeClients}`}
            sub="Derniers 90 jours"
            color="bg-teal-500"
            loading={loading}
          />

          <KpiCard
            icon={Star}
            label="Taux fidélité"
            value={`${loyaltyRate.toFixed(2)} %`}
            sub="Clients récurrents"
            color="bg-amber-500"
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Évolution du chiffre d'affaires
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {periodLabels[period]}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </div>

            {loading ? (
              <div className="h-48 animate-pulse rounded-xl bg-slate-50" />
            ) : analytics?.sales_by_day?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={analytics.sales_by_day}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip content={<CustomTooltip />} />

                  <Area
                    type="monotone"
                    dataKey="montant"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fill="url(#caGradient)"
                    dot={{ fill: "#2563eb", strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, fill: "#2563eb" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                Aucune vente sur cette période
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Top produits</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Par quantité vendue
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                <Package className="h-4 w-4 text-indigo-600" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, index) => (
                  <div
                    key={index}
                    className="h-8 animate-pulse rounded-lg bg-slate-50"
                  />
                ))}
              </div>
            ) : topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, index) => {
                  const max = Number(topProducts[0]?.qte || 1);
                  const quantity = Number(product.qte || 0);
                  const percentage = Math.round((quantity / max) * 100);
                  const productName =
                    product.produit__nom ||
                    product.produit_nom ||
                    product.nom ||
                    "Produit";

                  const colors = [
                    "bg-blue-500",
                    "bg-indigo-500",
                    "bg-violet-500",
                    "bg-sky-400",
                    "bg-teal-400",
                  ];

                  return (
                    <div key={`${productName}-${index}`}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="max-w-[70%] truncate text-sm font-medium text-slate-700">
                          <span className="mr-1.5 text-slate-400">
                            #{index + 1}
                          </span>
                          {productName}
                        </span>

                        <span className="text-xs font-bold text-slate-500">
                          {quantity} unités
                        </span>
                      </div>

                      <div className="h-1.5 w-full rounded-full bg-slate-100">
                        <div
                          className={`h-1.5 rounded-full ${
                            colors[index] || "bg-blue-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-8 text-center text-sm text-slate-400">
                Aucune donnée
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">Alertes stock</h2>
                  <p className="text-xs text-slate-400">
                    {lowStockProducts.length} produit(s) à surveiller
                  </p>
                </div>
              </div>

              <Link
                to="/stock"
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                Voir tout <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className="h-12 animate-pulse rounded-xl bg-slate-50"
                  />
                ))}
              </div>
            ) : lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                  <Activity className="h-5 w-5 text-green-500" />
                </div>

                <p className="text-sm font-medium text-slate-700">Tout est OK !</p>
                <p className="mt-1 text-xs text-slate-400">
                  Aucune alerte de stock
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockProducts.map((product) => {
                  const tag = getStockStatusTag(
                    product.quantite_stock,
                    product.seuil_minimum,
                    product.seuil_critique
                  );

                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {product.nom}
                        </p>
                        <p className="text-xs text-slate-400">
                          {Number(product.quantite_stock || 0)} en stock
                        </p>
                      </div>

                      <span
                        className={`ml-3 flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tag.color}`}
                      >
                        {tag.label}
                      </span>
                    </div>
                  );
                })}

                <Link
                  to="/stock"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-blue-300 hover:text-blue-500"
                >
                  Gérer les stocks <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-5">
              <h2 className="font-bold text-slate-900">Accès rapide</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Naviguer vers un module
              </p>
            </div>

            {visibleQuickLinks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                Aucun module disponible pour ce rôle.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {visibleQuickLinks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-center transition-all hover:border-blue-100 hover:bg-blue-50 hover:shadow-sm"
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color} transition-transform group-hover:scale-110`}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>

                      <div>
                        <p className="text-xs font-semibold leading-tight text-slate-700 transition-colors group-hover:text-blue-700">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-tight text-slate-400">
                          {item.desc}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {canSeeTeamPerformance && employees.length > 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Performance équipe</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Top vendeurs — {periodLabels[period]}
                </p>
              </div>

              {canOpenEmployeesModule && (
                <Link
                  to="/employes"
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                >
                  Voir l'équipe <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Employé
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Ventes
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      CA Total
                    </th>
                    <th className="hidden pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">
                      Part
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {employees.map((employee, index) => {
                    const employeeName =
                      employee.vendeur ||
                      employee.user__email ||
                      employee.email ||
                      "Employé";

                    const employeeTotal = Number(employee.total || 0);
                    const employeeSales = Number(employee.ventes || 0);

                    const share =
                      totalTeamRevenue > 0
                        ? Math.round((employeeTotal / totalTeamRevenue) * 100)
                        : 0;

                    return (
                      <tr
                        key={employee.id || `${employeeName}-${index}`}
                        className="transition-colors hover:bg-slate-50"
                      >
                        <td className="py-3 font-medium text-slate-700">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                              <span className="text-[10px] font-bold text-white">
                                {employeeName?.[0]?.toUpperCase() || "?"}
                              </span>
                            </div>

                            <span className="text-sm">{employeeName}</span>
                          </div>
                        </td>

                        <td className="py-3 text-right font-semibold text-slate-700">
                          {employeeSales}
                        </td>

                        <td className="py-3 text-right font-bold text-slate-900">
                          {employeeTotal.toFixed(2)} €
                        </td>

                        <td className="hidden py-3 text-right sm:table-cell">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-slate-100">
                              <div
                                className="h-1.5 rounded-full bg-blue-500"
                                style={{ width: `${share}%` }}
                              />
                            </div>

                            <span className="w-8 text-xs text-slate-400">
                              {share}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}