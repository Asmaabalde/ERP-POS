import { Link } from 'react-router';
import { BarChart3, Users, Package, TrendingUp } from 'lucide-react';

export function Index() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link to="/" className="flex items-center">
            <img
              src="/planify-x.png"
              alt="PlanifyX"
              className="h-10 w-auto"
            />
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
            >
              Se connecter
            </Link>

            <Link
              to="/signup"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              S'inscrire
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="px-6 pb-20 pt-20 lg:px-8 lg:pt-28">
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="text-5xl font-bold leading-tight tracking-tight text-slate-900 md:text-7xl">
              Simplifiez la gestion de votre entreprise
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-xl leading-9 text-slate-500 md:text-2xl">
              La solution ERP et POS tout-en-un pour piloter votre commerce avec
              efficacité et simplicité
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex min-w-[250px] items-center justify-center rounded-2xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
              >
                Commencer gratuitement
              </Link>

              <Link
                to="/login"
                className="inline-flex min-w-[220px] items-center justify-center rounded-2xl border-2 border-blue-600 px-8 py-4 text-lg font-semibold text-blue-600 transition hover:bg-blue-50"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 pb-24 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="mb-4 text-2xl font-bold text-slate-900">
                Gestion Clients
              </h3>
              <p className="text-lg leading-8 text-slate-500">
                CRM intégré avec historique d'achats et programme de fidélité
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="mb-4 text-2xl font-bold text-slate-900">
                Catalogue Produits
              </h3>
              <p className="text-lg leading-8 text-slate-500">
                Gestion complète des produits, variantes et stocks en temps réel
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="mb-4 text-2xl font-bold text-slate-900">
                Analytics Avancés
              </h3>
              <p className="text-lg leading-8 text-slate-500">
                Tableaux de bord et rapports pour piloter votre activité
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="mb-4 text-2xl font-bold text-slate-900">
                Point de Vente
              </h3>
              <p className="text-lg leading-8 text-slate-500">
                Caisse rapide et intuitive avec suggestions intelligentes
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 pb-24 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-gradient-to-r from-blue-700 to-blue-500 px-8 py-16 text-center shadow-xl md:px-12">
            <h2 className="text-4xl font-bold text-white md:text-6xl">
              Prêt à transformer votre gestion ?
            </h2>

            <p className="mx-auto mt-5 max-w-3xl text-xl leading-8 text-blue-100">
              Rejoignez des centaines d'entreprises qui font confiance à PlanifyX
            </p>

            <Link
              to="/signup"
              className="mt-10 inline-flex items-center justify-center rounded-2xl bg-white px-10 py-4 text-lg font-semibold text-blue-700 shadow-lg transition hover:bg-slate-100"
            >
              Créer mon compte
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-6 text-center lg:px-8">
          <img
            src="/planify-x.png"
            alt="PlanifyX"
            className="h-8 w-auto opacity-80"
          />
          <p className="text-lg text-slate-500">
            © 2026 PlanifyX. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}