import React from 'react';
import { Bell, Search, RefreshCw } from 'lucide-react';
import './Header.css';

export default function Header({ title, subtitle }) {
    const [time, setTime] = React.useState(new Date());

    React.useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    return (
        <header className="top-header">
            <div className="header-left">
                <div>
                    <h1 className="header-title">{title}</h1>
                    {subtitle && <p className="header-subtitle">{subtitle}</p>}
                </div>
            </div>

            <div className="header-right">
                {/* Search */}
                <div className="header-search">
                    <Search size={14} className="search-icon" />
                    <input id="global-search" placeholder="Search transactions..." className="search-input" />
                </div>

                {/* Live Clock */}
                <div className="header-clock">
                    <div className="live-dot" />
                    <span className="clock-time">
                        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                </div>

                {/* Refresh */}
                <button id="btn-refresh-header" className="btn btn-ghost btn-sm header-btn" title="Refresh">
                    <RefreshCw size={14} />
                </button>

                {/* Notifications */}
                <button id="btn-notifications" className="btn btn-ghost btn-sm header-btn notification-btn" title="Notifications">
                    <Bell size={14} />
                    <span className="notif-badge">3</span>
                </button>

                {/* Avatar */}
                <div className="header-avatar" title="Analyst">
                    <span>AS</span>
                </div>
            </div>
        </header>
    );
}
