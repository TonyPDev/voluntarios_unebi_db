from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from studies.models import Study
import datetime

class Volunteer(models.Model):
    SEX_CHOICES = [('M', 'Masculino'), ('F', 'Femenino')]
    
    # Datos Personales
    code = models.CharField(max_length=20, unique=True, editable=False, verbose_name="Código")
    first_name = models.CharField(max_length=100, verbose_name="Primer Nombre")
    middle_name = models.CharField(max_length=100, blank=True, null=True, verbose_name="Segundo Nombre")
    last_name_paternal = models.CharField(max_length=100, verbose_name="Apellido Paterno")
    last_name_maternal = models.CharField(max_length=100, verbose_name="Apellido Materno")
    sex = models.CharField(max_length=1, choices=SEX_CHOICES, verbose_name="Sexo")
    phone = models.CharField(max_length=20, verbose_name="Teléfono")
    curp = models.CharField(max_length=18, unique=True, verbose_name="CURP")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Generación automática de código si no existe
        if not self.code:
            self.code = self.generate_code()
        super().save(*args, **kwargs)

    def generate_code(self):
        # Lógica: Iniciales + Año + Consecutivo (Reseteable por año)
        initials = (
            self.first_name[0] + 
            self.last_name_paternal[0] + 
            self.last_name_maternal[0]
        ).upper()
        
        current_year = datetime.date.today().year
        
        # Contamos cuántos voluntarios se registraron este año para el consecutivo
        count = Volunteer.objects.filter(created_at__year=current_year).count() + 1
        
        # Formato: ABC-2026-0001
        return f"{initials}-{current_year}-{count:04d}"

    def __str__(self):
        return f"{self.code} - {self.first_name} {self.last_name_paternal}"

    @property
    def full_name(self):
        m_name = f" {self.middle_name}" if self.middle_name else ""
        return f"{self.first_name}{m_name} {self.last_name_paternal} {self.last_name_maternal}"


class Participation(models.Model):
    volunteer = models.ForeignKey(Volunteer, on_delete=models.CASCADE, related_name='participations')
    study = models.ForeignKey(Study, on_delete=models.PROTECT, related_name='participants')
    
    admission_date = models.DateField(verbose_name="Fecha de Internamiento")
    payment_date = models.DateField(null=True, blank=True, verbose_name="Fecha de Pago")
    
    # Estado derivado: Si tiene fecha de pago, se asume finalizado, si no, está activo.
    # O podemos agregar un booleano explícito si prefieres control manual.
    is_active = models.BooleanField(default=True, verbose_name="Actualmente Participando")

    class Meta:
        # Restricción DB: Un voluntario no puede tener dos participaciones activas al mismo tiempo
        constraints = [
            models.UniqueConstraint(
                fields=['volunteer'], 
                condition=models.Q(is_active=True), 
                name='unique_active_participation'
            )
        ]

    def clean(self):
        # Validación de Negocio: Regla de los 3 meses
        if self.pk is None: # Solo al crear nueva participación
            last_participation = Participation.objects.filter(
                volunteer=self.volunteer,
                payment_date__isnull=False
            ).order_by('-payment_date').first()

            if last_participation:
                three_months_later = last_participation.payment_date + datetime.timedelta(days=90)
                if datetime.date.today() < three_months_later:
                    raise ValidationError(
                        f"El voluntario no es apto. Su último pago fue el {last_participation.payment_date}. "
                        f"Debe esperar hasta el {three_months_later}."
                    )