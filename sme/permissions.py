# permissions.py
from rest_framework import permissions

class IsBusinessOwner(permissions.BasePermission):
    """
    Custom permission to only allow the owner of a business to edit or delete it.
    """

    def has_object_permission(self, request, view, obj):
        # Check if the user is the owner of the business
        return obj.user == request.user
