/**
 * Page Analytics
 * Cette page affiche les statistiques globales de l'entreprise.
 * Les données proviennent du backend via l'API /ventes/analytics/overview/.
 */

import {useEffect, useState} from "react";
import {TrendingUp, Users, Package, Euro} from "lucide-react";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {getAnalytics} from "../utils/api";


/**
 * Palette de couleurs utilisée pour les graphiques circulaires.
 */
const COLORS = ["#0066cc", "#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe"];

export function Analytics() {
    /**
     * data : contient toutes les statistiques renvoyées par le backend.
     * Exemple : chiffre d'affaires, panier moyen, top produits, etc.
     */
    const [data, setData] = useState(null);

    /**
     * Chargement des données Analytics au montage de la page.
     * L'appel API récupère toutes les statistiques calculées côté backend.
     */
    useEffect(() => {
        getAnalytics("week")
            .then((res) => setData(res.data))
            .catch((err) => console.error("Erreur chargement analytics", err));
    }, []);


    /**
     * Affichage d'un message temporaire tant que les données ne sont pas chargées.
     */
    if (!data) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900">
                <header className="border-b border-slate-200 bg-white">
                    <div className="mx-auto max-w-7xl px-6 py-4">
                        <h1 className="text-xl font-bold">Analytics</h1>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl px-6 py-10">
                    <p className="text-center text-slate-500">Chargement des statistiques...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">

            {/* Header */}
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-7xl px-6 py-4">
                    <h1 className="text-xl font-bold">Analytics</h1>
                </div>
            </header>

            {/* Contenu principal */}
            <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">

                {/**
                 * SECTION KPI : affichage des indicateurs principaux
                 */}
                <section className="grid md:grid-cols-4 gap-6">

                    {/* KPI : Chiffre d'affaires */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Euro className="w-6 h-6 text-blue-600"/>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">CA Total</p>
                                <p className="text-2xl font-semibold">
                                    {data.revenue.toLocaleString("fr-FR")} €
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* KPI : Panier moyen */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-green-600"/>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Panier moyen</p>
                                <p className="text-2xl font-semibold">
                                    {data.average_basket.toFixed(2)} €
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* KPI : Clients actifs */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Users className="w-6 h-6 text-purple-600"/>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Clients actifs</p>
                                <p className="text-2xl font-semibold">{data.active_clients}</p>
                            </div>
                        </div>
                    </div>

                    {/* KPI : Taux fidélisation */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                                <Package className="w-6 h-6 text-orange-600"/>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Taux fidélisation</p>
                                <p className="text-2xl font-semibold">{data.loyalty_rate} %</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/**
                 * Graphique des ventes par jour
                 */}
                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-xl font-semibold mb-6">Ventes de la semaine</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height={300}>
  <LineChart data={data.sales_by_day} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>

    <defs>
      <linearGradient id="colorMontant" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
      </linearGradient>
    </defs>

    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} />
    <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />

    <Tooltip
      contentStyle={{
        backgroundColor: "white",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
      }}
      labelStyle={{ color: "#374151" }}
    />

    <Line
      type="monotone"
      dataKey="montant"
      stroke="#3b82f6"
      strokeWidth={3}
      dot={{ r: 5, fill: "#3b82f6" }}
      activeDot={{ r: 7 }}
      fill="url(#colorMontant)"
    />
  </LineChart>
</ResponsiveContainer>

                    </div>
                </section>

                {/**
                 * Top produits + Répartition par âge
                 */}
                <section className="grid lg:grid-cols-2 gap-6">

                    {/* Top produits */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                        <h3 className="text-xl font-semibold mb-6">Produits les plus vendus</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.top_products} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                                    <XAxis type="number" stroke="#64748b"/>
                                    <YAxis dataKey="produit__nom" type="category" stroke="#64748b" width={120}/>
                                    <Tooltip/>
                                    <Bar dataKey="qte" fill="#0066cc" radius={[0, 8, 8, 0]}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Répartition par âge */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                        <h3 className="text-xl font-semibold mb-6">Répartition par âge</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.age_distribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({tranche, percent}) =>
                                            `${tranche} (${(percent * 100).toFixed(0)}%)`
                                        }
                                        outerRadius={100}
                                        dataKey="count"
                                    >
                                        {data.age_distribution.map((entry, index) => (
                                            <Cell key={index} fill={COLORS[index % COLORS.length]}/>
                                        ))}
                                    </Pie>
                                    <Tooltip/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </section>

                {/**
                 * Répartition par sexe
                 */}
                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-xl font-semibold mb-6">Répartition par sexe</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.gender_distribution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                                <XAxis dataKey="sexe" stroke="#64748b"/>
                                <YAxis stroke="#64748b"/>
                                <Tooltip/>
                                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/**
                 * Performance des vendeurs
                 */}
                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-xl font-semibold mb-6">Performance des vendeurs</h3>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Vendeur</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Ventes
                                    totales
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Nombre de
                                    ventes
                                </th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Panier moyen
                                </th>
                            </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-200">
                            {data.employees.map((v, index) => {
                                const panierMoyen = v.ventes > 0 ? (v.total / v.ventes).toFixed(2) : "0.00";

                                return (
                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">
                      {v.vendeur[0].toUpperCase()}
                    </span>
                                                </div>
                                                <span className="font-medium text-slate-800">{v.vendeur}</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-right font-semibold text-slate-800">
                                            {v.total.toLocaleString("fr-FR")} €
                                        </td>

                                        <td className="px-6 py-4 text-center text-slate-700">
                                            {v.ventes}
                                        </td>

                                        <td className="px-6 py-4 text-right text-slate-800">
                                            {Number(panierMoyen).toLocaleString("fr-FR")} €
                                        </td>

                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </section>


            </main>
        </div>
    );
}
