import axios from 'axios';
import { useState, useEffect, useRef } from 'react';
import {
  createSupplier, getSuppliers, updateSupplier, deleteSupplier,
  getCategories, createCategory, deleteCategory,
} from '../utils/api';
import { useUserStore } from '../stores/useUserStore.js';
import { Tooltip } from '../components/Tooltip.jsx';
import {
  Search, PackagePlus, Phone, Mail, MapPin,
  X, Pencil, Trash2, Plus, Tag, Layers,
} from 'lucide-react';

function parseSupplierError(data) {
  if (typeof data.detail === 'string') return data.detail;
  if (data.email?.[0]) {
    const msg = data.email[0].toLowerCase();
    if (msg.includes('existe déjà') || msg.includes('already exists'))
      return 'Cette adresse email est déjà utilisée par un autre fournisseur.';
    if (msg.includes('valid') || msg.includes('invalide'))
      return "L'adresse email saisie n'est pas valide.";
    return data.email[0];
  }
  if (data.telephone?.[0]) {
    const msg = data.telephone[0].toLowerCase();
    if (msg.includes('existe déjà') || msg.includes('already exists'))
      return 'Ce numéro de téléphone est déjà utilisé par un autre fournisseur.';
    return data.telephone[0];
  }
  if (data.nom?.[0]) return `Nom : ${data.nom[0]}`;
  if (data.adresse?.[0]) return `Adresse : ${data.adresse[0]}`;
  if (data.categorie?.[0]) return `Catégorie : ${data.categorie[0]}`;
  if (data.non_field_errors?.[0]) return data.non_field_errors[0];
  return "Une erreur est survenue. Vérifiez les informations saisies.";
}

function parseNetworkError(err) {
  if (axios.isAxiosError(err) && err.response?.data)
    return parseSupplierError(err.response.data);
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error')
    return 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
  return "Une erreur inattendue est survenue. Veuillez réessayer.";
}

export function Suppliers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [suppliersList, setSuppliersList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategorieName, setNewCategorieName] = useState('');
  const [categorieError, setCategorieError] = useState('');
  const [categorieSuccess, setCategorieSuccess] = useState('');
  const [isCreatingCategorie, setIsCreatingCategorie] = useState(false);
  const [deletingCategorieId, setDeletingCategorieId] = useState(null);

  const [adresseSuggestions, setAdresseSuggestions] = useState([]);
  const adresseTimeout = useRef(null);
  const [adresseSuggestionsEdit, setAdresseSuggestionsEdit] = useState([]);
  const adresseTimeoutEdit = useRef(null);

  const emptyForm = { nom: '', email: '', telephone: '', adresse: '', categorie: '' };
  const [formData, setFormData] = useState(emptyForm);
  const [editData, setEditData] = useState(emptyForm);

  const accessToken = useUserStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) return;
    setIsLoading(true);
    Promise.all([
      getSuppliers().catch(() => ({ data: [] })),
      getCategories().catch(() => ({ data: [] })),
    ])
      .then(([supRes, catRes]) => {
        const normalize = (data) => Array.isArray(data) ? data : (data?.results ?? []);
        setSuppliersList(normalize(supRes.data));
        setCategoriesList(normalize(catRes.data));
      })
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  const filteredSuppliers = suppliersList.filter((sup) => {
    const matchSearch =
      sup.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sup.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCategorie = selectedCategorie === ''
      ? true
      : selectedCategorie === 'none'
        ? !sup.categorie_detail
        : sup.categorie_detail?.id === Number(selectedCategorie);

    return matchSearch && matchCategorie;
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
    setFormData(emptyForm);
    setCreateError('');
    setCreateSuccess('');
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateError('');
    setCreateSuccess('');
    setAdresseSuggestions([]);
    setIsCreateModalOpen(false);
  };

  const openEditModal = (supplier) => {
    setEditError('');
    setEditSuccess('');
    setEditData({
      nom: supplier.nom,
      email: supplier.email,
      telephone: supplier.telephone,
      adresse: supplier.adresse,
      categorie: supplier.categorie ?? '',
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditError('');
    setEditSuccess('');
    setAdresseSuggestionsEdit([]);
    setIsEditModalOpen(false);
  };

  const openCategoriesModal = () => {
    setNewCategorieName('');
    setCategorieError('');
    setCategorieSuccess('');
    setIsCategoriesModalOpen(true);
  };

  const handleAdresseSearch = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, adresse: value }));
    clearTimeout(adresseTimeout.current);
    if (value.length < 3) { setAdresseSuggestions([]); return; }
    adresseTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5`);
        const data = await res.json();
        setAdresseSuggestions(data.features || []);
      } catch { setAdresseSuggestions([]); }
    }, 300);
  };
  const selectAdresse = (feature) => {
    setFormData((prev) => ({ ...prev, adresse: feature.properties.label }));
    setAdresseSuggestions([]);
  };

  const handleAdresseSearchEdit = (e) => {
    const value = e.target.value;
    setEditData((prev) => ({ ...prev, adresse: value }));
    clearTimeout(adresseTimeoutEdit.current);
    if (value.length < 3) { setAdresseSuggestionsEdit([]); return; }
    adresseTimeoutEdit.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5`);
        const data = await res.json();
        setAdresseSuggestionsEdit(data.features || []);
      } catch { setAdresseSuggestionsEdit([]); }
    }, 300);
  };
  const selectAdresseEdit = (feature) => {
    setEditData((prev) => ({ ...prev, adresse: feature.properties.label }));
    setAdresseSuggestionsEdit([]);
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setIsSubmitting(true);
    try {
      const payload = { ...formData, categorie: formData.categorie || null };
      const res = await createSupplier(payload);
      setSuppliersList((prev) => [...prev, res.data]);
      setCreateSuccess('Fournisseur créé avec succès.');
      setTimeout(() => { setIsCreateModalOpen(false); setCreateSuccess(''); }, 1200);
    } catch (err) {
      setCreateError(parseNetworkError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSupplier = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setIsSubmitting(true);
    try {
      const payload = { ...editData, categorie: editData.categorie || null };
      const res = await updateSupplier(selectedSupplier.id, payload);
      setSuppliersList((prev) => prev.map((sup) => sup.id === selectedSupplier.id ? res.data : sup));
      setSelectedSupplier(res.data);
      setEditSuccess('Fournisseur modifié avec succès.');
      setTimeout(() => { setIsEditModalOpen(false); setEditSuccess(''); }, 1200);
    } catch (err) {
      setEditError(parseNetworkError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSupplier = async () => {
    setIsDeleting(true);
    try {
      await deleteSupplier(selectedSupplier.id);
      setSuppliersList((prev) => prev.filter((sup) => sup.id !== selectedSupplier.id));
      setIsDeleteConfirmOpen(false);
      setSelectedSupplier(null);
    } catch (err) {
      console.error('Erreur suppression :', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateCategorie = async (e) => {
    e.preventDefault();
    setCategorieError('');
    setCategorieSuccess('');
    const trimmed = newCategorieName.trim();

    if (trimmed.length < 2) {
      setCategorieError('Le nom doit contenir au moins 2 caractères.');
      return;
    }
    if (trimmed.length > 50) {
      setCategorieError('Le nom ne peut pas dépasser 50 caractères.');
      return;
    }
    if (!/^[a-zA-ZÀ-ÿ0-9 \-_']+$/.test(trimmed)) {
      setCategorieError('Le nom contient des caractères non autorisés.');
      return;
    }
    if (categoriesList.some((c) => c.nom.toLowerCase() === trimmed.toLowerCase())) {
      setCategorieError('Cette catégorie existe déjà.');
      return;
    }

    setIsCreatingCategorie(true);
    try {
      const res = await createCategory({ nom: trimmed });
      setCategoriesList((prev) => [...prev, res.data]);
      setCategorieSuccess('Catégorie créée avec succès.');
      setNewCategorieName('');
      setTimeout(() => setCategorieSuccess(''), 2000);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data;
        if (data.nom?.[0]) {
          const msg = data.nom[0].toLowerCase();
          setCategorieError(
            msg.includes('existe déjà') || msg.includes('already exists')
              ? 'Une catégorie avec ce nom existe déjà.'
              : data.nom[0]
          );
        } else if (typeof data.detail === 'string') {
          setCategorieError(data.detail);
        } else {
          setCategorieError('Une erreur est survenue lors de la création de la catégorie.');
        }
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setCategorieError('Impossible de contacter le serveur. Vérifiez votre connexion internet.');
      } else {
        setCategorieError('Une erreur inattendue est survenue. Veuillez réessayer.');
      }
    } finally {
      setIsCreatingCategorie(false);
    }
  };

  const handleDeleteCategorie = async (categorieId) => {
    setDeletingCategorieId(categorieId);
    try {
      await deleteCategory(categorieId);
      setCategoriesList((prev) => prev.filter((c) => c.id !== categorieId));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data;
        if (typeof data.detail === 'string') {
          const msg = data.detail.toLowerCase();
          setCategorieError(
            msg.includes('assigned') || msg.includes('assigné') || msg.includes('utilisé')
              ? 'Impossible de supprimer cette catégorie car elle est assignée à un ou plusieurs fournisseurs.'
              : data.detail
          );
        } else {
          setCategorieError('Impossible de supprimer cette catégorie.');
        }
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setCategorieError('Impossible de contacter le serveur. Vérifiez votre connexion internet.');
      } else {
        setCategorieError('Une erreur inattendue est survenue. Veuillez réessayer.');
      }
    } finally {
      setDeletingCategorieId(null);
    }
  };

  const hasFilters = searchTerm || selectedCategorie;

  const getInitials = (nom) => {
    const words = nom.trim().split(' ');
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return nom.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Gestion des fournisseurs</p>
          <div className="flex items-center gap-3">
            <button
              onClick={openCategoriesModal}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm font-medium"
            >
              <Layers className="w-4 h-4 text-indigo-500" />
              Gérer les catégories
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
            >
              <PackagePlus className="w-4 h-4" />
              Ajouter un fournisseur
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un fournisseur..."
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={selectedCategorie}
                onChange={(e) => setSelectedCategorie(e.target.value)}
                className={`pl-9 pr-8 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-colors ${
                  selectedCategorie
                    ? 'border-indigo-300 text-indigo-600 bg-indigo-50'
                    : 'border-gray-200 text-gray-600 bg-gray-50'
                }`}
              >
                <option value="">Toutes les catégories</option>
                <option value="none">Sans catégorie</option>
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
          </div>

          {hasFilters && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {filteredSuppliers.length} fournisseur{filteredSuppliers.length !== 1 ? 's' : ''} trouvé{filteredSuppliers.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => { setSearchTerm(''); setSelectedCategorie(''); }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Chargement des fournisseurs...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            {hasFilters ? 'Aucun fournisseur ne correspond à votre recherche.' : 'Aucun fournisseur trouvé.'}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                onClick={() => setSelectedSupplier(supplier)}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                    <span className="text-lg font-semibold text-white">
                      {getInitials(supplier.nom)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {supplier.nom}
                    </h3>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${
                      supplier.est_actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {supplier.est_actif ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm mt-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{supplier.telephone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{supplier.adresse}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 shrink-0 text-indigo-400" />
                    <span className={supplier.categorie_detail ? 'text-indigo-600 font-medium' : 'italic text-gray-400'}>
                      {supplier.categorie_detail ? supplier.categorie_detail.nom : 'Aucune catégorie'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isCategoriesModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={() => setIsCategoriesModalOpen(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Gestion des catégories</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Catégories de fournisseurs disponibles</p>
                </div>
                <button onClick={() => setIsCategoriesModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <form onSubmit={handleCreateCategorie} autoComplete="off" className="flex gap-2">
                  <input type="text" name="fake-field" style={{ display: 'none' }} />
                  <div className="flex-1 relative">
                    <div className="flex items-center mb-1">
                      <span className="text-sm text-gray-600">Nom de la catégorie</span>
                      <Tooltip text="Entre 2 et 50 caractères. Lettres, chiffres, espaces, tirets et apostrophes acceptés. Pas de doublon." />
                    </div>
                    <input
                      type="text"
                      name="categorie-nom"
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                      value={newCategorieName}
                      onChange={(e) => { setNewCategorieName(e.target.value); setCategorieError(''); }}
                      placeholder="ex: Alimentation"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingCategorie || !newCategorieName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shrink-0 self-end"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </form>

                {categorieError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{categorieError}</p>}
                {categorieSuccess && <p className="text-sm text-green-600 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">{categorieSuccess}</p>}

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {categoriesList.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Aucune catégorie créée pour le moment.</p>
                  ) : (
                    categoriesList.map((categorie) => (
                      <div key={categorie.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-indigo-400" />
                          <span className="text-sm font-medium text-gray-800">{categorie.nom}</span>
                          <span className="text-xs text-gray-400">{categorie.fournisseurs_count} fournisseur{categorie.fournisseurs_count !== 1 ? 's' : ''}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteCategorie(categorie.id)}
                          disabled={deletingCategorieId === categorie.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title={categorie.fournisseurs_count > 0 ? 'Impossible de supprimer une catégorie assignée' : 'Supprimer'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedSupplier && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={() => setSelectedSupplier(null)}>
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-semibold text-white">
                      {getInitials(selectedSupplier.nom)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedSupplier.nom}</h2>
                    <p className="text-sm text-gray-500">{selectedSupplier.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedSupplier(null)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{selectedSupplier.telephone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{selectedSupplier.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{selectedSupplier.adresse}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-400" />
                    <span className={selectedSupplier.categorie_detail ? 'text-indigo-600 font-medium text-sm' : 'italic text-gray-400 text-sm'}>
                      {selectedSupplier.categorie_detail ? selectedSupplier.categorie_detail.nom : 'Aucune catégorie'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-500">Statut</span>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      selectedSupplier.est_actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {selectedSupplier.est_actif ? '✓ Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => openEditModal(selectedSupplier)}
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
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-6" onClick={() => setIsDeleteConfirmOpen(false)}>
            <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Supprimer le fournisseur</h3>
                  <p className="text-sm text-gray-500">Cette action est irréversible.</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Voulez-vous vraiment supprimer{' '}
                <span className="font-medium text-gray-900">{selectedSupplier?.nom}</span>{'  '}
                ? Toutes les commandes associées pourraient être affectées.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteSupplier}
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-6" onClick={closeEditModal}>
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Modifier le fournisseur</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedSupplier?.nom}</p>
                </div>
                <button onClick={closeEditModal} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <form onSubmit={handleEditSupplier} autoComplete="off" className="p-6 space-y-6">
                <input type="text" name="fake-field" style={{ display: 'none' }} />
                <input type="password" name="fake-password" style={{ display: 'none' }} />
                {editError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{editError}</div>}
                {editSuccess && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-600 text-sm">{editSuccess}</div>}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du fournisseur <Tooltip text="Raison sociale ou nom commercial du fournisseur." />
                    </label>
                    <input
                      type="text"
                      name="fournisseur-nom"
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                      value={editData.nom}
                      onChange={(e) => setEditData((prev) => ({ ...prev, nom: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email <Tooltip text="Adresse email principale du fournisseur pour les communications." />
                    </label>
                    <input
                      type="text"
                      name="fournisseur-contact"
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                      inputMode="email"
                      value={editData.email}
                      onChange={(e) => setEditData((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone <Tooltip text="Numéro de téléphone du fournisseur. Format : 01 23 45 67 89 ou +33 1 23 45 67 89." />
                    </label>
                    <input
                      type="text"
                      name="fournisseur-tel"
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                      value={editData.telephone}
                      onChange={(e) => setEditData((prev) => ({ ...prev, telephone: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse <Tooltip text="Adresse du fournisseur. Commencez à taper pour obtenir des suggestions automatiques depuis la base nationale des adresses (api-adresse.data.gouv.fr)." />
                    </label>
                    <input
                      type="text"
                      name="fournisseur-adresse"
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                      value={editData.adresse}
                      onChange={handleAdresseSearchEdit}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="12 rue du Commerce, 75001 Paris"
                      required
                    />
                    {adresseSuggestionsEdit.length > 0 && (
                      <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                        {adresseSuggestionsEdit.map((feature) => (
                          <li key={feature.properties.id} onMouseDown={() => selectAdresseEdit(feature)}
                            className="px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer border-b border-gray-100 last:border-0">
                            {feature.properties.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catégorie <Tooltip text="Catégorie du fournisseur (ex: Alimentation, Matériel). Gérez les catégories via le bouton « Gérer les catégories »." />
                    </label>
                    <select
                      name="fournisseur-categorie"
                      value={editData.categorie}
                      onChange={(e) => setEditData((prev) => ({ ...prev, categorie: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">— Aucune catégorie —</option>
                      {categoriesList.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button type="button" onClick={closeEditModal} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                    Annuler
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium disabled:opacity-60">
                    {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={closeCreateModal}>
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Ajouter un fournisseur</h2>
                  <p className="text-sm text-gray-500 mt-1">Renseignez les informations du fournisseur</p>
                </div>
                <button onClick={closeCreateModal} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <form onSubmit={handleCreateSupplier} autoComplete="off" className="p-6 space-y-6">
                <input type="text" name="fake-field" style={{ display: 'none' }} />
                <input type="password" name="fake-password" style={{ display: 'none' }} />
                {createError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{createError}</div>}
                {createSuccess && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-600 text-sm">{createSuccess}</div>}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du fournisseur <Tooltip text="Raison sociale ou nom commercial du fournisseur. Doit être unique." />
                    </label>
                    <input
                      type="text"
                      name="fournisseur-nom"
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                      value={formData.nom}
                      onChange={(e) => setFormData((prev) => ({ ...prev, nom: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ex: Maison Dupont"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email <Tooltip text="Adresse email principale du fournisseur. Doit être unique." />
                    </label>
                    <input
                      type="text"
                      name="fournisseur-contact"
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                      inputMode="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="contact@fournisseur.fr"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone <Tooltip text="Numéro de téléphone du fournisseur. Format : 01 23 45 67 89 ou +33 1 23 45 67 89." />
                    </label>
                    <input
                      type="text"
                      name="fournisseur-tel"
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                      value={formData.telephone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, telephone: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="01 23 45 67 89"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse <Tooltip text="Adresse du fournisseur. Commencez à taper pour obtenir des suggestions automatiques depuis la base nationale des adresses (api-adresse.data.gouv.fr)." />
                    </label>
                    <input
                      type="text"
                      name="fournisseur-adresse"
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                      value={formData.adresse}
                      onChange={handleAdresseSearch}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="12 rue du Commerce, 75001 Paris"
                      required
                    />
                    {adresseSuggestions.length > 0 && (
                      <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                        {adresseSuggestions.map((feature) => (
                          <li key={feature.properties.id} onMouseDown={() => selectAdresse(feature)}
                            className="px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer border-b border-gray-100 last:border-0">
                            {feature.properties.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catégorie <Tooltip text="Catégorie du fournisseur. Gérez les catégories via le bouton « Gérer les catégories » en haut de la page." />
                    </label>
                    <select
                      name="fournisseur-categorie"
                      value={formData.categorie}
                      onChange={(e) => setFormData((prev) => ({ ...prev, categorie: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">— Aucune catégorie —</option>
                      {categoriesList.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button type="button" onClick={closeCreateModal} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                    Annuler
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium disabled:opacity-60">
                    {isSubmitting ? 'Création en cours...' : 'Créer le fournisseur'}
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