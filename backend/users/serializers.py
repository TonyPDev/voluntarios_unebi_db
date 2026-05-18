from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.core.cache import cache
from rest_framework.exceptions import PermissionDenied

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

    def validate(self, attrs):
        request = self.context.get('request')
        
        # 1. Obtener IP manejando posibles cabeceras de proxies
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
            
        username = attrs.get('username')

        # 2. Llaves únicas para la memoria caché
        cache_key_ip = f'lockout_ip_{ip}'
        cache_key_user = f'lockout_user_{username}'

        attempts_ip = cache.get(cache_key_ip, 0)
        attempts_user = cache.get(cache_key_user, 0)

        # 3. Bloqueo si excedió el límite (5 intentos)
        if attempts_ip >= 5 or attempts_user >= 5:
            raise PermissionDenied(
                "Demasiados intentos fallidos. Por seguridad, el acceso ha sido bloqueado por 15 minutos."
            )

        # 4. Intento de validación
        try:
            data = super().validate(attrs)
        except Exception:
            # Incrementar el contador de fallos con un timeout de 900 segundos (15 minutos)
            cache.set(cache_key_ip, attempts_ip + 1, timeout=900)
            cache.set(cache_key_user, attempts_user + 1, timeout=900)
            
            intentos_restantes = 5 - (attempts_ip + 1)
            
            if intentos_restantes > 0:
                raise serializers.ValidationError({
                    "detail": f"Credenciales inválidas. Intentos restantes: {intentos_restantes}"
                })
            else:
                raise PermissionDenied(
                    "Demasiados intentos fallidos. Por seguridad, el acceso ha sido bloqueado por 15 minutos."
                )

        # 5. Si el login es exitoso, limpiar los contadores de fallos
        cache.delete(cache_key_ip)
        cache.delete(cache_key_user)

        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Agregamos datos extra al token
        token['username'] = user.username
        token['is_staff'] = user.is_staff
        token['full_name'] = f"{user.first_name} {user.last_name}".strip()
        
        return token