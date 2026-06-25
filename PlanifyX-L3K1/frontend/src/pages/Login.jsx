import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from "react-router";
import { Mail, Lock, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Tooltip } from '../components/Tooltip';
import { loginUser, getMe } from "../utils/api";
import { getErrorMessage } from "../utils/axios";
import { useUserStore } from "../stores/useUserStore";

export function Login() {
  const setAuth = useUserStore((state) => state.setAuth);
  const setUser = useUserStore((state) => state.setUser);
  const navigate = useNavigate();
  const location = useLocation();

  const successMessage = location.state?.message;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isInactive, setIsInactive] = useState(false);
  const [isUnknownEmail, setIsUnknownEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsInactive(false);
    setIsUnknownEmail(false);
    setIsSubmitting(true);

    try {
      const response = await loginUser(email, password);

      const accessToken = response.data.access;
      const refreshToken = response.data.refresh;

      setAuth({ user: null, accessToken, refreshToken });

      const meResponse = await getMe();
      setUser(meResponse.data);

      navigate('/dashboard');
    } catch (err) {
      if (err.response) {
        const errorMessage =
          err.response.data.detail ||
          err.response.data.non_field_errors?.[0] ||
          'Email ou mot de passe incorrect.';

        setIsInactive(errorMessage.includes("activé") || errorMessage.includes("boîte mail"));
        setIsUnknownEmail(errorMessage.includes("Aucun compte"));
        setError(errorMessage);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorClass = (base) =>
    `${base} ${isInactive ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`;
  const errorIconClass = isInactive ? 'text-amber-500' : 'text-red-500';
  const errorTextClass = isInactive ? 'text-amber-700' : 'text-red-600';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img src="/planify-x.png" alt="PlanifyX" className="h-20" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Bon retour !</h1>
          <p className="text-gray-500">Connectez-vous à votre compte</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">

          {successMessage && (
            <div className="mb-6 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
              <span className="text-sm text-green-700">{successMessage}</span>
            </div>
          )}

          {error && (
            <div className={errorClass("mb-6 p-3 rounded-lg border flex gap-2")}>
              <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${errorIconClass}`} />
              <div>
                <p className={`text-sm ${errorTextClass}`}>{error}</p>
                {isInactive && (
                  <p className="text-xs text-amber-600 mt-1">
                    Vérifiez vos spams si vous ne trouvez pas l'email d'activation.
                  </p>
                )}
                {isUnknownEmail && (
                  <p className="text-xs text-red-500 mt-1">
                    Vous n'avez pas encore de compte ?{' '}
                    <Link to="/signup" className="underline font-medium">
                      Inscrivez-vous
                    </Link>
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
            <input type="text" name="fake-email" style={{ display: 'none' }} />
            <input type="password" name="fake-password" style={{ display: 'none' }} />

            <div>
              <label htmlFor="identifiant" className="block text-sm font-medium text-gray-700 mb-2">
                Email
                  <Tooltip text="Utilisez l'adresse email avec laquelle vous vous êtes inscrit et que vous avez validée par email." />
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="identifiant"
                  name="identifiant"
                  type="email"
                  autoComplete="email"
                  data-form-type="other"
                  data-lpignore="true"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 rounded-lg border ${error ? 'border-red-300' : 'border-gray-300'} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="exemple@domaine.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="password"
                  data-form-type="other"
                  data-lpignore="true"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`password-mask w-full pl-11 pr-4 py-3 rounded-lg border ${error ? 'border-red-300' : 'border-gray-300'} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Pas encore de compte ?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-500 font-medium">
                S'inscrire
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}