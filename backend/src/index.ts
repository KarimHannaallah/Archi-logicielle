import { createApp } from './app';
import { createTodoService } from './domain/TodoService';
import { InMemoryRepository } from './persistence/inmemory';

function resolveAdapter(): any {
    if (process.env.USE_INMEMORY === 'true') {
        return new InMemoryRepository();
    } else if (process.env.MYSQL_HOST) {
        return require('./persistence/mysql');
    } else {
        return require('./persistence/sqlite');
    }
}

async function main() {
    const adapter = resolveAdapter();

    if (adapter.init) {
        await adapter.init();
    }

    const todoService = createTodoService(adapter);
    const app = createApp(todoService);

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

main().catch(console.error);