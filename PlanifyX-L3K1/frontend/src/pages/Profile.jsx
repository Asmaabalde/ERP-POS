import { useEffect, useRef, useState } from "react";
import {
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  Building2,
  Briefcase,
} from "lucide-react";
import { getMe, updateMe } from "../utils/api";
import { useUserStore } from "../stores/useUserStore";
import { getRoleBadgeConfig } from "../utils/functions";

function getInitials(user) {
  const prenom = user?.prenom || "";
  const nom = user?.nom || "";

  return `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase() || "US";
}

export function Profile() {
  const storeUser = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);

  const [profile, setProfile] = useState(storeUser);
  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    telephone: "",
    adresse: "",
    poste: "",
  });

  const [adresseSuggestions, setAdresseSuggestions] = useState([]);
  const adresseTimeout = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = profile?.role === "ADMIN";
  const roleBadge = getRoleBadgeConfig(profile?.role);

  useEffect(() => {
    getMe()
      .then((res) => {
        setProfile(res.data);
        setUser(res.data);
        setFormData({
          prenom: res.data.prenom || "",
          nom: res.data.nom || "",
          telephone: res.data.telephone || "",
          adresse: res.data.adresse || "",
          poste: res.data.poste || "",
        });
      })
      .catch(() => setError("Impossible de charger le profil."))
      .finally(() => setIsLoading(false));
  }, [setUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdresseSearch = (e) => {
    const value = e.target.value;

    setFormData((prev) => ({ ...prev, adresse: value }));
    clearTimeout(adresseTimeout.current);

    if (!isAdmin || value.length < 3) {
      setAdresseSuggestions([]);
      return;
    }

    adresseTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5`
        );
        const data = await res.json();
        setAdresseSuggestions(data.features || []);
      } catch {
        setAdresseSuggestions([]);
      }
    }, 300);
  };

  const selectAdresse = (feature) => {
    setFormData((prev) => ({
      ...prev,
      adresse: feature.properties.label,
    }));
    setAdresseSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAdmin) return;

    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const res = await updateMe(formData);
      setProfile(res.data);
      setUser(res.data);
      setSuccess("Profil mis à jour avec succès.");
    } catch {
      setError("Impossible de modifier le profil.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <h1 className="text-xl font-bold">Mon profil</h1>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-10">
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500">
            Chargement du profil...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="text-xl font-bold">Mon profil</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="space-y-6 px-6 py-6 mb-7">
          {!isAdmin && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Contactez un administrateur pour modifier vos informations.
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
              {success}
            </div>
          )}

          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 h-fit">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <span className="text-3xl font-semibold text-white">
                    {getInitials(profile)}
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-semibold text-slate-900">
                  {profile?.prenom} {profile?.nom}
                </h2>

                <p className="text-sm text-slate-500 mt-1">{profile?.email}</p>

                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${roleBadge.className}`}
                >
                  {roleBadge.label}
                </span>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <ProfileInfo icon={Building2} value={profile?.entreprise || "Entreprise non renseignée"} />
                <ProfileInfo icon={Briefcase} value={profile?.poste || "Poste non renseigné"} />
                <ProfileInfo icon={Phone} value={profile?.telephone || "Téléphone non renseigné"} />
                <ProfileInfo icon={MapPin} value={profile?.adresse || "Adresse non renseignée"} />
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-6"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <ProfileInput
                  label="Prénom"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  icon={User}
                />

                <ProfileInput
                  label="Nom"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  icon={User}
                />

                <ProfileInput
                  label="Email"
                  value={profile?.email || ""}
                  disabled
                  icon={Mail}
                />

                <ProfileInput
                  label="Rôle"
                  value={roleBadge.label}
                  disabled
                  icon={Shield}
                />

                <ProfileInput
                  label="Entreprise"
                  value={profile?.entreprise || ""}
                  disabled
                  icon={Building2}
                />

                <ProfileInput
                  label="Poste"
                  name="poste"
                  value={formData.poste}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  icon={Briefcase}
                />

                <ProfileInput
                  label="Téléphone"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  icon={Phone}
                />

                <div className="md:col-span-2 relative">
                  <ProfileInput
                    label="Adresse"
                    name="adresse"
                    value={formData.adresse}
                    onChange={handleAdresseSearch}
                    disabled={!isAdmin}
                    icon={MapPin}
                  />

                  {adresseSuggestions.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      {adresseSuggestions.map((feature) => (
                        <li
                          key={feature.properties.id}
                          onMouseDown={() => selectAdresse(feature)}
                          className="px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer border-b border-slate-100 last:border-0"
                        >
                          {feature.properties.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!isAdmin || isSaving}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileInfo({ icon: Icon, value }) {
  return (
    <div className="flex items-center gap-3 text-slate-600">
      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
      <span>{value}</span>
    </div>
  );
}

function ProfileInput({
  label,
  name,
  value,
  onChange,
  disabled,
  icon: Icon,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>

      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        )}

        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            disabled
              ? "bg-slate-100 text-slate-500 cursor-not-allowed"
              : "bg-white text-slate-900"
          }`}
        />
      </div>
    </div>
  );
}