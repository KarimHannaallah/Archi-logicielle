# ADR-003 — Injection de dépendances via Composition Root

**Date :** février 2026
**Statut :** Accepté
**Contexte projet :** Refonte Todo App — M1 Architecture Logicielle

---

## Contexte

L'étape 7 du processus de refonte (« Isolation de l'infrastructure ») demande de rendre la base de données interchangeable : SQLite en production, InMemory en test, MySQL en option. Cela implique un mécanisme pour choisir et fournir l'implémentation correcte au reste du code.

Dans l'application initiale, chaque fichier route importe directement la persistence :

```typescript
// Dans chaque route (addItem.ts, getItems.ts, etc.)
const db: Persistence = require('../persistence');
```

Le module `persistence/index.ts` fait un `if/else` sur les variables d'environnement pour résoudre l'implémentation. C'est un pattern **Service Locator** : chaque module va chercher sa propre dépendance. Le domaine/routes connaissent le chemin vers le module de résolution.

Le sujet demande de « créer des interfaces (ports) » et d'« injecter l'implémentation selon l'environnement ».

## Décision

Nous adoptons l'**injection de dépendances manuelle** via un **Composition Root** situé dans `backend/src/index.ts`. Aucun framework d'injection n'est utilisé.

Le fonctionnement est le suivant :

**1. Les routes et services sont des factories** qui reçoivent leurs dépendances en paramètre :

```typescript
// routes/getItems.ts — ne connaît que l'interface TodoService
export function makeGetItems(todoService: TodoService) {
    return async (_req: Request, res: Response) => {
        const items = await todoService.listTodos();
        res.send(items);
    };
}
```

```typescript
// domain/TodoService.ts — ne connaît que l'interface TodoRepository
export function createTodoService(repository: TodoRepository): TodoService {
    return {
        async createTodo(name: string) { /* ... */ },
        async listTodos() { return repository.getAll(); },
        // ...
    };
}
```

**2. Le Composition Root assemble le graphe de dépendances** :

```typescript
// index.ts — le seul endroit qui connaît les implémentations concrètes
const adapter = resolveAdapter();          // SQLite, InMemory, ou MySQL
const userAdapter = resolveUserAdapter();  // idem pour les users
const todoService = createTodoService(adapter);
const authService = createAuthService(userAdapter);
const app = createApp(todoService, { authService });
```

**3. `createApp` reçoit les services et les injecte dans les routes** :

```typescript
export function createApp(todoService: TodoService, options?: AppOptions) {
    const app = express();
    app.get('/items', makeGetItems(todoService));
    app.post('/items', makeAddItem(todoService));
    // ...
}
```

## Alternatives envisagées

**1. Service Locator (pattern initial)**
Garder `persistence/index.ts` qui résout l'implémentation, et les routes qui importent ce module. Ça fonctionne, et c'est plus simple. Mais les routes connaissent toujours le chemin vers le module de résolution. Les tests d'intégration doivent manipuler `process.env` avant d'importer l'app. Et aucune règle de lint ne peut garantir que les routes n'importent pas directement `sqlite.ts` au lieu de `index.ts`. Rejeté car c'est du service locator, pas de l'injection.

**2. Framework DI (InversifyJS, tsyringe, awilix)**
Un conteneur d'injection automatique avec décorateurs ou tokens. Avantage : résolution automatique du graphe de dépendances. Inconvénient : ajoute une dépendance lourde, nécessite souvent `reflect-metadata` et les décorateurs expérimentaux, et masque le wiring derrière de la magie. Rejeté car surdimensionné pour un projet de cette taille et contraire à l'esprit pédagogique (on veut comprendre la DI, pas la déléguer à un framework).

**3. Injection par middleware Express**
Attacher le service à `req` via un middleware (`req.todoService = ...`) et le récupérer dans les routes. Pattern courant dans Express. Inconvénient : perd le typage TypeScript (il faut augmenter le type `Request`), et mélange la responsabilité du middleware (HTTP) avec le wiring (composition). Rejeté car ça dégrade le typage et viole la séparation des concerns.

## Conséquences

### Positives

- **Traçabilité totale** : le wiring de l'application est visible en un seul fichier (`index.ts`). Il n'y a pas de magie, pas de décorateurs, pas de résolution cachée. Un développeur qui lit `index.ts` comprend immédiatement quel repository est utilisé et où.
- **Testabilité maximale** : les tests d'intégration construisent leur propre graphe : `InMemoryRepo → TodoService → createApp(service)`. Pas besoin de manipuler `process.env` ni de `jest.mock`. Le test `api.spec.js` le montre :

```javascript
const repo = require('../../src/persistence/inmemory');
const todoService = createTodoService(repo);
const app = createApp(todoService); // pas d'auth en tests API
```

- **Enforceability** : `dependency-cruiser` interdit à `src/routes/` d'importer `src/persistence/`. Si un développeur ajoute un `require('../persistence/sqlite')` dans une route, le lint casse. L'architecture est protégée par tooling, pas par convention.
- **Zéro dépendance supplémentaire** : pas de framework DI, pas de `reflect-metadata`. Juste des fonctions et des paramètres.

### Négatives

- **Verbosité** : chaque route est une factory (`makeGetItems`, `makeAddItem`, etc.) au lieu d'un handler direct. Ça ajoute un niveau d'indirection. Sur 4 routes, c'est gérable. Sur 40 routes, ça deviendrait pénible et justifierait un framework DI ou un router-level injection.
- **Wiring manuel** : si on ajoute un service (ex: `NotificationService`), il faut le créer dans `index.ts`, le passer à `createApp`, et le propager aux routes qui en ont besoin. Pas de résolution automatique. C'est le compromis explicite de la DI manuelle.
