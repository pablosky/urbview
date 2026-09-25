// frontend/src/components/Auth/LoginForm.tsx
import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

export const LoginForm = ({ onSuccess }: { onSuccess: () => void }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const login = useAuthStore((state) => state.login);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('http://localhost:8000/api-token-auth/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) throw new Error('Invalid credentials');

            const data = await response.json();
            login(data.token, data.username);
            onSuccess();
        } catch (err) {
            setError('Login failed. Please check your credentials.');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', marginTop: 0 }}>
                Login
            </h2>

            {error && (
                <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                    {error}
                </p>
            )}

            <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    marginBottom: '0.75rem',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                }}
            />

            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                }}
            />

            <button
                type="submit"
                style={{
                    width: '100%',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.6rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                }}
            >
                Log In
            </button>
        </form>
    );
};
