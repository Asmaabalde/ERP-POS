from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.utils import timezone
from .models import BonReduction
from .serializers import BonReductionSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def valider_code_promo(request):
    """
    Vérifie si un code promo est valide pour un client donné.
    """

    code = request.GET.get('code')
    client_id = request.GET.get('client_id')

    if not code or not client_id:
        return Response(
            {"detail": "Code promo et client_id requis."},
            status=status.HTTP_400_BAD_REQUEST
        )

    bon = BonReduction.objects.filter(
        code=code,
        client_id=client_id,
        utilise=False,
        date_expiration__gte=timezone.now()
    ).first()

    if not bon:
        return Response(
            {"detail": "Code invalide, expiré ou déjà utilisé."},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = BonReductionSerializer(bon)
    return Response(serializer.data, status=200)


@api_view(['GET'])
@permission_classes([AllowAny])
def liste_bons_client(request, client_id):
    """
    Retourne tous les bons valides d’un client
    """

    bons = BonReduction.objects.filter(
        client_id=client_id,
        utilise=False,
        date_expiration__gte=timezone.now()
    )

    serializer = BonReductionSerializer(bons, many=True)
    return Response(serializer.data)