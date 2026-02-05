// Unit tests with full mocking — complements sqlite.spec.js (integration with real DB)
// Covers: error paths, fs branches, boolean conversion, logging

describe('sqlite persistence (unit with mocks)', () => {
    afterEach(() => {
        jest.resetModules();
        jest.restoreAllMocks();
        delete process.env.SQLITE_DB_LOCATION;
        delete process.env.NODE_ENV;
    });

    function makeMockEnv(opts = {}) {
        const {
            dbOpenError = null,
            createTableError = null,
            allError = null,
            allRows = [],
            runError = null,
            closeError = null,
            existsSync = false,
            nodeEnv = 'test',
        } = opts;

        // fs mock (mkdir branch)
        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => existsSync),
            mkdirSync: jest.fn(),
        }));

        // single DB object mock
        const dbObj = {
            run: jest.fn((sql, paramsOrCb, maybeCb) => {
                const cb =
                    typeof paramsOrCb === 'function' ? paramsOrCb : maybeCb;
                const err = String(sql).includes('CREATE TABLE')
                    ? createTableError
                    : runError;
                cb(err, null);
            }),
            all: jest.fn((sql, paramsOrCb, maybeCb) => {
                const cb =
                    typeof paramsOrCb === 'function' ? paramsOrCb : maybeCb;
                cb(allError, allRows);
            }),
            close: jest.fn((cb) => cb(closeError)),
        };

        // sqlite3 mock
        const sqlite3Mock = {
            verbose: () => sqlite3Mock,
            Database: jest.fn((_location, cb) => {
                process.nextTick(() => cb(dbOpenError));
                return dbObj;
            }),
        };
        jest.doMock('sqlite3', () => sqlite3Mock);

        // env
        process.env.SQLITE_DB_LOCATION = '/tmp/mock/todo.db';
        process.env.NODE_ENV = nodeEnv;

        return { dbObj, sqlite3Mock };
    }

    async function loadAndInit(opts) {
        makeMockEnv(opts);
        const sqlite = require('../../src/persistence/sqlite');
        await sqlite.init();
        return sqlite;
    }

    // ---------- init() ----------

    test('init creates directory if missing', async () => {
        makeMockEnv({ existsSync: false });
        const sqlite = require('../../src/persistence/sqlite');
        await sqlite.init();

        const fsMock = require('fs');
        expect(fsMock.existsSync).toHaveBeenCalledWith('/tmp/mock');
        expect(fsMock.mkdirSync).toHaveBeenCalledWith('/tmp/mock', {
            recursive: true,
        });
    });

    test('init skips mkdir if directory exists', async () => {
        makeMockEnv({ existsSync: true });
        const sqlite = require('../../src/persistence/sqlite');
        await sqlite.init();

        const fsMock = require('fs');
        expect(fsMock.existsSync).toHaveBeenCalled();
        expect(fsMock.mkdirSync).not.toHaveBeenCalled();
    });

    test('init logs when NODE_ENV is not test', async () => {
        const consoleSpy = jest
            .spyOn(console, 'log')
            .mockImplementation(() => {});
        makeMockEnv({ nodeEnv: 'development' });
        const sqlite = require('../../src/persistence/sqlite');
        await sqlite.init();

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('/tmp/mock/todo.db'),
        );
    });

    test('init does not log when NODE_ENV is test', async () => {
        const consoleSpy = jest
            .spyOn(console, 'log')
            .mockImplementation(() => {});
        makeMockEnv({ nodeEnv: 'test' });
        const sqlite = require('../../src/persistence/sqlite');
        await sqlite.init();

        expect(consoleSpy).not.toHaveBeenCalled();
    });

    test.each([
        [
            'open fails',
            { dbOpenError: new Error('open failed') },
            'open failed',
        ],
        [
            'create table fails',
            { createTableError: new Error('create failed') },
            'create failed',
        ],
    ])('init rejects when %s', async (_label, opts, msg) => {
        makeMockEnv(opts);
        const sqlite = require('../../src/persistence/sqlite');
        await expect(sqlite.init()).rejects.toThrow(msg);
    });

    // ---------- teardown() ----------

    test('teardown resolves on close success', async () => {
        const sqlite = await loadAndInit({ closeError: null });
        await expect(sqlite.teardown()).resolves.toBeUndefined();
    });

    test('teardown rejects on close error', async () => {
        const sqlite = await loadAndInit({
            closeError: new Error('close failed'),
        });
        await expect(sqlite.teardown()).rejects.toThrow('close failed');
    });

    // ---------- getAll / getById ----------

    test('getAll converts completed 1/0 to boolean', async () => {
        const sqlite = await loadAndInit({
            allRows: [
                { id: '1', name: 'A', completed: 1 },
                { id: '2', name: 'B', completed: 0 },
            ],
        });
        await expect(sqlite.getAll()).resolves.toEqual([
            { id: '1', name: 'A', completed: true },
            { id: '2', name: 'B', completed: false },
        ]);
    });

    test('getAll rejects on db.all error', async () => {
        const sqlite = await loadAndInit({
            allError: new Error('all failed'),
        });
        await expect(sqlite.getAll()).rejects.toThrow('all failed');
    });

    test('getById returns first item and converts completed', async () => {
        const sqlite = await loadAndInit({
            allRows: [{ id: 'x', name: 'X', completed: 1 }],
        });
        await expect(sqlite.getById('x')).resolves.toEqual({
            id: 'x',
            name: 'X',
            completed: true,
        });
    });

    test('getById returns undefined when no rows', async () => {
        const sqlite = await loadAndInit({ allRows: [] });
        await expect(sqlite.getById('missing')).resolves.toBeUndefined();
    });

    test('getById rejects on db.all error', async () => {
        const sqlite = await loadAndInit({
            allError: new Error('getById failed'),
        });
        await expect(sqlite.getById('x')).rejects.toThrow('getById failed');
    });

    // ---------- add / update / remove (success + error) ----------

    test.each([
        [
            'add',
            (s) => s.add({ id: '1', name: 'A', completed: true }),
        ],
        [
            'update',
            (s) => s.update('1', { name: 'A', completed: false }),
        ],
        ['remove', (s) => s.remove('1')],
    ])('%s resolves on success', async (_name, call) => {
        const sqlite = await loadAndInit({ runError: null });
        await expect(call(sqlite)).resolves.toBeUndefined();
    });

    test.each([
        [
            'add',
            (s) => s.add({ id: '1', name: 'A', completed: true }),
        ],
        [
            'update',
            (s) => s.update('1', { name: 'A', completed: false }),
        ],
        ['remove', (s) => s.remove('1')],
    ])('%s rejects on db.run error', async (_name, call) => {
        const sqlite = await loadAndInit({
            runError: new Error('run failed'),
        });
        await expect(call(sqlite)).rejects.toThrow('run failed');
    });

    // ---------- ternary branches completed ? 1 : 0 ----------

    test('add/update pass correct completed flag (1 or 0)', async () => {
        const { dbObj } = makeMockEnv({ runError: null });
        const sqlite = require('../../src/persistence/sqlite');
        await sqlite.init();

        await sqlite.add({ id: '1', name: 'A', completed: true });
        await sqlite.add({ id: '2', name: 'B', completed: false });
        await sqlite.update('1', { name: 'A', completed: true });
        await sqlite.update('2', { name: 'B', completed: false });

        // INSERT params: [id, name, completedFlag]
        const insertCalls = dbObj.run.mock.calls.filter((c) =>
            String(c[0]).includes('INSERT INTO'),
        );
        expect(insertCalls[0][1][2]).toBe(1);
        expect(insertCalls[1][1][2]).toBe(0);

        // UPDATE params: [name, completedFlag, id]
        const updateCalls = dbObj.run.mock.calls.filter((c) =>
            String(c[0]).includes('UPDATE todo_items'),
        );
        expect(updateCalls[0][1][1]).toBe(1);
        expect(updateCalls[1][1][1]).toBe(0);
    });
});
