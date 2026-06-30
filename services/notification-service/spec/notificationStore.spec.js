const { addNotification, getNotificationsForUser, markAllRead } = require('../src/store/notificationStore');

describe('notificationStore', () => {
    test('addNotification et getNotificationsForUser', () => {
        addNotification({ id: '1', userId: 'u1', message: 'test', read: false, createdAt: new Date().toISOString() });
        const notifs = getNotificationsForUser('u1');
        expect(notifs.length).toBeGreaterThan(0);
        expect(notifs[0].userId).toBe('u1');
    });

    test('getNotificationsForUser ne retourne pas les notifs d\'autres users', () => {
        const notifs = getNotificationsForUser('u-inexistant');
        expect(notifs).toEqual([]);
    });

    test('markAllRead marque toutes les notifs comme lues', () => {
        addNotification({ id: '2', userId: 'u2', message: 'hello', read: false, createdAt: new Date().toISOString() });
        markAllRead('u2');
        const notifs = getNotificationsForUser('u2');
        expect(notifs.every(n => n.read)).toBe(true);
    });
});