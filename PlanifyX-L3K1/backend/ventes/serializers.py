from rest_framework import serializers

from .models import Vente, LigneVente


class LigneVenteInputSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    quantite = serializers.IntegerField(min_value=1)

    # Le backend recalcule le prix depuis Product.prix_vente_ht.
    # On garde ce champ optionnel pour ne pas casser le frontend s'il l'envoie.
    prix = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=0,
        required=False,
    )


class VenteCreateSerializer(serializers.Serializer):
    panier = LigneVenteInputSerializer(many=True)

    # Le backend ne doit pas faire confiance au total envoyé par le frontend.
    # Il est donc optionnel et seulement conservé pour compatibilité.
    total = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=0,
        required=False,
    )

    client_id = serializers.IntegerField(required=False, allow_null=True)
    bon_id = serializers.IntegerField(required=False, allow_null=True)
    mode = serializers.CharField(required=False, allow_blank=True, default="Carte")


class LigneVenteSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source="produit.nom", read_only=True)

    class Meta:
        model = LigneVente
        fields = [
            "id",
            "produit",
            "produit_nom",
            "quantite",
            "prix_unitaire",
        ]
        read_only_fields = fields


class VenteSerializer(serializers.ModelSerializer):
    lignes = LigneVenteSerializer(many=True, read_only=True)
    client_nom = serializers.SerializerMethodField()
    vendeur = serializers.SerializerMethodField()

    class Meta:
        model = Vente
        fields = [
            "id",
            "entreprise",
            "user",
            "vendeur",
            "client",
            "client_nom",
            "mode",
            "date_vente",
            "total_ttc",
            "lignes",
        ]
        read_only_fields = fields

    def get_client_nom(self, obj):
        client = getattr(obj, "client", None)

        if not client:
            return None

        prenom = getattr(client, "prenom", "") or getattr(client, "first_name", "")
        nom = getattr(client, "nom", "") or getattr(client, "last_name", "")

        full_name = f"{prenom} {nom}".strip()

        return full_name or getattr(client, "email", None) or str(client)

    def get_vendeur(self, obj):
        user = getattr(obj, "user", None)

        if not user:
            return None

        full_name = ""

        if hasattr(user, "get_full_name"):
            full_name = user.get_full_name()

        return full_name or getattr(user, "email", None) or str(user)