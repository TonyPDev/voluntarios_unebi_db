from django.db import models
from django.core.validators import RegexValidator
import uuid

class Volunteer(models.Model):
    # Generamos UUID por si no traen CURP, para tener algo único interno
    id = models.BigAutoField(primary_key=True)
    
    # CÓDIGO: Ahora editable para poder importarlo, pero se autogenera si viene vacío
    code = models.CharField(max_length=20, unique=True, blank=True, null=True)
    
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name_paternal = models.CharField(max_length=100)
    
    # CAMPOS OPCIONALES (null=True, blank=True)
    last_name_maternal = models.CharField(max_length=100, blank=True, null=True)
    
    # La fecha puede ser nula
    birth_date = models.DateField(blank=True, null=True)
    
    SEX_CHOICES = [('M', 'Masculino'), ('F', 'Femenino')]
    sex = models.CharField(max_length=1, choices=SEX_CHOICES, blank=True, null=True)
    
    # CURP opcional, pero si la ponen debe ser única
    curp = models.CharField(
        max_length=18, 
        unique=True, 
        blank=True, 
        null=True,
        validators=[RegexValidator(r'^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$', 'Formato CURP inválido')]
    )
    
    phone = models.CharField(max_length=20, blank=True, null=True)
    
    STATUS_CHOICES = [
        ('waiting_approval', 'En espera por aprobación'),
        ('eligible', 'Apto'),
        ('rejected', 'Rechazado'),
        ('age_mismatch', 'No elegible por edad'),
        ('in_study', 'En estudio'),
        ('study_assigned', 'Estudio asignado'),
        ('standby', 'En espera (Descanso)'),
    ]
    manual_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting_approval')
    status_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Lógica para autogenerar código SOLO si no se proporcionó uno
        if not self.code:
            year_suffix = str(self.created_at.year)[-2:] if self.created_at else '26'
            # Buscamos el último consecutivo de ese año
            last = Volunteer.objects.filter(code__endswith=f"-{year_suffix}").count() + 1
            self.code = f"V-{year_suffix}-{last:04d}"
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name_paternal} ({self.code})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.middle_name or ''} {self.last_name_paternal} {self.last_name_maternal or ''}".strip()

    @property
    def status(self):
        return self.get_manual_status_display()
        
    @property
    def age(self):
        if not self.birth_date:
            return None
        from datetime import date
        today = date.today()
        return today.year - self.birth_date.year - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))

class Participation(models.Model):
    volunteer = models.ForeignKey(Volunteer, related_name='participations', on_delete=models.CASCADE)
    study = models.ForeignKey('studies.Study', on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.volunteer.code} - {self.study.name}"
    
    @property
    def study_name(self):
        return self.study.name