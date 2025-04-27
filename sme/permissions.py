from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of a business profile to edit or delete it.
    """

    def has_object_permission(self, request, view, obj):
        # SAFE_METHODS are like GET, HEAD, OPTIONS — allow them for everyone
        if request.method in permissions.SAFE_METHODS:
            return True

        # Otherwise (PUT, PATCH, DELETE), only allow the owner (user) to edit/delete
        return obj.user == request.user
