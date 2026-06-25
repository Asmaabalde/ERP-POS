from rest_framework import serializers
from .models import BonReduction


class BonReductionSerializer(serializers.ModelSerializer):
    valide = serializers.SerializerMethodField()

    class Meta:
        model = BonReduction
        fields = [
            'id',
            'code',
            'montant',
            'pourcentage',
            'client',
            'date_creation',
            'date_expiration',
            'utilise',
            'valide'
        ]

    def get_valide(self, obj):
        return obj.est_valide()