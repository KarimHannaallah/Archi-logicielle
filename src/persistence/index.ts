import { InMemoryRepository } from './inmemory';

let persistence: any;

if (process.env.USE_INMEMORY === 'true') {
    persistence = new InMemoryRepository();
} else if (process.env.MYSQL_HOST) {
    persistence = require('./mysql');
} else {
    persistence = require('./sqlite');
}

export = persistence;