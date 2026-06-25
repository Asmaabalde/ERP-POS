from django.urls import path
from .views import (
    CategorieListCreateView,
    CategorieDetailView,
    FournisseurListCreateView,
    FournisseurDetailView,
    CommandeListCreateView,
    CommandeDetailView,
)

urlpatterns = [
    path('categories-fournisseurs/', CategorieListCreateView.as_view(), name='categorie-list'),
    path('categories-fournisseurs/<int:pk>/', CategorieDetailView.as_view(), name='categorie-detail'),

    path('fournisseurs/', FournisseurListCreateView.as_view(), name='fournisseur-list'),
    path('fournisseurs/<int:pk>/', FournisseurDetailView.as_view(), name='fournisseur-detail'),

    path('commandes/', CommandeListCreateView.as_view(), name='commande-list'),
    path('commandes/<int:pk>/', CommandeDetailView.as_view(), name='commande-detail'),
]