const { createProjectService } = require('../../src/domain/ProjectService');
const { createInMemoryProjectRepository, clearStore } = require('../../src/persistence/inmemory');

const USER = 'user-abc';

beforeEach(() => clearStore());

describe('ProjectService — auto-close logic', () => {
    test('project closes when all tasks are completed', async () => {
        const repo = createInMemoryProjectRepository();
        const service = createProjectService(repo);

        const project = await service.createProject('My Project', USER);

        // Simulate 2 tasks registered
        await repo.update(project.id, USER, { totalTasks: 2 });

        await service.incrementCompletedTasks(project.id, USER);
        let p = await repo.getById(project.id, USER);
        expect(p.status).toBe('open'); // 1/2 done → still open

        await service.incrementCompletedTasks(project.id, USER);
        p = await repo.getById(project.id, USER);
        expect(p.status).toBe('closed'); // 2/2 done → closed
        expect(p.completedTasks).toBe(2);
    });

    test('project does not close when totalTasks is 0', async () => {
        const repo = createInMemoryProjectRepository();
        const service = createProjectService(repo);
        const project = await service.createProject('Empty Project', USER);

        await service.incrementCompletedTasks(project.id, USER);
        const p = await repo.getById(project.id, USER);
        expect(p.status).toBe('open'); // totalTasks=0 → no auto-close
    });

    test('project re-opens when a task is reopened', async () => {
        const repo = createInMemoryProjectRepository();
        const service = createProjectService(repo);
        const project = await service.createProject('Closed Project', USER);

        // Force project to closed state with 2/2 tasks
        await repo.update(project.id, USER, { totalTasks: 2, completedTasks: 2, status: 'closed' });

        await service.decrementCompletedTasks(project.id, USER);
        const p = await repo.getById(project.id, USER);
        expect(p.status).toBe('open');
        expect(p.completedTasks).toBe(1);
    });

    test('incrementTotalTasks increases totalTasks', async () => {
        const repo = createInMemoryProjectRepository();
        const service = createProjectService(repo);
        const project = await service.createProject('Project', USER);

        await service.incrementTotalTasks(project.id, USER);
        await service.incrementTotalTasks(project.id, USER);
        const p = await repo.getById(project.id, USER);
        expect(p.totalTasks).toBe(2);
    });

    test('decrementTotalTasks does not go below 0', async () => {
        const repo = createInMemoryProjectRepository();
        const service = createProjectService(repo);
        const project = await service.createProject('Project', USER);

        await service.decrementTotalTasks(project.id, USER);
        const p = await repo.getById(project.id, USER);
        expect(p.totalTasks).toBe(0);
    });
});
