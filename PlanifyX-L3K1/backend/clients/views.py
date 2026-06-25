from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Client
from .serializers import ClientSerializer
from rest_framework.permissions import IsAuthenticated
from django.core.mail import send_mail
from django.conf import settings


class ClientListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        email = request.query_params.get('email', None)
        if email:
            clients = Client.objects.filter(
                entreprise=request.user.entreprise,
                email__icontains=email
            )
        else:
            clients = Client.objects.filter(entreprise=request.user.entreprise)
        serializer = ClientSerializer(clients, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ClientSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(entreprise=request.user.entreprise)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class ClientDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Client.objects.get(
                pk=pk,
                entreprise=self.request.user.entreprise
            )
        except Client.DoesNotExist:
            return None

    def get(self, request, pk):
        client = self.get_object(pk)
        if client is None:
            return Response(
                {"error": "Client introuvable"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ClientSerializer(client)
        return Response(serializer.data)


    def put(self, request, pk):
        client = self.get_object(pk)
        if client is None:
            return Response({"error": "Client introuvable"}, status=404)

        serializer = ClientSerializer(client, data=request.data)
        if serializer.is_valid():
            serializer.save(entreprise=request.user.entreprise)
            return Response(serializer.data)

        return Response(serializer.errors, status=400)


    def delete(self, request, pk):
        client = self.get_object(pk)
        if client is None:
            return Response(
                {"error": "Client introuvable"},
                status=status.HTTP_404_NOT_FOUND
            )

        client.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)




class EnvoyerEmailClientView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            client = Client.objects.get(
                pk=pk,
                entreprise=request.user.entreprise
            )
        except Client.DoesNotExist:
            return Response({"error": "Client introuvable"}, status=404)

        sujet = request.data.get("sujet")
        message = request.data.get("message")

        if not sujet or not message:
            return Response({"error": "Sujet et message requis"}, status=400)

        # Vérification minimale : le client doit avoir un email
        if not client.email:
            return Response({"error": "Ce client n'a pas d'email"}, status=400)

        send_mail(
            subject=sujet,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[client.email],
            fail_silently=False,
        )

        return Response({"message": "Email envoyé avec succès"}, status=200)