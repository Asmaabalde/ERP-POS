from django.urls import path
from .views import ClientDetailView, ClientListView,EnvoyerEmailClientView

urlpatterns = [
    path("clients/", ClientListView.as_view(), name="client-list"),
    path("clients/<int:pk>/", ClientDetailView.as_view(), name="client-detail"),
    path("clients/<int:pk>/envoyer-email/", EnvoyerEmailClientView.as_view()),
]