from django_apscheduler.jobstores import DjangoJobStore
from apscheduler.schedulers.background import BackgroundScheduler
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from bons.models import BonReduction
import uuid

def envoyer_emails_anniversaire():
    from clients.models import Client
    aujourd_hui = timezone.now().date()

    clients = Client.objects.filter(
        date_anniversaire__month=aujourd_hui.month,
        date_anniversaire__day=aujourd_hui.day,
    )

    for client in clients:

        # 1) Générer un code unique
        code = str(uuid.uuid4())[:8].upper()

        # 2) Créer un bon de réduction (20% valable aujourd’hui)
        bon = BonReduction.objects.create(
            client=client,
            code=code,
            pourcentage=20,
            date_expiration=timezone.now() + timedelta(days=1),
        )

        # 3) Envoyer l’email avec le vrai bon
        send_mail(
            subject=f"Joyeux anniversaire {client.nom_complet.split()[0]} ! 🎂",
            message=f"""Bonjour {client.nom_complet},

Toute l'équipe PlanifyX vous souhaite un joyeux anniversaire !

🎁 Voici votre bon de réduction :
- Code : {bon.code}
- Réduction : {bon.pourcentage}%
- Expire le : {bon.date_expiration.strftime('%d/%m/%Y %H:%M')}

Présentez ce code en caisse pour en profiter.

À bientôt,
L'équipe PlanifyX""",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[client.email],
            fail_silently=True,
        )

    print(f"[Anniversaire] {clients.count()} email(s) envoyé(s)")



def envoyer_emails_inactivite():
    from clients.models import Client
    seuil = timezone.now() - timedelta(days=90)  # 3 mois

    clients = Client.objects.filter(
        derniere_visite__lt=seuil,
    ).exclude(email="")

    for client in clients:

        # 1) Générer un code unique
        code = str(uuid.uuid4())[:8].upper()

        # 2) Créer un bon de réduction (10% valable 7 jours)
        bon = BonReduction.objects.create(
            client=client,
            code=code,
            pourcentage=10,
            date_expiration=timezone.now() + timedelta(days=7),
        )

        # 3) Envoyer l’email avec le vrai bon
        send_mail(
            subject="Vous nous manquez ! 💙",
            message=f"""Bonjour {client.nom_complet},

Cela fait un moment qu'on ne vous a pas vu chez PlanifyX !

🎁 Pour vous accueillir à nouveau, voici votre bon de réduction :
- Code : {bon.code}
- Réduction : {bon.pourcentage}%
- Expire le : {bon.date_expiration.strftime('%d/%m/%Y %H:%M')}

À très bientôt,
L'équipe PlanifyX""",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[client.email],
            fail_silently=True,
        )

    print(f"[Inactivité] {clients.count()} email(s) envoyé(s)")


def envoyer_emails_nouvelles_collections():
    from clients.models import Client
    from products.models import Product
    # Récupère les catégories des produits ajoutés dans les 7 derniers jours
    # Pour simplifier on prend toutes les catégories disponibles
    categories = Product.objects.values_list('categorie', flat=True).distinct()

    for categorie in categories:
        clients = Client.objects.filter(categorie_preferee=categorie)
        for client in clients:
            send_mail(
                subject=f"Nouveautés dans votre catégorie préférée : {categorie} !",
                message=f"""Bonjour {client.nom_complet},

De nouveaux produits viennent d'arriver dans la catégorie {categorie} que vous adorez !

Venez les découvrir en magasin.

À bientôt,
L'équipe PlanifyX""",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[client.email],
                fail_silently=True,
            )
    print(f"[Nouvelles collections] Emails envoyés")


def start():
    scheduler = BackgroundScheduler()
    scheduler.add_jobstore(DjangoJobStore(), "default")

    # Tous les jours à 8h00
    scheduler.add_job(
        envoyer_emails_anniversaire,
        "cron", hour=8, minute=00,
        id="emails_anniversaire",
        replace_existing=True,
    )
    scheduler.add_job(
        envoyer_emails_inactivite,
        "cron", hour=8, minute=15,
        id="emails_inactivite",
        replace_existing=True,
    )

    scheduler.add_job(
        envoyer_emails_nouvelles_collections,
        "cron", hour=8, minute=30,
        id="emails_collections",
        replace_existing=True,
    )

    scheduler.start()
    print("Scheduler démarré !! Emails automatiques actifs")