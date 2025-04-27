# sme/views.py

from django.shortcuts import render

from rest_framework import generics, filters, permissions
from .models import BusinessProfile
from .serializers import BusinessProfileSerializer
from .permissions import IsOwnerOrReadOnly  # 👈 FIX: Import the correct permission class

class BusinessProfileListCreateAPIView(generics.ListCreateAPIView):
    queryset = BusinessProfile.objects.all()
    serializer_class = BusinessProfileSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'owner_name', 'business_type']
    filterset_fields = ['business_type']

    permission_classes = [permissions.IsAuthenticated]  # 👈 Add this to protect creation

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return BusinessProfile.objects.filter(user=self.request.user)
        return BusinessProfile.objects.none()  # 👈 If not logged in, return an empty list


    def perform_create(self, serializer):
        serializer.save(user=self.request.user)  # 👈 Ensure created BusinessProfile is tied to logged-in user

class BusinessProfileRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = BusinessProfile.objects.all()
    serializer_class = BusinessProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]  # 👈 Correct permission class
