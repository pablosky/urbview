from django.urls import path
from . import views


urlpatterns = [
    path("kpis/", views.kpis, name="kpis"),
    path("feature/<str:layer>/<str:fid>", views.feature, name="feature"),
]
