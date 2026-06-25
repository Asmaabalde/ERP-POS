from django.db import models
from accounts.models import Entreprise


class Product(models.Model):
    # Chaque produit appartient à une entreprise pour isoler les données en multi-tenant
    entreprise = models.ForeignKey(
        Entreprise,
        on_delete=models.CASCADE,
        related_name="products",
        null=True,
        blank=True,
    )

    categorie = models.CharField(max_length=100)
    nom = models.CharField(max_length=255)
    code_barre = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)
    sous_categorie = models.CharField(max_length=255, blank=True, null=True)
    famille = models.CharField(max_length=255, blank=True, null=True)
    prix_achat_ht = models.DecimalField(max_digits=12, decimal_places=2)
    prix_vente_ht = models.DecimalField(max_digits=12, decimal_places=2)
    taux_tva = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    stock_initial = models.IntegerField(default=0)
    quantite_stock = models.IntegerField(default=0)
    seuil_minimum = models.IntegerField(default=0)
    seuil_critique = models.IntegerField(default=0)
    image = models.ImageField(upload_to="products/", null=True, blank=True)

    class Meta:
        constraints = [
            # Empêche deux produits d'une même entreprise d'avoir le même code-barres
            models.UniqueConstraint(
                fields=["entreprise", "code_barre"],
                name="unique_code_barre_par_entreprise",
            )
        ]

    def __str__(self):
        # Représentation lisible d'un produit dans l'admin Django
        return self.nom