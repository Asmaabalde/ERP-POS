from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from drf_spectacular.utils import extend_schema
from .models import Product
from .serializers import ProductSerializer


class ProductListView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        summary="Lister les produits",
        description="Retourne tous les produits de l'entreprise de l'utilisateur connecté.",
        responses=ProductSerializer(many=True),
    )
    def get(self, request):
        """
        Appelée lors d'une requête GET sur la liste des produits.
        Récupère uniquement les produits liés à l'entreprise de l'utilisateur connecté.
        """
        products = Product.objects.filter(entreprise=request.user.entreprise)
        serializer = ProductSerializer(products, many=True, context={"request": request})
        return Response(serializer.data)

    @extend_schema(
        summary="Créer un produit",
        description="Crée un produit pour l'entreprise de l'utilisateur connecté.",
        request=ProductSerializer,
        responses={201: ProductSerializer},
    )
    def post(self, request):
        """
        Appelée lors d'une requête POST sur la liste des produits.
        Valide les données reçues puis crée un nouveau produit pour l'entreprise courante.
        """
        serializer = ProductSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save(entreprise=request.user.entreprise)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductDetailView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self, pk, entreprise):
        """
        Appelée par les méthodes de détail pour récupérer un produit précis.
        Vérifie aussi que le produit appartient bien à l'entreprise demandée.
        """
        try:
            return Product.objects.get(pk=pk, entreprise=entreprise)
        except Product.DoesNotExist:
            return None

    @extend_schema(
        summary="Récupérer un produit",
        description="Retourne le détail d'un produit appartenant à l'entreprise de l'utilisateur connecté.",
        responses={200: ProductSerializer},
    )
    def get(self, request, pk):
        """
        Appelée lors d'une requête GET sur un produit précis.
        Retourne le produit si l'utilisateur a le droit d'y accéder.
        """
        product = self.get_object(pk, request.user.entreprise)
        if product is None:
            return Response(
                {"error": "Produit introuvable"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProductSerializer(product, context={"request": request})
        return Response(serializer.data)

    @extend_schema(
        summary="Modifier un produit",
        description="Met à jour un produit existant appartenant à l'entreprise de l'utilisateur connecté.",
        request=ProductSerializer,
        responses={200: ProductSerializer},
    )
    def put(self, request, pk):
        """
        Appelée lors d'une requête PUT sur un produit précis.
        Met à jour le produit si celui-ci appartient à l'entreprise courante.
        """
        product = self.get_object(pk, request.user.entreprise)
        if product is None:
            return Response(
                {"error": "Produit introuvable"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProductSerializer(product, data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save(entreprise=request.user.entreprise)
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Supprimer un produit",
        description="Supprime un produit appartenant à l'entreprise de l'utilisateur connecté.",
        responses={204: None},
    )
    def delete(self, request, pk):
        """
        Appelée lors d'une requête DELETE sur un produit précis.
        Supprime le produit s'il appartient à l'entreprise courante.
        """
        product = self.get_object(pk, request.user.entreprise)
        if product is None:
            return Response(
                {"error": "Produit introuvable"},
                status=status.HTTP_404_NOT_FOUND
            )

        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)