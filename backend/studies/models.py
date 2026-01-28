from django.db import models
from datetime import date # Importante

class Study(models.Model):
    name = models.CharField(max_length=200, unique=True, verbose_name="Nombre del Estudio")
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