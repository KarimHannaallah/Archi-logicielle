# Todo App

Application Todo fullstack avec authentification et conformite RGPD.

- **Frontend** : React 19 + Vite + TypeScript
- **Backend** : Express 4 + TypeScript (architecture Ports & Adapters)
- **Persistance** : SQLite (defaut), MySQL, ou InMemory
- **Auth** : JWT + scrypt password hashing
- **RGPD** : minimisation des donnees, consentement, droit a l'effacement

## Prerequis

- **Node.js >= 24** (voir `.nvmrc`)
- npm
- Docker & Docker Compose (pour le lancement en 1 commande)

## Lancement rapide (Docker Compose)

```bash
docker compose up
```
## Pour Supprimer (Docker Compose)

```bash
docker compose down
docker compose down -v
```

- Frontend : http://localhost
- Backend API : http://localhost:3000

## Developpement local

### Backend

```bash
cd backend
npm install
npm run dev          # nodemon sur le port 3000
npm test             # 67 tests (unit + integration + auth)
npm run typecheck    # verification TypeScript
npm run lint         # ESLint
npm run lint:arch    # dependency-cruiser (regles architecture)
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # Vite dev server sur le port 5173 (proxy vers backend)
npm run build        # Build de production
npm run test:e2e     # tests end-to-end (Playwright)
```

## Architecture

```
/
├── docker-compose.yml          # Lancement 1 commande
├── docs/
│   ├── AUDIT.md                # Audit d'architecture initial
│   └── RGPD.md                 # Documentation RGPD
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # Composition root
│       ├── app.ts               # Factory Express (routes + auth)
│       ├── domain/              # Couche metier (interfaces pures)
│       │   ├── TodoItem.ts
│       │   ├── TodoRepository.ts
│       │   ├── TodoService.ts
│       │   ├── User.ts
│       │   ├── UserRepository.ts
│       │   └── AuthService.ts
│       ├── persistence/          # Adapters (implementations)
│       │   ├── inmemory.ts
│       │   ├── sqlite.ts
│       │   ├── mysql.ts
│       │   ├── userInmemory.ts
│       │   └── userSqlite.ts
│       ├── routes/               # Handlers HTTP (factories)
│       │   ├── addItem.ts
│       │   ├── getItems.ts
│       │   ├── updateItem.ts
│       │   ├── deleteItem.ts
│       │   └── auth.ts
│       └── middleware/
│           └── auth.ts            # JWT verification middleware
│   └── spec/                    # Tests (Jest)
│       ├── integration/
│       │   ├── api.spec.js        # Tests CRUD complets
│       │   └── auth.spec.js       # Tests authentification
│       ├── routes/               # Tests unitaires des handlers
│       └── persistence/          # Tests des adapters
└── frontend/
    ├── Dockerfile
    ├── nginx.conf               # Reverse proxy vers backend
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── components/           # Composants React
        │   ├── Navbar.tsx
        │   ├── Login.tsx
        │   ├── Register.tsx
        │   ├── Profile.tsx
        │   ├── TodoListCard.tsx
        │   ├── AddItemForm.tsx
        │   └── ItemDisplay.tsx
        ├── context/
        │   └── AuthContext.tsx     # Etat d'authentification
        ├── api/
        │   └── client.ts          # Client HTTP avec token JWT
        └── types/
            └── index.ts
```

### Principes d'architecture (Ports & Adapters)

- **Domain** : interfaces pures (`TodoRepository`, `UserRepository`, `TodoService`, `AuthService`), aucune dependance infra
- **Persistence** : adapters interchangeables (InMemory, SQLite, MySQL)
- **Routes** : factories recevant les services par injection
- **Middleware** : auth JWT separee du metier
- **Regles enforcees** par `dependency-cruiser` :
  - Domain -> pas d'infrastructure
  - Routes -> pas de persistence directe
  - Pas de dependances circulaires

### Variables d'environnement

| Variable | Defaut | Description |
|---|---|---|
| `PORT` | `3000` | Port du backend |
| `JWT_SECRET` | `dev-secret-...` | Secret JWT (changer en production !) |
| `SQLITE_DB_LOCATION` | `/etc/todos/todo.db` | Chemin de la base SQLite |
| `CORS_ORIGIN` | `http://localhost:5173` | Origine autorisee CORS |
| `USE_INMEMORY` | `false` | Utiliser la persistence en memoire |
| `MYSQL_HOST` | - | Active l'adapter MySQL |

## Tests

```bash
cd backend && npm test
```

**67 tests** couvrant :
- Tests unitaires des routes (mocks)
- Tests unitaires de la persistence (InMemory, SQLite, SQLite avec mocks)
- Tests d'integration API (CRUD complet)
- Tests d'authentification (register, login, profil, suppression)
- Tests de non-regression (isolation infrastructure)

## Conformite RGPD

Voir [docs/RGPD.md](docs/RGPD.md) pour la documentation complete.

- **Minimisation** : seules les donnees necessaires sont collectees (email, nom, hash du mot de passe)
- **Consentement** : case a cocher obligatoire lors de l'inscription
- **Droit d'acces** : page profil affichant toutes les donnees personnelles
- **Droit de rectification** : modification du nom et de l'email
- **Droit a l'effacement** : suppression du compte et de toutes les donnees associees
- **Securite** : mots de passe hashes avec scrypt, tokens JWT avec expiration
