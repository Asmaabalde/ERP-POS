from django.urls import path
from .views import valider_code_promo, liste_bons_client

urlpatterns = [
    path('valider/', valider_code_promo, name='valider_code_promo'),
    path('clients/<int:client_id>/bons/', liste_bons_client, name='liste_bons_client'),
]