from django.db import models
from datetime import date

class Study(models.Model):
    name = models.CharField(max_length=200, unique=True, verbose_name="Nombre del Estudio")
    sponsor = models.CharField(max_length=200, blank=True, null=True, verbose_name="Patrocinador")
    molecules = models.JSONField(default=list, blank=True, null=True, verbose_name="Moléculas")
    doses = models.JSONField(default=list, blank=True, null=True, verbose_name="Dosis")
    description = models.TextField(blank=True, verbose_name="Descripción")
    
    admission_date = models.DateField(null=True, blank=True, verbose_name="Fecha de Internamiento")
    payment_date = models.DateField(null=True, blank=True, verbose_name="Fecha de Pago")
    
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.payment_date and self.payment_date < date.today():
            self.is_active = False
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({'Activo' if self.is_active else 'Finalizado'})"