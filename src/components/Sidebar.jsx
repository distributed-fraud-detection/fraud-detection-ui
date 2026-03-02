import React from 'react';
import { NavLink } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import {
    Shield, LayoutDashboard, Send, AlertTriangle,
    BarChart3, Activity, ChevronRight, Zap, Server, LogOut
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', id: 'nav-dashboard' },
    { to: '/simulator', icon: Send, label: 'Transaction Simulator', id: 'nav-simulator' },
    { to: '/cases', icon: AlertTriangle, label: 'Case Management', id: 'nav-cases' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics', id: 'nav-analytics' },
    { to: '/kafka', icon: Server, label: 'Kafka Monitor', id: 'nav-kafka' },
];

export default function Sidebar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');

    const handleSignOut = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        navigate('/login', { replace: true });
    };
    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="logo-icon">
                    <Shield size={20} strokeWidth={2.5} />
                </div>
                <div className="logo-text">
                    <span className="logo-name">FraudShield</span>
                    <span className="logo-tag">Risk Platform</span>
                </div>
            </div>

            {/* Live Status */}
            <div className="sidebar-status">
                <div className="live-dot" />
                <span>System Operational</span>
                <Zap size={12} className="zap-icon" />
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="nav-section-label">Navigation</div>
                {navItems.map(({ to, icon, label, id }) => (
                    <NavLink
                        key={to}
                        to={to}
                        id={id}
                        end={to === '/'}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{React.createElement(icon, { size: 17, strokeWidth: 2 })}</span>
                        <span className="nav-label">{label}</span>
                        <ChevronRight size={14} className="nav-arrow" />
                    </NavLink>
                ))}
            </nav>

            {/* Activity */}
            <div className="sidebar-activity">
                <div className="activity-header">
                    <Activity size={13} />
                    <span>Live Events</span>
                </div>
                <LiveEventFeed />
            </div>

            {/* Footer */}
            <div className="sidebar-footer">
                {user.name && <div className="sidebar-footer-label" style={{ fontWeight: 600 }}>{user.name}</div>}
                {user.email && <div className="sidebar-footer-sub" style={{ fontSize: 10, marginBottom: 8 }}>{user.email}</div>}
                <button id="btn-sign-out" onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '6px 12px', color: '#ef4444', fontSize: 12, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                    <LogOut size={12} />Sign Out
                </button>
                <div className="sidebar-footer-sub" style={{ marginTop: 6 }}>Kafka · Redis · PostgreSQL</div>
            </div>
        </aside>
    );
}

function LiveEventFeed() {
    const [events, setEvents] = React.useState([
        { id: 1, text: 'tx9821 BLOCKED', type: 'block', time: '0s' },
        { id: 2, text: 'tx9820 APPROVED', type: 'approve', time: '2s' },
        { id: 3, text: 'tx9819 REVIEW', type: 'review', time: '5s' },
    ]);

    React.useEffect(() => {
        const eventTypes = [
            { text: 'BLOCKED', type: 'block' },
            { text: 'APPROVED', type: 'approve' },
            { text: 'REVIEW', type: 'review' },
        ];
        const interval = setInterval(() => {
            const ev = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            const txId = `tx${Math.floor(Math.random() * 9000 + 1000)}`;
            setEvents(prev => [
                { id: Date.now(), text: `${txId} ${ev.text}`, type: ev.type, time: 'now' },
                ...prev.slice(0, 4),
            ]);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="live-events">
            {events.map(ev => (
                <div key={ev.id} className={`live-event live-event-${ev.type}`}>
                    <span className={`event-dot event-dot-${ev.type}`} />
                    <span className="event-text">{ev.text}</span>
                    <span className="event-time">{ev.time}</span>
                </div>
            ))}
        </div>
    );
}
