from rest_framework import serializers
from .models import Client
from ventes.models import Vente, LigneVente
from common.utils import generer_code_barre_unique


class LigneVenteSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)

    class Meta:
        model = LigneVente
        fields = ['produit_nom', 'quantite']


class VenteSerializer(serializers.ModelSerializer):
    lignes = LigneVenteSerializer(many=True, read_only=True)

    class Meta:
        model = Vente
        fields = ['id', 'date_vente', 'total_ttc', 'mode', 'lignes']


class ClientSerializer(serializers.ModelSerializer):
    entreprise = serializers.CharField(source="entreprise.nom", read_only=True)
    code_barre = serializers.CharField(read_only=True)
    ventes = serializers.SerializerMethodField()
    total_achats = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id', 'entreprise', 'nom_complet', 'email', 'date_anniversaire', 'sexe',
            'telephone', 'adresse', 'ville', 'code_postal', 'pays',
            'code_barre',
            'points_fidelite', 'panier_moyen', 'categorie_preferee',
            'derniere_visite', 'date_creation', 'ventes', 'total_achats'
        ]
        read_only_fields = ['entreprise', 'code_barre']

    def create(self, validated_data):
        validated_data["code_barre"] = generer_code_barre_unique(for_client=True)
        return super().create(validated_data)

    def get_ventes(self, obj):
        ventes = obj.ventes.order_by('-date_vente')
        return VenteSerializer(ventes, many=True).data

    def get_total_achats(self, obj):
        return float(sum(v.total_ttc for v in obj.ventes.all()))