from rest_framework import serializers
from .models import Volunteer, Participation
from studies.models import Study
from auditing.models import AuditLog
from datetime import date, timedelta

class ParticipationSerializer(serializers.ModelSerializer):
    study_name = serializers.CharField(source='study.name', read_only=True)
    
    class Meta:
        model = Participation
        fields = '__all__'

class VolunteerSerializer(serializers.ModelSerializer):
    participations = ParticipationSerializer(many=True, read_only=True)
    is_eligible = serializers.SerializerMethodField()
    active_study = serializers.SerializerMethodField()
    
    # Campo "solo escritura" para recibir la justificación desde el Frontend
    justification = serializers.CharField(write_only=True, required=False)
    initial_study_id = serializers.IntegerField(write_only=True, required=False)
    initial_admission_date = serializers.DateField(write_only=True, required=False)

    class Meta:
        model = Volunteer
        fields = [
            'id', 'code', 'first_name', 'middle_name', 'last_name_paternal', 
            'last_name_maternal', 'sex', 'phone', 'curp', 'created_at', 
            'participations', 'is_eligible', 'active_study', 'justification',
            'initial_study_id', 'initial_admission_date' # <--- Agregados
        ]
        read_only_fields = ['code']

    def create(self, validated_data):
        # Sacamos los datos del estudio inicial
        study_id = validated_data.pop('initial_study_id', None)
        admission_date = validated_data.pop('initial_admission_date', None)
        
        # Creamos al voluntario
        volunteer = Volunteer.objects.create(**validated_data)

        # Si venía estudio, creamos la participación
        if study_id and admission_date:
            try:
                study = Study.objects.get(pk=study_id)
                Participation.objects.create(
                    volunteer=volunteer,
                    study=study,
                    admission_date=admission_date,
                    is_active=True
                )
            except Study.DoesNotExist:
                pass # O manejar error
        
        return volunteer

    def get_active_study(self, obj):
        # Retorna el nombre del estudio si está activo actualmente
        active = obj.participations.filter(is_active=True).first()
        return active.study.name if active else None

    def get_is_eligible(self, obj):
        # Lógica de los 3 meses para mostrar en el frontend (visual)
        last_part = obj.participations.filter(payment_date__isnull=False).order_by('-payment_date').first()
        if not last_part:
            return True
        return date.today() >= (last_part.payment_date + timedelta(days=90))

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