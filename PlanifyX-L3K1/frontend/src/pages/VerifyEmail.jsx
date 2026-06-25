import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import axios from 'axios';

export function VerifyEmail() {
  const { uid, token } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios
      .get(`/api/verify-email/${uid}/${token}/`)
      .then(() => {
        setStatus('success');
        setMessage('Votre compte a été activé avec succès.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err.response?.data?.non_field_errors?.[0] ??
          err.response?.data?.detail ??
          'Lien invalide ou expiré.'
        );
      });
  }, [uid, token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="flex items-center justify-center mb-8">
          <img src="/planify-x.png" alt="PlanifyX" className="h-20" />
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">

          {status === 'loading' && (
            <>
              <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Vérification en cours...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-800 mb-2">Compte activé !</h1>
              <p className="text-gray-500 mb-6">{message}</p>
              <Link
                to="/login"
                className="inline-block w-full py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium"
              >
                Se connecter
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-800 mb-2">Lien invalide</h1>
              <p className="text-gray-500 mb-6">{message}</p>
              <Link
                to="/signup"
                className="inline-block w-full py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium"
              >
                Retour à l'inscription
              </Link>
            </>
          )}

        </div>
      </div>
    </div>
  );
}