from django.db import models
from django.core.validators import RegexValidator
import uuid

class Volunteer(models.Model):
    id = models.BigAutoField(primary_key=True)
    
    code = models.CharField(max_length=20, unique=True, blank=True, null=True)
    
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name_paternal = models.CharField(max_length=100)
    last_name_maternal = models.CharField(max_length=100, blank=True, null=True)
    
    birth_date = models.DateField(blank=True, null=True)
    
    SEX_CHOICES = [('M', 'Masculino'), ('F', 'Femenino')]
    sex = models.CharField(max_length=1, choices=SEX_CHOICES, blank=True, null=True)
    
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
        ('reevaluation', 'Reevaluación'), 
    ]
    manual_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting_approval')
    
    REJECTION_CHOICES = [
        ('IMC', 'IMC'),
        ('Laboratoriales', 'Laboratoriales'),
        ('Incumplimiento', 'Incumplimiento'),
        ('Otro', 'Otro'),
    ]
    rejection_category = models.CharField(max_length=20, choices=REJECTION_CHOICES, blank=True, null=True, verbose_name="Categoría de Rechazo")
    
    status_reason = models.TextField(blank=True, null=True, verbose_name="Observaciones / Motivo")
    
    # Nuevos estados de contacto solicitados
    CONTACT_STATUS_CHOICES = [
        ('not_contacted', 'No contactado'),       # Gris
        ('contacted_yes', 'Contactado (Sí)'),     # Verde
        ('contacted_no_response', 'No respondió'),# Amarillo
        ('contacted_rejected', 'Rechazó'),        # Rojo
    ]
    contacted = models.CharField(
        max_length=30, 
        choices=CONTACT_STATUS_CHOICES, 
        default='not_contacted', 
        verbose_name="Estatus de Contacto"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            from datetime import date
            today = date.today()
            current_year = today.year 

            ini_nom = self.first_name.strip()[0].upper()
            ini_pat = self.last_name_paternal.strip()[0].upper()
            if self.last_name_maternal and self.last_name_maternal.strip():
                ini_mat = self.last_name_maternal.strip()[0].upper()
            else:
                ini_mat = 'X'
            
            initials = f"{ini_nom}{ini_pat}{ini_mat}"

            existing_codes = Volunteer.objects.filter(
                code__contains=f"-{current_year}-"
            ).values_list('code', flat=True)
            
            max_sequence = 0
            for code in existing_codes:
                try:
                    parts = code.split('-')
                    if len(parts) >= 3 and parts[-1].isdigit():
                        sequence = int(parts[-1])
                        if sequence > max_sequence:
                            max_sequence = sequence
                except (ValueError, IndexError):
                    continue
            
            new_sequence = max_sequence + 1
            self.code = f"{initials}-{current_year}-{new_sequence:04d}"
            
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