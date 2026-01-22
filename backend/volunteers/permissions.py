from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True # Todos pueden leer (GET, HEAD, OPTIONS)
        return request.user.is_staff # Solo staff (admins) pueden escribir (POST, PUT, DELETE)