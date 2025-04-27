# sme/serializers.py

from rest_framework import serializers
from .models import BusinessProfile

class BusinessProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessProfile
        fields = [
            'id',
            'name',
            'owner_name',
            'email',
            'phone_number',
            'address',
            'business_type',
            'registration_number',
            'website',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('id','user','created_at', 'updated_at')
        
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)