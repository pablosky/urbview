from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render

def home(request):
    print('dsa')
    return render(request, "home.html", {"name": "UrbView"})

urlpatterns = [
    path("", home),
    path("admin/", admin.site.urls),
    path("api/", include("kpis.urls")),
]
