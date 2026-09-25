// frontend/src/components/Auth/SignUpForm.tsx
import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

export const SignUpForm = ({ onSuccess }: { onSuccess: () => void }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [error, setError] = useState('');
    const login = useAuthStore((state) => state.login);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== password2) {
            setError("Passwords don't match");
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/api/register/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, password2 }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.username ? data.username[0] : 'Registration failed.';
                throw new Error(errorMsg);
            }

            login(data.token, data.username);
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Something went wrong.');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', marginTop: 0 }}>
                Sign Up
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
                    marginBottom: '0.75rem',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                }}
            />

            <input
                type="password"
                placeholder="Confirm Password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
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
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.6rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                }}
            >
                Sign Up & Save
            </button>
        </form>
    );
};
