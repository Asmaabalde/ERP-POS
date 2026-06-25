import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import { useUserStore } from "../stores/useUserStore";
import { getProducts } from "../utils/api";
import { showToast } from "../utils/toast";
import {mapProductForOffline, saveOfflineProducts} from "../utils/offlineDb.js";

export function RedirectRoute() {
  const location = useLocation();
  const navigate = useNavigate();

  const accessToken = useUserStore((state) => state.accessToken);
  const setUser = useUserStore((state) => state.setUser);
  const logout = useUserStore((state) => state.logout);

  const [canAccess, setCanAccess] = useState(null);
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
        setCanAccess(true);
        return;
      }

      if (!window.navigator.onLine) {
        setIsOffline(true);
        setCanAccess(false);
        return;
      }

      try {
        // On teste si l'utilisateur est connecté
        // Si oui, on met à jour IndexedDB, et on passe /login
        const response = await getProducts();
        const offlineProducts = response.data.map(mapProductForOffline);
        await saveOfflineProducts(offlineProducts);
        setCanAccess(false);
      } catch (error) {
        const status = error?.response?.status;

        if (status === 401 || status === 403) {
          logout();
          setCanAccess(true);
          return;
        }

        setCanAccess(true);
      }
    };

    checkAuth();
  }, [accessToken, setUser, logout]);

  if (canAccess === null) {
    return null;
  }

  if (isOffline) {
    return <Navigate to="/offline" replace state={{ from: location.pathname }} />;
  }

  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}