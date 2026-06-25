import React, { useState, useEffect } from 'react';
import { getFactures, envoyerFactureMail } from '../utils/api';
import { getErrorMessage } from '../utils/axios';

const Factures = () => {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    const fetchFactures = async () => {
      try {
        const response = await getFactures();
        setFactures(response.data);
      } catch (error) {
        console.error("Erreur chargement factures :", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFactures();
  }, []);

  // fonction pour l'envoi par email
  const handleSendEmail = async () => {
    if (!emailInput) {
      setEmailStatus("Email manquant");
      return;
    }

    setEmailLoading(true);
    setEmailStatus("Envoi en cours...");

    try {
      await envoyerFactureMail(selectedFacture.id, emailInput);
      setEmailStatus("Email envoyé !");
      setEmailInput('');
    } catch (error) {
      setEmailStatus("Erreur : " + getErrorMessage(error));
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="p-6 h-full bg-gray-50 print:bg-white print:p-0">

      {/* liste de l'historique */}
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Historique des Factures</h1>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3">N° Facture</th>
                <th scope="col" className="px-6 py-3">Articles</th>
                <th scope="col" className="px-6 py-3">Total TTC</th>
                <th scope="col" className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-400">
                    Chargement...
                  </td>
                </tr>
              ) : factures.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-400">
                    Aucune facture trouvée
                  </td>
                </tr>
              ) : (
                factures.map((facture) => (
                  <tr key={facture.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      FAC-{facture.id.toString().padStart(4, '0')}
                    </td>
                    <td className="px-6 py-4">{facture.lignes.length} article(s)</td>
                    <td className="px-6 py-4 font-bold text-blue-600">{facture.total_ttc} €</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => { setSelectedFacture(facture); setEmailStatus(''); setEmailInput(''); }}
                        className="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-4 py-2"
                      >
                        Voir le détail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* modale détail facture */}
      {selectedFacture && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 print:relative print:bg-transparent print:inset-auto"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md print:shadow-none print:max-w-full print:p-0">

            {/* En-tête */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-blue-600">PlanifyX</h2>
              <p className="text-gray-500 text-sm">
                Facture n° FAC-{selectedFacture.id.toString().padStart(4, '0')}
              </p>
            </div>

            {/* liste des articles */}
            <div className="mb-6 border-t border-b py-4">
              {selectedFacture.lignes?.map((ligne, index) => (
                <div key={index} className="flex justify-between mb-2 text-sm">
                  <span className="text-gray-800">{ligne.quantite}x {ligne.produit_nom}</span>
                  <span className="text-gray-600">{ligne.prix_unitaire} €</span>
                </div>
              ))}
            </div>

            {/* total */}
            <div className="flex justify-between items-center mb-8 font-bold text-lg">
              <span>Total TTC</span>
              <span className="text-blue-600">{selectedFacture.total_ttc} €</span>
            </div>

            {/* actions */}
            <div className="print:hidden">
              <div className="flex flex-col gap-3 mb-4 border-t pt-4">
                <input
                  type="email"
                  placeholder="Email du client"
                  className="bg-gray-50 border border-gray-300 text-sm rounded-lg block w-full p-2.5"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
                <button
                  onClick={handleSendEmail}
                  disabled={emailLoading}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg font-medium transition-opacity"
                >
                  {emailLoading ? "Envoi en cours..." : "Envoyer par Email"}
                </button>
                {emailStatus && (
                  <p className={`text-sm text-center font-medium mt-1 ${
                    emailStatus.startsWith("Erreur") ? "text-red-600" :
                    emailStatus === "Email envoyé !" ? "text-green-600" :
                    "text-gray-700"
                  }`}>
                    {emailStatus}
                  </p>
                )}
              </div>

              <div className="flex justify-between gap-4 mt-6">
                <button
                  onClick={() => setSelectedFacture(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium"
                >
                  Fermer
                </button>
                <button
                  onClick={() => window.open(`/facture/${selectedFacture.id}/print`, '_blank')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
                >
                  Ouvrir le PDF
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Factures;