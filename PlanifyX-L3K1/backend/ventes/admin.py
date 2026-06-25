from django.contrib import admin
from .models import Vente

# on veut afficher les vents dans al version admin
admin.site.register(Vente)