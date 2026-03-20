# Todo App — Architecture Microservices Event-Driven

Application Todo fullstack avec authentification, gestion de projets et notifications
en temps quasi-réel via Redis Pub/Sub.

- **Frontend** : React 19 + Vite + TypeScript + Bootstrap 5
- **task-service** : Express + TypeScript + SQLite ou MySQL (Ports & Adapters)
- **project-service** : Express + TypeScript + SQLite
- **notification-service** : Express + TypeScript + In-Memory store
- **Message broker** : Redis Pub/Sub (événements entre services)
- **Auth** : JWT + scrypt password hashing (partagé entre tous les services)

## Prérequis

- **Node.js >= 24** (voir `.nvmrc`)
- **npm**
- **Docker** & **Docker Compose**

## Lancement rapide

```bash
make        # ou : make up
```

| Service | URL |
|---|---|
| Frontend (React) | http://localhost |
| task-service (API) | http://localhost:3000 |
| project-service (API) | http://localhost:3002 |
| notification-service (API) | http://localhost:3003 |

## Commandes Make

| Commande | Description |
|---|---|
| `make` / `make up` | Build et démarre tous les conteneurs |
| `make install` | Installe les dépendances npm de tous les services |
| `make test` | Suite complète : clean → install → up → wait-mysql → unit → e2e |
| `make test-unit` | Tests unitaires task-service + project-service (MySQL requis sur :3306) |
| `make test-e2e` | Tests E2E Playwright (stack Docker déjà démarrée) |
| `make wait-mysql` | Attend que MySQL accepte des requêtes (utilisé par `make test`) |
| `make logs` | Logs en live de tous les conteneurs |
| `make clean` | Stoppe les conteneurs (conserve les volumes) |
| `make clean-all` | Stoppe les conteneurs **et supprime les volumes** (reset complet) |

## Choix de la base de données (task-service)

Le task-service choisit son adaptateur de persistence au démarrage selon les variables d'environnement (priorité en cascade) :

| Condition | Adaptateur |
|---|---|
| `MYSQL_HOST` défini | MySQL |
| `USE_INMEMORY=true` | In-memory (aucune persistence) |
| (rien) | **SQLite** ← défaut |

### SQLite (défaut)

Aucune configuration requise. Les données sont persistées dans un volume Docker (`/data/task.db`).

```bash
make up
```

### MySQL (optionnel)

Dans le fichier `.env` à la racine, décommenter les 5 lignes :

```env
COMPOSE_PROFILES=mysql
MYSQL_HOST=mysql
MYSQL_USER=todo
MYSQL_PASSWORD=todopass
MYSQL_DB=todos
```

Puis simplement :

```bash
make
```

`COMPOSE_PROFILES=mysql` indique à Docker Compose de démarrer le conteneur MySQL automatiquement.

### In-memory (tests locaux rapides)

```bash
cd services/task-service
USE_INMEMORY=true npm run dev
```

## Développement local (par service)

### task-service

```bash
cd services/task-service
npm install
npm run dev          # nodemon + ts-node sur :3000
npm test             # tests unitaires + intégration + auth
npm run typecheck    # TypeScript strict
```

Tests SQLite uniquement (sans MySQL) :

```bash
cd services/task-service
npm test -- --testPathIgnorePatterns=mysql --forceExit
```

### project-service

```bash
cd services/project-service
npm install
npm run dev          # nodemon + ts-node sur :3002
npm test
npm run typecheck
```

### notification-service

```bash
cd services/notification-service
npm install
npm run dev          # nodemon + ts-node sur :3003
npm run typecheck
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # Vite dev server sur :5173 (proxy vers les services)
npm run build        # Build de production
npm run test:e2e     # Tests E2E Playwright
```

## Tests

### Suite complète (recommandée)

```bash
make test
```

Enchaîne automatiquement : `clean-all` → `install` → `up` → `wait-mysql` → `test-unit` → `test-e2e`.
Le step `wait-mysql` garantit que MySQL est prêt avant de lancer les tests unitaires.

### Tests unitaires seuls

```bash
make test-unit
```

Lance les tests Jest du task-service (avec MySQL sur `localhost:3306`) et du project-service.
**Requiert que la stack Docker soit démarrée** (`make up`).

### Tests E2E (Playwright)

```bash
make test-e2e
```

Deux suites de tests :

| Fichier | Description | Redis requis |
|---|---|---|
| `e2e/todo.spec.ts` | CRUD tâches, auth (10 scénarios) | Non (events ignorés) |
| `e2e/project-workflow.spec.ts` | Workflow complet event-driven (3 scénarios) | Oui (démarré auto) |

## Architecture

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour les diagrammes complets.

```
projet-archi/
├── docker-compose.yml              # Lancement 1 commande
├── docs/
│   ├── ARCHITECTURE.md             # Architecture complète (Partie 1 + Partie 2)
│   ├── adr/
│   │   ├── ADR-001-ports-and-adapters.md
│   │   ├── ADR-002-separation-frontend-backend.md
│   │   ├── ADR-003-injection-composition-root.md
│   │   ├── ADR-004-choix-message-broker.md       # Redis vs RabbitMQ
│   │   └── ADR-005-event-driven-architecture.md  # Pourquoi event-driven
│   └── events/
│       ├── TaskCompleted.v1.json   # Contrat d'événement
│       ├── TaskReopened.v1.json
│       └── ProjectClosed.v1.json
├── services/
│   ├── task-service/               # CRUD tâches + auth + publish events
│   │   ├── src/
│   │   │   ├── domain/             # TodoService, AuthService, interfaces
│   │   │   ├── persistence/        # SQLite, InMemory adapters
│   │   │   ├── routes/             # HTTP handlers (factories)
│   │   │   ├── middleware/         # JWT auth
│   │   │   └── infra/
│   │   │       └── eventBus.ts     # Redis publisher (reconnect + logs structurés)
│   │   └── spec/                   # 68 tests Jest
│   ├── project-service/            # CRUD projets + subscribe events
│   │   ├── src/
│   │   │   ├── domain/             # ProjectService, interfaces
│   │   │   ├── persistence/        # InMemory adapter
│   │   │   ├── routes/             # HTTP handlers
│   │   │   ├── middleware/         # JWT auth
│   │   │   └── infra/
│   │   │       └── eventBus.ts     # Redis subscriber + publisher + idempotence
│   │   └── spec/                   # 14 tests Jest
│   └── notification-service/       # Consumer pur + HTTP GET /notifications
│       └── src/
│           ├── domain/             # Notification interface
│           ├── store/              # In-memory store (max 1000 notifs)
│           ├── middleware/         # JWT auth
│           ├── routes/             # GET /notifications
│           ├── app.ts              # Express factory
│           └── index.ts            # Redis subscriber + Express :3003
└── frontend/
    ├── nginx.conf                  # Reverse proxy vers les 3 services
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.tsx           # Avec NotificationPanel (cloche + badge)
    │   │   └── NotificationPanel.tsx # Polling 10s, dropdown Bootstrap
    │   └── api/
    │       └── client.ts            # getNotifications() + autres appels API
    └── e2e/
        ├── todo.spec.ts             # Tests CRUD (sans Redis)
        └── project-workflow.spec.ts # Tests event-driven complets (avec Redis)
```

### Flux événementiel

```
Utilisateur complète une tâche
  → task-service : PUBLISH TaskCompleted
    → project-service : incrémente completedTasks
      → si completedTasks === totalTasks : PUBLISH ProjectClosed
        → notification-service : crée Notification "Projet terminé !"
    → notification-service : crée Notification "Tâche terminée dans le projet X"
  → Frontend polling /notifications toutes les 10s
    → Cloche avec badge + dropdown des notifications
```

## Variables d'environnement

### task-service

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port HTTP |
| `JWT_SECRET` | `dev-secret-...` | Secret JWT (**changer en production !**) |
| `SQLITE_DB_LOCATION` | `/data/task.db` | Chemin SQLite |
| `CORS_ORIGIN` | `http://localhost:5173` | Origine CORS autorisée |
| `REDIS_HOST` | `localhost` | Hôte Redis |
| `REDIS_PORT` | `6379` | Port Redis |
| `USE_INMEMORY` | — | Mettre `true` pour désactiver la persistence |
| `MYSQL_HOST` | — | Si défini, active l'adaptateur MySQL à la place de SQLite |
| `MYSQL_USER` | — | Utilisateur MySQL |
| `MYSQL_PASSWORD` | — | Mot de passe MySQL |
| `MYSQL_DB` | — | Nom de la base MySQL |

### project-service

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3002` | Port HTTP |
| `JWT_SECRET` | `dev-secret-...` | Secret JWT (identique aux autres services) |
| `REDIS_HOST` | `localhost` | Hôte Redis |
| `REDIS_PORT` | `6379` | Port Redis |

### notification-service

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3003` | Port HTTP |
| `JWT_SECRET` | `dev-secret-...` | Secret JWT |
| `REDIS_HOST` | `localhost` | Hôte Redis |
| `REDIS_PORT` | `6379` | Port Redis |

## Conformité RGPD

Voir [docs/RGPD.md](docs/RGPD.md).

- **Minimisation** : seules les données nécessaires sont collectées
- **Consentement** : case obligatoire à l'inscription
- **Droit d'accès** : page profil avec toutes les données personnelles
- **Droit de rectification** : modification du nom et de l'email
- **Droit à l'effacement** : suppression du compte et de toutes les données
- **Sécurité** : mots de passe hashés avec scrypt, JWT avec expiration
