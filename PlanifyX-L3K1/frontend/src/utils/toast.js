export const showToast = (message, type = "success") => {
  /**
   * Déclenche un toast global n'importe où dans l'application.
   */
  window.dispatchEvent(
    new CustomEvent("app-toast", {
      detail: { message, type },
    })
  );
};