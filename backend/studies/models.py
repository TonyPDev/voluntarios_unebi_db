from django.db import models

class Study(models.Model):
    name = models.CharField(max_length=200, unique=True, verbose_name="Nombre del Estudio")
    description = models.TextField(blank=True, verbose_name="Descripción")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({'Activo' if self.is_active else 'Finalizado'})"