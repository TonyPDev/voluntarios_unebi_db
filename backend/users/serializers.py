from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_staff', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    # Traducción del mensaje de error de credenciales inválidas
    default_error_messages = {
        'no_active_account': 'No se encontró una cuenta activa con estas credenciales. Verifique usuario y contraseña.',
    }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Agregamos datos extra al token
        token['username'] = user.username
        token['is_staff'] = user.is_staff
        token['full_name'] = f"{user.first_name} {user.last_name}".strip()
        
        return token