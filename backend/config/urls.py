from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render
from rest_framework.authtoken.views import obtain_auth_token



def home(request):
    print('dsa')
    return render(request, "home.html", {"name": "UrbView"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('kpis.urls')), # Assuming your app urls are here
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'), # Add this
]
