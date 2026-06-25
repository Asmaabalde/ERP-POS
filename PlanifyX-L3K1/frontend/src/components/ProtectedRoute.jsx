import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import { useUserStore } from "../stores/useUserStore";
import { getProducts, getClients } from "../utils/api";
import {
  mapProductForOffline,
  saveOfflineProducts,
  mapClientForOffline,
  saveOfflineClients,
} from "../utils/offlineDb";
import { showToast } from "../utils/toast";
import { canAccessPath } from "../utils/functions";
import { useOfflineOperationsStore } from "../stores/useOfflineOperationsStore.js";

export function ProtectedRoute() {
  const location = useLocation();
  const navigate = useNavigate();

  const accessToken = useUserStore((state) => state.accessToken);
  const logout = useUserStore((state) => state.logout);
  const user = useUserStore((state) => state.user);
  const refreshOfflineOperationsCount = useOfflineOperationsStore(
    (state) => state.refreshOfflineOperationsCount
  );

  const [isAuthorized, setIsAuthorized] = useState(null);
  const [isOffline, setIsOffline] = useState(() => !window.navigator.onLine);

  const hasShownOfflineToastRef = useRef(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);

      if (!hasShownOfflineToastRef.current) {
        showToast("Connexion perdue. Passage en mode hors ligne.", "warning");
        hasShownOfflineToastRef.current = true;
      }

      navigate("/offline", {
        replace: true,
        state: { from: location.pathname },
      });
    };

    const handleOnline = () => {
      setIsOffline(false);
      hasShownOfflineToastRef.current = false;
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    const checkAuth = async () => {
      if (!accessToken) {
        setIsAuthorized(false);
        return;
      }

      if (!window.navigator.onLine) {
        setIsOffline(true);
        setIsAuthorized(true);
        return;
      }

      try {
        const [productsResponse, clientsResponse] = await Promise.all([
          getProducts(),
          getClients(),
        ]);

        const offlineProducts = productsResponse.data.map(mapProductForOffline);
        const offlineClients = clientsResponse.data.map(mapClientForOffline);

        await Promise.all([
          saveOfflineProducts(offlineProducts),
          saveOfflineClients(offlineClients),
        ]);

        setIsOffline(false);
        setIsAuthorized(true);

        // On setup de nombres de ventes effectuées hors-ligne (pour la pastille)
        await refreshOfflineOperationsCount();

      } catch (error) {
        const status = error?.response?.status;

        if (status === 401 || status === 403) {
          logout();
          setIsAuthorized(false);
          return;
        }

        setIsAuthorized(true);
      }
    };

    checkAuth();
  }, [accessToken, logout, refreshOfflineOperationsCount]);

  if (isAuthorized === null) {
    return null;
  }

  if (!accessToken || !isAuthorized) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isOffline) {
    return <Navigate to="/offline" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessPath(user?.role, location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}