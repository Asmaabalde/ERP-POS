import random
from products.models import Product
from clients.models import Client

def generer_code_barre_unique(for_client=False):
    """
    Appelée lors de la création d'un produit pour éviter les doublons.
    Génère un code-barres puis recommence tant qu'il existe déjà en base.
    """
    # TODO: Boucle infinie pour recommencer si on génère un code barre qui existe déjà. A modifier si on a beaucoup de produits

    while True:
        code = generer_code_barre_ean13(for_client)
        if (not Product.objects.filter(code_barre=code).exists()) and (not Client.objects.filter(code_barre=code).exists()):
            return code

def generer_code_barre_ean13(for_client):
    """
    Appelée pour construire un code EAN-13 valide.
    Génère 12 chiffres aléatoires puis calcule automatiquement la clé de contrôle.
    """
    # Premier chiffre pour différencier les clients des produits
    first_digit = 1 if for_client else random.randint(2, 9)

    # 12 chiffres aléatoires + 1 clé de contrôle (1 chiffre)
    base = [first_digit] + [random.randint(0, 9) for _ in range(11)]

    # Calcul de la clé de contrôle
    even_sum = sum(base[i] for i in range(0, 12, 2))
    odd_sum = sum(base[i] for i in range(1, 12, 2))

    total = even_sum + odd_sum * 3
    check_digit = (10 - (total % 10)) % 10

    ean13 = "".join(map(str, base)) + str(check_digit)
    return ean13