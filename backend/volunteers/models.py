from django.db import models
from django.core.exceptions import ValidationError
from studies.models import Study
import datetime

class Volunteer(models.Model):
    SEX_CHOICES = [('M', 'Masculino'), ('F', 'Femenino')]
    
    MANUAL_STATUS_CHOICES = [
        ('waiting_approval', 'En espera por aprobación'),
        ('eligible', 'Apto'),
        ('rejected', 'Rechazado'),
    ]

    code = models.CharField(max_length=20, unique=True, editable=False)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name_paternal = models.CharField(max_length=100)
    last_name_maternal = models.CharField(max_length=100)
    
    # NUEVO CAMPO
    birth_date = models.DateField(verbose_name="Fecha de Nacimiento", null=True, blank=True)
    
    sex = models.CharField(max_length=1, choices=SEX_CHOICES)
    phone = models.CharField(max_length=20)
    curp = models.CharField(
        max_length=18, 
        unique=True, 
        verbose_name="CURP",
        error_messages={'unique': "Ya existe un voluntario registrado con esta CURP."}
    )
    
    manual_status = models.CharField(
        max_length=20, 
        choices=MANUAL_STATUS_CHOICES, 
        default='waiting_approval',
        verbose_name="Estatus Administrativo"
    )
    status_reason = models.TextField(blank=True, verbose_name="Motivo del Estatus")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.generate_code()
        super().save(*args, **kwargs)

    def generate_code(self):
        initials = (self.first_name[0] + self.last_name_paternal[0] + self.last_name_maternal[0]).upper()
        year = datetime.date.today().year
        count = Volunteer.objects.filter(created_at__year=year).count() + 1
        return f"{initials}-{year}-{count:04d}"
    
    @property
    def full_name(self):
         return f"{self.first_name} {self.last_name_paternal} {self.last_name_maternal}"

    # Helper para calcular edad
    @property
    def age(self):
        if not self.birth_date:
            return 0
        today = datetime.date.today()
        return today.year - self.birth_date.year - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))

# (El modelo Participation queda igual, no es necesario tocarlo)
class Participation(models.Model):
    volunteer = models.ForeignKey(Volunteer, on_delete=models.CASCADE, related_name='participations')
    study = models.ForeignKey(Study, on_delete=models.PROTECT, related_name='participants')

    def clean(self):
        active_participations = Participation.objects.filter(
            volunteer=self.volunteer,
            study__is_active=True
        ).exclude(pk=self.pk) 

        if active_participations.exists():
            raise ValidationError(f"El voluntario ya está participando en el estudio vigente: {active_participations.first().study.name}")

        last_paid_participation = Participation.objects.filter(
            volunteer=self.volunteer,
            study__payment_date__isnull=False
        ).order_by('-study__payment_date').first()

        if last_paid_participation:
            last_payment = last_paid_participation.study.payment_date
            three_months_later = last_payment + datetime.timedelta(days=90)
            
            if datetime.date.today() < three_months_later:
                raise ValidationError(
                    f"No apto. Su último estudio ({last_paid_participation.study.name}) se pagó el {last_payment}. "
                    f"Disponible a partir del: {three_months_later}."
                )