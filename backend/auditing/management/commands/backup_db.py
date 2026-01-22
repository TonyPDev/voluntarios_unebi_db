import os
import subprocess
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Genera un respaldo de la base de datos PostgreSQL'

    def handle(self, *args, **kwargs):
        db = settings.DATABASES['default']

        db_name = db['NAME']
        db_user = db['USER']
        db_pass = db['PASSWORD']
        db_host = db['HOST']
        db_port = db['PORT']

        backup_dir = os.path.join(settings.BASE_DIR, 'backups')
        os.makedirs(backup_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        filename = f"backup_{db_name}_{timestamp}.dump"
        filepath = os.path.join(backup_dir, filename)

        os.environ['PGPASSWORD'] = db_pass

        cmd = [
            "pg_dump",
            "-h", db_host,
            "-p", str(db_port),
            "-U", db_user,
            "-F", "c",
            "-b",
            "-f", filepath,
            db_name
        ]

        try:
            subprocess.run(cmd, check=True)
            self.stdout.write(
                self.style.SUCCESS(f'Backup creado exitosamente: {filename}')
            )
        except subprocess.CalledProcessError as e:
            self.stdout.write(
                self.style.ERROR(f'Error creando backup: {e}')
            )
        finally:
            os.environ.pop('PGPASSWORD', None)
