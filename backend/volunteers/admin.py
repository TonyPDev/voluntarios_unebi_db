from django.contrib import admin
from .models import Volunteer, Participation

class ParticipationInline(admin.TabularInline):
    model = Participation
    extra = 0 # No muestra filas vacías extra
    autocomplete_fields = ['study'] # Útil si tienes muchos estudios
    readonly_fields = ['get_study_status']

    def get_study_status(self, obj):
        if obj.study.is_active:
            return "Vigente"
        return "Finalizado"
    get_study_status.short_description = "Estado del Estudio"

@admin.register(Volunteer)
class VolunteerAdmin(admin.ModelAdmin):
    # Columnas que se ven en la lista (igual que tu SmartTable)
    list_display = ('code', 'full_name', 'age_display', 'curp', 'phone', 'manual_status_colored')
    
    # Buscador (por nombre, código o curp)
    search_fields = ('code', 'first_name', 'last_name_paternal', 'last_name_maternal', 'curp')
    
    # Filtros laterales
    list_filter = ('sex', 'manual_status', 'created_at')
    
    # Edición de participaciones dentro del voluntario
    inlines = [ParticipationInline]

    # Campos de solo lectura (como el código autogenerado)
    readonly_fields = ('code', 'created_at', 'updated_at')

    # Configuración del formulario de edición
    fieldsets = (
        ('Información Personal', {
            'fields': (
                ('first_name', 'middle_name'),
                ('last_name_paternal', 'last_name_maternal'),
                ('birth_date', 'sex'),
                ('curp', 'phone')
            )
        }),
        ('Estatus Administrativo', {
            'fields': ('manual_status', 'status_reason'),
            'classes': ('collapse',) # Se puede colapsar
        }),
        ('Metadatos', {
            'fields': ('code', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    # Método para mostrar la edad (calculada)
    def age_display(self, obj):
        return obj.age
    age_display.short_description = "Edad"

    # Método para colorear el estatus (opcional, visual)
    def manual_status_colored(self, obj):
        from django.utils.html import format_html
        colors = {
            'eligible': 'green',
            'waiting_approval': 'orange',
            'rejected': 'red',
        }
        color = colors.get(obj.manual_status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_manual_status_display()
        )
    manual_status_colored.short_description = "Estatus"