from collections import Counter
from decimal import Decimal, InvalidOperation
from io import BytesIO

from django.conf import settings
from django.core.mail import EmailMessage
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Vente, LigneVente
from products.models import Product
from clients.models import Client
from bons.models import BonReduction

from .analytics import (
    get_revenue,
    get_average_basket,
    get_top_products,
    get_employee_performance,
    get_sales_by_day,
    get_age_distribution,
    get_gender_distribution,
    get_active_clients,
    get_loyalty_rate,
)


def model_has_field(model, field_name):
    return any(field.name == field_name for field in model._meta.get_fields())


def get_user_entreprise(user):
    if not user or not getattr(user, "is_authenticated", False):
        return None

    return getattr(user, "entreprise", None)


def get_scoped_products(user):
    qs = Product.objects.all()

    if not user or not getattr(user, "is_authenticated", False):
        return qs.none()

    entreprise = get_user_entreprise(user)

    if entreprise and model_has_field(Product, "entreprise"):
        return qs.filter(entreprise=entreprise)

    if entreprise and model_has_field(Product, "user"):
        return qs.filter(user__entreprise=entreprise)

    return qs.none()


def get_scoped_clients(user):
    qs = Client.objects.all()

    if not user or not getattr(user, "is_authenticated", False):
        return qs.none()

    entreprise = get_user_entreprise(user)

    if entreprise and model_has_field(Client, "entreprise"):
        return qs.filter(entreprise=entreprise)

    if entreprise and model_has_field(Client, "user"):
        return qs.filter(user__entreprise=entreprise)

    if entreprise and model_has_field(Client, "created_by"):
        return qs.filter(created_by__entreprise=entreprise)

    return qs.none()


def get_scoped_ventes(user):
    qs = Vente.objects.all()

    if not user or not getattr(user, "is_authenticated", False):
        return qs.none()

    entreprise = get_user_entreprise(user)

    if entreprise and model_has_field(Vente, "entreprise"):
        return qs.filter(entreprise=entreprise)

    if entreprise and model_has_field(Vente, "user"):
        return qs.filter(user__entreprise=entreprise)

    if model_has_field(Vente, "user"):
        return qs.filter(user=user)

    return qs.none()


def parse_decimal(value, default="0"):
    try:
        return Decimal(str(value if value is not None else default))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(default)


def get_default_from_email():
    return (
        getattr(settings, "DEFAULT_FROM_EMAIL", None)
        or getattr(settings, "EMAIL_HOST_USER", None)
    )


class VenteCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        panier = data.get("panier", [])
        client_id = data.get("client_id", None)
        mode = data.get("mode", "Carte")
        bon_id = data.get("bon_id", None)

        entreprise = get_user_entreprise(request.user)

        if not entreprise:
            return Response(
                {"error": "Votre compte n'est rattaché à aucune entreprise."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not panier:
            return Response(
                {"error": "Le panier est vide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                client = None

                if client_id:
                    client = get_scoped_clients(request.user).filter(id=client_id).first()

                    if not client:
                        return Response(
                            {"error": "Client introuvable pour cette entreprise."},
                            status=status.HTTP_404_NOT_FOUND,
                        )

                sous_total = Decimal("0")
                lignes_preparees = []

                produits_qs = get_scoped_products(request.user).select_for_update()

                for item in panier:
                    produit_id = item.get("id")
                    quantite = int(item.get("quantite", 0) or 0)

                    if not produit_id or quantite <= 0:
                        return Response(
                            {"error": "Produit ou quantité invalide dans le panier."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    produit = produits_qs.filter(id=produit_id).first()

                    if not produit:
                        return Response(
                            {
                                "error": (
                                    "Un produit du panier est introuvable "
                                    "pour cette entreprise."
                                )
                            },
                            status=status.HTTP_404_NOT_FOUND,
                        )

                    if produit.quantite_stock < quantite:
                        return Response(
                            {"error": f"Stock insuffisant pour {produit.nom}"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    prix_unitaire = parse_decimal(produit.prix_vente_ht)
                    sous_total += prix_unitaire * Decimal(quantite)

                    lignes_preparees.append(
                        {
                            "produit": produit,
                            "quantite": quantite,
                            "prix_unitaire": prix_unitaire,
                        }
                    )

                remise = Decimal("0")
                bon = None

                if bon_id:
                    if not client:
                        return Response(
                            {"error": "Un client est requis pour utiliser un bon."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    bon = BonReduction.objects.filter(
                        id=bon_id,
                        client=client,
                        utilise=False,
                        date_expiration__gte=timezone.now(),
                    ).first()

                    if not bon:
                        return Response(
                            {"error": "Bon invalide, expiré ou déjà utilisé."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    if bon.montant:
                        remise = parse_decimal(bon.montant)
                    elif bon.pourcentage:
                        remise = sous_total * (
                            parse_decimal(bon.pourcentage) / Decimal("100")
                        )

                total_final = max(Decimal("0"), sous_total - remise)

                nouvelle_vente = Vente.objects.create(
                    total_ttc=total_final,
                    client=client,
                    mode=mode,
                    entreprise=entreprise,
                    user=request.user,
                )

                for ligne_data in lignes_preparees:
                    produit = ligne_data["produit"]
                    quantite = ligne_data["quantite"]

                    produit.quantite_stock -= quantite
                    produit.save(update_fields=["quantite_stock"])

                    LigneVente.objects.create(
                        vente=nouvelle_vente,
                        produit=produit,
                        quantite=quantite,
                        prix_unitaire=ligne_data["prix_unitaire"],
                    )

                if bon:
                    bon.utilise = True
                    bon.save(update_fields=["utilise"])

                if client:
                    points_gagnes = int(total_final)
                    client.points_fidelite = (client.points_fidelite or 0) + points_gagnes

                    ventes_client = (
                        get_scoped_ventes(request.user)
                        .filter(client=client)
                        .prefetch_related("lignes__produit")
                    )

                    ventes_count = ventes_client.count()
                    total_achats = sum(
                        parse_decimal(vente.total_ttc) for vente in ventes_client
                    )

                    panier_moyen = (
                        total_achats / Decimal(ventes_count)
                        if ventes_count > 0
                        else Decimal("0")
                    )

                    categories = []

                    for vente in ventes_client:
                        for ligne in vente.lignes.all():
                            categorie = getattr(ligne.produit, "categorie", None)

                            if categorie:
                                categories.append(categorie)

                    categorie_preferee = Counter(categories).most_common(1)
                    categorie_preferee = (
                        categorie_preferee[0][0] if categorie_preferee else None
                    )

                    client.panier_moyen = round(panier_moyen, 2)
                    client.categorie_preferee = categorie_preferee
                    client.derniere_visite = timezone.now()
                    client.save()

            return Response(
                {
                    "message": "Vente enregistrée.",
                    "id": nouvelle_vente.id,
                    "total": float(total_final),
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            print(f"Erreur d'encaissement : {str(e)}")

            return Response(
                {"error": "Une erreur est survenue lors de l'encaissement."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def envoyer_ticket(request):
    email = request.data.get("email")
    nom = request.data.get("nom")
    articles = request.data.get("articles", [])
    total = parse_decimal(request.data.get("total"))
    date = request.data.get("date")
    mode_paiement = request.data.get("modePaiement")
    code_promo = request.data.get("codePromo")
    remise_promo = parse_decimal(request.data.get("remisePromo", 0))

    if not email:
        return Response({"error": "Email requis."}, status=status.HTTP_400_BAD_REQUEST)

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 60

    p.setFont("Helvetica-Bold", 18)
    p.drawCentredString(width / 2, y, "PLANIFYX")

    y -= 20
    p.setFont("Helvetica", 10)
    p.drawCentredString(width / 2, y, "123 Rue de la Réussite, Paris")

    y -= 15
    p.drawCentredString(width / 2, y, f"Date : {date}")

    y -= 30
    p.line(50, y, width - 50, y)

    y -= 20

    if nom:
        p.setFont("Helvetica-Bold", 11)
        p.drawString(50, y, f"Client : {nom}")
        y -= 20

    p.setFont("Helvetica-Bold", 11)
    p.drawString(50, y, "Articles :")

    y -= 15
    p.setFont("Helvetica", 10)

    for item in articles:
        prix = parse_decimal(item.get("prix", 0))
        quantite = int(item.get("quantite", 0) or 0)
        nom_article = item.get("nom", "Article")
        montant_ligne = prix * Decimal(quantite)

        ligne = f"  {nom_article}  x{quantite}  —  {montant_ligne:.2f} €"
        p.drawString(50, y, ligne)
        y -= 14

    y -= 10
    p.line(50, y, width - 50, y)

    y -= 20

    if code_promo:
        p.drawString(50, y, f"Code promo : {code_promo}  —  -{remise_promo:.2f} €")
        y -= 20

    p.setFont("Helvetica-Bold", 13)
    p.drawString(50, y, f"TOTAL TTC : {total:.2f} €")

    y -= 20
    p.setFont("Helvetica", 11)
    p.drawString(50, y, f"Mode de paiement : {mode_paiement}")

    p.showPage()
    p.save()
    buffer.seek(0)

    mail = EmailMessage(
        subject="Votre ticket de caisse PlanifyX",
        body=f"Bonjour {nom or ''},\n\nVeuillez trouver ci-joint votre ticket de caisse.",
        from_email=get_default_from_email(),
        to=[email],
    )

    mail.attach(f"ticket_planifyx_{date}.pdf", buffer.read(), "application/pdf")
    mail.send()

    return Response({"message": "Ticket PDF envoyé par email."}, status=status.HTTP_200_OK)


class AnalyticsOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get("period", "week")

        data = {
            "revenue": get_revenue(period, request.user),
            "average_basket": get_average_basket(period, request.user),
            "active_clients": get_active_clients(request.user),
            "loyalty_rate": get_loyalty_rate(period, request.user),
            "sales_by_day": get_sales_by_day(period, request.user),
            "top_products": list(get_top_products(period, request.user)),
            "gender_distribution": list(get_gender_distribution(request.user)),
            "age_distribution": list(get_age_distribution(request.user)),
            "employees": list(get_employee_performance(period, request.user)),
        }

        return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def historique_ventes(request):
    ventes = (
        get_scoped_ventes(request.user)
        .prefetch_related("lignes__produit")
        .order_by("-id")
    )

    data = []

    for vente in ventes:
        lignes_data = []

        for ligne in vente.lignes.all():
            lignes_data.append(
                {
                    "produit_nom": ligne.produit.nom,
                    "quantite": ligne.quantite,
                    "prix_unitaire": ligne.prix_unitaire,
                }
            )

        data.append(
            {
                "id": vente.id,
                "total_ttc": vente.total_ttc,
                "date_vente": vente.date_vente,
                "mode": getattr(vente, "mode", None),
                "lignes": lignes_data,
            }
        )

    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def envoyer_facture_mail(request, pk):
    email_destinataire = request.data.get("email")

    if not email_destinataire:
        return Response(
            {"error": "Veuillez fournir une adresse email."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    vente = get_object_or_404(
        get_scoped_ventes(request.user).prefetch_related("lignes__produit"),
        id=pk,
    )

    lignes = vente.lignes.all()

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)

    p.setFont("Helvetica-Bold", 24)
    p.drawString(50, 800, "PlanifyX")

    p.setFont("Helvetica", 12)
    p.drawString(50, 780, f"Facture N° FAC-{str(vente.id).zfill(4)}")

    y = 730

    p.setFont("Helvetica-Bold", 10)
    p.drawString(50, y, "Description")
    p.drawString(350, y, "Quantité")
    p.drawString(450, y, "Prix Unitaire")

    y -= 20

    p.setFont("Helvetica", 10)

    for ligne in lignes:
        p.drawString(50, y, str(ligne.produit.nom))
        p.drawString(350, y, str(ligne.quantite))
        p.drawString(450, y, f"{ligne.prix_unitaire} EUR")
        y -= 20

    y -= 30

    p.setFont("Helvetica-Bold", 12)
    p.drawString(350, y, "TOTAL TTC :")
    p.drawString(450, y, f"{vente.total_ttc} EUR")

    p.showPage()
    p.save()

    pdf_file = buffer.getvalue()
    buffer.close()

    sujet = f"Votre facture PlanifyX n° FAC-{str(vente.id).zfill(4)}"

    message = (
        "Bonjour,\n\n"
        "Veuillez trouver ci-joint votre facture au format PDF.\n\n"
        "Merci de votre confiance,\n"
        "L'équipe PlanifyX"
    )

    try:
        email = EmailMessage(
            sujet,
            message,
            get_default_from_email(),
            [email_destinataire],
        )

        email.attach(
            f"Facture_FAC-{str(vente.id).zfill(4)}.pdf",
            pdf_file,
            "application/pdf",
        )

        email.send(fail_silently=False)

        return Response(
            {"message": "Email avec PDF envoyé avec succès."},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        print(f"Erreur d'envoi d'email : {e}")

        return Response(
            {"error": "Le serveur n'a pas pu envoyer l'email."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )