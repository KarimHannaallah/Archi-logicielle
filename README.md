# Kanban App — Microservices Event-Driven

Application collaborative de gestion de projets kanban, construite en microservices avec communication par événements.

## Architecture

- **Frontend** : React 19 + Vite + TypeScript
- **Task Service** : Express + TypeScript (Ports & Adapters) — CRUD tâches, publie TaskCompleted/TaskReopened
- **Project Service** : Express + TypeScript (Ports & Adapters) — CRUD projets, auto-close via projection locale
- **Notification Service** : Express + TypeScript — consumer Redis, stocke et expose les notifications
- **Broker** : Redis 7 Pub/Sub
- **Persistence** : SQLite (défaut) ou InMemory
- **Auth** : JWT + scrypt
- **RGPD** : minimisation des données, consentement, droit à l'effacement

## Prérequis

- Docker & Docker Compose
- Node.js >= 24 (pour le développement)

## Lancement (Docker Compose)
```bash
docker compose up --build
```

- Frontend : http://localhost
- Task Service : http://localhost:3000
- Project Service : http://localhost:3002
- Notification Service : http://localhost:3003

## Lancement en développement
```bash
# Terminal 1 — Redis
docker run --rm -p 6379:6379 redis:7-alpine

# Terminal 2 — Task Service
cd services/task-service
USE_INMEMORY=true REDIS_HOST=localhost JWT_SECRET=change-me npm run dev

# Terminal 3 — Project Service
cd services/project-service
USE_INMEMORY=true REDIS_HOST=localhost JWT_SECRET=change-me npx ts-node src/index.ts

# Terminal 4 — Notification Service
cd services/notification-service
REDIS_HOST=localhost JWT_SECRET=change-me npx ts-node src/index.ts

# Terminal 5 — Frontend
cd frontend
npm run dev
```

## Tests
```bash
# Tests unitaires + intégration (par service)
cd services/task-service && npm test
cd services/project-service && npm test

# Tests E2E (lance automatiquement Redis + 3 services + Vite)
cd frontend && npx playwright test
```

## Structure du monorepo
```
├── frontend/                     React + Vite
│   ├── src/components/           Composants (ProjectList, ProjectDetail, NotificationPanel...)
│   ├── e2e/                      Tests Playwright (todo.spec.ts, project-workflow.spec.ts)
│   └── playwright.config.ts      Config avec 5 webServers auto
├── services/
│   ├── task-service/             Express — CRUD tâches + events publisher
│   │   ├── src/domain/           TodoItem, TodoRepository, TodoService
│   │   ├── src/infra/            EventBus (Redis publisher)
│   │   └── spec/                 68 tests Jest
│   ├── project-service/          Express — CRUD projets + events subscriber
│   │   ├── src/domain/           Project, ProjectRepository, ProjectService
│   │   ├── src/infra/            EventBus (Redis subscriber + publisher)
│   │   └── spec/                 14+ tests Jest
│   └── notification-service/     Express + Redis subscriber
│       ├── src/domain/           Notification
│       ├── src/store/            In-memory notification store
│       └── src/routes/           GET /notifications
├── docs/
│   ├── ARCHITECTURE.md           Diagrammes + bounded contexts + séquences
│   ├── AUDIT.md                  Audit initial (11 problèmes identifiés)
│   ├── RGPD.md                   Conformité RGPD
│   ├── adr/                      5 ADR (Ports&Adapters, Front/Back, DI, Broker, Event-Driven)
│   └── events/                   JSON Schema des événements
└── docker-compose.yml            5 containers (frontend, task, project, notification, redis)
```

## Variables d'environnement

| Variable | Service | Défaut | Description |
|----------|---------|--------|-------------|
| PORT | tous | 3000/3002/3003 | Port d'écoute |
| REDIS_HOST | tous | localhost | Hôte Redis |
| REDIS_PORT | tous | 6379 | Port Redis |
| JWT_SECRET | tous | change-me-in-production | Secret JWT partagé |
| USE_INMEMORY | task, project | false | Utiliser InMemory au lieu de SQLite |
| SQLITE_DB_LOCATION | task, project | /data/*.db | Chemin de la base SQLite |
| CORS_ORIGIN | task | http://localhost:5173 | Origine autorisée CORS |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — Diagrammes, bounded contexts, séquences
- [Audit initial](docs/AUDIT.md) — 11 problèmes identifiés dans le monolithe
- [RGPD](docs/RGPD.md) — Conformité données personnelles
- [ADR-001](docs/adr/ADR-001-ports-and-adapters.md) — Choix Ports & Adapters
- [ADR-002](docs/adr/ADR-002-separation-frontend-backend.md) — Séparation Front/Back
- [ADR-003](docs/adr/ADR-003-injection-composition-root.md) — Injection via Composition Root
- [ADR-004](docs/adr/ADR-004-choix-message-brocker.md) — Redis Pub/Sub comme broker
- [ADR-005](docs/adr/ADR-005-event-driven-architecture.md) — Architecture Event-Driven