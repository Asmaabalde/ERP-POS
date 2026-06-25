import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lock, Check } from 'lucide-react';
import { confirmPasswordReset } from '../utils/api';
import axios from 'axios';
export function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const passwordRules = [
    { label: '8 caractères minimum', valid: newPassword.length >= 8 },
    { label: '1 majuscule', valid: /[A-Z]/.test(newPassword) },
    { label: '1 chiffre', valid: /[0-9]/.test(newPassword) },
    { label: '1 caractère spécial', valid: /[!@#$%^&*()_+\-=\[\]{};:,.<>?]/.test(newPassword) },
  ];
  const isPasswordValid = passwordRules.every((r) => r.valid);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!isPasswordValid) {
      setErrors({ new_password: 'Le mot de passe ne respecte pas les critères requis.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    setIsLoading(true);
    try {
      await confirmPasswordReset(uid, token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const serverErrors = err.response.data;
        setErrors({
          new_password: serverErrors.new_password?.[0] ?? '',
          global:
            serverErrors.non_field_errors?.[0] ??
            serverErrors.detail ??
            'Une erreur est survenue.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Nouveau mot de passe</h1>
          <p className="text-gray-500">Choisissez un mot de passe sécurisé</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-gray-700 font-medium">Mot de passe mis à jour !</p>
              <p className="text-sm text-gray-500">
                Vous allez être redirigé vers la page de connexion...
              </p>
            </div>
          ) : (
            <>
              {errors.global && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {errors.global}
                </div>
              )}
              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
                {/* Honeypots pour bloquer l'autocomplétion navigateur */}
                <input type="text" name="fake-email" style={{ display: 'none' }} />
                <input type="password" name="fake-password" style={{ display: 'none' }} />
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Nouveau mot de passe
                  </label>
                  {/* Indicateurs de complexité */}
                  <ul className="mb-2 space-y-1">
                    {passwordRules.map(({ label, valid }) => (
                      <li
                        key={label}
                        className={`text-xs flex items-center gap-1 ${valid ? 'text-green-500' : 'text-gray-400'}`}
                      >
                        <span>{valid ? '✓' : '·'}</span> {label}
                      </li>
                    ))}
                  </ul>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="text"
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`password-mask w-full pl-11 pr-4 py-3 rounded-lg border bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${errors.new_password ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  {errors.new_password && (
                    <p className="mt-1 text-xs text-red-500">{errors.new_password}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Check className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="text"
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`password-mask w-full pl-11 pr-4 py-3 rounded-lg border bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${errors.confirmPassword ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
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