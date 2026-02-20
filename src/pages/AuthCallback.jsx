import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * OAuth2 Callback page — handles the redirect from Google after login.
 *
 * Google redirects to: /auth/callback#access_token=...&token_type=Bearer&...
 * We extract the access_token from the URL hash and store it in localStorage.
 */
export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const hash = window.location.hash.substring(1); // remove leading #
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');

        if (token) {
            localStorage.setItem('auth_token', token);
            // Fetch basic user info from Google
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(r => r.json())
                .then(user => {
                    localStorage.setItem('auth_user', JSON.stringify({
                        name: user.name || 'Analyst',
                        email: user.email || '',
                        picture: user.picture || null,
                    }));
                })
                .catch(() => {/* profile load failed — token still stored */ })
                .finally(() => navigate('/', { replace: true }));
        } else {
            // No token received — redirect back to login
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', color: 'var(--text-muted)', fontSize: 13 }}>
            <div style={{ textAlign: 'center' }}>
                <div className="loader" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
                Completing sign-in…
            </div>
        </div>
    );
}
