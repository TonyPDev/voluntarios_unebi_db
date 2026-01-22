from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Creación'),
        ('UPDATE', 'Edición'),
        ('DELETE', 'Eliminación'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    model_affected = models.CharField(max_length=100) # Ej: Volunteer, Participation
    record_id = models.CharField(max_length=100)      # ID o Código del registro
    changes = models.JSONField(verbose_name="Cambios realizados") # Guardamos dict de {campo: {antes: x, despues: y}}
    justification = models.TextField(verbose_name="Justificación")
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp}"