import React, { useState, useRef, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import { createTransaction } from '../api/transactionApi';
import { getFraudCases } from '../api/fraudCaseApi';
import {
    Send, Zap, CheckCircle, XCircle, AlertCircle,
    MapPin, User, DollarSign, Clock, Activity, Wifi, WifiOff
} from 'lucide-react';
import { format } from 'date-fns';

const LOCATIONS = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Lagos', 'Dubai', 'Singapore', 'New York', 'London'];
const MERCHANT_TYPES = ['E-Commerce', 'ATM Withdrawal', 'POS Purchase', 'Wire Transfer', 'P2P Payment', 'Crypto Exchange', 'International Transfer'];
const USER_IDS = ['u001', 'u002', 'u003', 'u004', 'u005'];

const PIPELINE_STEPS = [
    'Transaction Received',
    'Published to Kafka',
    'Risk Engine Processing',
    'Fraud Decision Service',
    'Decision Stored',
    'Notification Triggered',
];

const randomRange = (min, max) => Math.round(Math.random() * (max - min) + min);

export default function Simulator() {
    const [form, setForm] = useState({
        userId: 'u001',
        amount: '',
        location: 'Mumbai',
        merchantType: 'E-Commerce',
    });
    const [status, setStatus] = useState('idle'); // idle | processing | polling | done | error
    const [result, setResult] = useState(null);
    const [step, setStep] = useState(0);
    const [log, setLog] = useState([]);
    const [autoMode, setAutoMode] = useState(false);
    const [backendOnline, setBackendOnline] = useState(null); // null=unknown, true, false
    const autoRef = useRef(null);

    // Heartbeat check
    useEffect(() => {
        const check = async () => {
            try {
                await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/actuator/health`);
                setBackendOnline(true);
            } catch {
                setBackendOnline(false);
            }
        };
        check();
        const t = setInterval(check, 15000);
        return () => clearInterval(t);
    }, []);

    const advanceSteps = useCallback(async () => {
        // Animate through pipeline steps with slight delays
        for (let i = 0; i <= PIPELINE_STEPS.length; i++) {
            await new Promise(r => setTimeout(r, 380 + Math.random() * 180));
            setStep(i);
        }
    }, []);

    const pollForDecision = useCallback(async (transactionId, maxRetries = 12) => {
        setStatus('polling');
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            await new Promise(r => setTimeout(r, 1500));
            try {
                const page = await getFraudCases(0, 50);
                const cases = page?.content ?? (Array.isArray(page) ? page : []);
                const match = cases.find(c => c.transactionId === transactionId);
                if (match) return match;
            } catch (e) {
                // Ignore transient errors during polling
            }
        }
        return null; // Decision not yet available
    }, []);

    const simulate = useCallback(async (isAuto = false) => {
        const amount = isAuto ? randomRange(1000, 95000) : parseFloat(form.amount);
        if (!isAuto && (!amount || amount <= 0)) return;

        const payload = {
            userId: isAuto ? USER_IDS[randomRange(0, USER_IDS.length - 1)] : form.userId,
            amount: amount,
            location: isAuto ? LOCATIONS[randomRange(0, LOCATIONS.length - 1)] : form.location,
            merchantType: isAuto ? MERCHANT_TYPES[randomRange(0, MERCHANT_TYPES.length - 1)] : form.merchantType,
        };

        setStatus('processing');
        setResult(null);
        setStep(0);

        try {
            // Run pipeline animation + real API call in parallel
            const [txn] = await Promise.all([
                createTransaction(payload),
                advanceSteps(),
            ]);

            // Poll fraud-decision-service for the decision (Kafka is async)
            const decision = await pollForDecision(txn.transactionId);

            const finalResult = {
                transactionId: txn.transactionId,
                userId: payload.userId,
                amount: payload.amount,
                location: payload.location,
                merchantType: payload.merchantType,
                timestamp: txn.timestamp ?? new Date().toISOString(),
                riskScore: decision?.riskScore ?? null,
                decision: decision?.decision ?? 'PENDING',
                caseId: decision?.caseId ?? null,
                flagReason: decision?.flagReason ?? null,
            };

            setResult(finalResult);
            setStatus('done');
            setLog(prev => [{ ...finalResult, logTime: new Date().toISOString() }, ...prev.slice(0, 19)]);

        } catch (e) {
            console.error('Transaction simulation failed:', e);
            setStatus('error');
        }
    }, [form, advanceSteps, pollForDecision]);

    useEffect(() => {
        if (autoMode) {
            autoRef.current = setInterval(() => simulate(true), 3500);
        } else {
            clearInterval(autoRef.current);
        }
        return () => clearInterval(autoRef.current);
    }, [autoMode, simulate]);

    const decisionColor = result?.decision === 'APPROVE'
        ? 'var(--status-approve)' : result?.decision === 'REVIEW'
            ? 'var(--status-review)' : result?.decision === 'BLOCK'
                ? 'var(--status-block)' : 'var(--text-muted)';

    return (
        <div className="main-content">
            <Header
                title="Transaction Simulator"
                subtitle="Submit live transactions and observe the real fraud pipeline"
                action={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        {backendOnline === true && <><Wifi size={13} color="var(--status-approve)" /> <span style={{ color: 'var(--status-approve)' }}>Backend Online</span></>}
                        {backendOnline === false && <><WifiOff size={13} color="var(--status-block)" /> <span style={{ color: 'var(--status-block)' }}>Backend Offline</span></>}
                    </div>
                }
            />
            <div className="page-content">
                <div className="grid-2" style={{ alignItems: 'start' }}>
                    {/* Left: Form + Pipeline */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="card card-body animate-fade-in">
                            <div className="section-title"><Send size={14} /> Send Transaction</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div className="form-group">
                                    <label className="form-label">User ID</label>
                                    <select id="sim-userId" className="input" value={form.userId} onChange={e => setForm(p => ({ ...p, userId: e.target.value }))}>
                                        {USER_IDS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Amount (₹)</label>
                                    <div style={{ position: 'relative' }}>
                                        <DollarSign size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input id="sim-amount" className="input" style={{ paddingLeft: 32 }} type="number" min="1" max="100000" placeholder="e.g. 15000" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Location</label>
                                    <select id="sim-location" className="input" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}>
                                        {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Merchant Type</label>
                                    <select id="sim-merchantType" className="input" value={form.merchantType} onChange={e => setForm(p => ({ ...p, merchantType: e.target.value }))}>
                                        {MERCHANT_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                    <button id="btn-simulate" className="btn btn-primary" style={{ flex: 1 }} onClick={() => simulate(false)} disabled={status === 'processing' || status === 'polling'}>
                                        {(status === 'processing' || status === 'polling')
                                            ? <><div className="loader" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'white' }} />{status === 'polling' ? 'Awaiting decision…' : 'Processing…'}</>
                                            : <><Send size={14} />Submit Transaction</>
                                        }
                                    </button>
                                    <button id="btn-auto-mode" className={`btn ${autoMode ? 'btn-danger' : 'btn-ghost'}`} onClick={() => setAutoMode(p => !p)} title={autoMode ? 'Stop Auto' : 'Auto Mode'}>
                                        <Zap size={14} />{autoMode ? 'Stop' : 'Auto'}
                                    </button>
                                </div>
                                {status === 'error' && (
                                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#ef4444' }}>
                                        ⚠ Transaction failed. Ensure the backend is running and Kafka is up.
                                    </div>
                                )}
                                {autoMode && (
                                    <div className="sim-auto-badge">
                                        <div className="live-dot" />Auto-generating transactions every 3.5s (real backend)
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pipeline */}
                        <div className="card card-body animate-fade-in" style={{ animationDelay: '0.1s' }}>
                            <div className="section-title"><Activity size={14} />Event Pipeline</div>
                            <div className="pipeline">
                                {PIPELINE_STEPS.map((s, i) => (
                                    <div key={i} className="pipeline-step">
                                        <div className={`pipeline-dot ${step > i ? 'done' : step === i && (status === 'processing' || status === 'polling') ? 'active' : 'idle'}`}>
                                            {step > i && <CheckCircle size={11} />}
                                            {step === i && (status === 'processing' || status === 'polling') && <div className="loader" style={{ width: 11, height: 11, borderWidth: 2, borderTopColor: 'white' }} />}
                                        </div>
                                        <div className={`pipeline-label ${step > i ? 'text-success' : step === i && (status === 'processing' || status === 'polling') ? 'text-accent' : 'text-muted'}`}>{s}</div>
                                        {i < PIPELINE_STEPS.length - 1 && <div className={`pipeline-line ${step > i ? 'pipeline-line-done' : ''}`} />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Result + Log */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="card card-body animate-fade-in" style={{ animationDelay: '0.05s', minHeight: 200 }}>
                            <div className="section-title">
                                {result?.decision === 'APPROVE' && <CheckCircle size={14} color="var(--status-approve)" />}
                                {result?.decision === 'REVIEW' && <AlertCircle size={14} color="var(--status-review)" />}
                                {result?.decision === 'BLOCK' && <XCircle size={14} color="var(--status-block)" />}
                                {!result && <Activity size={14} />}
                                Decision Result
                            </div>

                            {!result && status === 'idle' && (
                                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                                    <Send size={32} strokeWidth={1} style={{ marginBottom: 10, opacity: 0.4 }} />
                                    <div>Submit a transaction to see the real-time result</div>
                                </div>
                            )}

                            {(status === 'processing' || status === 'polling') && !result && (
                                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>
                                    <div className="loader" style={{ margin: '0 auto 12px', width: 28, height: 28 }} />
                                    <div>{status === 'polling' ? 'Waiting for Kafka pipeline decision…' : 'Sending to backend…'}</div>
                                </div>
                            )}

                            {result && (
                                <div className="result-panel animate-fade-in" style={{ borderColor: decisionColor }}>
                                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                        <div className="result-decision" style={{ color: decisionColor }}>
                                            {result.decision === 'APPROVE' && <CheckCircle size={36} />}
                                            {result.decision === 'REVIEW' && <AlertCircle size={36} />}
                                            {result.decision === 'BLOCK' && <XCircle size={36} />}
                                            {result.decision === 'PENDING' && <Activity size={36} />}
                                            <span>{result.decision}</span>
                                        </div>
                                    </div>

                                    {result.riskScore !== null && (
                                        <div style={{ marginBottom: 14 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                                                <span className="text-muted">Risk Score</span>
                                                <strong style={{ color: decisionColor }}>{result.riskScore?.toFixed(2)}</strong>
                                            </div>
                                            <div className="risk-bar" style={{ height: 8 }}>
                                                <div className="risk-bar-fill" style={{
                                                    width: `${(result.riskScore ?? 0) * 100}%`,
                                                    background: (result.riskScore ?? 0) > 0.8 ? 'var(--status-block)' : (result.riskScore ?? 0) > 0.6 ? 'var(--status-review)' : 'var(--status-approve)'
                                                }} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="result-details">
                                        {[
                                            { icon: Activity, label: 'Transaction ID', value: result.transactionId },
                                            { icon: User, label: 'User', value: result.userId },
                                            { icon: DollarSign, label: 'Amount', value: `₹${result.amount?.toLocaleString('en-IN')}` },
                                            { icon: MapPin, label: 'Location', value: result.location },
                                            { icon: Clock, label: 'Timestamp', value: format(new Date(result.timestamp), 'HH:mm:ss') },
                                        ].map(({ icon: Icon, label, value }) => (
                                            <div key={label} className="result-row">
                                                <Icon size={13} color="var(--text-muted)" />
                                                <span className="text-muted" style={{ fontSize: 12 }}>{label}</span>
                                                <span className="font-mono" style={{ marginLeft: 'auto', fontSize: 12 }}>{value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {result.flagReason && (
                                        <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(245,158,11,0.07)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.15)', fontSize: 11, color: 'var(--status-review)' }}>
                                            ⚠ {result.flagReason}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Live Log */}
                        <div className="card animate-fade-in" style={{ animationDelay: '0.15s' }}>
                            <div className="card-body" style={{ paddingBottom: 0 }}>
                                <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14} />Live Transaction Log</span>
                                    <span className="text-muted text-xs">{log.length} records (this session)</span>
                                </div>
                            </div>
                            <div className="table-wrapper" style={{ maxHeight: 260, overflowY: 'auto' }}>
                                {log.length === 0 ? (
                                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                        No transactions yet. Submit one above.
                                    </div>
                                ) : (
                                    <table>
                                        <thead><tr><th>TX ID</th><th>Amount</th><th>Score</th><th>Decision</th></tr></thead>
                                        <tbody>
                                            {log.map((l, i) => (
                                                <tr key={i}>
                                                    <td className="mono" style={{ fontSize: 11 }}>{l.transactionId?.slice(0, 12)}…</td>
                                                    <td>₹{l.amount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: (l.riskScore ?? 0) > 0.8 ? 'var(--status-block)' : (l.riskScore ?? 0) > 0.6 ? 'var(--status-review)' : 'var(--status-approve)' }}>
                                                        {l.riskScore !== null ? l.riskScore?.toFixed(2) : '…'}
                                                    </td>
                                                    <td><span className={`badge badge-${l.decision?.toLowerCase()}`}>{l.decision}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .sim-auto-badge { display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);font-size:12px;color:var(--status-approve);font-weight:500; }
        .pipeline { display:flex;flex-direction:column;gap:0;position:relative; }
        .pipeline-step { display:flex;align-items:flex-start;gap:12px;position:relative;padding-bottom:12px; }
        .pipeline-dot { width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;transition:all 0.3s;position:relative;z-index:1; }
        .pipeline-dot.done { background:var(--status-approve-dim);color:var(--status-approve);border:1.5px solid var(--status-approve); }
        .pipeline-dot.active { background:rgba(59,130,246,0.15);color:var(--accent-blue);border:1.5px solid var(--accent-blue); }
        .pipeline-dot.idle { background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.1); }
        .pipeline-label { font-size:13px;padding:4px 0 0 10px;transition:color 0.3s; }
        .pipeline-line { position:absolute;left:11px;top:26px;width:2px;height:100%;background:rgba(255,255,255,0.08);transition:background 0.4s; }
        .pipeline-line-done { background:rgba(16,185,129,0.4); }
        .result-panel { border:1px solid;border-radius:12px;padding:16px;background:rgba(255,255,255,0.02);transition:border-color 0.3s; }
        .result-decision { display:flex;flex-direction:column;align-items:center;gap:6px;font-size:1.5rem;font-weight:800;letter-spacing:-0.02em; }
        .result-details { display:flex;flex-direction:column;gap:8px; }
        .result-row { display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04); }
        .result-row:last-child { border-bottom:none; }
      `}</style>
        </div>
    );
}
