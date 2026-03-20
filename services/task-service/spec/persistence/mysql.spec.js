/**
 * MySQL persistence tests.
 *
 * Ces tests sont ignorés automatiquement si MYSQL_HOST n'est pas défini.
 * Pour les lancer, démarrer le service MySQL via Docker Compose puis exécuter :
 *
 *   docker compose up -d mysql
 *   MYSQL_HOST=localhost MYSQL_USER=todo MYSQL_PASSWORD=todopass MYSQL_DB=todos \
 *     npx jest spec/persistence/mysql.spec.js
 *
 * Ou depuis le projet racine :
 *   docker compose --profile mysql up -d
 *   (voir commentaires dans docker-compose.yml pour activer le service mysql)
 */

const SKIP = !process.env.MYSQL_HOST;

const ITEM = {
    id: '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
    name: 'Test MySQL',
    completed: false,
};

// conditionalDescribe saute le bloc si MySQL n'est pas configuré
const conditionalDescribe = SKIP ? describe.skip : describe;

conditionalDescribe('MySQL persistence (TodoRepository interface)', () => {
    let db;

    beforeAll(async () => {
        // Charger l'adapter ici pour que waitPort ne bloque pas si MYSQL_HOST est absent
        db = require('../../src/persistence/mysql');
        await db.init();
    }, 20_000);

    afterAll(async () => {
        try {
            await db.teardown();
        } catch (_e) {
            // ignore
        }
    });

    beforeEach(async () => {
        // Nettoyer la table avant chaque test
        await new Promise((resolve, reject) => {
            db._pool
                ? db._pool.query('DELETE FROM todo_items', (err) => (err ? reject(err) : resolve()))
                : resolve(); // fallback si _pool non exposé : on continue
        }).catch(() => {
            // Si _pool n'est pas exposé on ignore, les tests de getAll vérifieront quand même
        });
        // Alternative : recréer via l'API publique (supprimer l'item s'il existe)
        try { await db.remove(ITEM.id); } catch (_e) {}
    });

    test('it initializes correctly (connexion et création de table)', async () => {
        // init() a déjà été appelé dans beforeAll — on vérifie juste que getAll ne plante pas
        const items = await db.getAll();
        expect(Array.isArray(items)).toBe(true);
    });

    test('it can store and retrieve items', async () => {
        await db.add(ITEM);

        const items = await db.getAll();
        const found = items.find(i => i.id === ITEM.id);
        expect(found).toBeDefined();
        expect(found.name).toBe(ITEM.name);
        expect(found.completed).toBe(false);
    });

    test('it can update an existing item', async () => {
        await db.add(ITEM);

        await db.update(ITEM.id, { name: ITEM.name, completed: true });

        const updated = await db.getById(ITEM.id);
        expect(updated).toBeDefined();
        expect(updated.completed).toBe(true);
    });

    test('it can remove an existing item', async () => {
        await db.add(ITEM);
        await db.remove(ITEM.id);

        const item = await db.getById(ITEM.id);
        expect(item).toBeUndefined();
    });

    test('it can get a single item by id', async () => {
        await db.add(ITEM);

        const item = await db.getById(ITEM.id);
        expect(item).toBeDefined();
        expect(item.id).toBe(ITEM.id);
        expect(item.name).toBe(ITEM.name);
    });

    test('getById returns undefined for non-existent id', async () => {
        const item = await db.getById('non-existent-id');
        expect(item).toBeUndefined();
    });
});
