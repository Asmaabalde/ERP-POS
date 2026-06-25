import axios from "axios";
import { useUserStore } from "../stores/useUserStore.js";

// Instance Axios partagée dans toute l'application.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Transforme une erreur Axios en message lisible pour l'UI.
// On privilégie les messages renvoyés par l'API quand ils existent.
export const getErrorMessage = (err) => {
  const status = err?.response?.status;
  const data = err?.response?.data;

  let errMessage = `Une erreur est survenue${status ? ` (${status})` : ""}`;

  if ([400, 404, 409, 500].includes(status)) {
    errMessage =
      data?.error ||
      data?.detail ||
      JSON.stringify(data) ||
      `Une erreur est survenue (${status})`;
  }

  return errMessage;
};

// Ajoute automatiquement le JWT à chaque requête si un token existe en store.
api.interceptors.request.use(
  (config) => {
    const accessToken = useUserStore.getState().accessToken;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// En cas de 401, on considère la session comme invalide côté frontend :
// on vide le store, on nettoie l'auth par défaut et on renvoie vers /login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      const { logout } = useUserStore.getState();

      logout();
      delete api.defaults.headers.common["Authorization"];

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);