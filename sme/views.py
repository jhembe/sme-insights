from django.shortcuts import render

# sme/views.py

from rest_framework import generics,filters
from .models import BusinessProfile
from .serializers import BusinessProfileSerializer
from .permissions import IsBusinessOwner
from rest_framework import permissions

class BusinessProfileListCreateAPIView(generics.ListCreateAPIView):
    queryset = BusinessProfile.objects.all()
    serializer_class = BusinessProfileSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'owner_name', 'business_type']
    filterset_fields = ['business_type']  # 👈 This line adds direct filtering

    def get_queryset(self):
        return BusinessProfile.objects.filter(user=self.request.user)    

class BusinessProfileRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = BusinessProfile.objects.all()
    serializer_class = BusinessProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsBusinessOwner]


