from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action_colored', 'model_affected', 'record_id')
    list_filter = ('action', 'model_affected', 'timestamp')
    search_fields = ('user__username', 'record_id', 'justification')
    readonly_fields = ('timestamp', 'user', 'action', 'model_affected', 'record_id', 'changes', 'justification')

    def has_add_permission(self, request):
        return False # Nadie puede crear logs manualmente desde aquí
    
    def has_change_permission(self, request, obj=None):
        return False # Nadie puede editar los logs (son inmutables)

    def action_colored(self, obj):
        from django.utils.html import format_html
        colors = {
            'CREATE': 'green',
            'UPDATE': 'blue',
            'DELETE': 'red',
        }
        return format_html(
            '<strong style="color: {};">{}</strong>',
            colors.get(obj.action, 'black'),
            obj.get_action_display()
        )
    action_colored.short_description = "Acción"