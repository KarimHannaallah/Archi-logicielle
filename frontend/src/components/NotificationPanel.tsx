import { useState, useEffect, useRef } from 'react';
import { getNotifications, markNotificationsRead } from '../api/client';
import type { Notification } from '../types';

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    return `il y a ${Math.floor(hours / 24)}j`;
}

function eventIcon(type: string): string {
    switch (type) {
        case 'TaskCompleted': return '✅';
        case 'TaskReopened': return '🔄';
        case 'ProjectClosed': return '🎉';
        default: return '🔔';
    }
}

export default function NotificationPanel() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const [, setTick] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchNotifs = () => {
            getNotifications().then(setNotifications).catch(() => {});
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                if (open) {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    markNotificationsRead().catch(() => {});
                }
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleToggle = () => {
        if (open) {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            markNotificationsRead().catch(() => {});
        }
        setOpen(!open);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="position-relative" ref={ref}>
            <button
                className="btn btn-outline-light btn-sm position-relative"
                onClick={handleToggle}
            >
                🔔
                {unreadCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="position-absolute end-0 mt-2 bg-white border rounded shadow"
                    style={{ width: '320px', maxHeight: '400px', overflowY: 'auto', zIndex: 1000 }}
                >
                    <div className="p-2 border-bottom fw-bold text-dark small">
                        Notifications ({notifications.length})
                    </div>
                    {notifications.length === 0 && (
                        <div className="p-3 text-center text-muted small">Aucune notification</div>
                    )}
                    {notifications.slice(0, 20).map(n => (
                        <div
                            key={n.id}
                            className={`d-flex align-items-start gap-2 p-2 border-bottom ${!n.read ? 'bg-light' : ''}`}
                        >
                            <span style={{ fontSize: '1.1rem' }}>{eventIcon(n.eventType)}</span>
                            <div className="flex-grow-1">
                                <div className="small text-dark fw-semibold">{n.message}</div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    {timeAgo(n.createdAt)}
                                </div>
                            </div>
                            {!n.read && (
                                <span className="badge bg-primary" style={{ fontSize: '0.6rem' }}>new</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}