from django.urls import path
from .views import kpis

urlpatterns = [
    path("kpis/", kpis, name="kpis"),
]
