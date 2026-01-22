from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Study
from .serializers import StudySerializer
from auditing.models import AuditLog

class StudyViewSet(viewsets.ModelViewSet):
    queryset = Study.objects.all()
    serializer_class = StudySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def update(self, request, *args, **kwargs):
        # Interceptamos la actualización para exigir justificación
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        justification = request.data.get('justification')

        # Solo exigimos justificación si es edición (PUT/PATCH), no creación
        if not justification:
            return Response(
                {"detail": "La justificación es obligatoria para editar un estudio."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Calculamos cambios para el log (antes de guardar)
        old_data = StudySerializer(instance).data
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        new_data = serializer.data
        
        # Detectar qué cambió
        changes = {}
        for key, value in new_data.items():
            if str(old_data.get(key)) != str(value):
                changes[key] = {'from': old_data.get(key), 'to': value}

        # Guardar log si hubo cambios
        if changes:
            AuditLog.objects.create(
                user=request.user,
                action='UPDATE',
                model_affected='Study',
                record_id=f"{instance.name} (ID: {instance.id})",
                changes=changes,
                justification=justification
            )

        return Response(serializer.data)