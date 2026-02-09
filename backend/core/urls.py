from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

# Importamos las vistas necesarias
from users.views import MyTokenObtainPairView, UserViewSet
from auditing.views import AuditLogViewSet

# Router para el panel de administración
admin_router = DefaultRouter()
admin_router.register(r'users', UserViewSet)
admin_router.register(r'logs', AuditLogViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Autenticación
    path('api/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # --- CORRECCIÓN AQUÍ ---
    # Cambiamos 'api/' por 'api/volunteers/' para que sea específico
    # y deje pasar a las demás rutas como 'studies' o 'admin'
    path('api/volunteers/', include('volunteers.urls')), 
    
    path('api/studies/', include('studies.urls')),
    
    # Rutas de Administración
    path('api/admin/', include(admin_router.urls)), 
]