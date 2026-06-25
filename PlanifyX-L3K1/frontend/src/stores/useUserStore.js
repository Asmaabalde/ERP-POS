import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUserStore = create(
  persist(
    (set) => ({
      // Données d'authentification conservées dans le store global.
      user: null,
      accessToken: null,
      refreshToken: null,

      // Met à jour l'ensemble des informations de session après connexion
      // ou après récupération complète des données utilisateur.
      setAuth: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),

      // Permet de mettre à jour uniquement les infos utilisateur
      // sans toucher aux tokens.
      setUser: (user) => set({ user }),

      // Utilisé notamment lors d'un refresh de session pour remplacer
      // les tokens sans réécrire l'objet user.
      setTokens: ({ accessToken, refreshToken }) =>
        set({
          accessToken,
          refreshToken,
        }),

      // Réinitialise complètement la session côté frontend.
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        }),
    }),
    {
      // Persiste la session dans le stockage local du navigateur
      // pour conserver l'utilisateur connecté après rechargement.
      name: "user-auth-storage",
    }
  )
);