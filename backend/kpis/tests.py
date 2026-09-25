# backend/kpis/tests.py
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

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
