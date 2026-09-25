# backend/kpis/models.py
from django.db import models
from django.contrib.auth.models import User

class SavedKpi(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    data = models.JSONField() # Stores the KPI payload
    saved_at = models.DateTimeField(auto_now_add=True) # Automatically adds the save date

    def __str__(self):
        return f"{self.user.username} - {self.saved_at.strftime('%Y-%m-%d %H:%M')}"
