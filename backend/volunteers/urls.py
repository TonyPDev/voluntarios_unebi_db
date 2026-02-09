from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VolunteerViewSet, ImportVolunteersView 

router = DefaultRouter()
router.register(r'', VolunteerViewSet, basename='volunteers')

urlpatterns = [
    path('import/', ImportVolunteersView.as_view(), name='import-volunteers'),
    path('', include(router.urls)),
]