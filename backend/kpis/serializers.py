# backend/kpis/serializers.py
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import SavedKpi

class SavedKpiSerializer(serializers.ModelSerializer):
    summary = serializers.SerializerMethodField()

    class Meta:
        model = SavedKpi
        fields = ['id', 'data', 'summary', 'saved_at']
        read_only_fields = ['saved_at', 'summary']

    def get_summary(self, obj):
        # The payload we saved from the frontend looks like:
        # { "data": { "kpis": [...], "areaKm2": 1.23, "areaInfo": {...} } }
        try:
            inner = obj.data.get('data', {}) if isinstance(obj.data, dict) else {}
            kpis = inner.get('kpis', []) or []
            # Take up to 2 KPIs for a preview
            preview = [
                {
                    'label': k.get('label'),
                    'value': k.get('value'),
                    'unit': k.get('unit'),
                }
                for k in kpis[:2]
            ]
            return {
                'areaKm2': inner.get('areaKm2'),
                'source': (inner.get('areaInfo') or {}).get('source'),
                'kpiPreview': preview,
            }
        except Exception:
            return {}

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, style={'input_type': 'password'}, label="Confirm Password")

    class Meta:
        model = User
        fields = ['username', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        # Use create_user to automatically hash the password
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )
        return user
