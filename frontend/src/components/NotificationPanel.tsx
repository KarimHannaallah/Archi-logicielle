import { useState, useEffect, useRef, useCallback } from 'react';
import { getNotifications, markNotificationsRead } from '../api/client';
import type { Notification } from '../types';

const POLL_INTERVAL_MS = 10_000;
const MARK_READ_GRACE_MS = 15_000;

function relativeTime(isoDate: string): string {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `il y a ${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH}h`;
    return `il y a ${Math.floor(diffH / 24)}j`;
}

function eventIcon(eventType: string): string {
    switch (eventType) {
        case 'TaskCompleted': return '✅';
        case 'TaskReopened':  return '🔄';
        case 'TaskDeleted':   return '🗑️';
        case 'ProjectClosed': return '🎉';
        default: return '🔔';
    }
}

export default function NotificationPanel() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const [, setTick] = useState(0);
    const panelRef = useRef<HTMLDivElement>(null);
    const lastMarkReadAt = useRef<number>(0);

    const fetchNotifications = useCallback(() => {
        // Don't overwrite local "all read" state within the grace period
        if (Date.now() - lastMarkReadAt.current < MARK_READ_GRACE_MS) return;
        getNotifications()
            .then(setNotifications)
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchNotifications();
        const pollId = setInterval(fetchNotifications, POLL_INTERVAL_MS);
        return () => clearInterval(pollId);
    }, [fetchNotifications]);

    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30_000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleOpen = () => {
        const wasOpen = open;
        setOpen(o => !o);
        if (!wasOpen) {
            const hasUnread = notifications.some(n => !n.read);
            if (hasUnread) {
                // Optimistically mark all as read locally immediately
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                lastMarkReadAt.current = Date.now();
                // Then persist on server (best effort)
                markNotificationsRead().catch(() => {});
            }
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="position-relative me-2" ref={panelRef}>
            <button
                className="btn btn-link nav-link p-0 position-relative"
                onClick={handleOpen}
                aria-label="Notifications"
                style={{ color: 'rgba(255,255,255,0.85)' }}
            >
                <i className="fa fa-bell fa-lg" />
                {unreadCount > 0 && (
                    <span
                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                        style={{ fontSize: '0.6rem' }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="dropdown-menu dropdown-menu-end show notif-dropdown"
                    style={{ maxHeight: '420px', overflowY: 'auto', right: 0, left: 'auto' }}
                >
                    <div className="notif-header">
                        <span>
                            <i className="fa fa-bell me-2" style={{ color: 'var(--primary)' }} />
                            Notifications
                        </span>
                        {unreadCount > 0 && (
                            <span className="badge rounded-pill" style={{ background: 'var(--primary)', fontSize: '0.7rem' }}>
                                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    <div className="dropdown-divider m-0" />

                    {notifications.length === 0 ? (
                        <div className="notif-empty">
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.4 }}>🔔</div>
                            Aucune notification
                        </div>
                    ) : (
                        notifications.slice(0, 20).map(n => (
                            <div
                                key={n.id}
                                className={`notif-item ${!n.read ? 'unread' : ''}`}
                            >
                                <div className="d-flex align-items-start gap-2">
                                    <span className="notif-icon">{eventIcon(n.eventType)}</span>
                                    <div className="flex-grow-1">
                                        <div className="notif-msg">{n.message}</div>
                                        <div className="notif-time">{relativeTime(n.createdAt)}</div>
                                    </div>
                                    {!n.read && (
                                        <span
                                            className="badge rounded-pill align-self-center"
                                            style={{ background: 'var(--primary)', fontSize: '0.55rem' }}
                                        >
                                            new
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
