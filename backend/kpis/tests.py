# backend/kpis/tests.py
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from .models import SavedKpi

class SaveKpiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.save_url = '/api/save-kpi/' # Adjust based on your exact URL routing
        self.payload = {'data': {'metric1': 100, 'metric2': 200}}

    def test_anonymous_user_cannot_save(self):
        response = self.client.post(self.save_url, self.payload, format='json')
        self.assertEqual(response.status_code, 401) # Unauthorized

    def test_authenticated_user_can_save(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.save_url, self.payload, format='json')
        self.assertEqual(response.status_code, 201) # Created

        # Verify it saved correctly
        self.assertEqual(SavedKpi.objects.count(), 1)
        saved_kpi = SavedKpi.objects.first()
        self.assertEqual(saved_kpi.user, self.user)
        self.assertEqual(saved_kpi.data, self.payload['data'])
        self.assertIsNotNone(saved_kpi.saved_at)

class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpassword123'
        )
        self.login_url = '/api-token-auth/'

    def test_login_success_returns_token(self):
        response = self.client.post(self.login_url, {
            'username': 'testuser',
            'password': 'testpassword123'
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn('token', response.data)

        # Verify token exists in DB
        token = Token.objects.get(user=self.user)
        self.assertEqual(response.data['token'], token.key)

    def test_login_failure_invalid_credentials(self):
        response = self.client.post(self.login_url, {
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        # DRF returns 400 Bad Request for invalid credentials by default
        self.assertEqual(response.status_code, 400)
        self.assertNotIn('token', response.data)

    def test_login_failure_missing_fields(self):
        response = self.client.post(self.login_url, {
            'username': 'testuser'
        })
        self.assertEqual(response.status_code, 400)

    def test_user_only_sees_their_own_saves(self):
        from .models import SavedKpi
        # create another user and a save for them
        other = User.objects.create_user(username='other', password='pw')
        SavedKpi.objects.create(user=other, data={'data': {'areaKm2': 9}})

        # create 6 saves for our user
        for i in range(6):
            SavedKpi.objects.create(user=self.user, data={'data': {'areaKm2': i}})

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/save-kpi/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 5)  # capped at 5
        # ensure none belong to other user
        ids = [s['id'] for s in response.data]
        self.assertNotIn(SavedKpi.objects.filter(user=other).first().id, ids)
