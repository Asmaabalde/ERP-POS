import { Modal, ModalBody, ModalHeader, ModalFooter, Button, Spinner } from "flowbite-react";

export function SessionExpiryModal({
  isOpen,
  secondsLeft,
  onClose,
  onRefresh,
  onLogout,
  isRefreshing = false,
}) {
  /**
   * Modale affichée quand le token arrive bientôt à expiration.
   * Elle permet à l'utilisateur de prolonger sa session ou de se déconnecter.
   */
  return (
    <Modal show={isOpen} onClose={onClose} popup dismissible>
      <ModalHeader />
      <ModalBody>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              Session bientôt expirée
            </h3>
          </div>

          <div className="text-sm text-slate-600 space-y-3">
            <p>
              Pour des raisons de sécurité, votre session utilisateur a une durée limitée.
            </p>

            <p>
              Votre session expirera dans{" "}
              <span className="font-semibold">
                {secondsLeft} seconde{secondsLeft > 1 ? "s" : ""}
              </span>.
            </p>

            <p>
              Vous pouvez rafraîchir votre session pour continuer à utiliser l’application
              sans être déconnecté.
            </p>
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="justify-end">
        <Button color="light" onClick={onLogout}>
          Déconnexion
        </Button>

        <Button onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing && <Spinner size="sm" className="mr-2" />}
          {isRefreshing ? "Rafraîchissement..." : "Rafraîchir la session"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}