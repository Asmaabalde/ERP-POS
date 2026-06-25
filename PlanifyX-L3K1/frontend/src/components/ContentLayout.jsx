import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { SessionWatcher } from "./SessionWatcher.jsx";
import { AppSidebar } from "./AppSidebar.jsx";
import { showToast } from "../utils/toast";

export function ContentLayout() {
  const navigate = useNavigate();

  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [sidebarCollapsedDesktop, setSidebarCollapsedDesktop] = useState(false);
  const [isOffline, setIsOffline] = useState(() => !window.navigator.onLine);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);

      showToast("Connexion perdue. Passage en mode hors ligne.", "warning");
      navigate("/offline", { replace: true });
    };

    const handleOnline = () => {
      setIsOffline(false);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50">
      <SessionWatcher />

      <AppSidebar
        sidebarOpenMobile={sidebarOpenMobile}
        setSidebarOpenMobile={setSidebarOpenMobile}
        sidebarCollapsedDesktop={sidebarCollapsedDesktop}
        setSidebarCollapsedDesktop={setSidebarCollapsedDesktop}
        isOffline={isOffline}
      />

      <main
        className={`
          min-h-screen transition-all duration-300
          ${sidebarCollapsedDesktop ? "lg:ml-[88px]" : "lg:ml-[275px]"}
        `}
      >
        <Outlet />
      </main>
    </div>
  );
}