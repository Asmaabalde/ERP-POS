from rest_framework import serializers
from .models import Categorie, Fournisseur, Commande, LigneCommande
from django.contrib.auth import get_user_model
from products.models import Product
import re
from django.db import transaction
from django.db.models import F

User = get_user_model()


class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = ['id', 'nom']


class FournisseurSerializer(serializers.ModelSerializer):
    categorie_detail = CategorieSerializer(source='categorie', read_only=True)

    class Meta:
        model = Fournisseur
        fields = ['id', 'nom', 'email', 'telephone', 'adresse', 'categorie', 'categorie_detail']

    def validate_email(self, value):
        if not value:
            return value

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "Cette adresse email est déjà utilisée par un employé ou un administrateur."
            )

        qs = Fournisseur.objects.filter(email__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "Cette adresse email est déjà utilisée par un autre fournisseur."
            )
        return value

    def validate_nom(self, value):
        qs = Fournisseur.objects.filter(nom__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "Un fournisseur avec ce nom existe déjà."
            )
        return value

    def validate_telephone(self, value):
        if not value:
            return value

        value = value.strip()

        if not re.fullmatch(r'^[0-9+\s().-]+$', value):
            raise serializers.ValidationError(
                "Le numéro de téléphone contient des caractères invalides."
            )

        digits_only = re.sub(r'\D', '', value)
        if len(digits_only) < 8 or len(digits_only) > 15:
            raise serializers.ValidationError(
                "Le numéro de téléphone doit contenir entre 8 et 15 chiffres."
            )

        if User.objects.filter(telephone=value).exists():
            raise serializers.ValidationError(
                "Ce numéro de téléphone est déjà utilisé par un utilisateur."
            )

        qs = Fournisseur.objects.filter(telephone=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "Ce numéro de téléphone est déjà utilisé par un autre fournisseur."
            )

        return value


class LigneCommandeSerializer(serializers.ModelSerializer):
    produit = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())

    class Meta:
        model = LigneCommande
        fields = ['id', 'produit', 'designation', 'quantite', 'prix_unitaire']


class CommandeSerializer(serializers.ModelSerializer):
    lignes = LigneCommandeSerializer(many=True)
    fournisseur_detail = FournisseurSerializer(source='fournisseur', read_only=True)

    class Meta:
        model = Commande
        fields = [
            'id',
            'fournisseur',
            'fournisseur_detail',
            'date_commande',
            'statut',
            'notes',
            'lignes',
        ]
        read_only_fields = ['date_commande']

    @transaction.atomic
    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes', [])
        commande = Commande.objects.create(**validated_data)

        for ligne_data in lignes_data:
            produit = ligne_data['produit']
            LigneCommande.objects.create(
                commande=commande,
                produit=produit,
                designation=ligne_data.get('designation') or produit.nom,
                quantite=ligne_data['quantite'],
                prix_unitaire=ligne_data.get('prix_unitaire')
                if ligne_data.get('prix_unitaire') is not None
                else produit.prix_achat_ht,
            )

        if commande.statut == 'livree':
            for ligne in commande.lignes.select_related('produit').all():
                Product.objects.filter(pk=ligne.produit_id).update(
                    quantite_stock=F('quantite_stock') + ligne.quantite
                )

        return commande

    @transaction.atomic
    def update(self, instance, validated_data):
        ancien_statut = instance.statut
        lignes_data = validated_data.pop('lignes', [])

        instance.fournisseur = validated_data.get('fournisseur', instance.fournisseur)
        instance.statut = validated_data.get('statut', instance.statut)
        instance.notes = validated_data.get('notes', instance.notes)
        instance.save()

        instance.lignes.all().delete()

        for ligne_data in lignes_data:
            produit = ligne_data['produit']
            LigneCommande.objects.create(
                commande=instance,
                produit=produit,
                designation=ligne_data.get('designation') or produit.nom,
                quantite=ligne_data['quantite'],
                prix_unitaire=ligne_data.get('prix_unitaire')
                if ligne_data.get('prix_unitaire') is not None
                else produit.prix_achat_ht,
            )

        if ancien_statut != 'livree' and instance.statut == 'livree':
            for ligne in instance.lignes.select_related('produit').all():
                Product.objects.filter(pk=ligne.produit_id).update(
                    quantite_stock=F('quantite_stock') + ligne.quantite
                )

        return instance