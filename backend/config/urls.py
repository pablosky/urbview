from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render
from rest_framework.authtoken.views import obtain_auth_token

from kpis.views import CustomLoginView  # <--- import custom view

def home(request):
    print('dsa')
    return render(request, "home.html", {"name": "UrbView"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('kpis.urls')),
    path('api-token-auth/', CustomLoginView.as_view(), name='api_token_auth'),
]
