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
└── todo.spec.ts             # Playwright: register + CRUD complet
```

**Total : 67 tests backend (Jest) + 10 scenarios E2E (Playwright)**
