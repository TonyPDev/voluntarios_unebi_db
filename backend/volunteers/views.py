import pandas as pd
import re
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Volunteer, Participation
from studies.models import Study # Importamos el modelo de Estudios
from .serializers import VolunteerSerializer, ParticipationSerializer
from .permissions import IsAdminOrReadOnly

class VolunteerViewSet(viewsets.ModelViewSet):
    queryset = Volunteer.objects.all().order_by('-created_at')
    serializer_class = VolunteerSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name_paternal', 'last_name_maternal', 'code', 'curp']
    ordering_fields = ['created_at', 'birth_date', 'code']

    @action(detail=False, methods=['POST'], url_path='import')
    def import_volunteers(self, request):
        file = request.FILES.get('file')
        
        if not file:
            return Response({"error": "No se proporcionó ningún archivo."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            try:
                df = pd.read_excel(file)
            except Exception:
                return Response({"error": "El archivo no es un Excel válido (.xlsx)."}, status=status.HTTP_400_BAD_REQUEST)

            # Normalizar columnas
            df.columns = [str(c).lower().strip() for c in df.columns]

            created_count = 0
            errors = []
            
            # Regex CURP
            curp_pattern = r'^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$'

            for index, row in df.iterrows():
                row_num = index + 2 

                try:
                    # 1. Función de limpieza
                    def clean(val): 
                        if pd.isna(val): return ""
                        return str(val).strip()

                    # 2. Validaciones de CURP
                    raw_curp = row.get('curp')
                    curp = clean(raw_curp).upper() if raw_curp else None

                    if not curp:
                        errors.append(f"Fila {row_num}: La CURP es obligatoria.")
                        continue

                    if len(curp) != 18:
                        errors.append(f"Fila {row_num}: La CURP '{curp}' debe tener 18 caracteres.")
                        continue

                    if not re.match(curp_pattern, curp):
                        errors.append(f"Fila {row_num}: La CURP '{curp}' tiene formato inválido.")
                        continue

                    if Volunteer.objects.filter(curp=curp).exists():
                        errors.append(f"Fila {row_num}: La CURP '{curp}' ya está registrada.")
                        continue

                    # 3. Datos del Voluntario
                    first_name = clean(row.get('nombre', row.get('first_name')))
                    paternal = clean(row.get('apellido paterno', row.get('last_name_paternal')))
                    
                    if not first_name or not paternal:
                        errors.append(f"Fila {row_num}: Falta Nombre o Apellido Paterno.")
                        continue

                    # Sexo (Normalización)
                    sex_val = clean(row.get('sexo', row.get('sex'))).upper()
                    if sex_val.startswith('H'): sex_val = 'M'
                    elif sex_val.startswith('M'): sex_val = 'F'
                    if sex_val not in ['M', 'F']:
                         # Si viene vacío o raro, asignamos None o reportamos error
                         sex_val = None 

                    # Fecha Nacimiento
                    birth_date = None
                    raw_date = row.get('fecha nacimiento', row.get('fecha de nacimiento'))
                    if pd.notna(raw_date) and str(raw_date).strip() != '':
                        try:
                            birth_date = pd.to_datetime(raw_date).date()
                        except:
                            pass # Si falla, se queda en None

                    # CÓDIGO (Importante: leerlo del excel si viene)
                    provided_code = clean(row.get('codigo', row.get('code')))
                    if not provided_code:
                        provided_code = None # Dejar que el modelo lo autogenere
                    elif Volunteer.objects.filter(code=provided_code).exists():
                        errors.append(f"Fila {row_num}: El código '{provided_code}' ya existe.")
                        continue

                    # 4. Creación
                    volunteer = Volunteer.objects.create(
                        code=provided_code,
                        first_name=first_name,
                        middle_name=clean(row.get('segundo nombre', row.get('middle_name'))),
                        last_name_paternal=paternal,
                        last_name_maternal=clean(row.get('apellido materno', row.get('last_name_maternal'))),
                        phone=clean(row.get('telefono', row.get('phone'))),
                        sex=sex_val,
                        curp=curp,
                        birth_date=birth_date
                        # ¡OJO! Eliminé 'email' porque tu modelo no lo tiene
                    )
                    created_count += 1

                    # 5. ASIGNACIÓN DE ESTUDIOS (Opcional, basado en tu imagen)
                    estudios_str = clean(row.get('estudios', row.get('studies')))
                    if estudios_str:
                        # Asumiendo formato: "Estudio A, Estudio B"
                        names = [s.strip() for s in estudios_str.split(',') if s.strip()]
                        for study_name in names:
                            study = Study.objects.filter(name__iexact=study_name).first()
                            if study:
                                Participation.objects.get_or_create(
                                    volunteer=volunteer,
                                    study=study
                                )
                
                except Exception as row_e:
                    errors.append(f"Fila {row_num}: Error técnico - {str(row_e)}")

            response_data = {
                "message": "Proceso finalizado.",
                "created": created_count,
                "errors": errors,
                "has_errors": len(errors) > 0
            }
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ParticipationViewSet(viewsets.ModelViewSet):
    queryset = Participation.objects.all()
    serializer_class = ParticipationSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]