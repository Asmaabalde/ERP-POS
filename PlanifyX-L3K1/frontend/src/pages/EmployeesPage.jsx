import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  createEmployee, getEmployees, updateEmployee, deleteEmployee,
  requestPasswordReset,
} from '../utils/api';
import { useUserStore } from '../stores/useUserStore';
import {
  Search, UserPlus, Phone, Mail, MapPin,
  X, Pencil, Trash2, Tag,
} from 'lucide-react';
import { Tooltip } from '../components/Tooltip';

const EMPLOYEE_ROLES = [
  { value: 'ADMIN', label: 'Administrateur' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'VENDEUR', label: 'Vendeur' },
];

function getRoleLabel(value) {
  return EMPLOYEE_ROLES.find((role) => role.value === value)?.label || value || 'Aucun rôle assigné';
}

function parseEmployeeError(data) {
  if (typeof data.detail === 'string') return data.detail;
  if (data.email?.[0]) {
    const msg = data.email[0].toLowerCase();
    if (msg.includes('existe déjà') || msg.includes('already exists'))
      return 'Cette adresse email est déjà utilisée par un autre employé.';
    if (msg.includes('valid') || msg.includes('invalide'))
      return "L'adresse email saisie n'est pas valide.";
    return data.email[0];
  }
  if (data.telephone?.[0]) return data.telephone[0];
  if (data.prenom?.[0]) return `Prénom : ${data.prenom[0]}`;
  if (data.nom?.[0]) return `Nom : ${data.nom[0]}`;
  if (data.adresse?.[0]) return `Adresse : ${data.adresse[0]}`;
  if (data.role?.[0]) return `Rôle : ${data.role[0]}`;
  if (data.non_field_errors?.[0]) return data.non_field_errors[0];
  return "Une erreur est survenue. Vérifiez les informations saisies.";
}

function parseNetworkError(err) {
  if (axios.isAxiosError(err) && err.response?.data)
    return parseEmployeeError(err.response.data);
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error')
    return 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
  return "Une erreur inattendue est survenue. Veuillez réessayer.";
}

export function EmployeesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [employeesList, setEmployeesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [adresseSuggestions, setAdresseSuggestions] = useState([]);
  const adresseTimeout = useRef(null);
  const [adresseSuggestionsEdit, setAdresseSuggestionsEdit] = useState([]);
  const adresseTimeoutEdit = useRef(null);

  const emptyForm = {
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    role: '',
  };

  const [formData, setFormData] = useState(emptyForm);
  const [editData, setEditData] = useState(emptyForm);

  const accessToken = useUserStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    setIsLoading(true);
    getEmployees()
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        setEmployeesList(data);
      })
      .catch(() => setEmployeesList([]))
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  const filteredEmployees = employeesList.filter((emp) => {
    const matchSearch =
      emp.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRole = selectedRole === '' ? true : emp.role === selectedRole;

    return matchSearch && matchRole;
  });

  const handleAdresseSearch = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, adresse: value }));
    clearTimeout(adresseTimeout.current);

    if (value.length < 3) {
      setAdresseSuggestions([]);
      return;
    }

    adresseTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5`);
        const data = await res.json();
        setAdresseSuggestions(data.features || []);
      } catch {
        setAdresseSuggestions([]);
      }
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

    if (value.length < 3) {
      setAdresseSuggestionsEdit([]);
      return;
    }

    adresseTimeoutEdit.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5`);
        const data = await res.json();
        setAdresseSuggestionsEdit(data.features || []);
      } catch {
        setAdresseSuggestionsEdit([]);
      }
    }, 300);
  };

  const selectAdresseEdit = (feature) => {
    setEditData((prev) => ({ ...prev, adresse: feature.properties.label }));
    setAdresseSuggestionsEdit([]);
  };

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

  const openEditModal = (employee) => {
    setEditError('');
    setEditSuccess('');
    setEditData({
      prenom: employee.prenom || '',
      nom: employee.nom || '',
      email: employee.email || '',
      telephone: employee.telephone || '',
      adresse: employee.adresse || '',
      role: employee.role || '',
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditError('');
    setEditSuccess('');
    setAdresseSuggestionsEdit([]);
    setIsEditModalOpen(false);
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setIsSubmitting(true);

    try {
      const res = await createEmployee(formData);
      setEmployeesList((prev) => [...prev, res.data]);
      setCreateSuccess('Employé créé avec succès.');
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

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setIsSubmitting(true);

    try {
      const res = await updateEmployee(selectedEmployee.id, editData);
      setEmployeesList((prev) =>
        prev.map((emp) => emp.id === selectedEmployee.id ? res.data : emp)
      );
      setSelectedEmployee(res.data);
      setEditSuccess('Employé modifié avec succès.');
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

  const handleDeleteEmployee = async () => {
    setIsDeleting(true);

    try {
      await deleteEmployee(selectedEmployee.id);
      setEmployeesList((prev) => prev.filter((emp) => emp.id !== selectedEmployee.id));
      setIsDeleteConfirmOpen(false);
      setSelectedEmployee(null);
    } catch (err) {
      console.error('Erreur suppression :', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResendEmail = async (email) => {
    try {
      await requestPasswordReset(email);
      alert('Mail renvoyé avec succès.');
    } catch {
      alert("Erreur lors de l'envoi du mail.");
    }
  };

  const hasFilters = searchTerm || selectedRole;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Gestion des ressources humaines</p>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Ajouter un employé
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
                placeholder="Rechercher un employé..."
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className={`pl-9 pr-8 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-colors ${
                  selectedRole
                    ? 'border-indigo-300 text-indigo-600 bg-indigo-50'
                    : 'border-gray-200 text-gray-600 bg-gray-50'
                }`}
              >
                <option value="">Tous les rôles</option>
                {EMPLOYEE_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
          </div>

          {hasFilters && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {filteredEmployees.length} employé{filteredEmployees.length !== 1 ? 's' : ''} trouvé{filteredEmployees.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedRole('');
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
          <div className="text-center text-gray-400 py-12">Chargement des employés...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            {hasFilters ? 'Aucun employé ne correspond à votre recherche.' : 'Aucun employé trouvé.'}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                onClick={() => setSelectedEmployee(employee)}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0">
                    <span className="text-lg font-semibold text-white">
                      {employee.prenom?.[0]}{employee.nom?.[0]}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {employee.prenom} {employee.nom}
                    </h3>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${
                      employee.est_valide ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {employee.est_valide ? 'Actif' : 'En attente'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm mt-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{employee.telephone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{employee.adresse || 'Non renseignée'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 shrink-0 text-indigo-400" />
                    <span className="text-indigo-600 font-medium">
                      {getRoleLabel(employee.role)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={() => setSelectedEmployee(null)}>
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-semibold text-white">
                      {selectedEmployee.prenom?.[0]}{selectedEmployee.nom?.[0]}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedEmployee.prenom} {selectedEmployee.nom}</h2>
                    <p className="text-sm text-gray-500">{selectedEmployee.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedEmployee(null)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{selectedEmployee.telephone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{selectedEmployee.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{selectedEmployee.adresse || 'Non renseignée'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-400" />
                    <span className="text-indigo-600 font-medium text-sm">
                      {getRoleLabel(selectedEmployee.role)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-500">Statut du compte</span>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      selectedEmployee.est_valide ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {selectedEmployee.est_valide ? '✓ Compte activé' : 'En attente'}
                    </span>
                  </div>
                  {!selectedEmployee.est_valide && (
                    <button
                      onClick={() => handleResendEmail(selectedEmployee.email)}
                      className="w-full px-4 py-2 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors text-sm font-medium"
                    >
                      Renvoyer le mail d'invitation
                    </button>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => openEditModal(selectedEmployee)}
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
                  <h3 className="font-semibold text-gray-900">Supprimer l'employé</h3>
                  <p className="text-sm text-gray-500">Cette action est irréversible.</p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Voulez-vous vraiment supprimer{' '}
                <span className="font-medium text-gray-900">{selectedEmployee?.prenom} {selectedEmployee?.nom}</span>{' '}
                ? Son compte sera également supprimé.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteEmployee}
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
                  <h2 className="text-2xl font-semibold text-gray-900">Modifier l'employé</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedEmployee?.prenom} {selectedEmployee?.nom}</p>
                </div>
                <button onClick={closeEditModal} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleEditEmployee} className="p-6 space-y-6">
                {editError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{editError}</div>}
                {editSuccess && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-600 text-sm">{editSuccess}</div>}

                <EmployeeFormFields
                  data={editData}
                  onChange={handleEditChange}
                  onAdresseChange={handleAdresseSearchEdit}
                  adresseSuggestions={adresseSuggestionsEdit}
                  onSelectAdresse={selectAdresseEdit}
                  isAdmin={selectedEmployee?.role === 'ADMIN'}
                />

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
                  <h2 className="text-2xl font-semibold text-gray-900">Ajouter un employé</h2>
                  <p className="text-sm text-gray-500 mt-1">Renseignez les informations principales</p>
                </div>
                <button onClick={closeCreateModal} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleCreateEmployee} className="p-6 space-y-6">
                <input type="text" name="fake-field" style={{ display: 'none' }} />
                {createError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{createError}</div>}
                {createSuccess && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-600 text-sm">{createSuccess}</div>}

                <EmployeeFormFields
                  data={formData}
                  onChange={handleChange}
                  onAdresseChange={handleAdresseSearch}
                  adresseSuggestions={adresseSuggestions}
                  onSelectAdresse={selectAdresse}
                  isAdmin={false}
                />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button type="button" onClick={closeCreateModal} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                    Annuler
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium disabled:opacity-60">
                    {isSubmitting ? 'Création en cours...' : "Créer l'employé"}
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

function EmployeeFormFields({
  data,
  onChange,
  onAdresseChange,
  adresseSuggestions,
  onSelectAdresse,
  isAdmin,
}) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prénom <Tooltip text="Prénom de l'employé tel qu'il apparaîtra dans l'application." />
        </label>
        <input
          autoComplete="off"
          data-form-type="other"
          data-lpignore="true"
          type="text"
          name="prenom"
          value={data.prenom}
          onChange={onChange}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="ex: Marie"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nom <Tooltip text="Nom de famille de l'employé tel qu'il apparaîtra dans l'application." />
        </label>
        <input
          autoComplete="off"
          data-form-type="other"
          data-lpignore="true"
          type="text"
          name="nom"
          value={data.nom}
          onChange={onChange}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="ex: Martin"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email <Tooltip text="Adresse email professionnelle de l'employé. Elle doit être unique. Un mail d'invitation sera envoyé automatiquement." />
        </label>
        <input
          autoComplete="off"
          data-form-type="other"
          data-lpignore="true"
          type="email"
          name="email"
          value={data.email}
          onChange={onChange}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="marie.martin@email.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Téléphone <Tooltip text="Numéro de téléphone de l'employé. Format accepté : 06 12 34 56 78 ou +33 6 12 34 56 78." />
        </label>
        <input
          autoComplete="off"
          data-form-type="other"
          data-lpignore="true"
          type="text"
          name="telephone"
          value={data.telephone}
          onChange={onChange}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="06 12 34 56 78"
        />
      </div>

      <div className="md:col-span-2 relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Adresse <Tooltip text="Adresse personnelle de l'employé. Commencez à taper pour obtenir des suggestions automatiques." />
        </label>
        <input
          type="text"
          name="adresse"
          value={data.adresse}
          onChange={onAdresseChange}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="12 rue de Paris, 75001 Paris"
          autoComplete="off"
        />
        {adresseSuggestions.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {adresseSuggestions.map((feature) => (
              <li
                key={feature.properties.id}
                onMouseDown={() => onSelectAdresse(feature)}
                className="px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer border-b border-gray-100 last:border-0"
              >
                {feature.properties.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rôle <Tooltip text="Le rôle définit les permissions de l'employé dans l'application." />
        </label>
        <select
          name="role"
          value={data.role}
          onChange={onChange}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          required
        >
          <option value="">— Sélectionner un rôle —</option>
          {EMPLOYEE_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}