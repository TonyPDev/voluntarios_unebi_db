from rest_framework import serializers
from .models import Volunteer, Participation
from studies.models import Study
from auditing.models import AuditLog
from datetime import date, timedelta

class ParticipationSerializer(serializers.ModelSerializer):
    study_name = serializers.CharField(source='study.name', read_only=True)
    # Traemos las fechas DEL ESTUDIO para mostrarlas en el frontend
    admission_date = serializers.DateField(source='study.admission_date', read_only=True)
    payment_date = serializers.DateField(source='study.payment_date', read_only=True)
    is_active = serializers.BooleanField(source='study.is_active', read_only=True)

    class Meta:
        model = Participation
        fields = ['id', 'volunteer', 'study', 'study_name', 'admission_date', 'payment_date', 'is_active']

class VolunteerSerializer(serializers.ModelSerializer):
    participations = ParticipationSerializer(many=True, read_only=True)
    is_eligible = serializers.SerializerMethodField()
    active_study = serializers.SerializerMethodField()
    
    justification = serializers.CharField(write_only=True, required=False)
    # Solo necesitamos el ID del estudio inicial
    initial_study_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Volunteer
        fields = [
            'id', 'code', 'first_name', 'middle_name', 'last_name_paternal', 
            'last_name_maternal', 'sex', 'phone', 'curp', 'created_at', 
            'participations', 'is_eligible', 'active_study', 'justification',
            'initial_study_id'
        ]
        read_only_fields = ['code']

    def get_active_study(self, obj):
        # Busca si tiene alguna participación en un estudio activo
        active_part = obj.participations.filter(study__is_active=True).first()
        return active_part.study.name if active_part else None

    def get_is_eligible(self, obj):
        # Lógica visual de los 3 meses
        last_part = obj.participations.filter(study__payment_date__isnull=False).order_by('-study__payment_date').first()
        if not last_part:
            return True
        return date.today() >= (last_part.study.payment_date + timedelta(days=90))

    def create(self, validated_data):
        study_id = validated_data.pop('initial_study_id', None)
        # Eliminamos la lógica de fechas aquí
        
        volunteer = Volunteer.objects.create(**validated_data)

        if study_id:
            try:
                study = Study.objects.get(pk=study_id)
                # Simplemente creamos el vínculo. Las fechas las pone el estudio.
                Participation.objects.create(volunteer=volunteer, study=study)
            except Exception:
                pass 
        
        return volunteer
    
    def update(self, instance, validated_data):
        justification = validated_data.pop('justification', None)
        user = self.context['request'].user

        # Validar que si hay cambios, exista justificación (excepto admins de TI quizás, pero dijiste SIEMPRE)
        if not justification:
            raise serializers.ValidationError({"justification": "La justificación es obligatoria para editar."})

        # Calculamos cambios para el log
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