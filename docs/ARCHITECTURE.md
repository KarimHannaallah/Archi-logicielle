# Architecture technique — Todo App

## 1. Vue d'ensemble

```
┌──────────────────────────────────────────────────────────┐
│                    Docker Compose                         │
│                                                          │
│  ┌─────────────────────┐    ┌─────────────────────────┐  │
│  │     Frontend         │    │        Backend          │  │
│  │  (React+Vite+TS)     │    │    (Express+TS)         │  │
│  │                      │    │                         │  │
│  │  nginx:80            │───▶│  node:3000              │  │
│  │  /items ──proxy──▶   │    │  /items   /auth         │  │
│  │  /auth  ──proxy──▶   │    │                         │  │
│  └─────────────────────┘    └────────────┬────────────┘  │
│                                          │               │
│                                   ┌──────▼──────┐        │
│                                   │   SQLite    │        │
│                                   │  (volume)   │        │
│                                   └─────────────┘        │
└──────────────────────────────────────────────────────────┘
```

## 2. Architecture backend — Ports & Adapters

```mermaid
graph TB
    subgraph "Infrastructure (Adapters)"
        HTTP["HTTP (Express)"]
        SQLite["SQLite Adapter"]
        MySQL["MySQL Adapter"]
        InMemory["InMemory Adapter"]
        UserSQLite["User SQLite Adapter"]
        UserInMemory["User InMemory Adapter"]
    end

    subgraph "Application (Ports)"
        Routes["Routes (factories)"]
        AuthRoutes["Auth Routes"]
        Middleware["Auth Middleware (JWT)"]
    end

    subgraph "Domain (coeur metier)"
        TodoService["TodoService"]
        AuthService["AuthService"]
        TodoRepo["<<interface>>\nTodoRepository"]
        UserRepo["<<interface>>\nUserRepository"]
        TodoItem["TodoItem"]
        User["User"]
    end

    HTTP --> Middleware
    Middleware --> Routes
    Middleware --> AuthRoutes
    Routes --> TodoService
    AuthRoutes --> AuthService
    TodoService --> TodoRepo
    AuthService --> UserRepo
    TodoRepo -.-> SQLite
    TodoRepo -.-> MySQL
    TodoRepo -.-> InMemory
    UserRepo -.-> UserSQLite
    UserRepo -.-> UserInMemory

    style TodoService fill:#e1f5fe
    style AuthService fill:#e1f5fe
    style TodoRepo fill:#fff9c4
    style UserRepo fill:#fff9c4
    style TodoItem fill:#c8e6c9
    style User fill:#c8e6c9
```

### Legende

| Couleur | Signification |
|---------|---------------|
| Bleu clair | Services (logique metier) |
| Jaune | Interfaces / Ports (contrats) |
| Vert | Entites du domaine |
| Gris (defaut) | Infrastructure / Adapters |

### Regle de dependance

Les fleches pointent toujours **vers le centre** (le domaine). Le domaine ne depend de rien d'exterieur :

```
Infrastructure ──▶ Application ──▶ Domain
     │                                ▲
     └────────────────────────────────┘
              (implemente les interfaces)
```

Cette regle est **enforcee automatiquement** par `dependency-cruiser` (`npm run lint:arch`).

## 3. Flux de donnees — Requete CRUD

```mermaid
sequenceDiagram
    participant Browser
    participant Nginx
    participant Express
    participant AuthMW as Auth Middleware
    participant Route as Route Handler
    participant Service as TodoService
    participant Repo as TodoRepository
    participant DB as SQLite

    Browser->>Nginx: GET /items (+ Bearer token)
    Nginx->>Express: proxy_pass
    Express->>AuthMW: verifier JWT
    AuthMW->>Route: req.userId defini
    Route->>Service: listTodos()
    Service->>Repo: getAll()
    Repo->>DB: SELECT * FROM todo_items
    DB-->>Repo: rows
    Repo-->>Service: TodoItem[]
    Service-->>Route: TodoItem[]
    Route-->>Express: res.send(items)
    Express-->>Nginx: 200 JSON
    Nginx-->>Browser: response
```

## 4. Flux d'authentification

```mermaid
sequenceDiagram
    participant Browser
    participant Frontend as React App
    participant Backend as Express API
    participant Auth as AuthService
    participant UserRepo as UserRepository
    participant DB as SQLite

    Note over Browser,DB: Inscription
    Browser->>Frontend: Formulaire Register
    Frontend->>Backend: POST /auth/register {email, name, password, consent}
    Backend->>Auth: register(email, name, password, consent)
    Auth->>Auth: hashPassword(scrypt + salt)
    Auth->>UserRepo: create(user)
    UserRepo->>DB: INSERT INTO users
    Auth-->>Backend: User
    Backend->>Backend: jwt.sign({userId}, secret)
    Backend-->>Frontend: {token, user}
    Frontend->>Frontend: localStorage.setItem('token')

    Note over Browser,DB: Requete authentifiee
    Browser->>Frontend: Ajouter un todo
    Frontend->>Backend: POST /items + Authorization: Bearer token
    Backend->>Backend: jwt.verify(token)
    Backend->>Backend: req.userId = decoded.userId
```

## 5. Architecture frontend — Composants React

```mermaid
graph TB
    subgraph "App (React Router)"
        Router["BrowserRouter"]
    end

    subgraph "Context"
        AuthCtx["AuthProvider\n(token, user, login, register,\nlogout, profile CRUD)"]
    end

    subgraph "Pages"
        Login["Login"]
        Register["Register"]
        Profile["Profile"]
        TodoList["TodoListCard"]
    end

    subgraph "Composants"
        Navbar["Navbar"]
        AddForm["AddItemForm"]
        ItemDisp["ItemDisplay"]
    end

    subgraph "Services"
        API["api/client.ts\n(fetch + JWT header)"]
    end

    Router --> AuthCtx
    AuthCtx --> Navbar
    AuthCtx --> Login
    AuthCtx --> Register
    AuthCtx --> Profile
    AuthCtx --> TodoList
    TodoList --> AddForm
    TodoList --> ItemDisp
    Login --> API
    Register --> API
    Profile --> API
    AddForm --> API
    ItemDisp --> API
    API -->|"/items, /auth"| Backend["Backend API :3000"]

    style AuthCtx fill:#e1f5fe
    style API fill:#fff9c4
```

## 6. Structure des donnees

### Table `todo_items`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | VARCHAR(36) | UUID v4 |
| `name` | VARCHAR(255) | Nom de la tache |
| `completed` | BOOLEAN | Etat de completion |
| `user_id` | VARCHAR(36) | Propriétaire de la tâche |
| `project_id` | VARCHAR(36) | Projet associé |

### Table `users`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | VARCHAR(36) | UUID v4 |
| `email` | VARCHAR(255) UNIQUE | Adresse email |
| `name` | VARCHAR(255) | Nom de l'utilisateur |
| `password_hash` | TEXT | Hash scrypt (salt:hash) |
| `created_at` | TEXT | Date ISO 8601 |
| `consent_given` | BOOLEAN | Consentement RGPD |

## 7. Composition Root (injection de dependances)

```typescript
// backend/src/index.ts (simplifie)

// 1. Choisir les adapters selon l'environnement
const todoAdapter = resolveAdapter();       // SQLite | MySQL | InMemory
const userAdapter = resolveUserAdapter();   // SQLite | InMemory

// 2. Creer les services avec injection
const todoService = createTodoService(todoAdapter);
const authService = createAuthService(userAdapter);

// 3. Assembler l'application
const app = createApp(todoService, { authService, enableAuth: true });

// 4. Initialiser et demarrer
await Promise.all([todoAdapter.init(), userAdapter.init()]);
app.listen(3000);
```

## 8. Tests — Couverture par couche

```
backend/spec/
├── integration/
│   ├── api.spec.js          # CRUD complet (InMemory, sans auth)
│   └── auth.spec.js         # Register, login, profil, delete, routes protegees
├── routes/
│   ├── addItem.spec.js      # Unit test (mock service)
│   ├── getItems.spec.js     # Unit test (mock service)
│   ├── updateItem.spec.js   # Unit test (mock service)
│   └── deleteItem.spec.js   # Unit test (mock service)
└── persistence/
    ├── inmemory.spec.js     # InMemory TodoRepository
    ├── sqlite.spec.js       # SQLite integration (real DB)
    ├── sqlite.unit.spec.js  # SQLite unit (full mocks)
    └── no-sqlite-in-test.spec.js  # Non-regression: isolation infra

frontend/e2e/
└── todo.spec.ts             # Playwright: register + CRUD complet
```

**Total : 67 tests backend (Jest) + 10 scenarios E2E (Playwright)**

---

## Architecture Microservices (Partie 2)

### Vue d'ensemble

La Todo App évolue vers une architecture **event-driven** composée de 3 microservices
indépendants, chacun avec sa propre base de données SQLite, communiquant via Redis
Pub/Sub (voir ADR-004).

```mermaid
graph TB
    User["Utilisateur"]
    FE["Frontend\n(React + Vite)"]
    Nginx["Nginx\n(reverse proxy :80)"]

    subgraph "Microservices"
        TS["task-service\n:3000"]
        PS["project-service\n:3002"]
        NS["notification-service\n:3003"]
    end

    subgraph "Bases de données"
        TDB[("SQLite\ntask.db")]
        PDB[("SQLite\nproject.db")]
    end

    Redis(["Redis\nPub/Sub\n:6379"])

    User --> FE
    FE --> Nginx
    Nginx -->|"/items, /auth"| TS
    Nginx -->|"/projects"| PS
    Nginx -->|"/notifications"| NS

    TS --- TDB
    PS --- PDB

    TS -->|"PUBLISH TaskCreated\nTaskCompleted\nTaskReopened\nTaskDeleted"| Redis
    Redis -->|"SUBSCRIBE"| PS
    Redis -->|"SUBSCRIBE"| NS
    PS -->|"PUBLISH ProjectClosed"| Redis

    style Redis fill:#dc382c,color:#fff
    style TS fill:#e1f5fe
    style PS fill:#e1f5fe
    style NS fill:#e1f5fe
    style Nginx fill:#009639,color:#fff
```

### Description des 3 Bounded Contexts

**Task Service** — Source of truth des tâches. Expose un CRUD complet pour créer,
lire, mettre à jour et supprimer des tâches. Chaque tâche est associée à un `projectId`
(référence externe, sans connaissance du projet) et à un `userId`. Lorsqu'une tâche
passe à `completed: true`, le service **publie** un événement `TaskCompleted` sur
Redis. Lorsqu'elle repasse à `completed: false`, il publie `TaskReopened`. À la
création d'une tâche avec `projectId`, il publie `TaskCreated`. À la suppression,
il publie `TaskDeleted`. Ce service ne connaît pas l'existence du project-service
ni du notification-service.

**Project Service** — Source of truth des projets. Expose un CRUD complet pour gérer
les projets. Il maintient en local une **projection** (`completedTasks` / `totalTasks`)
mise à jour en écoutant les événements `TaskCreated`, `TaskCompleted`, `TaskReopened`
et `TaskDeleted` publiés par le task-service. Dès que `completedTasks === totalTasks`
(et `totalTasks > 0`), le projet passe automatiquement à l'état `closed` et le service
**publie** un événement `ProjectClosed` sur Redis. Ce service ne fait jamais d'appel
HTTP vers le task-service.

**Notification Service** — Consumer avec endpoint de lecture. Il **écoute** les
événements (`TaskCompleted`, `TaskReopened`, `ProjectClosed`, `TaskDeleted`), les
logue en console et les stocke en mémoire. Expose `GET /notifications` pour consulter
les notifications de l'utilisateur et `PUT /notifications/read` pour les marquer
comme lues.

---

### Diagramme de séquence — "Complete task → Project auto-close → Notification"

```mermaid
sequenceDiagram
    actor User as Utilisateur
    participant FE as Frontend (React)
    participant TS as task-service
    participant Redis as Redis Pub/Sub
    participant PS as project-service
    participant NS as notification-service

    User->>FE: Coche une tâche (completed)
    FE->>TS: PUT /items/:id { completed: true }
    TS->>TS: Mettre à jour la tâche en DB
    TS-->>FE: 200 OK { task }

    TS->>Redis: PUBLISH TaskCompleted

    par Consumers parallèles
        Redis-->>PS: TaskCompleted
        PS->>PS: Incrémenter completedTasks
        PS->>PS: completedTasks === totalTasks ?

        alt Toutes les tâches sont terminées
            PS->>PS: Passer projet à status = closed
            PS->>Redis: PUBLISH ProjectClosed
            Redis-->>NS: ProjectClosed
            NS->>NS: Stocker notification
        end

    and
        Redis-->>NS: TaskCompleted
        NS->>NS: Stocker notification
    end

    User->>FE: Clique sur la cloche
    FE->>NS: GET /notifications
    NS-->>FE: [ TaskCompleted, ProjectClosed ]
    FE-->>User: Affiche les notifications
```

---

### Diagramme de séquence — "Reopen task → Project revient open"

```mermaid
sequenceDiagram
    actor User as Utilisateur
    participant FE as Frontend
    participant TS as task-service
    participant Redis as Redis Pub/Sub
    participant PS as project-service
    participant NS as notification-service

    User->>FE: Décoche une tâche
    FE->>TS: PUT /items/:id { completed: false }
    TS->>TS: Mettre à jour en DB
    TS-->>FE: 200 OK

    TS->>Redis: PUBLISH TaskReopened

    par Consumers
        Redis-->>PS: TaskReopened
        PS->>PS: Décrémenter completedTasks
        PS->>PS: Si status était closed → repasser à open
    and
        Redis-->>NS: TaskReopened
        NS->>NS: Stocker notification "Tâche réouverte"
    end
```

---

## Bounded Contexts (DDD)

```mermaid
graph TB
    subgraph TC ["Task Context (task-service)"]
        Task["Task\n─────────────\n• id: UUID\n• name: string\n• completed: boolean\n• projectId: UUID (ref)\n• userId: UUID (ref)"]
    end

    subgraph PC ["Project Context (project-service)"]
        Project["Project\n─────────────\n• id: UUID\n• name: string\n• status: open | closed\n• userId: UUID (ref)\n• completedTasks: number\n• totalTasks: number"]
    end

    subgraph NC ["Notification Context (notification-service)"]
        Notification["Notification\n─────────────\n• id: UUID\n• eventType: string\n• message: string\n• userId: UUID (ref)\n• createdAt: datetime\n• read: boolean"]
        EventLog["Event Log\n─────────────\n(stockage in-memory\ndes events reçus)"]
        Notification --- EventLog
    end

    TCEvent1["TaskCompleted\n{ eventId, taskId,\nprojectId, userId }"]
    TCEvent2["TaskReopened\n{ eventId, taskId,\nprojectId, userId }"]
    TCEvent3["TaskCreated\n{ eventId, taskId,\nprojectId, userId }"]
    TCEvent4["TaskDeleted\n{ eventId, taskId,\nprojectId, userId,\nwasCompleted }"]
    PCEvent1["ProjectClosed\n{ eventId,\nprojectId, userId }"]

    TC -->|publie| TCEvent1
    TC -->|publie| TCEvent2
    TC -->|publie| TCEvent3
    TC -->|publie| TCEvent4
    TCEvent1 -->|consommé par| PC
    TCEvent2 -->|consommé par| PC
    TCEvent3 -->|consommé par| PC
    TCEvent4 -->|consommé par| PC
    TCEvent1 -->|consommé par| NC
    TCEvent2 -->|consommé par| NC
    TCEvent4 -->|consommé par| NC
    PC -->|publie| PCEvent1
    PCEvent1 -->|consommé par| NC

    style TC fill:#e3f2fd,stroke:#1565c0
    style PC fill:#e8f5e9,stroke:#2e7d32
    style NC fill:#fff3e0,stroke:#e65100
    style TCEvent1 fill:#bbdefb
    style TCEvent2 fill:#bbdefb
    style TCEvent3 fill:#bbdefb
    style TCEvent4 fill:#bbdefb
    style PCEvent1 fill:#c8e6c9
```

### Concepts partagés entre les contextes

| Concept | Task Context | Project Context | Notification Context |
|---|---|---|---|
| `projectId` | Référence externe (simple champ UUID) | Entité propre (aggregate root) | Donnée de contexte dans le payload |
| `userId` | Référence (propriétaire de la tâche) | Référence (propriétaire du projet) | Référence (destinataire notifié) |
| `taskId` | Entité propre (aggregate root) | Absent — projection locale uniquement | Donnée de contexte dans le payload |

### Parallèle avec l'exemple Sales/Support du cours

Dans le cours, `Customer` est un concept partagé entre les contextes Sales et Support :
du côté Sales, c'est un **prospect à convertir** (avec pipeline, devis, contrats) ;
du côté Support, c'est un **utilisateur avec des tickets** (avec historique, SLA).
Le même `customerId` est une référence dans les deux cas, mais l'entité est modélisée
différemment selon les besoins métier de chaque contexte.

Ici, `projectId` joue exactement ce rôle. Dans le **Task Context**, c'est un simple
champ UUID sur la tâche — une référence opaque vers un projet dont le task-service
ne sait rien (pas de relation FK, pas de JOIN). Dans le **Project Context**, c'est
l'identité de l'aggregate root `Project`, porteur d'un état (`status`), d'un nom,
et d'une projection locale (`completedTasks / totalTasks`). Chaque contexte possède
sa propre vision de `projectId`, cohérente avec ses responsabilités métier, et les
événements (comme `TaskCompleted`) servent de **pont entre les contextes** sans jamais
les coupler directement.

---

## Tableau récapitulatif des événements

| Événement | Producteur | Consommateurs | Payload clé |
|-----------|-----------|---------------|-------------|
| TaskCreated | task-service | project-service | taskId, projectId, userId |
| TaskCompleted | task-service | project-service, notification-service | taskId, projectId, userId |
| TaskReopened | task-service | project-service, notification-service | taskId, projectId, userId |
| TaskDeleted | task-service | project-service | taskId, projectId, userId, wasCompleted |
| ProjectClosed | project-service | notification-service | projectId, userId |

---

## Idempotence & Logs structurés

Chaque consumer (project-service et notification-service) implémente une garde d'idempotence :

- Un `Set<string>` stocke les `eventId` déjà traités
- Si un event arrive avec un `eventId` déjà vu → skip avec log `DUPLICATE`
- Le Set est cappé à 10 000 entrées (FIFO) pour éviter les fuites mémoire

Format des logs :
```
[2026-03-15T14:30:00.000Z] PUBLISHED TaskCompleted | eventId=abc-123 | subscribers=2
[2026-03-15T14:30:00.005Z] RECEIVED TaskCompleted | eventId=abc-123 | projectId=def-456
[2026-03-15T14:30:00.010Z] DUPLICATE TaskCompleted | eventId=abc-123 — skipping
```

---

## Tests — Couverture mise à jour (Partie 2)

```
services/task-service/spec/        68 tests Jest (unit + intégration)
services/project-service/spec/     14+ tests Jest (CRUD + auto-close)

frontend/e2e/
├── todo.spec.ts                   Tests CRUD tâches dans un projet
└── project-workflow.spec.ts       3 tests workflow complet :
    ├── create project → task → complete → auto-close → notifications
    ├── project stays open if not all tasks completed
    └── TaskReopened notification appears
```

**Total : 82+ tests backend (Jest) + 13+ scénarios E2E (Playwright)**
