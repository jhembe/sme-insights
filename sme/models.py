# sme/models.py

from django.db import models
from django.contrib.auth.models import User

class BusinessProfile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='business_profiles')
    name = models.CharField(max_length=255)
    owner_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    business_type = models.CharField(max_length=255, blank=True, null=True)
    registration_number = models.CharField(max_length=100, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

# 👇 NEW Sale model — added BELOW BusinessProfile

class Sale(models.Model):
    business = models.ForeignKey(BusinessProfile, on_delete=models.CASCADE, related_name='sales')
    date = models.DateField()
    product_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product_name} - {self.business.name}"
