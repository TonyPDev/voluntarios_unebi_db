from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VolunteerViewSet, ParticipationViewSet, ImportVolunteersView

router = DefaultRouter()

router.register(r'', VolunteerViewSet, basename='volunteer')

router.register(r'participations', ParticipationViewSet, basename='participation')

urlpatterns = [
    path('import/', ImportVolunteersView.as_view(), name='import-volunteers'),
    
    path('', include(router.urls)),
]