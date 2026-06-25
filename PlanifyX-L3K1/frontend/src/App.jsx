import { Routes, Route } from "react-router";
import { Index } from "./pages/Index.jsx";
import { Login } from "./pages/Login.jsx";
import { Signup } from "./pages/Signup.jsx";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Products } from "./pages/Products.jsx";
import { Stock } from "./pages/Stock.jsx";
import Caisse from "./pages/Caisse.jsx";
import Factures from "./pages/Factures.jsx";
import FacturePrint from "./pages/FacturePrint.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { OfflineRoute } from "./components/OfflineRoute.jsx";
import { ContentLayout } from "./components/ContentLayout.jsx";
import { PublicRoute } from "./components/PublicRoute.jsx";
import { GlobalToast } from "./components/GlobalToast.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { Clients } from "./pages/Clients.jsx";
import { ClientDetails } from "./pages/ClientDetails.jsx";
import { EmployeesPage } from "./pages/EmployeesPage.jsx";
import { OfflinePage } from "./pages/OfflinePage.jsx";
import { OfflineOperations } from "./pages/OfflineOperations.jsx";
import {RedirectRoute} from "./components/RedirectRoute.jsx";
import {VerifyEmail} from "./pages/VerifyEmail.jsx";
import { Suppliers } from './pages/Suppliers';
import { Orders } from './pages/Orders';
import {Profile} from "./pages/Profile.jsx";
import { Analytics } from "./pages/Analytics.jsx";


export function App() {
  return (
    <>
      <GlobalToast />

      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/" element={<Index />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        <Route element={<RedirectRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:uid/:token" element={<VerifyEmail />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<ContentLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/employes" element={<EmployeesPage />} />
            <Route path="/products" element={<Products />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/pos" element={<Caisse />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetails />} />
            <Route path="/offline-operations" element={<OfflineOperations />} />
            <Route path="/fournisseurs" element={<Suppliers />} />
            <Route path="/commandes-fournisseurs" element={<Orders />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/factures" element={<Factures />} />
            <Route path="/facture/:id/print" element={<FacturePrint />} />
          </Route>
        </Route>

        <Route element={<OfflineRoute />}>
          <Route path="/offline" element={<OfflinePage />} />
          <Route element={<ContentLayout />}>
            <Route path="/offline/pos" element={<Caisse offlineMode />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}