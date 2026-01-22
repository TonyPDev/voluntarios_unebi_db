import pandas as pd
from django.core.management.base import BaseCommand
from volunteers.models import Volunteer, Participation
from studies.models import Study
from django.utils.dateparse import parse_date
import datetime

class Command(BaseCommand):
    help = 'Importar voluntarios desde un archivo Excel'

    def add_arguments(self, parser):
        parser.add_argument('excel_file', type=str, help='Ruta del archivo Excel')

    def handle(self, *args, **kwargs):
        file_path = kwargs['excel_file']
        
        self.stdout.write(f"Leyendo archivo: {file_path}...")
        
        try:
            # Asumimos que las columnas del Excel se llaman así (ajústalo a tu excel real)
            df = pd.read_excel(file_path)
            # Normalizar nombres de columnas a minúsculas para evitar errores
            df.columns = df.columns.str.lower().str.strip()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error leyendo el archivo: {e}"))
            return

        count_created = 0
        count_updated = 0

        for index, row in df.iterrows():
            try:
                # 1. Extracción de datos (Ajusta los nombres de las claves según tu Excel)
                # Ejemplo: row.get('nombre completo', '')
                
                # Asumiremos que el Excel tiene columnas separadas o trataremos de separar el nombre
                # Aquí hago una lógica simple, pero lo ideal es que el Excel tenga columnas separadas
                full_name = str(row.get('nombre', '')).strip()
                parts = full_name.split()
                
                first_name = parts[0] if len(parts) > 0 else "SinNombre"
                # Lógica básica de separación (puede fallar con nombres compuestos, ojo aquí)
                if len(parts) >= 3:
                    last_name_p = parts[-2]
                    last_name_m = parts[-1]
                    middle_name = " ".join(parts[1:-2])
                elif len(parts) == 2:
                    last_name_p = parts[1]
                    last_name_m = "X" # Placeholder si falta
                    middle_name = ""
                else:
                    last_name_p = "X"
                    last_name_m = "X"
                    middle_name = ""

                curp = str(row.get('curp', '')).strip().upper()
                phone = str(row.get('telefono', ''))
                sex = str(row.get('sexo', 'M'))[0].upper() # Tomamos la primera letra

                # 2. Crear o Actualizar Voluntario
                volunteer, created = Volunteer.objects.update_or_create(
                    curp=curp,
                    defaults={
                        'first_name': first_name,
                        'middle_name': middle_name,
                        'last_name_paternal': last_name_p,
                        'last_name_maternal': last_name_m,
                        'sex': sex,
                        'phone': phone,
                    }
                )

                if created:
                    count_created += 1
                else:
                    count_updated += 1

                # 3. Importar Estudio (Si el Excel dice en qué estudio participó)
                study_name = str(row.get('estudio', '')).strip()
                fecha_pago = row.get('fecha pago') # Asumiendo columna 'fecha pago'
                
                if study_name and study_name.lower() != 'nan':
                    # Buscamos o creamos el estudio (para que no falle la importación)
                    study, _ = Study.objects.get_or_create(name=study_name)
                    
                    # Verificamos si es fecha válida
                    if pd.isnull(fecha_pago):
                        p_date = None
                    else:
                        # Pandas a veces trae Timestamp, lo pasamos a date
                        p_date = fecha_pago.date() if isinstance(fecha_pago, datetime.datetime) else None

                    # Creamos la participación histórica
                    # OJO: Asumimos fecha de internamiento hoy si no viene en el excel, o pon una por defecto
                    Participation.objects.get_or_create(
                        volunteer=volunteer,
                        study=study,
                        defaults={
                            'admission_date': datetime.date.today(), # Ajustar si el excel tiene esta fecha
                            'payment_date': p_date,
                            'is_active': False if p_date else True
                        }
                    )

            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Error en fila {index}: {e}"))
                continue

        self.stdout.write(self.style.SUCCESS(f"Importación completada. Creados: {count_created}, Actualizados: {count_updated}"))