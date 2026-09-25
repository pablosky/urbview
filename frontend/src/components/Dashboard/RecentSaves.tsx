// frontend/src/components/Dashboard/RecentSaves.tsx
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

interface KpiPreview {
    label?: string;
    value?: number | string;
    unit?: string;
}

interface SaveItem {
    id: number;
    saved_at: string;
    summary: {
        areaKm2?: number;
        source?: string;
        kpiPreview?: KpiPreview[];
    };
}

export default function RecentSaves() {
    const { token, isAuthenticated, savesVersion } = useAuthStore();
    const [items, setItems] = useState<SaveItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isAuthenticated || !token) {
            setItems([]);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError('');

        fetch('http://localhost:8000/api/save-kpi/', {
            headers: { Authorization: `Token ${token}` },
        })
            .then(async (res) => {
                if (!res.ok) throw new Error('Failed to load saves');
                return res.json();
            })
            .then((data) => {
                if (!cancelled) setItems(data);
            })
            .catch(() => {
                if (!cancelled) setError('Could not load saves');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, token, savesVersion]);

    if (!isAuthenticated) return null;

    return (
        <div
            style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '0.75rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                fontSize: '0.8125rem',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                }}
            >
                <strong style={{ fontSize: '0.8125rem', color: '#374151' }}>
                    Recent saves
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    last 5
                </span>
            </div>

            {loading && <p style={{ color: '#6b7280', margin: 0 }}>Loading…</p>}
            {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
            {!loading && !error && items.length === 0 && (
                <p style={{ color: '#9ca3af', margin: 0 }}>No saves yet.</p>
            )}

            {!loading && !error && items.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {items.map((s) => (
                        <li
                            key={s.id}
                            style={{
                                padding: '0.5rem 0',
                                borderTop: '1px solid #f3f4f6',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.15rem',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    color: '#111827',
                                }}
                            >
                                <span>
                                    {s.summary?.areaKm2 != null
                                        ? `${s.summary.areaKm2.toFixed(2)} km²`
                                        : 'Unknown area'}
                                </span>
                                <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                                    {new Date(s.saved_at).toLocaleString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>

                            {s.summary?.kpiPreview && s.summary.kpiPreview.length > 0 && (
                                <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                                    {s.summary.kpiPreview
                                        .map(
                                            (k) =>
                                                `${k.label ?? '?'}: ${k.value ?? '-'}${
                                                    k.unit ? ' ' + k.unit : ''
                                                }`
                                        )
                                        .join(' · ')}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
