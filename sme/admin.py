from django.contrib import admin
from .models import BusinessProfile

@admin.register(BusinessProfile)
class BusinessProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner_name', 'email', 'phone_number', 'created_at')
    search_fields = ('name', 'owner_name', 'email', 'phone_number')
    list_filter = ('business_type', 'created_at')
    ordering = ('created_at',)

    fieldsets = (
        ('Business Information', {
            'fields': ('name', 'business_type', 'registration_number', 'website', 'address')
        }),
        ('Owner Information', {
            'fields': ('owner_name', 'email', 'phone_number')
        }),
    )
