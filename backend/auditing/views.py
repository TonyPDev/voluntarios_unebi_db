from rest_framework import viewsets, permissions
from .models import AuditLog
from .serializers import AuditLogSerializer

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    # Se excluyen los logs de "Cambio rápido de estatus 'Contactado' (Toggle)"
    # para evitar ruido visual en la tabla de auditoría.
    queryset = AuditLog.objects.exclude(
        justification="Cambio rápido de estatus 'Contactado' (Toggle)"
    ).order_by('-timestamp')
    
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAdminUser]