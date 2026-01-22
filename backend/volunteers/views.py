from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from .models import Volunteer, Participation
from .serializers import VolunteerSerializer, ParticipationSerializer
from .permissions import IsAdminOrReadOnly
from auditing.models import AuditLog

class VolunteerViewSet(viewsets.ModelViewSet):
    queryset = Volunteer.objects.all().order_by('-created_at')
    serializer_class = VolunteerSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtros básicos
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search) | 
                Q(first_name__icontains=search) | 
                Q(last_name_paternal__icontains=search) |
                Q(curp__icontains=search)
            )
        return queryset

    @action(detail=True, methods=['post'], url_path='add-participation')
    def add_participation(self, request, pk=None):
        volunteer = self.get_object()
        user = request.user
        justification = request.data.get('justification')
        
        if not user.is_staff:
             return Response({"detail": "No autorizado"}, status=status.HTTP_403_FORBIDDEN)

        if not justification:
            return Response({"justification": "Este campo es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        # Añadimos el voluntario a los datos del serializador
        data = request.data.copy()
        data['volunteer'] = volunteer.id

        serializer = ParticipationSerializer(data=data)
        if serializer.is_valid():
            participation = serializer.save()
            
            # Crear Log
            AuditLog.objects.create(
                user=user,
                action='CREATE',
                model_affected='Participation',
                record_id=f"{volunteer.code} -> Estudio {participation.study.name}",
                changes=serializer.data,
                justification=justification
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)