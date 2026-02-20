import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import { getDailySummary, getTopRiskUsers, triggerBatch } from '../api/analyticsApi';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
    BarChart3, TrendingDown, Users, Globe, Calendar,
    ArrowUpRight, ArrowDownRight, AlertTriangle, RefreshCw, Play
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <div className="chart-tooltip-label">{label}</div>
            {payload.map((p, i) => (
                <div key={i} className="chart-tooltip-row">
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: p.color, display: 'inline-block' }} />
                    {p.name}: <strong>{typeof p.value === 'number' && p.value > 100 ? p.value.toLocaleString() : p.value}</strong>
                </div>
            ))}
        </div>
    );
};

// Static geo risk data (kept as-is — no backend endpoint for this yet)
const GEO_RISK = [
    { location: 'Lagos', riskScore: 87, txnCount: 23 },
    { location: 'Dubai', riskScore: 74, txnCount: 31 },
    { location: 'Singapore', riskScore: 68, txnCount: 45 },
    { location: 'New York', riskScore: 55, txnCount: 78 },
    { location: 'London', riskScore: 48, txnCount: 62 },
    { location: 'Delhi', riskScore: 42, txnCount: 134 },
    { location: 'Mumbai', riskScore: 39, txnCount: 189 },
    { location: 'Bangalore', riskScore: 34, txnCount: 96 },
];

function RiskLevelBadge({ score }) {
    if (score > 0.8) return <span className="badge badge-block">Critical</span>;
    if (score > 0.65) return <span className="badge badge-review">High</span>;
    return <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue-light)', border: '1px solid rgba(59,130,246,0.25)' }}>Medium</span>;
}

export default function Analytics() {
    const [dateRange, setDateRange] = useState('14d');
    const [dailyData, setDailyData] = useState([]);
    const [riskUsers, setRiskUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [batchRunning, setBatchRunning] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const days = dateRange === '7d' ? 7 : 14;
            const [summary, users] = await Promise.all([
                getDailySummary(days),
                getTopRiskUsers(10),
            ]);

            const raw = Array.isArray(summary) ? summary : [];
            setDailyData(raw.map(d => ({
                date: d.metricDate ? format(parseISO(d.metricDate), 'MMM dd') : '?',
                totalTransactions: d.totalTransactions ?? 0,
                fraudulent: d.fraudCount ?? 0,
                reviewed: d.reviewCount ?? 0,
                blocked: d.blockCount ?? 0,
                fraudRate: +(d.fraudRate ?? 0).toFixed(2),
                avgRisk: Math.round((d.avgRiskScore ?? 0) * 100),
            })));

            // Top risk users — backend returns RiskProfile list
            const userArr = Array.isArray(users) ? users : [];
            setRiskUsers(userArr.map(u => ({
                userId: u.userId,
                riskScore: u.riskScore ?? 0,
                riskLevel: u.riskLevel ?? 'LOW',
                recentFraudCount: u.recentFraudCount ?? 0,
                txnFrequency: u.txnFrequency ?? 0,
                topRiskFactor: u.topRiskFactor ?? '—',
            })));
        } catch (e) {
            console.error('Analytics load error:', e);
            showToast('Could not load analytics — backend may not be running.', 'danger');
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => { load(); }, [load]);

    const handleRunBatch = async () => {
        setBatchRunning(true);
        try {
            await triggerBatch();
            showToast('Batch job triggered — metrics will refresh shortly.', 'success');
            setTimeout(load, 3000); // reload after 3s to capture new data
        } catch (e) {
            showToast('Batch trigger failed — check the analytics-service.', 'danger');
        } finally {
            setBatchRunning(false);
        }
    };

    // Derived KPIs
    const totalFraud = dailyData.reduce((a, d) => a + d.fraudulent, 0);
    const avgFraudRate = dailyData.length
        ? (dailyData.reduce((a, d) => a + d.fraudRate, 0) / dailyData.length).toFixed(1)
        : 0;
    const highRiskUsers = riskUsers.filter(u => u.riskScore > 0.8).length;

    const kpiCards = [
        { label: 'Total Fraud Events', value: totalFraud, color: 'var(--status-block)', icon: AlertTriangle, change: `${dateRange} window`, up: null },
        { label: 'Avg Fraud Rate', value: `${avgFraudRate}%`, color: 'var(--status-review)', icon: TrendingDown, change: 'of all transactions', up: null },
        { label: 'High Risk Users', value: highRiskUsers, color: 'var(--accent-purple)', icon: Users, change: 'risk score > 0.8', up: null },
        {
            label: 'High Risk Geos', value: GEO_RISK.filter(g => g.riskScore > 60).length,
            color: 'var(--accent-cyan)', icon: Globe, change: 'score > 60', up: null
        },
    ];

    return (
        <div className="main-content">
            <Header
                title="Analytics"
                subtitle="Fraud trends, geospatial risk analysis, and user risk profiling"
                action={
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
                            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={handleRunBatch} disabled={batchRunning}>
                            {batchRunning
                                ? <><div className="loader" style={{ width: 12, height: 12, borderWidth: 2, borderTopColor: 'white' }} />Running…</>
                                : <><Play size={12} />Run Batch</>
                            }
                        </button>
                    </div>
                }
            />
            <div className="page-content">

                {/* KPIs */}
                <div className="kpi-grid" style={{ marginBottom: 20 }}>
                    {kpiCards.map((k, i) => (
                        <div key={i} className="kpi-card animate-fade-in" style={{ animationDelay: `${i * 0.07}s` }}>
                            <div className="kpi-label">{k.label}</div>
                            <div className="kpi-value" style={{ color: k.color }}>
                                {loading ? <div style={{ height: 28, width: 60, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }} /> : k.value}
                            </div>
                            <div className="kpi-change" style={{ color: 'var(--text-muted)' }}>{k.change}</div>
                            <div className="kpi-icon"><k.icon size={34} color={k.color} strokeWidth={1.5} /></div>
                        </div>
                    ))}
                </div>

                {/* Date Range Toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <span className="text-muted text-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={13} />Time Range:
                    </span>
                    {['7d', '14d'].map(r => (
                        <button
                            key={r}
                            id={`range-${r}`}
                            className={`btn btn-sm ${dateRange === r ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setDateRange(r)}
                        >
                            {r === '7d' ? 'Last 7 Days' : 'Last 14 Days'}
                        </button>
                    ))}
                </div>

                <div className="grid-2" style={{ marginBottom: 20 }}>
                    {/* Fraud Rate Trend */}
                    <div className="card card-body animate-fade-in">
                        <div className="section-title"><TrendingDown size={14} />Daily Fraud Rate (%)</div>
                        {loading
                            ? <div style={{ height: 200, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }} />
                            : dailyData.length === 0
                                ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data — run the batch job to generate metrics</div>
                                : (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#4a5568' }} />
                                            <YAxis tick={{ fontSize: 11, fill: '#4a5568' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Line type="monotone" dataKey="fraudRate" name="Fraud Rate %" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} />
                                            <Line type="monotone" dataKey="avgRisk" name="Avg Risk %" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )
                        }
                    </div>

                    {/* Daily Volume */}
                    <div className="card card-body animate-fade-in" style={{ animationDelay: '0.08s' }}>
                        <div className="section-title"><BarChart3 size={14} />Daily Transaction Volume</div>
                        {loading
                            ? <div style={{ height: 200, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }} />
                            : dailyData.length === 0
                                ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div>
                                : (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="vol-grad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#4a5568' }} />
                                            <YAxis tick={{ fontSize: 11, fill: '#4a5568' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area type="monotone" dataKey="totalTransactions" name="Total Txns" stroke="#8b5cf6" fill="url(#vol-grad)" strokeWidth={2} dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )
                        }
                    </div>
                </div>

                {/* Geography Risk */}
                <div className="card card-body animate-fade-in" style={{ animationDelay: '0.12s', marginBottom: 20 }}>
                    <div className="section-title"><Globe size={14} />Top Risk Geographies</div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <ResponsiveContainer width="60%" height={200}>
                            <BarChart data={GEO_RISK} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }} barSize={10}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis type="number" tick={{ fontSize: 11, fill: '#4a5568' }} domain={[0, 100]} />
                                <YAxis type="category" dataKey="location" tick={{ fontSize: 12, fill: '#8b9dc3' }} width={60} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="riskScore" name="Risk Score" radius={[0, 4, 4, 0]} fill="#ef4444"
                                    label={{ position: 'right', fontSize: 11, fill: '#ef4444', formatter: v => `${v}` }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                        <div style={{ flex: 1 }}>
                            <div className="section-title" style={{ marginBottom: 12 }}>Legend</div>
                            {[
                                { label: 'Critical Risk', color: '#ef4444', range: '≥80' },
                                { label: 'High Risk', color: '#f59e0b', range: '60–79' },
                                { label: 'Medium Risk', color: '#3b82f6', range: '40–59' },
                                { label: 'Low Risk', color: '#10b981', range: '<40' },
                            ].map(l => (
                                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                    <span style={{ width: 12, height: 12, borderRadius: 3, background: l.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: 13, flex: 1, color: 'var(--text-secondary)' }}>{l.label}</span>
                                    <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: l.color }}>{l.range}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top Risky Users */}
                <div className="card animate-fade-in" style={{ animationDelay: '0.16s' }}>
                    <div className="card-body" style={{ paddingBottom: 0 }}>
                        <div className="section-title"><Users size={14} />Top Risk Profiles</div>
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>User ID</th>
                                    <th>Risk Score</th>
                                    <th>Fraud Count</th>
                                    <th>Txn Frequency</th>
                                    <th>Top Risk Factor</th>
                                    <th>Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading
                                    ? Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            {Array.from({ length: 7 }).map((_, j) => (
                                                <td key={j}><div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: '70%' }} /></td>
                                            ))}
                                        </tr>
                                    ))
                                    : riskUsers.length === 0
                                        ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>No risk profiles yet — submit some transactions first.</td></tr>
                                        : riskUsers.map((u, i) => (
                                            <tr key={u.userId}>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{i + 1}</td>
                                                <td><div className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{u.userId}</div></td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div className="risk-bar" style={{ width: 60 }}>
                                                            <div className="risk-bar-fill" style={{
                                                                width: `${u.riskScore * 100}%`,
                                                                background: u.riskScore > 0.8 ? '#ef4444' : u.riskScore > 0.65 ? '#f59e0b' : '#3b82f6',
                                                            }} />
                                                        </div>
                                                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700, color: u.riskScore > 0.8 ? 'var(--status-block)' : u.riskScore > 0.65 ? 'var(--status-review)' : 'var(--accent-blue-light)' }}>
                                                            {u.riskScore.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ color: u.recentFraudCount > 5 ? 'var(--status-block)' : 'var(--status-review)', fontWeight: 600 }}>
                                                    {u.recentFraudCount}
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{u.txnFrequency}/min</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.topRiskFactor}</td>
                                                <td><RiskLevelBadge score={u.riskScore} /></td>
                                            </tr>
                                        ))
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className="toast">
                    <div className="toast-item" style={{ borderColor: toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{toast.msg}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
