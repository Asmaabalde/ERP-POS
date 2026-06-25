import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const FacturePrint = () => {
  const { id } = useParams(); 
  const [facture, setFacture] = useState(null);

  useEffect(() => {
    const fetchFacture = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/historique/');
        if (response.ok) {
          const data = await response.json();
          // recup de la bonne facture via l'id
          const target = data.find(f => f.id.toString() === id?.toString());
          setFacture(target);
        }
      } catch (error) {
        console.error("erreur rzo :", error);
      }
    };
    fetchFacture();
  }, [id]);

  if (!facture) return <div className="p-10 text-center font-bold text-gray-500">chargement...</div>;

  return (
    <div className="bg-white p-10 max-w-3xl mx-auto my-10 border shadow-sm print:shadow-none print:border-none print:m-0 print:p-0">
      
      {/* header */}
      <div className="flex justify-between items-start border-b pb-8 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-blue-600 mb-2">PlanifyX</h1>
          <p className="text-gray-500 text-sm">Votre boutique de référence</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-800">FACTURE</h2>
          <p className="text-gray-600 font-medium mt-1">N° FAC-{facture.id.toString().padStart(4, '0')}</p>
        </div>
      </div>

      {/* liste articles */}
      <table className="w-full text-left mb-8">
        <thead>
          <tr className="border-b-2 border-gray-800 text-gray-800">
            <th className="py-3 font-bold">Description</th>
            <th className="py-3 font-bold text-center">Quantité</th>
            <th className="py-3 font-bold text-right">Prix Unitaire</th>
            <th className="py-3 font-bold text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {facture.lignes?.map((ligne, index) => (
            <tr key={index} className="border-b">
              <td className="py-4 text-gray-800">{ligne.produit_nom}</td>
              <td className="py-4 text-center text-gray-600">{ligne.quantite}</td>
              <td className="py-4 text-right text-gray-600">{ligne.prix_unitaire} €</td>
              <td className="py-4 text-right font-medium text-gray-800">
                {(ligne.quantite * parseFloat(ligne.prix_unitaire || 0)).toFixed(2)} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* total */}
      <div className="flex justify-end">
        <div className="w-1/2 bg-gray-50 p-6 rounded-lg">
          <div className="flex justify-between items-center text-xl font-bold text-gray-900">
            <span>TOTAL TTC :</span>
            <span className="text-blue-600">{facture.total_ttc} €</span>
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="mt-16 text-center text-gray-400 text-sm border-t pt-8">
        Merci de votre confiance. <br/>
        PlanifyX ERP - Document généré automatiquement.
      </div>
    </div>
  );
};

export default FacturePrint;