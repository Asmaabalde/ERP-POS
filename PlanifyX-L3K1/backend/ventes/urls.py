from django.urls import path
from .views import VenteCreateView, envoyer_ticket, AnalyticsOverviewView, historique_ventes, envoyer_facture_mail

urlpatterns = [
    path("encaisser/", VenteCreateView.as_view(), name="encaisser"),
    path('encaisser/envoyer-ticket/', envoyer_ticket),
    path("analytics/overview/", AnalyticsOverviewView.as_view()),
    path('historique/', historique_ventes, name='historique'),
    path('historique/<int:pk>/email/', envoyer_facture_mail, name='envoyer_email'),
]

