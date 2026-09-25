// frontend/src/components/Auth/UserMenu.tsx
import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

export const UserMenu = () => {
    const { username, isAuthenticated, logout } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);

    if (!isAuthenticated) return null;

    const handleLogout = () => {
        logout();
        setIsOpen(false);
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                }}
            >
                <span style={{
                    width: '24px', height: '24px',
                    borderRadius: '50%', background: '#2563eb',
                    color: 'white', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 600
                }}>
                    {username?.[0]?.toUpperCase() ?? '?'}
                </span>
                {username}
            </button>

            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 0.5rem)',
                        right: 0,
                        minWidth: '160px',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                        zIndex: 100,
                    }}
                >
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.75rem', color: '#6b7280' }}>
                        Signed in as <strong>{username}</strong>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.5rem 1rem',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            color: '#dc2626',
                        }}
                    >
                        Log out
                    </button>
                </div>
            )}
        </div>
    );
};
