# sme/urls.py

from django.urls import path
from .views import BusinessProfileListCreateAPIView, BusinessProfileRetrieveUpdateDestroyAPIView

urlpatterns = [
    path('business-profiles/', BusinessProfileListCreateAPIView.as_view(), name='businessprofile-list-create'),
    path('business-profiles/<int:pk>/', BusinessProfileRetrieveUpdateDestroyAPIView.as_view(), name='businessprofile-retrieve-update-destroy'),
]
