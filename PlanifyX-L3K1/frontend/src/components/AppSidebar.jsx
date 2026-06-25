import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  Package,
  Warehouse,
  ShoppingCart,
  FileText,
  BarChart3,
  CreditCard,
  UserCog,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  WifiOff,
  Truck,
  ClipboardList,
} from "lucide-react";
import { useUserStore } from "../stores/useUserStore";
import { getRoleBadgeConfig, getAllowedSidebarItems } from "../utils/functions";
import { useOfflineOperationsStore } from "../stores/useOfflineOperationsStore.js";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: CreditCard, label: "POS", path: "/pos" },
  { icon: Package, label: "Produits & Catalogue", path: "/products" },
  { icon: Warehouse, label: "Stocks", path: "/stock" },
  { icon: FileText, label: "Factures", path: "/factures" },
  { icon: Users, label: "Clients", path: "/clients" },
  { icon: WifiOff, label: "Opérations hors-ligne", path: "/offline-operations" },
  { icon: Truck, label: "Fournisseurs", path: "/fournisseurs" },
  { icon: ClipboardList, label: "Commandes fournisseurs", path: "/commandes-fournisseurs" },
  { icon: UserCog, label: "Employés", path: "/employes" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
];

const offlineMenuItems = [
  { icon: CreditCard, label: "POS", path: "/offline/pos" },
];

function getInitials(user) {
  const prenom = user?.prenom || user?.first_name || "";
  const nom = user?.nom || user?.last_name || "";

  if (prenom || nom) {
    return `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase();
  }

  return user?.email?.slice(0, 2).toUpperCase() || "US";
}

export function AppSidebar({
  sidebarOpenMobile,
  setSidebarOpenMobile,
  sidebarCollapsedDesktop,
  setSidebarCollapsedDesktop,
  isOffline = false,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const offlineOperationsCount = useOfflineOperationsStore((state) => state.offlineOperationsCount);

  const handleLogout = () => {
    // Supprime le cache du POS lors de la déconnexion
    sessionStorage.removeItem("pos-current-order");

    if (isOffline) {
      navigate("/offline", { replace: true });
      return;
    }

    logout();
    navigate("/login");
  };

  const handleProfileClick = () => {
    if (!isOffline) {
      navigate("/profile");
      handleMobileLinkClick();
    }
  };

  const handleMobileLinkClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpenMobile(false);
    }
  };

  const roleBadge = isOffline
    ? {
        label: "Hors-ligne",
        className: "bg-amber-100 text-amber-700",
      }
    : getRoleBadgeConfig(user?.role);

  const visibleMenuItems = isOffline
    ? offlineMenuItems
    : getAllowedSidebarItems(user?.role, menuItems);

  const displayName = isOffline
    ? "Anonyme"
    : [user?.prenom || user?.first_name, user?.nom || user?.last_name]
        .filter(Boolean)
        .join(" ") || user?.email || "Utilisateur";

  return (
    <>
      {sidebarOpenMobile && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpenMobile(false)}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-40 h-screen border-r border-slate-200 bg-white transition-all duration-300
          ${sidebarOpenMobile ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${sidebarCollapsedDesktop ? "lg:w-[88px]" : "w-[275px]"}
        `}
      >
        <div className="flex h-full flex-col">
          <div
            className={`flex h-[60px] box-content items-center justify-center border-b border-slate-200 transition-all duration-300 ${
              sidebarCollapsedDesktop ? "px-2" : "px-6"
            }`}
          >
            <img
              src="/planify-x.png"
              alt="PlanifyX"
              className="h-full max-h-full w-auto object-contain py-1"
            />
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-6">
            <ul className="space-y-1">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const showBadge =
                  !isOffline &&
                  item.path === "/offline-operations" &&
                  offlineOperationsCount > 0;

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={handleMobileLinkClick}
                      className={`flex items-center rounded-2xl px-4 py-3 text-[15px] font-medium transition-all ${
                        sidebarCollapsedDesktop
                          ? "justify-center lg:px-2"
                          : "gap-3"
                      } ${
                        isActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                      title={sidebarCollapsedDesktop ? item.label : undefined}
                    >
                      <div className="relative shrink-0">
                        <Icon
                          className={`h-5 w-5 ${
                            isActive ? "text-white" : "text-slate-500"
                          }`}
                        />

                        {showBadge && (
                          <span
                            className={`absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                              isActive
                                ? "bg-white text-red-600"
                                : "bg-red-600 text-white"
                            }`}
                          >
                            {offlineOperationsCount > 99 ? "99+" : offlineOperationsCount}
                          </span>
                        )}
                      </div>

                      {!sidebarCollapsedDesktop && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <button
              type="button"
              onClick={handleProfileClick}
              disabled={isOffline}
              className={`
                mb-3 w-full rounded-2xl bg-blue-50 text-left transition-all duration-300
                ${!isOffline ? "hover:bg-blue-100 cursor-pointer" : "cursor-default"}
                ${sidebarCollapsedDesktop ? "h-[84px] px-2 py-3" : "h-[84px] px-4 py-4"}
              `}
              title={sidebarCollapsedDesktop && !isOffline ? "Profil" : undefined}
            >
              <div
                className={`flex h-full items-center ${
                  sidebarCollapsedDesktop ? "justify-center" : "gap-3"
                }`}
              >
                {isOffline ? (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600">
                    <User className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600">
                    <span className="text-sm font-semibold text-white">
                      {getInitials(user)}
                    </span>
                  </div>
                )}

                {!sidebarCollapsedDesktop && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {displayName}
                    </p>

                    <div className="mt-1">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${roleBadge.className}`}
                      >
                        {roleBadge.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={handleLogout}
              className={`
                flex h-[48px] w-full items-center rounded-xl px-4 text-left text-slate-600 transition-colors
                hover:bg-slate-50 hover:text-slate-900
                ${sidebarCollapsedDesktop ? "justify-center" : "gap-3"}
              `}
              title={sidebarCollapsedDesktop ? "Déconnexion" : undefined}
            >
              <LogOut className="h-5 w-5 shrink-0 text-slate-500" />
              {!sidebarCollapsedDesktop && (
                <span className="font-medium">Déconnexion</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      <button
        onClick={() => setSidebarOpenMobile((prev) => !prev)}
        className={`
          fixed top-1/2 z-30 flex h-16 w-4 -translate-y-1/2 items-center justify-center
          border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-300
          hover:bg-slate-50 lg:hidden
          ${sidebarOpenMobile
            ? "left-[275px] rounded-r-xl border-l-0"
            : "left-0 rounded-r-xl border-l-0"
          }
        `}
        aria-label={sidebarOpenMobile ? "Fermer la sidebar" : "Ouvrir la sidebar"}
      >
        {sidebarOpenMobile ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      <button
        onClick={() => setSidebarCollapsedDesktop((prev) => !prev)}
        className={`
          fixed top-1/2 z-30 hidden h-16 w-4 -translate-y-1/2 items-center justify-center
          border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-300
          hover:bg-slate-50 lg:flex
          ${sidebarCollapsedDesktop
            ? "left-[88px] rounded-r-xl border-l-0"
            : "left-[275px] rounded-r-xl border-l-0"
          }
        `}
        aria-label={
          sidebarCollapsedDesktop ? "Déplier la sidebar" : "Rétracter la sidebar"
        }
      >
        {sidebarCollapsedDesktop ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </>
  );
}