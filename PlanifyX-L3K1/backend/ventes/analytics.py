from datetime import timedelta

from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

from ventes.models import Vente, LigneVente
from clients.models import Client


def model_has_field(model, field_name):
    return any(field.name == field_name for field in model._meta.get_fields())


def get_user_entreprise(user):
    if not user or not getattr(user, "is_authenticated", False):
        return None

    return getattr(user, "entreprise", None)


def get_scoped_ventes(user):
    """
    Retourne uniquement les ventes de l'entreprise de l'utilisateur connecté.

    Compatible avec deux modèles possibles :
    - Vente.entreprise existe
    - ou Vente.user existe et User.entreprise existe
    """
    qs = Vente.objects.all()

    if not user or not getattr(user, "is_authenticated", False):
        return qs.none()

    entreprise = get_user_entreprise(user)

    if entreprise:
        if model_has_field(Vente, "entreprise"):
            return qs.filter(entreprise=entreprise)

        if model_has_field(Vente, "user"):
            return qs.filter(user__entreprise=entreprise)

    if model_has_field(Vente, "user"):
        return qs.filter(user=user)

    return qs.none()


def get_scoped_clients(user):
    """
    Retourne uniquement les clients de l'entreprise de l'utilisateur connecté.

    Compatible avec plusieurs structures possibles :
    - Client.entreprise existe
    - Client.user existe
    - Client.created_by existe
    - sinon fallback via les ventes filtrées
    """
    qs = Client.objects.all()

    if not user or not getattr(user, "is_authenticated", False):
        return qs.none()

    entreprise = get_user_entreprise(user)

    if entreprise:
        if model_has_field(Client, "entreprise"):
            return qs.filter(entreprise=entreprise)

        if model_has_field(Client, "user"):
            return qs.filter(user__entreprise=entreprise)

        if model_has_field(Client, "created_by"):
            return qs.filter(created_by__entreprise=entreprise)

    if model_has_field(Client, "user"):
        return qs.filter(user=user)

    if model_has_field(Vente, "client"):
        client_ids = (
            get_scoped_ventes(user)
            .exclude(client_id__isnull=True)
            .values("client_id")
        )
        return qs.filter(id__in=client_ids).distinct()

    return qs.none()


def get_period_dates(period):
    now = timezone.now()

    if period == "day":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = (now - timedelta(days=6)).replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

    return start, now


def get_revenue(period, user):
    start, end = get_period_dates(period)

    return (
        get_scoped_ventes(user)
        .filter(date_vente__range=[start, end])
        .aggregate(total=Sum("total_ttc"))["total"]
        or 0
    )


def get_average_basket(period, user):
    start, end = get_period_dates(period)

    ventes = get_scoped_ventes(user).filter(date_vente__range=[start, end])

    if not ventes.exists():
        return 0

    total = ventes.aggregate(total=Sum("total_ttc"))["total"] or 0

    return round(total / ventes.count(), 2)


def get_top_products(period, user):
    start, end = get_period_dates(period)

    ventes = get_scoped_ventes(user).filter(date_vente__range=[start, end])

    lignes = LigneVente.objects.filter(vente__in=ventes)

    return (
        lignes.values("produit__nom")
        .annotate(qte=Sum("quantite"))
        .order_by("-qte")[:5]
    )


def get_employee_performance(period, user):
    start, end = get_period_dates(period)

    performances = (
        get_scoped_ventes(user)
        .filter(date_vente__range=[start, end], user__isnull=False)
        .values("user__id", "user__first_name", "user__last_name", "user__email")
        .annotate(total=Sum("total_ttc"), ventes=Count("id"))
        .order_by("-total")[:5]
    )

    return [
        {
            "id": performance["user__id"],
            "vendeur": (
                f"{performance['user__first_name'] or ''} "
                f"{performance['user__last_name'] or ''}"
            ).strip()
            or performance["user__email"]
            or "Employé",
            "email": performance["user__email"],
            "total": performance["total"] or 0,
            "ventes": performance["ventes"],
        }
        for performance in performances
    ]


def get_active_clients(user):
    seuil = timezone.now() - timedelta(days=90)

    return get_scoped_clients(user).filter(derniere_visite__gte=seuil).count()


def get_loyalty_rate(period, user):
    start, end = get_period_dates(period)

    ventes = get_scoped_ventes(user).filter(date_vente__range=[start, end])

    clients = (
        Client.objects.filter(ventes__in=ventes)
        .annotate(
            nb=Count(
                "ventes",
                filter=Q(ventes__in=ventes),
                distinct=True,
            )
        )
        .distinct()
    )

    if not clients.exists():
        return 0

    clients_recurrents = clients.filter(nb__gte=2).count()
    total_clients = clients.count()

    return round((clients_recurrents / total_clients) * 100, 2)


def get_sales_by_day(period, user):
    start, end = get_period_dates(period)

    ventes = (
        get_scoped_ventes(user)
        .filter(date_vente__range=[start, end])
        .annotate(day=TruncDate("date_vente"))
        .values("day")
        .annotate(total=Sum("total_ttc"))
        .order_by("day")
    )

    return [
        {
            "date": vente["day"].strftime("%d/%m"),
            "montant": float(vente["total"] or 0),
        }
        for vente in ventes
    ]


def get_age_distribution(user):
    now = timezone.now().date()

    tranches = {
        "18-25": 0,
        "26-35": 0,
        "36-50": 0,
        "50+": 0,
    }

    for client in get_scoped_clients(user).exclude(date_anniversaire__isnull=True):
        age = now.year - client.date_anniversaire.year

        if age < 26:
            tranches["18-25"] += 1
        elif age < 36:
            tranches["26-35"] += 1
        elif age < 51:
            tranches["36-50"] += 1
        else:
            tranches["50+"] += 1

    return [{"tranche": key, "count": value} for key, value in tranches.items()]


def get_gender_distribution(user):
    return (
        get_scoped_clients(user)
        .values("sexe")
        .annotate(count=Count("id"))
        .order_by("sexe")
    )