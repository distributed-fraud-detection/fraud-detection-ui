import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { getDailySummary } from '../api/analyticsApi';
import { Activity, Server, RefreshCw, ExternalLink } from 'lucide-react';

const KAFKA_UI_URL = import.meta.env.VITE_KAFKA_UI_URL || 'http://localhost:8090';

const TOPICS = [
    { name: 'transactions.created', color: '#3b82f6', description: 'New transactions from Transaction Service' },
    { name: 'risk.scored', color: '#f59e0b', description: 'Risk scores from Risk Engine' },
    { name: 'fraud.decision.made', color: '#ef4444', description: 'Final decisions from Fraud Decision Service' },
];

export default function KafkaMonitor() {
    const [stats, setStats] = useState(null);
    const [iframeKey, setIframeKey] = useState(0); // force iframe reload
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const summary = await getDailySummary(1);
                const today = Array.isArray(summary) ? summary[summary.length - 1] : null;
                if (today) {
                    setStats({
                        totalTransactions: today.totalTransactions ?? 0,
                        fraudCount: today.fraudCount ?? 0,
                        blockCount: today.blockCount ?? 0,
                    });
                }
            } catch { /* Kafka UI might be unreachable */ }
            finally { setLoading(false); }
        };
        loadStats();
    }, []);

    return (
        <div className="main-content">
            <Header
                title="Kafka Monitor"
                subtitle={`Live Kafka broker UI — ${KAFKA_UI_URL}`}
                action={
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setIframeKey(k => k + 1)}>
                            <RefreshCw size={13} /> Reload
                        </button>
                        <a href={KAFKA_UI_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                            <ExternalLink size={13} /> Open Full
                        </a>
                    </div>
                }
            />
            <div className="page-content">

                {/* Topic Stats Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                    {TOPICS.map(t => (
                        <div key={t.name} className="card card-body animate-fade-in" style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: t.color }}>{t.name}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.description}</div>
                        </div>
                    ))}
                </div>

                {/* Today's stats */}
                {stats && (
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                        {[
                            { label: 'Txns today', value: stats.totalTransactions, color: '#3b82f6' },
                            { label: 'Fraud decisions', value: stats.fraudCount, color: '#ef4444' },
                            { label: 'Blocked today', value: stats.blockCount, color: '#f59e0b' },
                        ].map((s, i) => (
                            <div key={i} style={{
                                padding: '8px 16px',
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: 10,
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <Activity size={13} color={s.color} />
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}:</span>
                                <strong style={{ fontSize: 13, color: s.color }}>{s.value}</strong>
                            </div>
                        ))}
                    </div>
                )}

                {/* Kafka UI Iframe */}
                <div className="card animate-fade-in" style={{ overflow: 'hidden', borderRadius: 12 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px',
                        background: 'rgba(255,255,255,0.03)',
                        borderBottom: '1px solid var(--border)',
                    }}>
                        <Server size={13} color="var(--text-muted)" />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                            {KAFKA_UI_URL}
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                            Kafka UI (Provectus) — set VITE_KAFKA_UI_URL in .env to customise
                        </span>
                    </div>
                    <iframe
                        key={iframeKey}
                        src={KAFKA_UI_URL}
                        title="Kafka UI"
                        style={{
                            width: '100%',
                            height: 'calc(100vh - 320px)',
                            minHeight: 500,
                            border: 'none',
                            background: '#0f172a',
                        }}
                        allow="same-origin"
                    />
                </div>
            </div>
        </div>
    );
}
