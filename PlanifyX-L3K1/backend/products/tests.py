from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Entreprise
from .models import Product


class ProductApiTests(APITestCase):
    def setUp(self):
        self.User = get_user_model()

        self.entreprise_1 = Entreprise.objects.create(nom="Planifyx")
        self.entreprise_2 = Entreprise.objects.create(nom="Concurrent")

        # On crée deux utilisateurs rattachés à deux entreprises différentes
        # pour vérifier l'isolation multi-tenant sur les endpoints produits.
        self.user_1 = self._create_user(
            email="admin@planifyx.test",
            entreprise=self.entreprise_1,
        )
        self.user_2 = self._create_user(
            email="admin@concurrent.test",
            entreprise=self.entreprise_2,
        )

        # Produit visible uniquement par l'utilisateur de la première entreprise.
        self.product_1 = Product.objects.create(
            entreprise=self.entreprise_1,
            categorie="Informatique",
            nom="MacBook Pro 14",
            code_barre="3700123456789",
            description="Ordinateur portable 14 pouces",
            sous_categorie="Ordinateurs portables",
            famille="Apple",
            prix_achat_ht="1450.00",
            prix_vente_ht="1899.00",
            taux_tva="20.00",
            stock_initial=8,
            quantite_stock=8,
            seuil_minimum=2,
            seuil_critique=1,
        )

        # Produit d'une autre entreprise, utilisé pour vérifier
        # qu'un utilisateur ne peut pas y accéder ni le modifier.
        self.product_2 = Product.objects.create(
            entreprise=self.entreprise_2,
            categorie="Informatique",
            nom="Dell XPS 13",
            code_barre="3700123456790",
            description="Ordinateur portable 13 pouces",
            sous_categorie="Ordinateurs portables",
            famille="Dell",
            prix_achat_ht="1200.00",
            prix_vente_ht="1599.00",
            taux_tva="20.00",
            stock_initial=4,
            quantite_stock=4,
            seuil_minimum=1,
            seuil_critique=1,
        )

    def _create_user(self, email, entreprise):
        """
        Helper de création utilisateur.
        On reste volontairement un peu souple ici pour éviter de figer
        les tests sur une implémentation trop précise du custom user.
        """
        password = "TestPass123!"

        user_fields = {field.name for field in self.User._meta.fields}
        create_kwargs = {
            "email": email,
            "password": password,
        }

        if "entreprise" in user_fields:
            create_kwargs["entreprise"] = entreprise

        if "role" in user_fields:
            create_kwargs["role"] = "ADMIN"

        user = self.User.objects.create_user(**create_kwargs)

        # Fallback utile si certains champs ne sont pas pris en charge
        # directement par create_user dans l'implémentation actuelle.
        if hasattr(user, "entreprise") and user.entreprise_id != entreprise.id:
            user.entreprise = entreprise

        if hasattr(user, "role") and not getattr(user, "role", None):
            user.role = "ADMIN"

        user.save()
        return user

    def authenticate(self, user):
        # Authentifie le client de test sans passer par une vraie requête login.
        # Pratique pour tester directement la logique métier des vues.
        self.client.force_authenticate(user=user)

    def test_get_all_products_returns_only_products_from_authenticated_user_company(self):
        # L'utilisateur ne doit voir que les produits de son entreprise.
        self.authenticate(self.user_1)
        url = reverse("product-list")

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.product_1.id)
        self.assertEqual(response.data[0]["nom"], "MacBook Pro 14")

    def test_create_product_creates_it_for_authenticated_user_company(self):
        # À la création, le produit doit être automatiquement rattaché
        # à l'entreprise de l'utilisateur connecté.
        self.authenticate(self.user_1)
        url = reverse("product-list")

        data = {
            "categorie": "Informatique",
            "nom": "Magic Mouse",
            "description": "Souris Apple",
            "sous_categorie": "Souris",
            "famille": "Apple",
            "prix_achat_ht": "55.00",
            "prix_vente_ht": "89.00",
            "taux_tva": "20.00",
            "stock_initial": 5,
            "quantite_stock": 5,
            "seuil_minimum": 1,
            "seuil_critique": 1,
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.filter(entreprise=self.entreprise_1).count(), 2)

        created_product = Product.objects.get(nom="Magic Mouse")
        self.assertEqual(created_product.entreprise, self.entreprise_1)
        self.assertTrue(created_product.code_barre)
        self.assertEqual(len(created_product.code_barre), 13)

    def test_create_product_ignores_code_barre_sent_by_client(self):
        # Le serializer génère lui-même le code-barres.
        # Même si le frontend en envoie un, il ne doit pas être utilisé.
        self.authenticate(self.user_1)
        url = reverse("product-list")

        data = {
            "categorie": "Informatique",
            "nom": "Magic Keyboard",
            "code_barre": "9999999999999",
            "description": "Clavier Apple",
            "sous_categorie": "Claviers",
            "famille": "Apple",
            "prix_achat_ht": "70.00",
            "prix_vente_ht": "109.00",
            "taux_tva": "20.00",
            "stock_initial": 3,
            "quantite_stock": 3,
            "seuil_minimum": 1,
            "seuil_critique": 1,
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        created_product = Product.objects.get(nom="Magic Keyboard")
        self.assertNotEqual(created_product.code_barre, "9999999999999")
        self.assertEqual(response.data["code_barre"], created_product.code_barre)

    def test_get_one_product_returns_product_when_it_belongs_to_user_company(self):
        # Un produit doit être accessible si l'utilisateur appartient
        # à la même entreprise que ce produit.
        self.authenticate(self.user_1)
        url = reverse("product-detail", args=[self.product_1.id])

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.product_1.id)
        self.assertEqual(response.data["nom"], "MacBook Pro 14")

    def test_get_one_product_returns_404_when_product_belongs_to_another_company(self):
        # Même si le produit existe, l'API doit répondre 404 si l'utilisateur
        # essaie d'accéder à un produit d'une autre entreprise.
        self.authenticate(self.user_1)
        url = reverse("product-detail", args=[self.product_2.id])

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Produit introuvable")

    def test_get_one_product_returns_404_when_product_does_not_exist(self):
        # Cas simple : un id inexistant doit renvoyer 404.
        self.authenticate(self.user_1)
        url = reverse("product-detail", args=[9999])

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Produit introuvable")

    def test_update_product_updates_product_when_it_belongs_to_user_company(self):
        # Vérifie qu'un produit de la bonne entreprise peut être modifié normalement.
        self.authenticate(self.user_1)
        url = reverse("product-detail", args=[self.product_1.id])

        data = {
            "categorie": "Informatique",
            "nom": "MacBook Pro 14 M3",
            "description": "Version mise à jour",
            "sous_categorie": "Ordinateurs portables",
            "famille": "Apple",
            "prix_achat_ht": "1500.00",
            "prix_vente_ht": "1999.00",
            "taux_tva": "20.00",
            "stock_initial": 8,
            "quantite_stock": 10,
            "seuil_minimum": 2,
            "seuil_critique": 1,
        }

        response = self.client.put(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.product_1.refresh_from_db()
        self.assertEqual(self.product_1.nom, "MacBook Pro 14 M3")
        self.assertEqual(self.product_1.quantite_stock, 10)
        self.assertEqual(self.product_1.entreprise, self.entreprise_1)

    def test_update_product_cannot_change_code_barre(self):
        # Comme le code-barres est en lecture seule côté serializer,
        # une tentative de modification ne doit pas l'écraser.
        self.authenticate(self.user_1)
        url = reverse("product-detail", args=[self.product_1.id])

        original_code_barre = self.product_1.code_barre

        data = {
            "categorie": "Informatique",
            "nom": "MacBook Pro 14",
            "code_barre": "1111111111111",
            "description": "Ordinateur portable 14 pouces",
            "sous_categorie": "Ordinateurs portables",
            "famille": "Apple",
            "prix_achat_ht": "1450.00",
            "prix_vente_ht": "1899.00",
            "taux_tva": "20.00",
            "stock_initial": 8,
            "quantite_stock": 8,
            "seuil_minimum": 2,
            "seuil_critique": 1,
        }

        response = self.client.put(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.product_1.refresh_from_db()
        self.assertEqual(self.product_1.code_barre, original_code_barre)
        self.assertEqual(response.data["code_barre"], original_code_barre)

    def test_update_product_returns_404_when_product_belongs_to_another_company(self):
        # Un utilisateur ne doit pas pouvoir modifier un produit
        # qui appartient à une autre entreprise.
        self.authenticate(self.user_1)
        url = reverse("product-detail", args=[self.product_2.id])

        data = {
            "categorie": "Informatique",
            "nom": "Dell XPS 13 Updated",
            "description": "Tentative de modification interdite",
            "sous_categorie": "Ordinateurs portables",
            "famille": "Dell",
            "prix_achat_ht": "1200.00",
            "prix_vente_ht": "1599.00",
            "taux_tva": "20.00",
            "stock_initial": 4,
            "quantite_stock": 4,
            "seuil_minimum": 1,
            "seuil_critique": 1,
        }

        response = self.client.put(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Produit introuvable")

        self.product_2.refresh_from_db()
        self.assertEqual(self.product_2.nom, "Dell XPS 13")

    def test_delete_product_deletes_only_product_from_authenticated_user_company(self):
        # La suppression doit fonctionner uniquement sur les produits
        # appartenant à l'entreprise de l'utilisateur connecté.
        self.authenticate(self.user_1)
        url = reverse("product-detail", args=[self.product_1.id])

        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Product.objects.filter(id=self.product_1.id).exists())
        self.assertTrue(Product.objects.filter(id=self.product_2.id).exists())

    def test_delete_product_returns_404_when_product_belongs_to_another_company(self):
        # La tentative de suppression d'un produit d'une autre entreprise
        # doit échouer proprement avec une 404.
        self.authenticate(self.user_1)
        url = reverse("product-detail", args=[self.product_2.id])

        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Product.objects.filter(id=self.product_2.id).exists())