from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from clients.models import Client


class BonReduction(models.Model):
    # Code du bon (ex : PROMO10, ANNIV20, etc.)
    # Utilisé par le client au moment du paiement
    code = models.CharField(max_length=50)

    # Montant fixe de la réduction (optionnel)
    # Exemple : 5.00 € de remise
    montant = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Pourcentage de réduction (optionnel)
    # Exemple : 10 pour 10%
    # Un seul des deux (montant ou pourcentage) est utilisé
    pourcentage = models.IntegerField(null=True, blank=True)

    # Le bon est lié à un client précis
    # Permet d'envoyer des bons personnalisés (anniversaire, inactivité)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="bons")

    # Date de création du bon
    # Utile pour le suivi et l’historique
    date_creation = models.DateTimeField(auto_now_add=True)

    # Date d’expiration du bon
    # Permet de limiter la validité dans le temps
    date_expiration = models.DateTimeField()

    # Indique si le bon a déjà été utilisé
    # Un bon ne peut être appliqué qu'une seule fois
    utilise = models.BooleanField(default=False)

    # Vérifie si le bon est encore utilisable
    # (non utilisé + pas expiré)
    def est_valide(self):
        return not self.utilise and timezone.now() <= self.date_expiration

    # Validation métier : empêcher montant ET pourcentage en même temps
    def clean(self):
        if self.montant and self.pourcentage:
            raise ValidationError("Choisir soit un montant soit un pourcentage, pas les deux.")

        if not self.montant and not self.pourcentage:
            raise ValidationError("Un bon doit avoir soit un montant soit un pourcentage.")

    def __str__(self):
        return f"{self.code} - {self.client.nom_complet}"