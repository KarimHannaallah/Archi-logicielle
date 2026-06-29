CREATE TABLE IF NOT EXISTS todo_items (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255),
    completed BOOLEAN,
    userId VARCHAR(36),
    projectId VARCHAR(36)
);