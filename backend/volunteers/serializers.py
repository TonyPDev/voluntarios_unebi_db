from rest_framework import serializers
from .models import Volunteer, Participation
from studies.models import Study
from auditing.models import AuditLog
from datetime import date, timedelta

class ParticipationSerializer(serializers.ModelSerializer):
    study_name = serializers.CharField(source='study.name', read_only=True)
    admission_date = serializers.DateField(source='study.admission_date', read_only=True)
    payment_date = serializers.DateField(source='study.payment_date', read_only=True)
    is_active = serializers.BooleanField(source='study.is_active', read_only=True)

    class Meta:
        model = Participation
        fields = ['id', 'volunteer', 'study', 'study_name', 'admission_date', 'payment_date', 'is_active']

class VolunteerSerializer(serializers.ModelSerializer):
    participations = ParticipationSerializer(many=True, read_only=True)
    
    status = serializers.SerializerMethodField()
    last_study = serializers.SerializerMethodField()
    active_study = serializers.SerializerMethodField()
    age = serializers.IntegerField(read_only=True) # Exponemos la edad calculada
    
    justification = serializers.CharField(write_only=True, required=False)
    initial_study_id = serializers.IntegerField(write_only=True, required=False)
    initial_admission_date = serializers.DateField(write_only=True, required=False)

    class Meta:
        model = Volunteer
        fields = [
            'id', 'code', 'first_name', 'middle_name', 'last_name_paternal', 
            'last_name_maternal', 'sex', 'phone', 'curp', 'birth_date', 'age', # Agregamos birth_date y age
            'created_at', 'participations', 'status', 'active_study', 'last_study',
            'manual_status', 'status_reason',
            'justification', 'initial_study_id', 'initial_admission_date'
        ]
        read_only_fields = ['code', 'age']

    def get_active_study(self, obj):
        active_part = obj.participations.filter(study__is_active=True).first()
        return active_part.study.name if active_part else None

    def get_last_study(self, obj):
        last = obj.participations.order_by('-id').first()
        return last.study.name if last else "-"

    def get_status(self, obj):
        today = date.today()
        
        # 1. PRIORIDAD MÁXIMA: En estudio activo
        active_part = obj.participations.filter(study__is_active=True).first()
        if active_part:
            if active_part.study.admission_date and active_part.study.admission_date > today:
                return "Estudio asignado"
            return "En estudio"
        
        # 2. VALIDACIÓN DE EDAD (Mayor a 55 años)
        # Si NO está en un estudio activo y tiene más de 55 años, es NO ELEGIBLE.
        if obj.age > 55:
            return "No elegible por edad"

        # 3. Periodo de lavado (En espera)
        last_paid = obj.participations.filter(study__payment_date__isnull=False).order_by('-study__payment_date').first()
        if last_paid:
            three_months_later = last_paid.study.payment_date + timedelta(days=90)
            if today < three_months_later:
                return "En espera (Descanso)"
        
        # 4. Estatus Administrativo Manual
        status_map = {
            'waiting_approval': 'En espera por aprobación',
            'eligible': 'Apto',
            'rejected': 'Rechazado'
        }
        return status_map.get(obj.manual_status, 'En espera por aprobación')

    def create(self, validated_data):
        study_id = validated_data.pop('initial_study_id', None)
        admission_date = validated_data.pop('initial_admission_date', None)
        
        volunteer = Volunteer.objects.create(**validated_data)

        if study_id:
            try:
                study = Study.objects.get(pk=study_id)
                Participation.objects.create(volunteer=volunteer, study=study)
            except Exception:
                pass 
        
        return volunteer

    def update(self, instance, validated_data):
        justification = validated_data.pop('justification', None)
        user = self.context['request'].user

        if not justification:
            raise serializers.ValidationError({"justification": "La justificación es obligatoria."})

        changes = {}
        for field, value in validated_data.items():
            old_value = getattr(instance, field)
            if old_value != value:
                changes[field] = {'from': str(old_value), 'to': str(value)}

        if changes:
            AuditLog.objects.create(
                user=user,
                action='UPDATE',
                model_affected='Volunteer',
                record_id=instance.code,
                changes=changes,
                justification=justification
            )

        return super().update(instance, validated_data)