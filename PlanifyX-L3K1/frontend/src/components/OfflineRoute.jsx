import { Navigate, Outlet, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { showToast } from "../utils/toast";

export function OfflineRoute() {
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(() => !window.navigator.onLine);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
    };

    const handleOnline = () => {
      setIsOffline(false);

      showToast(
        "Connexion rétablie. Veuillez vous reconnecter.",
        "warning"
      );

      navigate("/", { replace: true });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [navigate]);

  if (!isOffline) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}