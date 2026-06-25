from django.db import models
from products.models import Product


class Categorie(models.Model):
    nom = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nom


class Fournisseur(models.Model):
    nom = models.CharField(max_length=150)
    email = models.EmailField(blank=True, null=True, unique=True)
    telephone = models.CharField(max_length=30, blank=True, unique=True)
    adresse = models.TextField(blank=True)
    categorie = models.ForeignKey(
        Categorie, on_delete=models.SET_NULL, null=True, blank=True
    )
    est_actif = models.BooleanField(default=True)

    def __str__(self):
        return self.nom


class Commande(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('confirmee', 'Confirmée'),
        ('livree', 'Livrée'),
        ('annulee', 'Annulée'),
    ]

    fournisseur = models.ForeignKey(
        Fournisseur, on_delete=models.PROTECT,
        related_name='commandes', null=True, blank=True
    )
    date_commande = models.DateField(auto_now_add=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Commande #{self.id}"


class LigneCommande(models.Model):
    commande = models.ForeignKey(
        Commande, on_delete=models.CASCADE, related_name='lignes'
    )
    produit = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='lignes_commande'
    )
    designation = models.CharField(max_length=200, blank=True)
    quantite = models.PositiveIntegerField(default=1)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.produit.nom} x {self.quantite}"