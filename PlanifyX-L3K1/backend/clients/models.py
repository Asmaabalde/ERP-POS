from django.db import models
from django.utils import timezone
from accounts.models import Entreprise


class Client(models.Model):
    entreprise = models.ForeignKey(
        Entreprise,
        on_delete=models.CASCADE,
        related_name="clients",
        null=True,
        blank=True,
    )

    # Informations essentielles (obligatoires)
    # Nom complet du client
    nom_complet = models.CharField(max_length=255)

    # Email unique pour identifier le client
    email = models.EmailField(
        unique=True,
        error_messages={
            "unique": "Cet email est déjà utilisé.",
            "invalid": "Format d'email invalide."
        }
    )

    # Infos perso (optionnelles)
    # Utiles pour les offres d'anniversaire et la segmentation simple
    date_anniversaire = models.DateField(blank=True, null=True)
    sexe = models.CharField(
        max_length=10,
        choices=[('Homme', 'Homme'), ('Femme', 'Femme'), ('Autre', 'Autre')],
        blank=True,
        null=True
    )

    # Coordonnées optionnelles permettent d'avoir un profil client plus complet
    telephone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        error_messages={
            "unique": "Ce numéro est déjà utilisé."
        }
    )
    adresse = models.CharField(max_length=255, blank=True, null=True)
    ville = models.CharField(max_length=100, blank=True, null=True)
    code_postal = models.CharField(max_length=20, blank=True, null=True)
    pays = models.CharField(max_length=100, blank=True, null=True)

    code_barre = models.CharField(max_length=50)

    # CRM basique
    # Points fidélité accumulés automatiquement lors des achats
    points_fidelite = models.IntegerField(default=0)

    # Panier moyen calculé à partir de l'historique des ventes
    panier_moyen = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Catégorie préférée (mise à jour selon les achats)
    categorie_preferee = models.CharField(max_length=255, blank=True, null=True)

    # Comportement client
    # Dernière visite en magasin (mise à jour lors d'un achat)
    derniere_visite = models.DateTimeField(blank=True, null=True, default=timezone.now)

    # Date d'inscription du client
    date_creation = models.DateTimeField(auto_now_add=True)

    # NOTE : On laisse Django gérer automatiquement le nom de la table
    # Cela évite les conflits, les erreurs de migrations et les incohérences
    # db_table supprimé volontairement

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["entreprise", "code_barre"],
                name="unique_code_barre_client_par_entreprise",
            )
        ]

    def __str__(self):
        return self.nom_complet