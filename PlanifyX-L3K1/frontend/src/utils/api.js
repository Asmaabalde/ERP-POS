import { api } from "./axios";

// Accounts

export const registerUser = (userData) => api.post("/api/register/", userData);

export const loginUser = (email, password) =>
  api.post("/api/login/", { email, password });

export const getMe = () => api.get("/api/user/");

export const updateMe = (data) => api.patch("/api/user/", data);

export const refreshSession = (refreshToken) =>
  api.post("/api/token/refresh/", { refresh: refreshToken });

export const requestPasswordReset = (email) =>
  api.post("/api/forgot-password/", { email });

export const confirmPasswordReset = (uid, token, new_password) =>
  api.post("/api/reset-password/", { uid, token, new_password });

export const createEmployee = (employeeData) =>
  api.post("/api/employes/", employeeData);

export const getEmployees = () => api.get("/api/employes/");

export const updateEmployee = (id, data) =>
  api.patch(`/api/employes/${id}/`, data);

export const deleteEmployee = (id) => api.delete(`/api/employes/${id}/`);

export const getRoles = () => api.get("/api/roles/");
export const createRole = (data) => api.post("/api/roles/", data);
export const deleteRole = (id) => api.delete(`/api/roles/${id}/`);

// Products

export const getProducts = () => api.get("/api/products/");

export const getProduct = (productId) =>
  api.get(`/api/products/${productId}/`);

export const addProduct = (productData) =>
  api.post("/api/products/", productData);

export const updateProduct = (productId, productData) =>
  api.put(`/api/products/${productId}/`, productData);

export const deleteProduct = (productId) =>
  api.delete(`/api/products/${productId}/`);

// Clients

export const getClients = () => api.get("/api/clients/");

export const searchClients = (query) =>
  api.get("/api/clients/", {
    params: { search: query },
  });

export const getClientByEmail = (email) =>
  api.get(`/api/clients/?email=${email}`);

export const getClient = (id) => api.get(`/api/clients/${id}/`);

export const updateClient = (id, data) =>
  api.put(`/api/clients/${id}/`, data);

export const deleteClient = (id) => api.delete(`/api/clients/${id}/`);

export const createClient = (data) => api.post("/api/clients/", data);

export const envoyerEmailClient = (id, data) =>
  api.post(`/api/clients/${id}/envoyer-email/`, data);

// Bons

export const getClientBons = (clientId) => api.get(`/api/bons/clients/${clientId}/bons/`);

export const validatePromoCode = (code, clientId) =>
  api.get("/api/bons/valider/", {
    params: {
      code,
      client_id: clientId,
    },
  });

// Caisse

export const encaisser = (payload) =>
  api.post("/api/encaisser/", payload);

export const createSale = (saleData) => api.post("/api/encaisser/", saleData);

export const envoyerTicket = (payload) =>
  api.post("/api/encaisser/envoyer-ticket/", payload);

// Fournisseurs

export const getSuppliers = () => api.get("/api/fournisseurs/");
export const createSupplier = (data) =>
  api.post("/api/fournisseurs/", data);
export const updateSupplier = (id, data) =>
  api.put(`/api/fournisseurs/${id}/`, data);
export const deleteSupplier = (id) =>
  api.delete(`/api/fournisseurs/${id}/`);

// Catégories fournisseurs

export const getCategories = () =>
  api.get("/api/categories-fournisseurs/");
export const createCategory = (data) =>
  api.post("/api/categories-fournisseurs/", data);
export const deleteCategory = (id) =>
  api.delete(`/api/categories-fournisseurs/${id}/`);

// Commandes fournisseurs

export const getOrders = () => api.get("/api/commandes/");
export const createOrder = (data) =>
  api.post("/api/commandes/", data);
export const updateOrder = (id, data) =>
  api.put(`/api/commandes/${id}/`, data);
export const deleteOrder = (id) =>
  api.delete(`/api/commandes/${id}/`);

// Analytics

export const getAnalytics = (period = "week") =>
  api.get("/api/analytics/overview/", {
    params: { period },
  });

// Factures

export const getFactures = () => api.get("/api/historique/");

export const envoyerFactureMail = (id, email) =>
  api.post(`/api/historique/${id}/email/`, { email });