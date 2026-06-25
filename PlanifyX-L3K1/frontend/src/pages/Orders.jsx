import axios from 'axios';
import { useState, useEffect } from 'react';
import {
  createOrder, getOrders, updateOrder, deleteOrder,
  getSuppliers, getProducts
} from '../utils/api.js';
import { useUserStore } from '../stores/useUserStore.js';
import {
  Search, ShoppingCart, X, Pencil, Trash2, Plus, Tag,
  Building2, CalendarDays,
} from 'lucide-react';
import { Tooltip } from '../components/Tooltip.jsx';

const STATUS_CONFIG = {
  en_attente: { label: 'En attente', bg: 'bg-orange-100', text: 'text-orange-600' },
  confirmee: { label: 'Confirmée', bg: 'bg-blue-100', text: 'text-blue-600' },
  livree: { label: 'Livrée', bg: 'bg-green-100', text: 'text-green-700' },
  annulee: { label: 'Annulée', bg: 'bg-gray-100', text: 'text-gray-500' },
};

function parseOrderError(data) {
  if (typeof data.detail === 'string') return data.detail;
  if (data.fournisseur?.[0]) return `Fournisseur : ${data.fournisseur[0]}`;
  if (data.statut?.[0]) return `Statut : ${data.statut[0]}`;
  if (data.lignes?.[0]) {
    return `Lignes : ${
      typeof data.lignes[0] === 'string'
        ? data.lignes[0]
        : 'Vérifiez les articles commandés.'
    }`;
  }
  if (data.non_field_errors?.[0]) return data.non_field_errors[0];
  return 'Une erreur est survenue. Vérifiez les informations saisies.';
}

function parseNetworkError(err) {
  if (axios.isAxiosError(err) && err.response?.data) {
    return parseOrderError(err.response.data);
  }
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
  }
  return 'Une erreur inattendue est survenue. Veuillez réessayer.';
}

const emptyLigne = {
  produit: '',
  designation: '',
  quantite: 1,
  prix_unitaire: '',
};

export function Orders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatut, setSelectedStatut] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [ordersList, setOrdersList] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const emptyForm = {
    fournisseur: '',
    statut: 'en_attente',
    notes: '',
    lignes: [{ ...emptyLigne }],
  };

  const [formData, setFormData] = useState(emptyForm);
  const [editData, setEditData] = useState(emptyForm);

  const accessToken = useUserStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    setIsLoading(true);

    Promise.all([
      getOrders().catch(() => ({ data: [] })),
      getSuppliers().catch(() => ({ data: [] })),
      getProducts().catch(() => ({ data: [] })),
    ])
      .then(([ordRes, supRes, prodRes]) => {
        const normalize = (data) => Array.isArray(data) ? data : (data?.results ?? []);
        setOrdersList(normalize(ordRes.data));
        setSuppliersList(normalize(supRes.data));
        setProductsList(normalize(prodRes.data));
      })
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  const filteredOrders = ordersList.filter((ord) => {
    const supplierName = ord.fournisseur_detail?.nom ?? '';
    const matchSearch =
      supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(ord.id).includes(searchTerm) ||
      (ord.notes ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatut = selectedStatut === '' ? true : ord.statut === selectedStatut;
    return matchSearch && matchStatut;
  });

  const addLigne = (setter) =>
    setter((prev) => ({
      ...prev,
      lignes: [...prev.lignes, { ...emptyLigne }],
    }));

  const removeLigne = (setter, idx) =>
    setter((prev) => ({
      ...prev,
      lignes: prev.lignes.filter((_, i) => i !== idx),
    }));

  const updateLigne = (setter, idx, field, value) =>
    setter((prev) => {
      const lignes = [...prev.lignes];
      lignes[idx] = { ...lignes[idx], [field]: value };
      return { ...prev, lignes };
    });

  const handleProductSelect = (setter, idx, productId) => {
    const selectedProduct = productsList.find(
      (p) => String(p.id) === String(productId)
    );

    setter((prev) => {
      const lignes = [...prev.lignes];
      lignes[idx] = {
        ...lignes[idx],
        produit: productId,
        designation: selectedProduct?.nom || '',
        prix_unitaire: selectedProduct?.prix_achat_ht || '',
      };
      return { ...prev, lignes };
    });
  };

  const calcTotal = (lignes) =>
    lignes.reduce(
      (sum, l) =>
        sum + (parseFloat(l.prix_unitaire) || 0) * (parseInt(l.quantite) || 0),
      0
    );

    const buildPayload = (data) => ({
      fournisseur: data.fournisseur || null,
      statut: data.statut || 'en_attente',
      notes: data.notes || '',
      lignes: data.lignes.map((ligne) => ({
        produit: ligne.produit ? Number(ligne.produit) : null,
        designation: ligne.designation || '',
        quantite: Number(ligne.quantite),
        prix_unitaire: parseFloat(ligne.prix_unitaire),
      })),
    });
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setFormData({
      ...emptyForm,
      lignes: [{ ...emptyLigne }],
    });
    setCreateError('');
    setCreateSuccess('');
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateError('');
    setCreateSuccess('');
    setIsCreateModalOpen(false);
  };

  const openEditModal = (order) => {
    setEditError('');
    setEditSuccess('');
    setEditData({
      fournisseur: order.fournisseur ?? '',
      statut: order.statut ?? 'en_attente',
      notes: order.notes ?? '',
      lignes: order.lignes?.length
        ? order.lignes.map((l) => ({
            produit: l.produit ?? '',
            designation: l.designation ?? '',
            quantite: l.quantite ?? 1,
            prix_unitaire: l.prix_unitaire ?? '',
          }))
        : [{ ...emptyLigne }],
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditError('');
    setEditSuccess('');
    setIsEditModalOpen(false);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setIsSubmitting(true);

    try {
      const payload = buildPayload(formData);
      const res = await createOrder(payload);
      setOrdersList((prev) => [res.data, ...prev]);
      setCreateSuccess('Commande créée avec succès.');
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateSuccess('');
      }, 1200);
    } catch (err) {
      setCreateError(parseNetworkError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOrder = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setIsSubmitting(true);

    try {
      const payload = buildPayload(editData);
      const res = await updateOrder(selectedOrder.id, payload);
      setOrdersList((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? res.data : o))
      );
      setSelectedOrder(res.data);
      setEditSuccess('Commande modifiée avec succès.');
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditSuccess('');
      }, 1200);
    } catch (err) {
      setEditError(parseNetworkError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async () => {
    setIsDeleting(true);
    try {
      await deleteOrder(selectedOrder.id);
      setOrdersList((prev) => prev.filter((o) => o.id !== selectedOrder.id));
      setIsDeleteConfirmOpen(false);
      setSelectedOrder(null);
    } catch (err) {
      console.error('Erreur suppression :', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasFilters = searchTerm || selectedStatut;

  const LignesEditor = ({ data, setter }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Articles commandés</label>
        <button
          type="button"
          onClick={() => addLigne(setter)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-3 h-3" /> Ajouter un article
        </button>
      </div>

      {data.lignes.map((ligne, idx) => (
        <div
          key={idx}
          className="grid grid-cols-12 gap-2 items-end bg-gray-50 rounded-lg p-3 border border-gray-100"
        >
          <div className="col-span-5">
            {idx === 0 && (
              <label className="block text-xs text-gray-500 mb-1">Produit</label>
            )}
            <select
              value={ligne.produit}
              onChange={(e) => handleProductSelect(setter, idx, e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            >
              <option value="">— Sélectionner un produit —</option>
              {productsList.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-3">
            {idx === 0 && (
              <label className="block text-xs text-gray-500 mb-1">Quantité</label>
            )}
            <input
              type="number"
              min="1"
              value={ligne.quantite}
              onChange={(e) => updateLigne(setter, idx, 'quantite', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
          </div>

          <div className="col-span-3">
            {idx === 0 && (
              <label className="block text-xs text-gray-500 mb-1">Prix unit. (€)</label>
            )}
            <input
              type="number"
              min="0"
              step="0.01"
              value={ligne.prix_unitaire}
              onChange={(e) => updateLigne(setter, idx, 'prix_unitaire', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="0.00"
              required
            />
          </div>

          <div className="col-span-1 flex justify-center">
            {data.lignes.length > 1 && (
              <button
                type="button"
                onClick={() => removeLigne(setter, idx)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}

      {data.lignes.some((l) => l.prix_unitaire && l.quantite) && (
        <div className="flex justify-end pt-1">
          <span className="text-sm font-semibold text-gray-900">
            Total estimé : {calcTotal(data.lignes).toFixed(2)} €
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Passation de commandes fournisseurs</p>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <ShoppingCart className="w-4 h-4" />
            Nouvelle commande
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher une commande (fournisseur, n° commande...)"
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={selectedStatut}
                onChange={(e) => setSelectedStatut(e.target.value)}
                className={`pl-9 pr-8 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-colors ${
                  selectedStatut
                    ? 'border-indigo-300 text-indigo-600 bg-indigo-50'
                    : 'border-gray-200 text-gray-600 bg-gray-50'
                }`}
              >
                <option value="">Tous les statuts</option>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasFilters && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {filteredOrders.length} commande
                {filteredOrders.length !== 1 ? 's' : ''} trouvée
                {filteredOrders.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatut('');
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Chargement des commandes...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            {hasFilters
              ? 'Aucune commande ne correspond à votre recherche.'
              : 'Aucune commande trouvée.'}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((order) => {
              const status = STATUS_CONFIG[order.statut] ?? STATUS_CONFIG.en_attente;
              const total = calcTotal(order.lignes ?? []);

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        Commande #{order.id}
                      </h3>
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${status.bg} ${status.text}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mt-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Building2 className="w-4 h-4 shrink-0" />
                      <span
                        className={
                          order.fournisseur_detail
                            ? 'text-gray-700 font-medium truncate'
                            : 'italic text-gray-400'
                        }
                      >
                        {order.fournisseur_detail?.nom ?? 'Fournisseur non défini'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-500">
                      <CalendarDays className="w-4 h-4 shrink-0" />
                      <span>
                        {order.date_commande
                          ? new Date(order.date_commande).toLocaleDateString('fr-FR')
                          : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-gray-400 text-xs">
                        {(order.lignes ?? []).length} article
                        {(order.lignes ?? []).length !== 1 ? 's' : ''}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {total > 0 ? `${total.toFixed(2)} €` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedOrder && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
            onClick={() => setSelectedOrder(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Commande #{selectedOrder.id}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedOrder.fournisseur_detail?.nom ?? 'Fournisseur non défini'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Statut</span>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_CONFIG[selectedOrder.statut]?.bg} ${STATUS_CONFIG[selectedOrder.statut]?.text}`}
                    >
                      {STATUS_CONFIG[selectedOrder.statut]?.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700">
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      Commande :{' '}
                      {selectedOrder.date_commande
                        ? new Date(selectedOrder.date_commande).toLocaleDateString('fr-FR')
                        : '—'}
                    </span>
                  </div>

                  {selectedOrder.notes && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-400 mb-1">Notes</p>
                      <p className="text-sm text-gray-700">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>

                {(selectedOrder.lignes ?? []).length > 0 && (
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <div className="col-span-6">Désignation</div>
                      <div className="col-span-2 text-center">Qté</div>
                      <div className="col-span-2 text-right">P.U</div>
                      <div className="col-span-2 text-right">Total</div>
                    </div>

                    {selectedOrder.lignes.map((l, i) => (
                      <div
                        key={i}
                        className={`px-4 py-2.5 grid grid-cols-12 gap-2 text-sm ${
                          i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <div className="col-span-6 text-gray-700">{l.designation}</div>
                        <div className="col-span-2 text-center text-gray-600">{l.quantite}</div>
                        <div className="col-span-2 text-right text-gray-600">
                          {parseFloat(l.prix_unitaire).toFixed(2)} €
                        </div>
                        <div className="col-span-2 text-right font-medium text-gray-900">
                          {(l.quantite * parseFloat(l.prix_unitaire)).toFixed(2)} €
                        </div>
                      </div>
                    ))}

                    <div className="bg-gray-50 px-4 py-3 flex justify-between border-t border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">Total</span>
                      <span className="text-sm font-bold text-gray-900">
                        {calcTotal(selectedOrder.lignes).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => openEditModal(selectedOrder)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors text-sm font-medium"
                  >
                    <Pencil className="w-4 h-4" />
                    Modifier
                  </button>
                  <button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isDeleteConfirmOpen && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-6"
            onClick={() => setIsDeleteConfirmOpen(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Supprimer la commande</h3>
                  <p className="text-sm text-gray-500">Cette action est irréversible.</p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Voulez-vous vraiment supprimer la{' '}
                <span className="font-medium text-gray-900">
                  Commande #{selectedOrder?.id}
                </span>{' '}
                auprès de{' '}
                <span className="font-medium text-gray-900">
                  {selectedOrder?.fournisseur_detail?.nom ?? 'ce fournisseur'}
                </span>{' '}
                ?
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteOrder}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-60"
                >
                  {isDeleting ? 'Suppression...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isEditModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-6"
            onClick={closeEditModal}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Modifier la commande
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Commande #{selectedOrder?.id}
                  </p>
                </div>
                <button
                  onClick={closeEditModal}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleEditOrder} className="p-6 space-y-6">
                {editError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                    {editError}
                  </div>
                )}
                {editSuccess && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-600 text-sm">
                    {editSuccess}
                  </div>
                )}
                icicicicici
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fournisseur{' '}
                      <Tooltip text="Fournisseur auprès duquel la commande est passée." />
                    </label>
                    <select
                      name="fournisseur"
                      value={editData.fournisseur}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    >
                      <option value="">— Sélectionner un fournisseur —</option>
                      {suppliersList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Statut <Tooltip text="Statut actuel de la commande." />
                    </label>
                    <select
                      name="statut"
                      value={editData.statut}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>
                          {cfg.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <LignesEditor data={editData} setter={setEditData} />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={editData.notes}
                      onChange={handleEditChange}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                      placeholder="Informations complémentaires..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium disabled:opacity-60"
                  >
                    {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isCreateModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
            onClick={closeCreateModal}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Nouvelle commande
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Renseignez les informations de la commande
                  </p>
                </div>
                <button
                  onClick={closeCreateModal}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="p-6 space-y-6">
                {createError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                    {createError}
                  </div>
                )}
                {createSuccess && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-600 text-sm">
                    {createSuccess}
                  </div>
                )}


                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fournisseur{' '}
                      <Tooltip text="Sélectionnez le fournisseur auprès duquel vous passez la commande." />
                    </label>
                    <select
                      name="fournisseur"
                      value={formData.fournisseur}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    >
                      <option value="">— Sélectionner un fournisseur —</option>
                      {suppliersList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <LignesEditor data={formData} setter={setFormData} />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                      placeholder="Informations complémentaires, conditions particulières..."
                    />
                  </div>
                </div>


                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium disabled:opacity-60"
                  >
                    {isSubmitting ? 'Création en cours...' : 'Créer la commande'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}