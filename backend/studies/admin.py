from django.contrib import admin
from .models import Study

@admin.register(Study)
class StudyAdmin(admin.ModelAdmin):
    list_display = ('name', 'admission_date', 'payment_date', 'is_active_colored')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    ordering = ('-created_at',)
    
    # Habilitar búsqueda para el autocompletado en Voluntarios
    search_fields = ['name'] 

    def is_active_colored(self, obj):
        return obj.is_active
    is_active_colored.boolean = True # Muestra iconito de check/cruz
    is_active_colored.short_description = "Vigente"