import {useEffect, useState, useRef} from "react";
import {Search, UserPlus, Edit2, Trash2, X, Mail, Phone, Star, Filter} from "lucide-react";
import {Input} from "../components/Input.jsx";
import {useNavigate} from "react-router";
import axios from "axios";
import { getClients, createClient, updateClient, deleteClient } from "../utils/api";
import {mapClientForOffline, saveOfflineClients} from "../utils/offlineDb.js";
import {showToast} from "../utils/toast.js";


// Génère les initiales à partir du nom complet
function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Génère une couleur stable en fonction de l'index
function getInitialsColor(index) {
  const colors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#6366F1",
    "#14B8A6",
    "#E11D48",
  ];
  return colors[index % colors.length];
}


export function Clients() {

  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [adresseSuggestions, setAdresseSuggestions] = useState([]);
  const adresseTimeout = useRef(null);


  const [filters, setFilters] = useState({
    ville: "",
    sexe: "",
    points_min: "",
    points_max: "",
  });


  const clientsFiltres = clients.filter(c => {
    if (filters.ville && c.ville !== filters.ville) return false;
    if (filters.sexe && c.sexe !== filters.sexe) return false;
    if (filters.points_min && c.points_fidelite < Number(filters.points_min)) return false;
    if (filters.points_max && c.points_fidelite > Number(filters.points_max)) return false;
    return true;
  });


  const [formData, setFormData] = useState({
    nom_complet: "",
    email: "",
    date_anniversaire: "",
    telephone: "",
    adresse: "",
    ville: "",
    code_postal: "",
    pays: "",
    sexe: "",
  });

  const loadClients = async () => {
    const res = await getClients();
    setClients(res.data);

    // On enregistre également pour IndexedDB
    const offlineClients = res.data.map(mapClientForOffline);
    await saveOfflineClients(offlineClients);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const resetForm = () => {
    setFormData({
      nom_complet: "",
      email: "",
      date_anniversaire: "",
      telephone: "",
      adresse: "",
      ville: "",
      code_postal: "",
      pays: "",
      sexe: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    // Convertir les champs vides en null pour éviter les erreurs DRF
    const payload = {
      ...formData,
      date_anniversaire: formData.date_anniversaire || null,
      telephone: formData.telephone || null,
      adresse: formData.adresse || null,
      ville: formData.ville || null,
      code_postal: formData.code_postal || null,
      pays: formData.pays || null,
      sexe: formData.sexe || null,
    };

    try {
      if (editingClient) {
        await updateClient(editingClient.id, payload);
        showToast("Client modifié avec succès !");
      } else {
        await createClient(payload);
        showToast("Client créé avec succès !");
      }

      resetForm();
      setEditingClient(null);
      setIsFormOpen(false);
      loadClients();

    } catch (error) {
      console.log("Erreur API :", error.response?.data);

      if (error.response?.data) {
        // Erreurs de formulaire
        setErrors(error.response.data);
      } else {
        // Erreur globale
        showToast("Erreur lors de l’enregistrement", "error");
      }
    }
  };


  const handleEditClient = (client) => {
    setFormData({
      nom_complet: client.nom_complet,
      email: client.email,
      date_anniversaire: client.date_anniversaire || "",
      telephone: client.telephone || "",
      adresse: client.adresse || "",
      ville: client.ville || "",
      code_postal: client.code_postal || "",
      pays: client.pays || "",
      sexe: client.sexe || "",
    });
    setEditingClient(client);
    setIsFormOpen(true);
  };


  const handleDeleteClient = async (id) => {
    try {
      await deleteClient(id);
      showToast("Client supprimé avec succès !");
      setDeleteTarget(null);
      loadClients();
    } catch (error) {
      console.log("Erreur suppression :", error.response?.data);
      showToast("Erreur lors de la suppression", "error");
    }
  };


  function validateForm(data) {
    const newErrors = {};

    if (!data.nom_complet.trim()) {
      newErrors.nom_complet = "Ce champ est obligatoire.";
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(data.nom_complet)) {
      newErrors.nom_complet = "Le nom ne doit contenir que des lettres.";
    }

    if (!data.email.trim()) {
      newErrors.email = "L'email est obligatoire.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "Format d'email invalide.";
    }

    if (data.telephone && !/^\+?\d[\d ]{5,20}$/.test(data.telephone)) {
      newErrors.telephone = "Format du numéro invalide.";
    }

    if (data.date_anniversaire) {
      const dateNaissance = new Date(data.date_anniversaire);
      const aujourdhui = new Date();

      const il_y_a_150_ans = new Date();
      il_y_a_150_ans.setFullYear(aujourdhui.getFullYear() - 150);

      const il_y_a_16_ans = new Date();
      il_y_a_16_ans.setFullYear(aujourdhui.getFullYear() - 16);

      if (dateNaissance > aujourdhui) {
        newErrors.date_anniversaire = "La date de naissance ne peut pas être dans le futur.";
      } else if (dateNaissance > il_y_a_16_ans) {
        newErrors.date_anniversaire = "Le client doit avoir au moins 16 ans.";
      } else if (dateNaissance < il_y_a_150_ans) {
        newErrors.date_anniversaire = "La date de naissance semble invalide.";
      }
    }
    if (data.code_postal && !/^\d{5}$/.test(data.code_postal)) {
      newErrors.code_postal = "Le code postal doit contenir 5 chiffres.";
    }

    if (data.ville && !/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(data.ville)) {
      newErrors.ville = "La ville ne doit contenir que des lettres.";
    }

    if (data.adresse && !/^[0-9A-Za-zÀ-ÖØ-öø-ÿ' ,.-]+$/.test(data.adresse)) {
      newErrors.adresse = "L'adresse contient des caractères non autorisés (ex : @ # % _ *).";
    }

    return newErrors;
  }

  const handleAdresseSearch = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({...prev, adresse: value}));

    clearTimeout(adresseTimeout.current);

    if (value.length < 3) {
      setAdresseSuggestions([]);
      return;
    }

    adresseTimeout.current = setTimeout(async () => {
      try {
        const res = await axios.get(
            "https://api-adresse.data.gouv.fr/search/",
            {
              params: {
                q: value,
                limit: 5,
              },
            }
        );

        setAdresseSuggestions(res.data.features || []);
      } catch (error) {
        console.error(error);
        setAdresseSuggestions([]);
      }
    }, 300);
  };

  // Fonction de sélection d'une adresse
  const selectAdresse = (feature) => {
    const props = feature.properties;

    setFormData((prev) => ({
      ...prev,
      adresse: props.name || "",
      code_postal: props.postcode || "",
      ville: props.city || props.town || props.village || "",
      pays: "France",
    }));

    setAdresseSuggestions([]);
  };


  return (
      <div className="min-h-screen bg-slate-50 text-slate-900">

        {/* header */}
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <h1 className="text-xl font-bold">Gestion des Clients</h1>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-10">

          {/* ajout client */}
          <section className="flex items-center gap-3 mb-8">
            <button
                onClick={() => setIsFormOpen(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 ml-auto cursor-pointer flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5"/>
              Ajouter un client
            </button>
          </section>

          {/* Barre recherche*/}
          <section
              className="mb-3 flex items-center justify-between border border-slate-300 shadow-sm bg-white rounded-xl px-3 py-4">
            <div className="relative flex-grow mr-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"/>
              <input
                  type="text"
                  placeholder="Rechercher un client..."
                  className="bg-white border border-slate-300 shadow-sm pl-10 pr-4 py-2 rounded-xl w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Bouton filtres */}
            <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer border 
      ${isFilterOpen
                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                }`}
            >
              <Filter className="h-4 w-4"/>
              Filtres
            </button>
          </section>


          {/* Filtre client*/}
          {isFilterOpen && (
              <section className="mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold mb-3">Filtres avancés</h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                  <select
                      className="border border-slate-300 px-3 py-2 rounded-xl"
                      value={filters.ville}
                      onChange={(e) => setFilters({...filters, ville: e.target.value})}
                  >
                    <option value="">Toutes les villes</option>
                    {[...new Set(clients.map(c => c.ville).filter(Boolean))].map(v => (
                        <option key={v} value={v}>{v}</option>
                    ))}
                  </select>

                  <select
                      className="border border-slate-300 px-3 py-2 rounded-xl"
                      value={filters.sexe}
                      onChange={(e) => setFilters({...filters, sexe: e.target.value})}
                  >
                    <option value="">Tous les sexes</option>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                    <option value="Autre">Autre</option>
                  </select>

                  <input
                      type="number"
                      placeholder="Points min"
                      className="border border-slate-300 px-3 py-2 rounded-xl"
                      value={filters.points_min}
                      onChange={(e) => setFilters({...filters, points_min: e.target.value})}
                  />

                  <input
                      type="number"
                      placeholder="Points max"
                      className="border border-slate-300 px-3 py-2 rounded-xl"
                      value={filters.points_max}
                      onChange={(e) => setFilters({...filters, points_max: e.target.value})}
                  />

                </div>

                <button
                    className="mt-4 text-blue-600 underline"
                    onClick={() => setFilters({
                      ville: "",
                      sexe: "",
                      points_min: "",
                      points_max: ""
                    })}
                >
                  Réinitialiser
                </button>
              </section>
          )}


          {/* Grid clienys */}
          <section>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
              {clientsFiltres.map((client, index) => (
                  <div
                      key={client.id}
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group p-6"
                  >
                    {/* Header avec initiales */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                            style={{backgroundColor: getInitialsColor(index)}}
                        >
                          {getInitials(client.nom_complet)}
                        </div>

                        <div>
                          <h3 className="text-slate-800 font-semibold">
                            {client.nom_complet}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Mail className="w-4 h-4"/>
                        <span className="text-sm truncate">{client.email}</span>
                      </div>

                      {client.telephone && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Phone className="w-4 h-4"/>
                            <span className="text-sm">{client.telephone}</span>
                          </div>
                      )}

                      <div className="flex items-center gap-2 text-slate-500">
                        <Star className="w-4 h-4 fill-yellow-200 text-yellow-500"/>
                        <span className="text-sm">{client.points_fidelite} points de fidélité</span>
                      </div>

                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                      <div>
                        <div className="text-slate-500 text-sm mb-1">Total achats</div>
                        <div className="text-slate-800 font-medium">
                          {client.total_achats || 0} €
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500 text-sm mb-1">Panier moyen</div>
                        <div className="text-slate-800 font-medium">
                          {client.panier_moyen} €
                        </div>
                      </div>
                    </div>

                    {/* Boutons */}
                    <div className="flex gap-2 pt-4">
                      <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClient(client);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Edit2 className="w-4 h-4"/>
                        Modifier
                      </button>

                      <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(client);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4"/>
                        Supprimer
                      </button>
                    </div>
                  </div>
              ))}
            </div>
          </section>
        </main>

        {/* modal pour la gestion de l'ajout ou de la modif d'un client */}
        {isFormOpen && (
            <div
                className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                  setEditingClient(null);
                  setErrors({});
                }}
            >
              <form
                  onSubmit={handleSubmit}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white w-full max-w-2xl rounded-xl p-7 shadow-xl"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    {editingClient ? "Modifier le client" : "Ajouter un client"}
                  </h2>
                  <button
                      onClick={() => {
                        setIsFormOpen(false);
                        resetForm();
                        setEditingClient(null);
                        setErrors({});
                      }}
                      type="button"
                      className="p-2 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5"/>
                  </button>
                </div>

                {/* Formulaire */}
                <div className="space-y-4">

                  <Input
                      label="Nom complet"
                      id="nom_complet"
                      value={formData.nom_complet}
                      onChange={(e) =>
                          setFormData({...formData, nom_complet: e.target.value})
                      }
                      required
                      placeholder="Entrez le nom complet"
                      error={errors.nom_complet}
                  />

                  <Input
                      label="Email"
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                          setFormData({...formData, email: e.target.value})
                      }
                      required
                      placeholder="exemple@email.com"
                      error={errors.email}
                  />

                  <Input
                      label="Date d'anniversaire"
                      type="date"
                      id="date_anniversaire"
                      value={formData.date_anniversaire}
                      onChange={(e) =>
                          setFormData({...formData, date_anniversaire: e.target.value})
                      }
                      error={errors.date_anniversaire}
                  />

                  {/* Téléphone + Sexe */}
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Téléphone"
                        id="telephone"
                        value={formData.telephone}
                        onChange={(e) =>
                            setFormData({...formData, telephone: e.target.value})
                        }
                        placeholder="+33 688 38 98 27"
                        error={errors.telephone}
                    />

                    <div>
                      <label className="block text-sm font-medium mb-1">Sexe</label>
                      <select
                          className="w-full border border-slate-300 px-4 py-2 rounded-xl"
                          value={formData.sexe}
                          onChange={(e) =>
                              setFormData({...formData, sexe: e.target.value})
                          }
                      >
                        <option value="">Sélectionner</option>
                        <option value="Homme">Homme</option>
                        <option value="Femme">Femme</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                  </div>

                  {/* Adresse avec autocomplétion */}
                  <div className="relative">
                    <Input
                        label="Adresse"
                        id="adresse"
                        value={formData.adresse}
                        onChange={handleAdresseSearch}
                        placeholder="123 Rue de la Paix"
                        error={errors.adresse}
                    />

                    {adresseSuggestions.length > 0 && (
                        <div
                            className="absolute z-50 bg-white border border-slate-300 rounded-xl shadow-md w-full mt-1 max-h-48 overflow-auto">
                          {adresseSuggestions.map((feature) => (
                              <div
                                  key={feature.properties.id}
                                  onClick={() => selectAdresse(feature)}
                                  className="px-4 py-2 cursor-pointer hover:bg-slate-100 text-sm"
                              >
                                {feature.properties.label}
                              </div>
                          ))}
                        </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Ville"
                        id="ville"
                        value={formData.ville}
                        onChange={(e) =>
                            setFormData({...formData, ville: e.target.value})
                        }
                        placeholder="Paris"
                        error={errors.ville}
                    />

                    <Input
                        label="Code postal"
                        id="code_postal"
                        value={formData.code_postal}
                        onChange={(e) =>
                            setFormData({...formData, code_postal: e.target.value})
                        }
                        placeholder="75001"
                        error={errors.code_postal}
                    />
                  </div>

                  <Input
                      label="Pays"
                      id="pays"
                      value={formData.pays}
                      onChange={(e) =>
                          setFormData({...formData, pays: e.target.value})
                      }
                      placeholder="France"
                  />
                </div>


                {/* Boutons */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                      type="button"
                      onClick={() => {
                        setIsFormOpen(false);
                        resetForm();
                        setEditingClient(null);
                        setErrors({});
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100"
                  >
                    Annuler
                  </button>

                  <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {editingClient ? "Modifier" : "Ajouter"}
                  </button>
                </div>
              </form>
            </div>
        )}


        {/* Modal suppression */}
        {deleteTarget && (
            <div
                className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
                onClick={() => setDeleteTarget(null)}
            >
              <div
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl"
              >
                <h3 className="text-lg font-semibold mb-2">Supprimer le client</h3>
                <p className="text-slate-600 mb-6">
                  Voulez-vous vraiment supprimer{" "}
                  <strong>{deleteTarget.nom_complet}</strong> ?
                </p>

                <div className="flex justify-end gap-3">
                  <button
                      onClick={() => setDeleteTarget(null)}
                      className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100"
                  >
                    Annuler
                  </button>

                  <button
                      onClick={() => handleDeleteClient(deleteTarget.id)}
                      className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
        )}

      </div>
  );
}