from rest_framework import serializers
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from .models import Product
from common.utils import generer_code_barre_unique

# TODO: Valider les entrées utilisateur

class ProductSerializer(serializers.ModelSerializer):
    entreprise = serializers.CharField(source="entreprise.nom", read_only=True)
    code_barre = serializers.CharField(read_only=True)
    image = serializers.SerializerMethodField()
    image_file = serializers.ImageField(write_only=True, required=False, allow_null=True)
    remove_image = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Product
        fields = [
            "id",
            "entreprise",
            "categorie",
            "nom",
            "code_barre",
            "description",
            "sous_categorie",
            "famille",
            "prix_achat_ht",
            "prix_vente_ht",
            "taux_tva",
            "stock_initial",
            "quantite_stock",
            "seuil_minimum",
            "seuil_critique",
            "image",
            "image_file",
            "remove_image",
        ]
        read_only_fields = ["entreprise", "code_barre", "image"]

    def create(self, validated_data):
        """
        Appelée lors de la création d'un produit via le serializer.
        Génère automatiquement un code-barres unique et gère l'image envoyée si présente.
        """
        validated_data["code_barre"] = generer_code_barre_unique()
        validated_data["stock_initial"] = validated_data.get("quantite_stock", 0)

        image_file = validated_data.pop("image_file", None)
        validated_data.pop("remove_image", False)

        product = super().create(validated_data)

        if image_file:
            product.image = image_file
            product.save()

        return product

    def update(self, instance, validated_data):
        """
        Appelée lors de la modification d'un produit existant.
        Gère aussi le remplacement ou la suppression de l'image si demandé.
        """
        image_file = validated_data.pop("image_file", None)
        remove_image = validated_data.pop("remove_image", False)

        validated_data.pop("stock_initial", None)

        ancien_stock = instance.quantite_stock
        nouveau_stock = validated_data.get("quantite_stock")

        if nouveau_stock is not None and nouveau_stock > ancien_stock:
            validated_data["stock_initial"] = nouveau_stock

        product = super().update(instance, validated_data)

        if remove_image:
            if product.image:
                product.image.delete(save=False)
            product.image = None

        elif image_file:
            if product.image:
                product.image.delete(save=False)
            product.image = image_file

        product.save()
        return product

    @extend_schema_field(OpenApiTypes.URI)
    def get_image(self, obj):
        """
        Appelée au moment de sérialiser le produit pour la réponse API.
        Retourne l'URL de l'image si une image est associée au produit.
        """
        if not obj.image:
            return None

        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(obj.image.url)

        return obj.image.url