from rest_framework import serializers
from .models import Study

class StudySerializer(serializers.ModelSerializer):
    class Meta:
        model = Study
        fields = ['id', 'name', 'description', 'admission_date', 'payment_date', 'is_active']