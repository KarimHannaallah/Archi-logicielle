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
├── todo.spec.ts                    # Playwright: register + CRUD complet (sans Docker)
└── project-workflow.spec.ts        # Playwright: workflow event-driven complet (avec Redis)
```

**Total : 82 tests backend (Jest) + 13 scenarios E2E (Playwright)**

---

## Architecture Microservices (Partie 2)

### Vue d'ensemble

La Todo App évolue vers une architecture **event-driven** composée de 3 microservices
indépendants, chacun avec sa propre base de données SQLite, communiquant via Redis
Pub/Sub (voir ADR-004).

```mermaid
graph TB
    User["👤 Utilisateur"]
    FE["Frontend\n(React + Vite)"]
    Nginx["Nginx\n(reverse proxy :80)"]

    subgraph "Microservices"
        TS["task-service\n:3001"]
        PS["project-service\n:3002"]
        NS["notification-service\n:3003"]
    end

    subgraph "Bases de données"
        TDB[("SQLite\ntask.db")]
        PDB[("SQLite\nproject.db")]
        NDB[("SQLite\nnotification.db")]
    end

    Redis(["Redis\nPub/Sub\n:6379"])

    User --> FE
    FE --> Nginx
    Nginx -->|"/tasks/*"| TS
    Nginx -->|"/projects/*"| PS
    Nginx -->|"/notifications/*"| NS

    TS --- TDB
    PS --- PDB
    NS --- NDB

    TS -->|"PUBLISH task.completed\nPUBLISH task.reopened"| Redis
    Redis -->|"SUBSCRIBE task.*\nproject.*"| PS
    Redis -->|"SUBSCRIBE task.*\nproject.*"| NS
    PS -->|"PUBLISH project.closed"| Redis

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
Redis. Lorsqu'elle repasse à `completed: false`, il publie `TaskReopened`. Ce service
ne connaît pas l'existence du project-service ni du notification-service.

**Project Service** — Source of truth des projets. Expose un CRUD complet pour gérer
les projets. Il maintient en local une **projection** (`completedTasks` / `totalTasks`)
mise à jour en écoutant les événements `TaskCompleted` et `TaskReopened` publiés par
le task-service. Dès que `completedTasks === totalTasks` (et `totalTasks > 0`), le
projet passe automatiquement à l'état `closed` et le service **publie** un événement
`ProjectClosed` sur Redis. Ce service ne fait jamais d'appel HTTP vers le task-service.

**Notification Service** — Consumer pur (worker pattern). N'expose aucun endpoint
d'écriture. Il **écoute** les 3 événements (`TaskCompleted`, `TaskReopened`,
`ProjectClosed`), les logue en console et les persiste dans sa propre base SQLite.
Expose uniquement `GET /notifications` pour consulter l'historique des événements
reçus. C'est un observateur passif du système, jamais un émetteur.

---

### Diagramme de séquence — "Complete task → Project auto-close → Notification"

```mermaid
sequenceDiagram
    actor User as 👤 Utilisateur
    participant FE as Frontend (React)
    participant TS as task-service
    participant Redis as Redis Pub/Sub
    participant PS as project-service
    participant NS as notification-service

    User->>FE: Coche une tâche (completed)
    FE->>TS: PATCH /tasks/:taskId { completed: true }
    TS->>TS: Mettre à jour la tâche en DB
    TS-->>FE: 200 OK { task }

    TS->>Redis: PUBLISH task.completed { TaskCompleted event }

    par Consumers parallèles
        Redis-->>PS: TaskCompleted
        PS->>PS: Incrémenter completedTasks
        PS->>PS: completedTasks === totalTasks ?

        alt Toutes les tâches sont terminées
            PS->>PS: Passer projet à status = closed
            PS->>Redis: PUBLISH project.closed { ProjectClosed event }
            Redis-->>NS: ProjectClosed
            NS->>NS: Persister en DB + log console
        end

    and
        Redis-->>NS: TaskCompleted
        NS->>NS: Persister en DB + log console
    end

    User->>FE: Consulte GET /notifications
    FE->>NS: GET /notifications
    NS-->>FE: [ TaskCompleted, ProjectClosed ]
    FE-->>User: Affiche les notifications
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
        Notification["Notification\n─────────────\n• id: UUID\n• eventType: string\n• eventId: string\n• message: string\n• userId: UUID (ref)\n• projectId: UUID\n• createdAt: datetime\n• read: boolean"]
        InMemStore["In-Memory Store\n─────────────\n(Notification[]\nmax 1000 entrées)"]
        Notification --- InMemStore
    end

    TCEvent1["📤 TaskCompleted\n{ eventId, taskId,\nprojectId, userId }"]
    TCEvent2["📤 TaskReopened\n{ eventId, taskId,\nprojectId, userId }"]
    PCEvent1["📤 ProjectClosed\n{ eventId,\nprojectId, userId }"]

    TC -->|publie| TCEvent1
    TC -->|publie| TCEvent2
    TCEvent1 -->|consommé par| PC
    TCEvent2 -->|consommé par| PC
    TCEvent1 -->|consommé par| NC
    TCEvent2 -->|consommé par| NC
    PC -->|publie| PCEvent1
    PCEvent1 -->|consommé par| NC

    style TC fill:#e3f2fd,stroke:#1565c0
    style PC fill:#e8f5e9,stroke:#2e7d32
    style NC fill:#fff3e0,stroke:#e65100
    style TCEvent1 fill:#bbdefb
    style TCEvent2 fill:#bbdefb
    style PCEvent1 fill:#c8e6c9
```

---

### Diagramme de séquence — "Reopen task → Project revient open"

```mermaid
sequenceDiagram
    actor User as 👤 Utilisateur
    participant FE as Frontend (React)
    participant TS as task-service
    participant Redis as Redis Pub/Sub
    participant PS as project-service

    User->>FE: Décoche une tâche (reopen)
    FE->>TS: PUT /items/:taskId { completed: false }
    TS->>TS: Mettre à jour la tâche (completed → false)
    TS-->>FE: 200 OK { task }
    TS->>Redis: PUBLISH TaskReopened { eventId, taskId, projectId, userId }

    Redis-->>PS: TaskReopened
    PS->>PS: Décrémenter completedTasks
    PS->>PS: status redevient "open"
    Note over PS: completedTasks < totalTasks → status = open

    Redis-->>NS: TaskReopened
    NS->>NS: Créer Notification "Tâche réouverte dans le projet {projectId}"
```

---

### Ports & Adapters par service

```mermaid
graph TB
    subgraph "task-service"
        TS_HTTP["HTTP (Express :3000)\n/items, /auth"]
        TS_AUTH["Auth Middleware (JWT)"]
        TS_SVC["TodoService"]
        TS_REPO["<<interface>>\nTodoRepository"]
        TS_SQLITE["SQLite Adapter"]
        TS_MEM["InMemory Adapter"]
        TS_REDIS["Redis Publisher\n(publishEvent)"]

        TS_HTTP --> TS_AUTH --> TS_SVC
        TS_SVC --> TS_REPO
        TS_SVC --> TS_REDIS
        TS_REPO -.-> TS_SQLITE
        TS_REPO -.-> TS_MEM
    end

    subgraph "project-service"
        PS_HTTP["HTTP (Express :3002)\n/projects"]
        PS_AUTH2["Auth Middleware (JWT)"]
        PS_SVC["ProjectService"]
        PS_REPO["<<interface>>\nProjectRepository"]
        PS_MEM2["InMemory Adapter"]
        PS_SUB["Redis Subscriber\n(TaskCompleted, TaskReopened, TaskCreated)"]
        PS_PUB["Redis Publisher\n(ProjectClosed)"]

        PS_HTTP --> PS_AUTH2 --> PS_SVC
        PS_SUB --> PS_SVC
        PS_SVC --> PS_REPO
        PS_SVC --> PS_PUB
        PS_REPO -.-> PS_MEM2
    end

    subgraph "notification-service"
        NS_HTTP["HTTP (Express :3003)\n/notifications"]
        NS_AUTH3["Auth Middleware (JWT)"]
        NS_STORE["In-Memory Store\n(Notification[])"]
        NS_SUB["Redis Subscriber\n(TaskCompleted, TaskReopened, ProjectClosed)"]

        NS_HTTP --> NS_AUTH3 --> NS_STORE
        NS_SUB --> NS_STORE
    end
```

---

### Schéma des événements

| Channel | Producteur | Consommateurs | Payload clé |
|---|---|---|---|
| `TaskCreated` | task-service | project-service | `eventId, taskId, projectId, userId` |
| `TaskCompleted` | task-service | project-service, notification-service | `eventId, taskId, projectId, userId` |
| `TaskReopened` | task-service | project-service, notification-service | `eventId, taskId, projectId, userId` |
| `ProjectClosed` | project-service | notification-service | `eventId, projectId, userId` |

Contrats complets : `docs/events/*.v1.json`

---

### Idempotence et logs structurés

Chaque service qui consomme des événements maintient un `Set<string>` des `eventId`
déjà traités. Si le même événement arrive deux fois (reconnexion Redis), il est
ignoré avec un log `DUPLICATE ... — skipping`.

Les logs suivent le format structuré :
```
[project-service] [2024-01-15T10:23:45.123Z] RECEIVED TaskCompleted | eventId=abc-123 | projectId=proj-456
[task-service]    [2024-01-15T10:23:45.100Z] PUBLISHED TaskCompleted | eventId=abc-123 | subscribers=2
```

---

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
