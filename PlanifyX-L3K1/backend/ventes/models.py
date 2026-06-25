from django.db import models
from products.models import Product
from clients.models import Client
from accounts.models import Entreprise, User
from django.core.exceptions import ValidationError


class Vente(models.Model):
    date_vente = models.DateTimeField(auto_now_add=True)
    total_ttc = models.DecimalField(max_digits=10, decimal_places=2)

    entreprise = models.ForeignKey(
        Entreprise,
        on_delete=models.CASCADE,
        related_name="ventes_entreprise",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="vente_profile",
        null=True,
        blank=True,
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ventes'
    )
    mode = models.CharField(
        max_length=20,
        choices=[
            ("Carte", "Carte"),
            ("Espèces", "Espèces"),
            ("Points", "Points"),
        ],
        default="Carte"
    )

    def __str__(self):
        return f"Vente {self.id} - {self.total_ttc}€"


class LigneVente(models.Model):
    vente = models.ForeignKey(
        Vente,
        related_name='lignes',
        on_delete=models.CASCADE
    )
    produit = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantite = models.IntegerField()
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)

    def clean(self):
        if self.quantite <= 0:
            raise ValidationError("La quantité doit être strictement positive.")