import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import { getDailySummary } from '../api/analyticsApi';
import { getFraudCases } from '../api/fraudCaseApi';
import {
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
    ShieldAlert, TrendingUp, Activity, DollarSign,
    CheckCircle, XCircle, AlertCircle, ArrowUpRight, ArrowDownRight,
    RefreshCw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <div className="chart-tooltip-label">{label}</div>
                {payload.map((p, i) => (
                    <div key={i} className="chart-tooltip-row">
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: p.color, display: 'inline-block' }} />
                        {p.name}: <strong>{p.value?.toLocaleString()}</strong>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <div className="chart-tooltip-row">
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: payload[0].payload.color, display: 'inline-block' }} />
                    {payload[0].name}: <strong>{payload[0].value}</strong>
                </div>
            </div>
        );
    }
    return null;
};

function SkeletonRow({ cols = 7 }) {
    return (
        <tr>
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i}><div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: '70%' }} /></td>
            ))}
        </tr>
    );
}

export default function Dashboard() {
    const [dailyData, setDailyData] = useState([]);
    const [recentCases, setRecentCases] = useState([]);
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [summary, casesPage] = await Promise.all([
                getDailySummary(14),
                getFraudCases(0, 8),
            ]);

            // summary is an array of AggregatedMetric objects
            const days = Array.isArray(summary) ? summary : [];
            const formatted = days.map(d => ({
                date: d.metricDate ? format(parseISO(d.metricDate), 'MMM dd') : '?',
                totalTransactions: d.totalTransactions ?? 0,
                fraudulent: d.fraudCount ?? 0,
                reviewed: d.reviewCount ?? 0,
                blocked: d.blockCount ?? 0,
                approved: (d.totalTransactions ?? 0) - (d.fraudCount ?? 0) - (d.reviewCount ?? 0),
                fraudRate: d.fraudRate ?? 0,
                avgRiskScore: d.avgRiskScore ?? 0,
            }));
            setDailyData(formatted);

            // Derive KPIs from the summary
            const totalTxns = days.reduce((a, d) => a + (d.totalTransactions ?? 0), 0);
            const totalFraud = days.reduce((a, d) => a + (d.fraudCount ?? 0), 0);
            const totalBlocked = days.reduce((a, d) => a + (d.blockCount ?? 0), 0);
            const totalReview = days.reduce((a, d) => a + (d.reviewCount ?? 0), 0);
            setKpis({
                totalTransactions: totalTxns,
                blockedCount: totalBlocked,
                reviewCount: totalReview,
                fraudRate: totalTxns > 0 ? +((totalFraud / totalTxns) * 100).toFixed(1) : 0,
            });

            // Cases page — use content array if paginated, else array directly
            const cases = casesPage?.content ?? (Array.isArray(casesPage) ? casesPage : []);
            setRecentCases(cases.slice(0, 8));
        } catch (e) {
            console.error('Dashboard load error:', e);
            setError(e.backendMessage || 'Could not connect to the backend. Is the API Gateway running at localhost:8080?');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Pie distribution from latest daily data
    const riskDistribution = [
        { name: 'Approved', value: dailyData.reduce((a, d) => a + d.approved, 0), color: '#10b981' },
        { name: 'Review', value: dailyData.reduce((a, d) => a + d.reviewed, 0), color: '#f59e0b' },
        { name: 'Blocked', value: dailyData.reduce((a, d) => a + d.blocked, 0), color: '#ef4444' },
    ];

    const kpiCards = kpis ? [
        { label: 'Total Transactions', value: kpis.totalTransactions.toLocaleString(), icon: Activity, color: '#3b82f6', change: '14 days', up: true },
        { label: 'Fraud Rate', value: `${kpis.fraudRate}%`, icon: ShieldAlert, color: '#ef4444', change: 'of all txns', up: false },
        { label: 'Blocked Count', value: kpis.blockedCount.toLocaleString(), icon: XCircle, color: '#ef4444', change: '14 days', up: true },
        { label: 'Under Review', value: kpis.reviewCount.toLocaleString(), icon: AlertCircle, color: '#f59e0b', change: '14 days', up: true },
    ] : [];

    const last7Days = dailyData.slice(-7);

    return (
        <div className="main-content">
            <Header
                title="Fraud Dashboard"
                subtitle="Real-time fraud detection & risk monitoring"
                action={
                    <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading} title="Refresh">
                        <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                }
            />
            <div className="page-content">
                {error && (
                    <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 13, marginBottom: 20 }}>
                        ⚠ {error}
                    </div>
                )}

                {/* KPI Cards */}
                <div className="kpi-grid">
                    {loading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="kpi-card" style={{ opacity: 0.5 }}>
                                <div style={{ height: 14, width: '60%', borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginBottom: 12 }} />
                                <div style={{ height: 28, width: '40%', borderRadius: 4, background: 'rgba(255,255,255,0.12)' }} />
                            </div>
                        ))
                        : kpiCards.map((k, i) => (
                            <div key={i} className="kpi-card animate-fade-in" style={{ animationDelay: `${i * 0.07}s` }}>
                                <div className="kpi-label">{k.label}</div>
                                <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                                <div className="kpi-change" style={{ color: k.up ? 'var(--status-approve)' : 'var(--status-block)' }}>
                                    {k.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                                    {k.change}
                                </div>
                                <div className="kpi-icon"><k.icon size={36} color={k.color} strokeWidth={1.5} /></div>
                            </div>
                        ))
                    }
                </div>

                <div className="grid-2" style={{ marginBottom: 20 }}>
                    {/* Area Chart */}
                    <div className="card card-body animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        <div className="section-title"><TrendingUp size={14} />Transaction Volume (7 Days)</div>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={last7Days} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="grad-total" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="grad-fraud" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#4a5568' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#4a5568' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="totalTransactions" name="Total" stroke="#3b82f6" fill="url(#grad-total)" strokeWidth={2} dot={false} />
                                <Area type="monotone" dataKey="fraudulent" name="Fraudulent" stroke="#ef4444" fill="url(#grad-fraud)" strokeWidth={2} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Pie Chart */}
                    <div className="card card-body animate-fade-in" style={{ animationDelay: '0.25s' }}>
                        <div className="section-title"><Activity size={14} />Risk Distribution (14 Days)</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                            <ResponsiveContainer width={160} height={160}>
                                <PieChart>
                                    <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={46} outerRadius={70} paddingAngle={3} dataKey="value">
                                        {riskDistribution.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                                {riskDistribution.map((d, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                                        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>{d.name}</span>
                                        <strong style={{ fontSize: 13, color: d.color }}>{d.value}</strong>
                                    </div>
                                ))}
                                <div className="divider" style={{ margin: '4px 0' }} />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    Fraud Rate: <strong style={{ color: 'var(--status-block)' }}>{kpis?.fraudRate ?? 0}%</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bar Chart */}
                <div className="card card-body animate-fade-in" style={{ animationDelay: '0.3s', marginBottom: 20 }}>
                    <div className="section-title"><ShieldAlert size={14} />Daily Decision Breakdown</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={last7Days} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={12} barCategoryGap={16}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#4a5568' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#4a5568' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="reviewed" name="Reviewed" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="blocked" name="Blocked" fill="#ef4444" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent Fraud Cases */}
                <div className="card animate-fade-in" style={{ animationDelay: '0.35s' }}>
                    <div className="card-body" style={{ paddingBottom: 0 }}>
                        <div className="section-title"><Activity size={14} />Recent Fraud Cases</div>
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Case ID</th>
                                    <th>Transaction ID</th>
                                    <th>User</th>
                                    <th>Risk Score</th>
                                    <th>Decision</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading
                                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                                    : recentCases.length === 0
                                        ? (
                                            <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                                                No data yet — submit a transaction to see results here.
                                            </td></tr>
                                        )
                                        : recentCases.map((c) => (
                                            <tr key={c.caseId}>
                                                <td className="mono" style={{ color: 'var(--accent-blue-light)', fontSize: 12 }}>{c.caseId?.slice(0, 8)}…</td>
                                                <td className="mono" style={{ fontSize: 12 }}>{c.transactionId?.slice(0, 8)}…</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{c.userId}</td>
                                                <td>
                                                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700, color: c.riskScore > 0.8 ? 'var(--status-block)' : c.riskScore > 0.6 ? 'var(--status-review)' : 'var(--status-approve)' }}>
                                                        {c.riskScore?.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge badge-${c.decision?.toLowerCase()}`}>
                                                        {c.decision === 'APPROVE' && <CheckCircle size={10} />}
                                                        {c.decision === 'REVIEW' && <AlertCircle size={10} />}
                                                        {c.decision === 'BLOCK' && <XCircle size={10} />}
                                                        {c.decision}
                                                    </span>
                                                </td>
                                                <td><span className={`badge badge-${c.status?.toLowerCase()}`}>{c.status}</span></td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                    {c.createdAt ? format(parseISO(c.createdAt), 'MMM dd, HH:mm') : '—'}
                                                </td>
                                            </tr>
                                        ))
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
