export const getRoleBadgeConfig = (role) => {
  switch (role) {
    case "ADMIN":
      return {
        label: "Admin",
        className: "bg-red-100 text-red-700",
      };
    case "MANAGER":
      return {
        label: "Manager",
        className: "bg-amber-100 text-amber-700",
      };
    case "VENDEUR":
      return {
        label: "Vendeur",
        className: "bg-emerald-100 text-emerald-700",
      };
    default:
      return {
        label: role || "Utilisateur",
        className: "bg-slate-100 text-slate-700",
      };
  }
};

const managerHiddenPaths = [
  "/employes",
];

const vendeurHiddenPaths = [
  "/employes",
  "/fournisseurs",
  "/commandes-fournisseurs",
  "/analytics"
];

export const getAllowedSidebarItems = (role, items) => {
  switch (role) {
    case "ADMIN":
      return items;

    case "MANAGER":
      return items.filter(
        (item) => !managerHiddenPaths.includes(item.path)
      );

    case "VENDEUR":
      return items.filter(
        (item) => !vendeurHiddenPaths.includes(item.path)
      );

    default:
      return items.filter((item) => item.path === "/dashboard");
  }
};

export const canAccessPath = (role, pathname) => {
  if (pathname === "/dashboard" || pathname === "/profile") {
    return true;
  }

  switch (role) {
    case "ADMIN":
      return true;

    case "MANAGER":
      return !managerHiddenPaths.includes(pathname);

    case "VENDEUR":
      return !vendeurHiddenPaths.includes(pathname);

    default:
      return pathname === "/dashboard";
  }
};

export function getStockStatusTag(stock, minStock, criticalStock) {
  const stockValue = Number(stock || 0);
  const minStockValue = Number(minStock || 0);
  const criticalStockValue = Number(criticalStock || 0);

  if (stockValue === 0) {
    return {
      label: "En rupture",
      color: "bg-red-100 text-red-600",
    };
  }

  if (stockValue > minStockValue) {
    return {
      label: "Bon",
      color: "bg-green-100 text-green-700",
    };
  }

  if (stockValue >= criticalStockValue) {
    return {
      label: "Faible",
      color: "bg-yellow-100 text-yellow-700",
    };
  }

  return {
    label: "Critique",
    color: "bg-orange-100 text-orange-700",
  };
}