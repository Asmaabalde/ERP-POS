import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import { showToast } from "../utils/toast";

export function PublicRoute() {
  const location = useLocation();
  const navigate = useNavigate();

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

  if (isOffline) {
    return <Navigate to="/offline" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}