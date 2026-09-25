// frontend/src/components/Auth/AuthModal.tsx
import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';

interface AuthModalProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, onCancel }) => {
    const [isLoginMode, setIsLoginMode] = useState(true);

    return (
        <>
            {/* Backdrop — clicking it closes the modal */}
            <div
                onClick={onCancel}
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    zIndex: 1000,
                }}
            />

            {/* Right-side box */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    right: '1.5rem',
                    transform: 'translateY(-50%)',
                    width: '340px',
                    maxWidth: 'calc(100vw - 3rem)',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                    padding: '1.5rem',
                    zIndex: 1001,
                }}
            >
                {/* Close button */}
                <button
                    onClick={onCancel}
                    style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: 'none',
                        border: 'none',
                        fontSize: '1.25rem',
                        lineHeight: 1,
                        cursor: 'pointer',
                        color: '#9ca3af',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                    }}
                    aria-label="Close"
                >
                    ×
                </button>

                {isLoginMode ? (
                    <LoginForm onSuccess={onSuccess} />
                ) : (
                    <SignUpForm onSuccess={onSuccess} />
                )}

                <div style={{ marginTop: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>
                    {isLoginMode ? (
                        <p style={{ margin: 0, color: '#4b5563' }}>
                            Don't have an account?{' '}
                            <button
                                onClick={() => setIsLoginMode(false)}
                                style={{
                                    color: '#2563eb',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    padding: 0,
                                    fontSize: 'inherit',
                                }}
                            >
                                Sign Up
                            </button>
                        </p>
                    ) : (
                        <p style={{ margin: 0, color: '#4b5563' }}>
                            Already have an account?{' '}
                            <button
                                onClick={() => setIsLoginMode(true)}
                                style={{
                                    color: '#2563eb',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    padding: 0,
                                    fontSize: 'inherit',
                                }}
                            >
                                Log In
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </>
    );
};
