from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Categorie, Fournisseur, Commande
from .serializers import CategorieSerializer, FournisseurSerializer, CommandeSerializer


class CategorieListCreateView(generics.ListCreateAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]


class CategorieDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]


class FournisseurListCreateView(generics.ListCreateAPIView):
    queryset = Fournisseur.objects.all()
    serializer_class = FournisseurSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]


class FournisseurDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Fournisseur.objects.all()
    serializer_class = FournisseurSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]


class CommandeListCreateView(generics.ListCreateAPIView):
    queryset = Commande.objects.all().select_related('fournisseur').prefetch_related('lignes__produit')
    serializer_class = CommandeSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

class CommandeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Commande.objects.all().select_related('fournisseur').prefetch_related('lignes__produit')
    serializer_class = CommandeSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]