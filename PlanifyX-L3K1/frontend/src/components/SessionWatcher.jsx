import { useSessionExpiry } from "../hooks/useSessionExpiry";
import { SessionExpiryModal } from "./SessionExpiryModal.jsx";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

export function SessionWatcher() {
  const { isOffline } = useNetworkStatus();

  const {
    isModalOpen,
    secondsLeft,
    isRefreshingSession,
    closeModal,
    handleRefreshSession,
    handleLogout,
  } = useSessionExpiry();

  /**
   * Hors ligne, on laisse l'utilisateur continuer dans le flux offline
   * sans popup de rafraîchissement de session.
   */
  if (isOffline) {
    return null;
  }

  if (!isModalOpen || secondsLeft === null || secondsLeft <= 0) {
    return null;
  }

  return (
    <SessionExpiryModal
      isOpen={isModalOpen}
      secondsLeft={secondsLeft}
      onClose={closeModal}
      onRefresh={handleRefreshSession}
      onLogout={handleLogout}
      isRefreshing={isRefreshingSession}
    />
  );
}