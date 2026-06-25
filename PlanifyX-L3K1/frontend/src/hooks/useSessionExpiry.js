import { useEffect, useMemo, useState } from "react";
import { useUserStore } from "../stores/useUserStore";
import { refreshSession } from "../utils/api";

const SESSION_WARNING_SECONDS = 60;

const getTokenExpirationTimestamp = (token) => {
  /**
   * Lit la date d'expiration contenue dans le JWT.
   */
  if (!token) return null;

  try {
    const payloadBase64 = token.split(".")[1];
    // Le payload du JWT est dans la 2e partie du token
    const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    // On remet le format base64 standard avant décodage
    const payload = JSON.parse(atob(normalized));

    return payload?.exp ? payload.exp * 1000 : null;
    // "exp" est en secondes, donc conversion en millisecondes
  } catch (error) {
    return null;
  }
};

export function useSessionExpiry() {
  const accessToken = useUserStore((state) => state.accessToken);
  const refreshToken = useUserStore((state) => state.refreshToken);
  const setTokens = useUserStore((state) => state.setTokens);
  const logout = useUserStore((state) => state.logout);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
  const [dismissedToken, setDismissedToken] = useState(null);

  const tokenExpirationTimestamp = useMemo(() => {
    // On recalcule seulement si le token change
    return getTokenExpirationTimestamp(accessToken);
  }, [accessToken]);

  useEffect(() => {
    /**
     * Surveille le temps restant avant expiration.
     */
    if (!accessToken || !tokenExpirationTimestamp) {
      setIsModalOpen(false);
      setSecondsLeft(null);
      return;
    }

    if (!window.navigator.onLine) {
      setIsModalOpen(false);
      return;
    }
    // En mode hors ligne, on ne tente ni refresh ni logout automatique

    const updateRemainingTime = () => {
      const remainingMs = tokenExpirationTimestamp - Date.now();
      const remainingSeconds = Math.max(Math.ceil(remainingMs / 1000), 0);
      // Math.ceil évite d'afficher 0 trop tôt

      setSecondsLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        logout();
        return;
      }

      const shouldOpenModal =
        remainingSeconds <= SESSION_WARNING_SECONDS &&
        dismissedToken !== accessToken;

      if (shouldOpenModal) {
        setIsModalOpen(true);
      }
    };

    updateRemainingTime();

    const intervalId = window.setInterval(updateRemainingTime, 1000);
    // Met à jour le compteur chaque seconde

    return () => window.clearInterval(intervalId);
  }, [accessToken, tokenExpirationTimestamp, dismissedToken, logout]);

  const closeModal = () => {
    // Évite de rouvrir la modale immédiatement pour le même token
    setDismissedToken(accessToken);
    setIsModalOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsModalOpen(false);
  };

  const handleRefreshSession = async () => {
    /**
     * Prolonge la session avec le refresh token.
     */
    if (!refreshToken) {
      handleLogout();
      return;
    }

    if (!window.navigator.onLine) {
      return;
    }
    // Hors ligne, impossible de rafraîchir la session

    try {
      setIsRefreshingSession(true);

      const response = await refreshSession(refreshToken);

      const newAccessToken = response.data?.access;
      const newRefreshToken = response.data?.refresh || refreshToken;

      if (!newAccessToken) {
        throw new Error("Token d'accès manquant.");
      }

      setTokens({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });

      setDismissedToken(null);
      setIsModalOpen(false);
    } catch (error) {
      handleLogout();
    } finally {
      setIsRefreshingSession(false);
    }
  };

  return {
    isModalOpen,
    secondsLeft,
    isRefreshingSession,
    closeModal,
    handleRefreshSession,
    handleLogout,
  };
}