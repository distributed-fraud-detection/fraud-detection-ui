import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import { getFraudCases, reviewCase } from '../api/fraudCaseApi';
import {
    AlertTriangle, CheckCircle, XCircle, AlertCircle,
    Search, Eye, TrendingUp, User, MapPin, Clock, RefreshCw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUSES = ['ALL', 'PENDING', 'BLOCKED', 'APPROVED', 'REJECTED'];

function StatusBadge({ status }) {
    const map = {
        PENDING: { cls: 'badge-review', icon: AlertCircle },
        BLOCKED: { cls: 'badge-block', icon: XCircle },
        APPROVED: { cls: 'badge-approve', icon: CheckCircle },
        REJECTED: { cls: 'badge-block', icon: XCircle },
    };
    const m = map[status] || { cls: 'badge-review', icon: AlertCircle };
    return <span className={`badge ${m.cls}`}><m.icon size={10} />{status}</span>;
}

export default function CaseManagement() {
    const [cases, setCases] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviewing, setReviewing] = useState(null); // caseId being reviewed

    const PAGE_SIZE = 50;

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError(null); // Clear previous errors
        try {
            const data = await getFraudCases(page, PAGE_SIZE);
            const items = data?.content ?? (Array.isArray(data) ? data : []);
            setCases(items);
            setTotal(data?.totalElements ?? items.length);
        } catch (e) {
            console.error('Failed to load cases:', e);
            setError(e.backendMessage || 'Could not connect to the backend. Is the API Gateway running?');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { load(); }, [load]);

    const handleAction = async (caseId, action) => {
        setReviewing(caseId);
        try {
            const serverAction = action === 'approve' ? 'APPROVE' : 'REJECT';
            await reviewCase(caseId, serverAction);
            const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
            setCases(prev => prev.map(c => c.caseId === caseId ? { ...c, status: newStatus } : c));
            if (selected?.caseId === caseId) setSelected(prev => ({ ...prev, status: newStatus }));
            showToast(
                action === 'approve' ? `Case ${caseId.slice(0, 8)}… approved` : `Case ${caseId.slice(0, 8)}… rejected`,
                action === 'approve' ? 'success' : 'danger'
            );
        } catch (e) {
            console.error('Review action failed:', e);
            showToast(e.backendMessage || 'Review action failed — check backend connection', 'danger');
        } finally {
            setReviewing(null);
        }
    };

    const filtered = cases.filter(c => {
        const matchStatus = filter === 'ALL' || c.status === filter || c.decision === filter;
        const matchSearch = !search ||
            c.caseId?.toLowerCase().includes(search.toLowerCase()) ||
            c.userId?.toLowerCase().includes(search.toLowerCase()) ||
            c.transactionId?.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const pendingCount = cases.filter(c => c.status === 'PENDING').length;
    const blockedCount = cases.filter(c => c.status === 'BLOCKED').length;

    return (
        <div className="main-content">
            <Header
                title="Case Management"
                subtitle="Review, approve, or reject flagged fraud cases"
                action={
                    <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading} title="Refresh">
                        <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                }
            />
            <div className="page-content">
                {/* KPI Summary */}
                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
                    {[
                        { label: 'Total Cases', value: total, color: 'var(--accent-blue)', icon: AlertTriangle },
                        { label: 'Pending Review', value: pendingCount, color: 'var(--status-review)', icon: AlertCircle },
                        { label: 'Blocked', value: blockedCount, color: 'var(--status-block)', icon: XCircle },
                    ].map((k, i) => (
                        <div key={i} className="kpi-card animate-fade-in" style={{ animationDelay: `${i * 0.07}s` }}>
                            <div className="kpi-label">{k.label}</div>
                            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                            <div className="kpi-icon"><k.icon size={34} color={k.color} strokeWidth={1.5} /></div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
                    {/* Table */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Filters */}
                        <div className="card card-body animate-fade-in" style={{ marginBottom: 14, paddingBottom: 14 }}>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input id="case-search" className="input" style={{ paddingLeft: 30, height: 36 }} placeholder="Search case ID, transaction ID, or user…" value={search} onChange={e => setSearch(e.target.value)} />
                                </div>
                                {STATUSES.map(s => (
                                    <button key={s} id={`filter-${s.toLowerCase()}`} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(s)}>{s}</button>
                                ))}
                            </div>
                        </div>

                        <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
                            <div className="table-wrapper" style={{ maxHeight: 520, overflowY: 'auto' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Case ID</th>
                                            <th>User</th>
                                            <th>Transaction</th>
                                            <th>Risk</th>
                                            <th>Decision</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading
                                            ? Array.from({ length: 8 }).map((_, i) => (
                                                <tr key={i}>
                                                    {Array.from({ length: 7 }).map((_, j) => (
                                                        <td key={j}><div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: '70%' }} /></td>
                                                    ))}
                                                </tr>
                                            ))
                                            : filtered.length === 0
                                                ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>No cases match your filters.</td></tr>
                                                : filtered.map(c => (
                                                    <tr key={c.caseId} style={{ cursor: 'pointer', background: selected?.caseId === c.caseId ? 'rgba(59,130,246,0.07)' : '' }} onClick={() => setSelected(c)}>
                                                        <td><span className="mono" style={{ color: 'var(--accent-blue-light)', fontSize: 12 }}>{c.caseId?.slice(0, 8)}…</span></td>
                                                        <td><div style={{ fontWeight: 600, fontSize: 13 }}>{c.userId}</div></td>
                                                        <td><span className="mono" style={{ fontSize: 11 }}>{c.transactionId?.slice(0, 10)}…</span></td>
                                                        <td>
                                                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700, color: c.riskScore > 0.8 ? 'var(--status-block)' : 'var(--status-review)' }}>
                                                                {c.riskScore?.toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`badge badge-${c.decision?.toLowerCase()}`}>
                                                                {c.decision === 'BLOCK' ? <XCircle size={10} /> : <AlertCircle size={10} />}{c.decision}
                                                            </span>
                                                        </td>
                                                        <td><StatusBadge status={c.status} /></td>
                                                        <td onClick={e => e.stopPropagation()}>
                                                            {c.status === 'PENDING'
                                                                ? (
                                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                                        <button id={`btn-approve-${c.caseId}`} className="btn btn-success btn-sm" disabled={reviewing === c.caseId} onClick={() => handleAction(c.caseId, 'approve')}>
                                                                            {reviewing === c.caseId ? <div className="loader" style={{ width: 10, height: 10, borderWidth: 2 }} /> : <CheckCircle size={11} />}
                                                                        </button>
                                                                        <button id={`btn-reject-${c.caseId}`} className="btn btn-danger btn-sm" disabled={reviewing === c.caseId} onClick={() => handleAction(c.caseId, 'reject')}>
                                                                            <XCircle size={11} />
                                                                        </button>
                                                                    </div>
                                                                )
                                                                : (
                                                                    <button className="btn btn-ghost btn-sm" onClick={() => setSelected(c)}><Eye size={11} /></button>
                                                                )
                                                            }
                                                        </td>
                                                    </tr>
                                                ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Detail Panel */}
                    {selected && (
                        <div className="card card-body animate-fade-in" style={{ width: 300, flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <div className="section-title" style={{ margin: 0 }}><Eye size={14} />Case Detail</div>
                                <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
                            </div>

                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, marginBottom: 14 }}>
                                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-blue-light)', marginBottom: 4 }}>
                                    {selected.caseId?.slice(0, 16)}…
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <span className={`badge badge-${selected.decision?.toLowerCase()}`}>{selected.decision}</span>
                                    <StatusBadge status={selected.status} />
                                </div>
                            </div>

                            <div style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                                    <span className="text-muted">Risk Score</span>
                                    <strong style={{ color: selected.riskScore > 0.8 ? 'var(--status-block)' : 'var(--status-review)' }}>{selected.riskScore?.toFixed(2)}</strong>
                                </div>
                                <div className="risk-bar" style={{ height: 8 }}>
                                    <div className="risk-bar-fill" style={{ width: `${selected.riskScore * 100}%`, background: selected.riskScore > 0.8 ? 'var(--status-block)' : 'var(--status-review)' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                                {[
                                    { icon: User, label: 'User', value: selected.userId },
                                    { icon: TrendingUp, label: 'Transaction', value: selected.transactionId?.slice(0, 14) + '…' },
                                    { icon: Clock, label: 'Created', value: selected.createdAt ? format(parseISO(selected.createdAt), 'MMM dd, HH:mm:ss') : '—' },
                                ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} style={{ display: 'flex', gap: 8, fontSize: 12, alignItems: 'flex-start' }}>
                                        <Icon size={13} color="var(--text-muted)" style={{ marginTop: 1 }} />
                                        <div>
                                            <div className="text-muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                                            <div className="mono" style={{ fontWeight: 500 }}>{value}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selected.flagReason && (
                                <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.07)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.15)', fontSize: 12, color: 'var(--status-review)', marginBottom: 14 }}>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠ Flag Reason</div>
                                    {selected.flagReason}
                                </div>
                            )}

                            {selected.status === 'PENDING' && (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button id="detail-btn-approve" className="btn btn-success" style={{ flex: 1, fontSize: 12 }} disabled={reviewing === selected.caseId} onClick={() => handleAction(selected.caseId, 'approve')}>
                                        <CheckCircle size={13} />Approve
                                    </button>
                                    <button id="detail-btn-reject" className="btn btn-danger" style={{ flex: 1, fontSize: 12 }} disabled={reviewing === selected.caseId} onClick={() => handleAction(selected.caseId, 'reject')}>
                                        <XCircle size={13} />Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {toast && (
                <div className="toast">
                    <div className="toast-item" style={{ borderColor: toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }}>
                        {toast.type === 'success' ? <CheckCircle size={16} color="var(--status-approve)" /> : <XCircle size={16} color="var(--status-block)" />}
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{toast.msg}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
