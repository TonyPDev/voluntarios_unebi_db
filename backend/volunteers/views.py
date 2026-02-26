import pandas as pd
import numpy as np
import re
import os
from datetime import date, timedelta
from django.conf import settings
from django.http import HttpResponse
from rest_framework import viewsets, status, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAdminUser
from django.db.models import Q

from .models import Volunteer, Participation
from studies.models import Study
from auditing.models import AuditLog
from .serializers import VolunteerSerializer, ParticipationSerializer
from .permissions import IsAdminOrReadOnly

class VolunteerViewSet(viewsets.ModelViewSet):
    queryset = Volunteer.objects.all().order_by('-created_at')
    serializer_class = VolunteerSerializer
    permission_classes = [IsAdminOrReadOnly]
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name_paternal', 'last_name_maternal', 'code', 'curp']
    ordering_fields = ['created_at', 'birth_date', 'code']

    # --- MÉTODO AUXILIAR PARA CALCULAR ESTATUS (Debe coincidir con Serializer) ---
    def calculate_status(self, volunteer):
        today = date.today()
        
        # 1. En estudio activo
        active_part = volunteer.participations.filter(study__is_active=True).first()
        if active_part:
            if volunteer.manual_status == 'in_study':
                return "En estudio"
            else:
                return "Estudio asignado"
        
        # 2. Edad
        if volunteer.age and volunteer.age > 55:
            return "No elegible por edad"

        # 3. Periodo de Lavado
        last_paid = volunteer.participations.filter(study__payment_date__isnull=False).order_by('-study__payment_date').first()
        if last_paid:
            three_months_later = last_paid.study.payment_date + timedelta(days=90)
            if today < three_months_later:
                return "En espera (Descanso)"
            elif volunteer.manual_status != 'rejected':
                return "Reevaluación"
        
        # 4. Fallback Manual
        status_map = {
            'waiting_approval': 'En espera por aprobación',
            'eligible': 'Apto',
            'rejected': 'Rechazado',
            'in_study': 'En estudio',
            'study_assigned': 'Estudio asignado',
            'reevaluation': 'Reevaluación',
            'age_mismatch': 'No elegible por edad'
        }
        return status_map.get(volunteer.manual_status, 'En espera por aprobación')

    @action(detail=True, methods=['post'], url_path='add-participation')
    def add_participation(self, request, pk=None):
        volunteer = self.get_object()
        user = request.user
        
        if not user.is_staff:
             return Response({"detail": "No autorizado"}, status=status.HTTP_403_FORBIDDEN)

        justification = request.data.get('justification')
        if not justification:
            return Response({"detail": "La justificación es requerida."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data.copy()
        data['volunteer'] = volunteer.id
        if 'study_id' in data:
            data['study'] = data.pop('study_id')

        serializer = ParticipationSerializer(data=data)
        if serializer.is_valid():
            participation = serializer.save()
            
            volunteer.manual_status = 'study_assigned'
            volunteer.save()

            AuditLog.objects.create(
                user=user,
                action='CREATE',
                model_affected='Participation',
                record_id=volunteer.code or str(volunteer.id),
                changes={'Acción': 'Asignación Manual', 'Estudio': participation.study.name},
                justification=justification
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='remove-current-study')
    def remove_current_study(self, request, pk=None):
        volunteer = self.get_object()
        user = request.user
        
        if not user.is_staff:
             return Response({"detail": "No autorizado"}, status=status.HTTP_403_FORBIDDEN)

        justification = request.data.get('justification')
        if not justification:
            return Response({"detail": "La justificación es requerida para auditoría."}, status=status.HTTP_400_BAD_REQUEST)

        last_participation = volunteer.participations.order_by('-id').first()
        
        if not last_participation:
            return Response({"detail": "No se encontró ningún estudio para eliminar."}, status=status.HTTP_400_BAD_REQUEST)

        study_name = last_participation.study.name
        last_participation.delete()
        
        previous_status = volunteer.manual_status
        volunteer.manual_status = 'eligible'
        volunteer.save()

        AuditLog.objects.create(
            user=user,
            action='DELETE',
            model_affected='Participation',
            record_id=volunteer.code or str(volunteer.id),
            changes={
                'Acción': 'Desasignación de Estudio', 
                'Estudio Quitado': study_name, 
                'Estatus Anterior': previous_status,
                'Nuevo Estatus': 'Apto'
            },
            justification=justification
        )
        
        return Response({
            "detail": "Estudio desasignado correctamente.",
            "new_status": "Apto"
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='change-current-study')
    def change_current_study(self, request, pk=None):
        volunteer = self.get_object()
        user = request.user
        
        if not user.is_staff:
             return Response({"detail": "No autorizado"}, status=status.HTTP_403_FORBIDDEN)

        justification = request.data.get('justification')
        new_study_id = request.data.get('new_study_id')

        if not justification or not new_study_id:
            return Response({"detail": "La justificación y el nuevo estudio son requeridos."}, status=status.HTTP_400_BAD_REQUEST)

        current_participation = volunteer.participations.order_by('-id').first()
        
        if not current_participation:
            return Response({"detail": "El voluntario no tiene un estudio asignado actualmente."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_study = Study.objects.get(pk=new_study_id)
        except Study.DoesNotExist:
            return Response({"detail": "El estudio seleccionado no existe."}, status=status.HTTP_404_NOT_FOUND)

        old_study_name = current_participation.study.name
        
        current_participation.study = new_study
        current_participation.save()

        AuditLog.objects.create(
            user=user,
            action='UPDATE',
            model_affected='Participation',
            record_id=volunteer.code or str(volunteer.id),
            changes={
                'Acción': 'Cambio de Estudio (Swap)', 
                'De': old_study_name, 
                'A': new_study.name
            },
            justification=justification
        )
        
        return Response({
            "detail": f"Estudio cambiado de {old_study_name} a {new_study.name} correctamente."
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='download-template')
    def download_template(self, request):
        file_path = os.path.join(settings.BASE_DIR, 'volunteers', 'files', 'plantilla_voluntarios.xlsx')
        if os.path.exists(file_path):
            with open(file_path, 'rb') as fh:
                response = HttpResponse(fh.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                response['Content-Disposition'] = 'attachment; filename="plantilla_voluntarios.xlsx"'
                return response
        else:
            return Response({"error": "El archivo de plantilla no se encuentra en el servidor."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='export')
    def export_data(self, request):
        target_tab = request.query_params.get('tab', 'todos')
        ids_param = request.query_params.get('ids', None)
        
        volunteers = self.get_queryset()

        if ids_param:
            try:
                ids_list = [int(x) for x in ids_param.split(',') if x.isdigit()]
                volunteers = volunteers.filter(id__in=ids_list)
                target_tab = "seleccionados"
            except ValueError:
                pass

        data = []

        for v in volunteers:
            real_status = self.calculate_status(v)
            
            include_row = True
            
            if not ids_param and target_tab != 'todos':
                if target_tab == 'aptos' and real_status != "Apto":
                    include_row = False
                elif target_tab == 'en_estudio' and real_status != "En estudio":
                    include_row = False
                elif target_tab == 'asignado' and real_status != "Estudio asignado":
                    include_row = False
                elif target_tab == 'por_aprobacion' and real_status != "En espera por aprobación":
                    include_row = False
                elif target_tab == 'descanso' and real_status != "En espera (Descanso)":
                    include_row = False
                elif target_tab == 'reevaluacion' and real_status != "Reevaluación":
                    include_row = False
                elif target_tab == 'edad' and real_status != "No elegible por edad":
                    include_row = False
                elif target_tab == 'rechazados' and not ("Rechazado" in real_status):
                    include_row = False

            if include_row:
                fecha_nac = v.birth_date.strftime('%d/%m/%Y') if v.birth_date else ""
                estudios = ", ".join([p.study.name for p in v.participations.all()])
                
                # CORRECCIÓN: Manejo robusto del display de contactado
                contacted_val = v.contacted
                # Si por error de migración es un booleano o string 'false'
                if str(contacted_val).lower() == 'false' or contacted_val is False:
                    contacted_display = "No contactado"
                else:
                    contacted_display = v.get_contacted_display()

                row = {
                    'Codigo': v.code,
                    'Nombre': v.first_name,
                    'Segundo Nombre': v.middle_name,
                    'Apellido Paterno': v.last_name_paternal,
                    'Apellido Materno': v.last_name_maternal,
                    'Fecha Nacimiento': fecha_nac,
                    'Sexo': v.sex,
                    'CURP': v.curp,
                    'Telefono': v.phone,
                    'Estudios': estudios,
                    'Estatus Actual': real_status,
                    'Contactado': contacted_display
                }
                data.append(row)

        df = pd.DataFrame(data)
        filename = f"voluntarios_{target_tab}.xlsx"
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        df.to_excel(response, index=False)
        return response

class ParticipationViewSet(viewsets.ModelViewSet):
    queryset = Participation.objects.all()
    serializer_class = ParticipationSerializer
    permission_classes = [IsAdminOrReadOnly]

class ImportVolunteersView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser]

    def post(self, request, format=None):
        if 'file' not in request.data:
            return Response({"error": "No se proporcionó ningún archivo."}, status=status.HTTP_400_BAD_REQUEST)
        file = request.data['file']
        try:
            try:
                df = pd.read_excel(file)
            except Exception:
                return Response({"error": "El archivo no es un Excel válido (.xlsx)."}, status=status.HTTP_400_BAD_REQUEST)

            df = df.replace({np.nan: None})
            df.columns = [str(c).lower().strip() for c in df.columns]

            created_count = 0
            errors = []
            curp_pattern = r'^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$'

            for index, row in df.iterrows():
                row_num = index + 2
                try:
                    def clean(val): 
                        if pd.isna(val) or val is None or str(val).strip() == "": return None
                        return str(val).strip()

                    raw_curp = row.get('curp')
                    curp = clean(raw_curp)
                    if curp:
                        curp = curp.upper()
                        if len(curp) != 18:
                            errors.append(f"Fila {row_num}: La CURP '{curp}' debe tener 18 caracteres.")
                            continue
                        if not re.match(curp_pattern, curp):
                            errors.append(f"Fila {row_num}: La CURP '{curp}' tiene formato inválido.")
                            continue
                        if Volunteer.objects.filter(curp=curp).exists():
                            errors.append(f"Fila {row_num}: La CURP '{curp}' ya se encuentra registrada.")
                            continue
                    
                    first_name = clean(row.get('nombre', row.get('first_name')))
                    paternal = clean(row.get('apellido paterno', row.get('last_name_paternal')))
                    
                    if not first_name or not paternal:
                        errors.append(f"Fila {row_num}: Faltan datos obligatorios (Nombre o Apellido Paterno).")
                        continue

                    provided_code = clean(row.get('codigo', row.get('code')))
                    if provided_code:
                        if Volunteer.objects.filter(code=provided_code).exists():
                            errors.append(f"Fila {row_num}: El código '{provided_code}' ya existe.")
                            continue

                    sex_val = clean(row.get('sexo', row.get('sex')))
                    final_sex = None
                    if sex_val:
                        val = sex_val.upper().strip()
                        if val == 'M': final_sex = 'M'
                        elif val == 'F': final_sex = 'F'
                        elif val.startswith('H'): final_sex = 'M'
                        elif 'MUJER' in val or 'FEM' in val: final_sex = 'F'
                        elif val.startswith('M'): final_sex = 'M'

                    birth_date = None
                    raw_date = row.get('fecha nacimiento', row.get('fecha de nacimiento'))
                    if raw_date:
                        try:
                            birth_date = pd.to_datetime(raw_date).date()
                        except: pass

                    phone = clean(row.get('telefono', row.get('phone'))) or ""

                    volunteer = Volunteer.objects.create(
                        code=provided_code,
                        first_name=first_name,
                        middle_name=clean(row.get('segundo nombre', row.get('middle_name'))),
                        last_name_paternal=paternal,
                        last_name_maternal=clean(row.get('apellido materno', row.get('last_name_maternal'))),
                        phone=phone,
                        sex=final_sex,
                        curp=curp,
                        birth_date=birth_date,
                        manual_status='waiting_approval'
                    )
                    created_count += 1

                    estudios_str = clean(row.get('estudios', row.get('studies')))
                    if estudios_str:
                        names = [s.strip() for s in estudios_str.split(',') if s.strip()]
                        for study_name in names:
                            study = Study.objects.filter(name__iexact=study_name).first()
                            if study:
                                Participation.objects.get_or_create(volunteer=volunteer, study=study)
                
                except Exception as row_error:
                    errors.append(f"Fila {row_num}: Error técnico - {str(row_error)}")

            return Response({
                "message": "Proceso de importación finalizado.",
                "created": created_count,
                "errors": errors,
                "has_errors": len(errors) > 0
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Error crítico al procesar archivo: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)