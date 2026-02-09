import pandas as pd
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from django.db.models import Q
from .models import Volunteer, Participation
from .serializers import VolunteerSerializer, ParticipationSerializer
from .permissions import IsAdminOrReadOnly
from auditing.models import AuditLog
import numpy as np # Importante para manejar NaNs
from studies.models import Study # Importamos el modelo de Estudios

class VolunteerViewSet(viewsets.ModelViewSet):
    queryset = Volunteer.objects.all().order_by('-created_at')
    serializer_class = VolunteerSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
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

        data = request.data.copy()
        data['volunteer'] = volunteer.id
        
        # Mapeo de seguridad para el ID del estudio
        if 'study_id' in data:
            data['study'] = data.pop('study_id')

        serializer = ParticipationSerializer(data=data)
        if serializer.is_valid():
            participation = serializer.save()
            
            # Log de auditoría
            AuditLog.objects.create(
                user=user,
                action='CREATE',
                model_affected='Participation',
                record_id=f"{volunteer.code}",
                changes={
                    'Acción': 'Asignación de Estudio',
                    'Estudio Asignado': participation.study.name,
                    'Voluntario': volunteer.full_name
                },
                justification=justification
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ParticipationViewSet(viewsets.ModelViewSet):
    queryset = Participation.objects.all()
    serializer_class = ParticipationSerializer
    permission_classes = [IsAdminOrReadOnly]

class ImportVolunteersView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser]

    def post(self, request, format=None):
        if 'file' not in request.data:
            return Response({"error": "No se subió ningún archivo"}, status=status.HTTP_400_BAD_REQUEST)

        file = request.data['file']
        
        try:
            # Leemos Excel y convertimos los 'NaN' (vacíos) a None o string vacío
            df = pd.read_excel(file)
            df = df.replace({np.nan: None}) # Reemplaza NaN de pandas por None de Python
            
            # Normalizar columnas
            df.columns = df.columns.str.strip().str.lower()
            
            created_count = 0
            updated_count = 0
            errors = []

            for index, row in df.iterrows():
                try:
                    # 1. Extracción de Datos Básicos (con valores por defecto seguros)
                    first_name = str(row.get('nombre', '')).strip()
                    paternal = str(row.get('apellido paterno', '')).strip()
                    
                    if not first_name or not paternal:
                        errors.append(f"Fila {index+2}: Falta Nombre o Apellido Paterno (obligatorios).")
                        continue

                    # 2. Manejo de CURP (Opcional)
                    curp = row.get('curp')
                    if curp:
                        curp = str(curp).strip().upper()
                        # Si tiene CURP, verificamos duplicados
                        if Volunteer.objects.filter(curp=curp).exists():
                            # Opcional: Podríamos actualizar en vez de saltar, pero por seguridad saltamos
                            errors.append(f"Fila {index+2}: La CURP {curp} ya existe. Se omitió.")
                            continue
                    else:
                        curp = None # Permitimos que sea None

                    # 3. Manejo de Código (Opcional)
                    provided_code = row.get('codigo') or row.get('code')
                    if provided_code:
                        provided_code = str(provided_code).strip()
                        if Volunteer.objects.filter(code=provided_code).exists():
                            errors.append(f"Fila {index+2}: El código {provided_code} ya existe.")
                            continue
                    
                    # 4. Manejo de Sexo
                    sex_input = str(row.get('sexo', '')).strip().upper()
                    sex = None
                    if sex_input.startswith('M'): sex = 'M'
                    elif sex_input.startswith('F'): sex = 'F'
                    
                    # 5. Manejo de Fecha
                    birth_date = row.get('fecha nacimiento')
                    if pd.isna(birth_date) or str(birth_date).strip() == '':
                        birth_date = None
                    else:
                        try:
                            birth_date = pd.to_datetime(birth_date).date()
                        except:
                            birth_date = None

                    # --- CREACIÓN DEL VOLUNTARIO ---
                    volunteer = Volunteer.objects.create(
                        code=provided_code, # Si es None, el modelo lo autogenera en save()
                        first_name=first_name,
                        middle_name=str(row.get('segundo nombre', '') or '').strip(),
                        last_name_paternal=paternal,
                        last_name_maternal=str(row.get('apellido materno', '') or '').strip(),
                        birth_date=birth_date,
                        sex=sex,
                        curp=curp,
                        phone=str(row.get('telefono', '') or '').strip(),
                        manual_status='waiting_approval'
                    )
                    created_count += 1

                    # --- 6. ASIGNACIÓN DE ESTUDIOS ---
                    studies_str = row.get('estudios')
                    if studies_str:
                        # Separamos por comas: "Estudio A, Estudio B, Estudio C"
                        study_names = [s.strip() for s in str(studies_str).split(',') if s.strip()]
                        
                        for study_name in study_names:
                            # Buscamos el estudio por nombre (case insensitive)
                            study = Study.objects.filter(name__iexact=study_name).first()
                            
                            if study:
                                # Creamos la participación si no existe ya
                                Participation.objects.get_or_create(
                                    volunteer=volunteer,
                                    study=study
                                )
                            else:
                                errors.append(f"Fila {index+2}: Estudio '{study_name}' no encontrado en el sistema.")

                except Exception as e:
                    errors.append(f"Fila {index+2}: Error desconocido - {str(e)}")

            return Response({
                "message": f"Proceso terminado.\nVoluntarios creados: {created_count}",
                "errors": errors
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Error procesando archivo: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)