import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle } from 'lucide-react';
import { requestPasswordReset } from '../utils/api';
import { Tooltip } from '../components/Tooltip';
import axios from 'axios';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        setError(
          err.response.data.detail ??
          err.response.data.non_field_errors?.[0] ??
          'Une erreur est survenue.'
        );
      } else {
        setError('Une erreur est survenue.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Mot de passe oublié ?</h1>
          <p className="text-gray-500">Entrez votre email pour recevoir un lien de réinitialisation</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">

          {success ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-gray-700 font-medium">Email envoyé !</p>
              <p className="text-sm text-gray-500">
                Vous recevrez un lien de réinitialisation dans quelques minutes.
              </p>
              <Link
                to="/login"
                className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-600">{error}</p>
                    {error.includes("Aucun compte") && (
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
                    <Tooltip text="Saisissez l'adresse email associée à votre compte PlanifyX." />
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="identifiant"
                      name="identifiant"
                      type="text"
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      placeholder="votre@email.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Envoi en cours...' : 'Envoyer le lien'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}