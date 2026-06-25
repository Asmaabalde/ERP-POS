import sys
from django.apps import AppConfig


class ClientsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'clients'

    def ready(self):
        # Pour éviter que le scheduler demande à accéder à une table alors qu'elle n'est pas encore créée
        if any(cmd in sys.argv for cmd in ['makemigrations', 'migrate']):
            return

        from . import scheduler
        scheduler.start()