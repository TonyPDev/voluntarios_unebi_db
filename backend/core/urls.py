from django.contrib import admin
from django.urls import path, include
from auditing.views import AuditLogViewSet
from users.views import UserViewSet
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register(r'logs', AuditLogViewSet)
router.register(r'users', UserViewSet)


urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Autenticación JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'), # Login
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Apps
    path('api/volunteers/', include('volunteers.urls')), # Asumiendo que crearás urls.py en volunteers
    path('api/studies/', include('studies.urls')), 
    path('api/admin/', include(router.urls)),
]