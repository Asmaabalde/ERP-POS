import React, { useState } from 'react';
import { Link, useNavigate } from "react-router";
import { Building2, Mail, Lock, Check, AlertCircle, User } from 'lucide-react';
import { Tooltip } from '../components/Tooltip';
import { registerUser } from "../utils/api";
import { getErrorMessage } from "../utils/axios";

export function Signup() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    form: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: 'Les mots de passe ne correspondent pas',
        form: '',
      }));
      return;
    }

    setIsSubmitting(true);
    setErrors({ firstName: '', lastName: '', companyName: '', email: '', password: '', confirmPassword: '', form: '' });

    try {
      const registerResponse = await registerUser({
        entreprise: companyName,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });

      if (registerResponse.status === 201) {
        navigate('/login', {
          state: { message: 'Inscription réussie ! Vérifiez votre boîte mail pour activer votre compte.' },
        });
      }
    } catch (error) {
      if (error.response) {
        const { data } = error.response;
        setErrors({
          firstName: data.first_name ? data.first_name[0] : '',
          lastName: data.last_name ? data.last_name[0] : '',
          companyName: data.entreprise ? data.entreprise[0] : '',
          email: data.email ? data.email[0] : '',
          password: data.password ? data.password[0] : '',
          confirmPassword: '',
          form: data.non_field_errors ? data.non_field_errors[0] : (data.detail || ''),
        });
      } else {
        setErrors((prev) => ({ ...prev, form: getErrorMessage(error) }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img src="/planify-x.png" alt="PlanifyX" className="h-20" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Créer votre compte</h1>
          <p className="text-gray-500">Commencez votre essai gratuit aujourd'hui</p>
          <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <p className="font-medium mb-0.5">Inscription réservée aux entreprises</p>
            <p className="text-blue-600 text-xs">L'inscription des employés se fait via l'administrateur.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">

          {errors.form && (
            <div className="mb-6 p-3 bg-red-50 rounded-lg border border-red-200 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <span className="text-sm text-red-600">{errors.form}</span>
            </div>
          )}

          <p className="text-xs text-gray-400 mb-5">
            Les champs marqués d'un <span className="text-red-500 font-medium">*</span> sont obligatoires.
          </p>

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
            <input type="text" name="fake-email" style={{ display: 'none' }} />
            <input type="password" name="fake-password" style={{ display: 'none' }} />

            {/* Prénom + Nom sur deux colonnes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom
                  <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="off"
                    data-form-type="other"
                    data-lpignore="true"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`w-full pl-9 pr-3 py-3 rounded-lg border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Jean"
                    required
                    aria-required="true"
                  />
                </div>
                {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom
                  <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="off"
                    data-form-type="other"
                    data-lpignore="true"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`w-full pl-9 pr-3 py-3 rounded-lg border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Dupont"
                    required
                    aria-required="true"
                  />
                </div>
                {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
              </div>
            </div>

            {/* Entreprise */}
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'entreprise
                <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                <Tooltip text="Le nom sous lequel votre entreprise sera identifiée sur PlanifyX." />
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="company"
                  name="organization"
                  type="text"
                  autoComplete="organization"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 rounded-lg border ${errors.companyName ? 'border-red-500' : 'border-gray-300'} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Mon Entreprise"
                  required
                  aria-required="true"
                />
              </div>
              {errors.companyName && <p className="mt-1 text-sm text-red-500">{errors.companyName}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="identifiant" className="block text-sm font-medium text-gray-700 mb-2">
                Email
                <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                <Tooltip text="Votre adresse email servira d'identifiant pour vous connecter." />
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
                  className={`w-full pl-11 pr-4 py-3 rounded-lg border ${errors.email ? 'border-red-500' : 'border-gray-300'} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="exemple@domaine.com"
                  required
                  aria-required="true"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
                <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                <Tooltip text="Minimum 8 caractères, avec au moins une majuscule, un chiffre et un caractère spécial." />
              </label>
              <ul className="mb-2 space-y-1">
                {[
                  { label: '8 caractères minimum', valid: password.length >= 8 },
                  { label: '1 majuscule', valid: /[A-Z]/.test(password) },
                  { label: '1 chiffre', valid: /[0-9]/.test(password) },
                  { label: '1 caractère spécial', valid: /[!@#$%^&*()_+\-=\[\]{};:,.<>?]/.test(password) },
                ].map(({ label, valid }) => (
                  <li key={label} className={`text-xs flex items-center gap-1 ${valid ? 'text-green-500' : 'text-gray-400'}`}>
                    <span>{valid ? '✓' : '·'}</span> {label}
                  </li>
                ))}
              </ul>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  data-form-type="other"
                  data-lpignore="true"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`password-mask w-full pl-11 pr-4 py-3 rounded-lg border ${errors.password ? 'border-red-500' : 'border-gray-300'} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="••••••••"
                  required
                  aria-required="true"
                />
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
            </div>

            {/* Confirmer mot de passe */}
            <div>
              <label htmlFor="password2" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe
                <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                <Tooltip text="Saisissez à nouveau votre mot de passe pour confirmer qu'il n'y a pas d'erreur." />
              </label>
              <div className="relative">
                <Check className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password2"
                  name="password2"
                  type="password"
                  autoComplete="new-password"
                  data-form-type="other"
                  data-lpignore="true"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`password-mask w-full pl-11 pr-4 py-3 rounded-lg border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Retapez votre mot de passe"
                  required
                  aria-required="true"
                />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'En cours...' : 'Créer un compte'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Vous avez déjà un compte ?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                Se connecter
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