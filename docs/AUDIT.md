# Audit d'architecture — Todo App

> **Date :** 15 février 2026
> **Projet :** `101-app` (Todo App Express + React + SQLite/MySQL)
> **Objectif :** Diagnostiquer les problèmes de couplage, de responsabilités et les zones à risque **avant toute refactorisation**.

---

## Table des matières

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Cartographie des dépendances](#2-cartographie-des-dépendances)
3. [Problèmes identifiés](#3-problèmes-identifiés)
   - P1 — Absence de couche métier (SRP)
   - P2 — Couplage direct routes → persistence
   - P3 — Duplication de code entre les adaptateurs DB
   - P4 — Aucune validation des entrées
   - P5 — Aucune gestion d'erreurs dans les routes
   - P6 — État mutable global dans les modules de persistence
   - P7 — Sélection de la DB au `require` (couplage au chargement)
   - P8 — Accès filesystem mélangé à la persistence
   - P9 — Absence de contrat / DTO pour les entités
   - P10 — Frontend monolithique sans séparation des couches
   - P11 — Tests couplés à l'implémentation concrète
4. [Matrice de risque](#4-matrice-de-risque)
5. [Conclusion](#5-conclusion)

---

## 1. Vue d'ensemble du projet

```
src/
├── index.js                  # Point d'entrée Express
├── persistence/
│   ├── index.js              # Routeur de sélection DB
│   ├── sqlite.js             # Adaptateur SQLite
│   └── mysql.js              # Adaptateur MySQL
├── routes/
│   ├── addItem.js            # POST /items
│   ├── getItems.js           # GET /items
│   ├── updateItem.js         # PUT /items/:id
│   └── deleteItem.js         # DELETE /items/:id
└── static/
    ├── index.html            # Page HTML
    └── js/app.js             # Frontend React (SPA)
```

**Stack :** Express 4.18 · SQLite3 / MySQL2 · React (CDN) · Jest

L'architecture actuelle est en **2 couches** :
- **Routes** (handlers HTTP)
- **Persistence** (accès DB)

Il **manque** une couche intermédiaire : la **couche métier / domaine** (services, entités, règles de gestion).

---

## 2. Cartographie des dépendances

```
┌──────────────────────────────────────────────────────┐
│                    src/index.js                       │
│         (Express, routes, persistence, fs)            │
└───────────┬──────────────┬───────────────────────────┘
            │              │
            ▼              ▼
┌───────────────┐  ┌───────────────────────────────────┐
│   routes/*    │  │     persistence/index.js           │
│ (Express req/ │  │ (switch sur process.env.MYSQL_HOST)│
│  res + DB)    │  └──────┬────────────┬───────────────┘
└───────┬───────┘         │            │
        │                 ▼            ▼
        │         ┌────────────┐ ┌──────────────┐
        └────────►│ sqlite.js  │ │  mysql.js    │
                  │ (sqlite3,  │ │ (mysql2,     │
                  │  fs, path) │ │  fs, wait-   │
                  └────────────┘ │  port)       │
                                 └──────────────┘
```

**Constat :** les routes appellent **directement** la persistence. Il n'y a aucune couche intermédiaire pour isoler le métier du transport HTTP et du stockage.

---

## 3. Problèmes identifiés

### P1 — Absence de couche métier (violation du SRP)

**Principe violé :** Single Responsibility Principle — chaque module devrait avoir une seule raison de changer.

**Où :** `src/routes/addItem.js`, `src/routes/updateItem.js`

Les route handlers cumulent **3 responsabilités** :
1. Gérer le protocole HTTP (`req`, `res`)
2. Appliquer la logique métier (générer un UUID, construire l'objet)
3. Orchestrer la persistence (`db.storeItem`)

**Extrait — `src/routes/addItem.js` (lignes 1-10) :**
```js
const db = require('../persistence');
const {v4 : uuid} = require('uuid');

module.exports = async (req, res) => {
    const item = {
        id: uuid(),
        name: req.body.name,
        completed: false,
    };
    await db.storeItem(item);
    res.send(item);
};
```

Ici, la **création d'un item** (génération d'id, valeur par défaut de `completed`) est de la logique **métier** — elle ne devrait pas vivre dans un handler HTTP.

**Extrait — `src/routes/updateItem.js` (lignes 1-9) :**
```js
const db = require('../persistence');

module.exports = async (req, res) => {
    await db.updateItem(req.params.id, {
        name: req.body.name,
        completed: req.body.completed,
    });
    const item = await db.getItem(req.params.id);
    res.send(item);
};
```

L'extraction des champs, la construction de l'objet de mise à jour, et le re-fetch après update sont tous mélangés dans le même handler.

**Impact :**
- Impossible de réutiliser la logique de création d'item ailleurs (CLI, worker, script de migration) sans importer Express.
- Impossible de tester la logique métier sans mocker `req` et `res`.
- Si une règle métier change (ex. : limite de caractères sur `name`), il faut modifier un fichier qui est aussi un handler HTTP.

---

### P2 — Couplage direct routes → persistence

**Principe violé :** Dependency Inversion Principle — les modules de haut niveau ne devraient pas dépendre des modules de bas niveau.

**Où :** `src/routes/addItem.js:1`, `src/routes/getItems.js:1`, `src/routes/updateItem.js:1`, `src/routes/deleteItem.js:1`

**Extrait — chaque fichier route commence par :**
```js
const db = require('../persistence');
```

Les routes importent **directement** le module de persistence via un chemin relatif. Il n'y a pas d'injection de dépendances ni d'interface abstraite.

**Impact :**
- Si on veut ajouter du cache, du logging, de la validation, ou un événement métier entre les routes et la DB, il faut **modifier chaque fichier route**.
- Le remplacement de la couche de persistence (ex. : MongoDB, API externe) nécessite de vérifier et potentiellement modifier les 4 fichiers de routes.
- Les tests unitaires des routes sont obligés de mocker `../../src/persistence` via `jest.mock` avec le chemin exact — un renommage du dossier casse tous les tests.

---

### P3 — Duplication de code entre sqlite.js et mysql.js

**Principe violé :** DRY (Don't Repeat Yourself)

**Où :** `src/persistence/sqlite.js` et `src/persistence/mysql.js`

Les deux fichiers contiennent une logique de mapping **identique** pour la conversion `completed: 1 → true` :

**Extrait — `src/persistence/sqlite.js` (dans `getItems` et `getItem`) :**
```js
rows.map(item =>
    Object.assign({}, item, {
        completed: item.completed === 1,
    }),
)
```

**Extrait — `src/persistence/mysql.js` (dans `getItems` et `getItem`) :**
```js
rows.map(item =>
    Object.assign({}, item, {
        completed: item.completed === 1,
    }),
)
```

Ce bloc est dupliqué **4 fois** dans le projet (2x dans sqlite.js, 2x dans mysql.js).

De plus, la conversion inverse (`completed ? 1 : 0`) est aussi dupliquée dans `storeItem` et `updateItem` de chaque adaptateur.

**Impact :**
- Si le schéma de données change (ex. : ajout d'un champ `priority`), il faut modifier **les deux fichiers** de manière identique.
- Risque d'inconsistance si un développeur oublie de mettre à jour l'un des deux adaptateurs.
- La logique de mapping (DB → domaine) est une responsabilité **métier** qui ne devrait pas être dans la couche persistence.

---

### P4 — Aucune validation des entrées

**Principe violé :** Defense in Depth / Robustesse

**Où :** `src/routes/addItem.js:6`, `src/routes/updateItem.js:4-6`

**Extrait — `src/routes/addItem.js` :**
```js
const item = {
    id: uuid(),
    name: req.body.name,       // ← aucune validation
    completed: false,
};
await db.storeItem(item);
```

**Extrait — `src/routes/updateItem.js` :**
```js
await db.updateItem(req.params.id, {
    name: req.body.name,           // ← aucune validation
    completed: req.body.completed, // ← aucune validation de type
});
```

Aucune vérification n'est faite sur :
- La **présence** de `name` (peut être `undefined`)
- Le **type** de `completed` (peut être une string, un nombre, n'importe quoi)
- La **longueur** de `name` (la colonne DB est `varchar(255)`, mais rien ne l'empêche côté code)
- Le **format** de `id` dans `req.params.id` (doit être un UUID)

**Impact :**
- On peut créer des items avec `name: undefined` ou `name: null` sans aucune erreur.
- Un `completed: "oui"` sera stocké tel quel et provoquera des incohérences.
- Vulnérabilité potentielle à des payloads malformés (même si les requêtes SQL sont paramétrées).

---

### P5 — Aucune gestion d'erreurs dans les routes

**Principe violé :** Robustesse / Fail Gracefully

**Où :** Les 4 fichiers de routes — `addItem.js`, `getItems.js`, `updateItem.js`, `deleteItem.js`

**Extrait — `src/routes/getItems.js` (fichier complet) :**
```js
const db = require('../persistence');

module.exports = async (req, res) => {
    const items = await db.getItems();
    res.send(items);
};
```

Aucun `try/catch`. Si `db.getItems()` lance une exception (DB déconnectée, table supprimée), la promise rejetée sera interceptée par Express qui renverra un stack trace brut au client (en mode dev) ou un `500 Internal Server Error` générique.

C'est identique dans les 4 routes : **aucune** ne gère les erreurs.

**Impact :**
- En production, le client reçoit une erreur 500 sans message utile.
- En développement, des stack traces internes (avec chemins de fichiers) sont exposées.
- Aucun logging structuré des erreurs — un problème DB peut passer inaperçu.
- Impossible de retourner des codes HTTP appropriés (404 pour un item inexistant, 400 pour un body invalide).

---

### P6 — État mutable global dans les modules de persistence

**Principe violé :** Encapsulation / Testabilité

**Où :** `src/persistence/sqlite.js:4` et `src/persistence/mysql.js:16`

**Extrait — `src/persistence/sqlite.js` :**
```js
let db, dbAll, dbRun;   // ← variables globales du module

function init() {
    // ...
    db = new sqlite3.Database(location, err => { ... });
    // ...
}
```

**Extrait — `src/persistence/mysql.js` :**
```js
let pool;               // ← variable globale du module

async function init() {
    // ...
    pool = mysql.createPool({ ... });
    // ...
}
```

La connexion DB est stockée dans une **variable de module mutable**. Toutes les fonctions (`getItems`, `storeItem`, etc.) dépendent de cet état implicite.

**Impact :**
- Impossible de créer **plusieurs instances** (ex. : test en parallèle, multi-tenant).
- L'ordre d'appel est critique : si `getItems()` est appelé avant `init()`, crash silencieux (`db is undefined`).
- Les tests partagent l'état — un test qui ne fait pas `teardown` corrompt les suivants.
- En cas de reconnexion nécessaire, il faut muter cette variable globale.

---

### P7 — Sélection de la DB au `require` (couplage au chargement)

**Principe violé :** Inversion of Control

**Où :** `src/persistence/index.js`

**Extrait — `src/persistence/index.js` (fichier complet) :**
```js
if (process.env.MYSQL_HOST) module.exports = require('./mysql');
else module.exports = require('./sqlite');
```

La sélection de l'adaptateur se fait au moment du **chargement du module** (au `require`), basée sur une variable d'environnement.

**Impact :**
- Impossible de choisir l'adaptateur **programmatiquement** (ex. : dans un test, on ne peut pas passer un mock sans `jest.mock`).
- L'ajout d'un troisième adaptateur (PostgreSQL, MongoDB...) nécessite de modifier ce fichier avec un nouveau `if`.
- Pas d'injection de dépendances : le choix est **hardcodé** dans le module.
- Les deux modules (`sqlite.js` et `mysql.js`) sont **toujours** évalués (Node.js résout les `require`), même si un seul est utilisé — ce qui peut causer des erreurs d'import si le driver non utilisé n'est pas installé.

---

### P8 — Accès filesystem mélangé dans la persistence

**Principe violé :** SRP — la persistence ne devrait gérer que l'accès aux données.

**Où :** `src/persistence/sqlite.js:2-3,8-10` et `src/persistence/mysql.js:2,20-23`

**Extrait — `src/persistence/sqlite.js` :**
```js
const fs = require('fs');
const location = process.env.SQLITE_DB_LOCATION || '/etc/todos/todo.db';

function init() {
    const dirName = require('path').dirname(location);
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });    // ← gestion du filesystem
    }
    // ...
}
```

**Extrait — `src/persistence/mysql.js` :**
```js
const fs = require('fs');
// ...
async function init() {
    const host = HOST_FILE ? fs.readFileSync(HOST_FILE) : HOST;     // ← lecture de secrets Docker
    const user = USER_FILE ? fs.readFileSync(USER_FILE) : USER;
    const password = PASSWORD_FILE ? fs.readFileSync(PASSWORD_FILE) : PASSWORD;
    const database = DB_FILE ? fs.readFileSync(DB_FILE) : DB;
    // ...
}
```

Un module de persistence gère :
- La **création de répertoires** (sqlite.js)
- La **lecture de fichiers de secrets Docker** (mysql.js)

Ce sont des responsabilités d'**infrastructure / configuration**, pas de persistence.

**Impact :**
- Pour tester `sqlite.js`, il faut un vrai filesystem (on ne peut pas mocker `fs` facilement dans ce contexte).
- Le couplage `fs` rend le module non portable (ex. : environnement serverless sans filesystem classique).
- La lecture des secrets Docker devrait être dans une couche de configuration séparée.

---

### P9 — Absence de contrat / DTO pour les entités

**Principe violé :** Explicit Contracts / Interface Segregation

**Où :** Transversal — `src/routes/*`, `src/persistence/*`, `src/static/js/app.js`

Il n'existe **aucune définition explicite** de ce qu'est un "Todo Item". La structure de données est **implicite** et dispersée :

| Fichier | Forme supposée de l'item |
|---------|-------------------------|
| `routes/addItem.js` | `{ id, name, completed: false }` |
| `routes/updateItem.js` | `{ name, completed }` (partiel) |
| `persistence/sqlite.js` | `{ id: varchar(36), name: varchar(255), completed: boolean/int }` |
| `static/js/app.js` | `{ id, name, completed }` (consommé côté React) |

**Impact :**
- Si on ajoute un champ (ex. : `priority`, `createdAt`), il faut chercher **manuellement** dans chaque fichier les endroits à modifier.
- Rien ne garantit la cohérence entre ce que le frontend envoie, ce que la route traite, et ce que la DB stocke.
- Pas de documentation lisible par un développeur qui rejoint le projet.

---

### P10 — Frontend monolithique sans séparation des couches

**Principe violé :** SRP, Separation of Concerns

**Où :** `src/static/js/app.js`

L'intégralité du frontend (UI, data fetching, state management) est dans **un seul fichier** de ~150 lignes. Chaque composant mélange :

**Extrait — `src/static/js/app.js` (dans `AddItemForm`) :**
```js
const submitNewItem = e => {
    e.preventDefault();
    setSubmitting(true);
    fetch('/items', {                                    // ← appel API hardcodé
        method: 'POST',
        body: JSON.stringify({ name: newItem }),
        headers: { 'Content-Type': 'application/json' },
    })
        .then(r => r.json())
        .then(item => {
            onNewItem(item);
            setSubmitting(false);
            setNewItem('');
        });
};
```

**Extrait — `src/static/js/app.js` (dans `ItemDisplay`) :**
```js
const toggleCompletion = () => {
    fetch(`/items/${item.id}`, {                          // ← URL API hardcodée
        method: 'PUT',
        body: JSON.stringify({
            name: item.name,
            completed: !item.completed,
        }),
        headers: { 'Content-Type': 'application/json' },
    })
        .then(r => r.json())
        .then(onItemUpdate);
};
```

Les URLs d'API (`/items`, `/items/${item.id}`) sont **hardcodées** dans chaque composant.

**Impact :**
- Si l'API change de préfixe (ex. : `/api/v1/items`), il faut modifier **chaque composant** un par un.
- Impossible de tester les composants React indépendamment de l'API.
- Pas de couche d'abstraction API (service, client HTTP) réutilisable.
- Pas de gestion d'erreurs côté frontend (aucun `.catch()` sur les `fetch`).

---

### P11 — Tests couplés à l'implémentation concrète

**Principe violé :** Testabilité / Abstraction

**Où :** `spec/persistence/sqlite.spec.js`, `spec/routes/*.spec.js`

**Extrait — `spec/persistence/sqlite.spec.js` :**
```js
const db = require('../../src/persistence/sqlite');    // ← import concret, pas l'abstraction
const fs = require('fs');
const location = process.env.SQLITE_DB_LOCATION || '/etc/todos/todo.db';

beforeEach(() => {
    if (fs.existsSync(location)) {
        fs.unlinkSync(location);                       // ← accès filesystem direct
    }
});
```

Le test importe directement `sqlite.js` (pas `persistence/index.js`), dépend du filesystem et du chemin par défaut `/etc/todos/todo.db`.

**Extrait — `spec/routes/addItem.spec.js` :**
```js
jest.mock('../../src/persistence', () => ({
    removeItem: jest.fn(),
    storeItem: jest.fn(),
    getItem: jest.fn(),
}));
```

Les tests de routes mockent la persistence via un **chemin de fichier exact**. Un simple renommage de dossier casse l'ensemble de la suite de tests.

**Impact :**
- Les tests de persistence ne peuvent tourner que sur un environnement avec un filesystem accessible (pas dans un container minimal).
- Aucun test ne vérifie le **comportement métier** indépendamment de l'infrastructure.
- Le test de `sqlite.spec.js` n'a pas d'équivalent pour `mysql.spec.js` — un seul adaptateur est testé.

---

## 4. Matrice de risque

| # | Problème | Gravité | Fichiers impactés | Risque principal |
|---|----------|---------|--------------------|------------------|
| P1 | Absence de couche métier | **Haute** | `routes/*` | Logique non réutilisable, non testable isolément |
| P2 | Couplage routes → persistence | **Haute** | `routes/*` | Changement de DB = modification de toutes les routes |
| P3 | Duplication sqlite/mysql | **Moyenne** | `persistence/sqlite.js`, `persistence/mysql.js` | Incohérence lors d'évolution du schéma |
| P4 | Pas de validation | **Haute** | `routes/addItem.js`, `routes/updateItem.js` | Données corrompues en DB, comportement imprévisible |
| P5 | Pas de gestion d'erreurs | **Haute** | `routes/*` | Stack traces exposées, erreurs silencieuses |
| P6 | État global mutable | **Moyenne** | `persistence/sqlite.js`, `persistence/mysql.js` | Tests fragiles, impossible de multi-instancier |
| P7 | Sélection DB au require | **Moyenne** | `persistence/index.js` | Pas d'IoC, extension difficile |
| P8 | Filesystem dans persistence | **Basse** | `persistence/sqlite.js`, `persistence/mysql.js` | Couplage infra, portabilité réduite |
| P9 | Pas de contrat/DTO | **Moyenne** | Transversal | Incohérence des données entre couches |
| P10 | Frontend monolithique | **Basse** | `static/js/app.js` | Maintenance et testabilité du frontend |
| P11 | Tests couplés | **Moyenne** | `spec/*` | Tests fragiles, couverture partielle |

---

## 5. Conclusion

### Diagnostic global

L'application fonctionne mais repose sur une **architecture plate à 2 couches** (routes + persistence) sans couche métier intermédiaire. Le couplage est fort entre chaque couche :

```
[HTTP/Express] ←──couplage fort──→ [SQL/DB]
       ↑                                ↑
  pas de validation                pas d'abstraction
  pas de gestion d'erreurs         état global mutable
  logique métier mélangée          duplication de code
```

### Conséquences majeures

1. **Si on change la DB** (ex. : SQLite → PostgreSQL) → il faut écrire un nouvel adaptateur ET vérifier chaque route car il n'y a pas de contrat d'interface garanti.

2. **Si on veut tester le métier** → impossible sans mocker Express (`req`/`res`) et la persistence, car la logique métier n'existe pas en tant que couche isolée.

3. **Si on ajoute une fonctionnalité** (ex. : notifications, audit log) → il faut injecter le code directement dans les routes, qui sont déjà surchargées.

4. **Si on veut réutiliser le métier** (CLI, worker, API GraphQL) → il faut extraire manuellement la logique depuis les handlers Express.

### Ce qui fonctionne bien

- La **séparation routes/persistence** existe déjà (même si incomplète).
- Le **pattern adaptateur** (sqlite.js/mysql.js) est un bon point de départ.
- Les **tests unitaires** existent pour les routes et la persistence SQLite.
- Le `gracefulShutdown` dans `index.js` est une bonne pratique.
- Les requêtes SQL sont **paramétrées** (pas de concaténation de strings = pas d'injection SQL).
