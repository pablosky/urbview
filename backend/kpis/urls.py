from django.urls import path
from . import views
from .views import SaveKpiView, RegisterUserView

urlpatterns = [
    path("kpis/", views.kpis, name="kpis"),
    path("feature/<str:layer>/<str:fid>", views.feature, name="feature"),
    path('save-kpi/', SaveKpiView.as_view(), name='save-kpi'),
    path('register/', RegisterUserView.as_view(), name='register'),
]
