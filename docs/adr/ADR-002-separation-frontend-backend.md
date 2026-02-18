# ADR-002 — Séparation Frontend / Backend en deux applications indépendantes

**Date :** février 2026
**Statut :** Accepté
**Contexte projet :** Refonte Todo App — M1 Architecture Logicielle

---

## Contexte

L'application initiale est un monolithe : Express sert à la fois l'API REST et les fichiers statiques du frontend React (via `express.static`). Le frontend est un fichier `app.js` unique qui utilise React en CDN (Babel transpile dans le navigateur), sans bundler, sans TypeScript, sans système de build.

L'audit (P10) identifie les problèmes suivants :

- URLs d'API hardcodées dans chaque composant React (`fetch('/items')`)
- Impossible de tester les composants indépendamment de l'API
- Pas de couche d'abstraction HTTP réutilisable
- Pas de gestion d'erreurs côté frontend
- Aucun outillage frontend moderne (pas de build, pas de HMR, pas de type checking)

Le sujet exige : « Séparation frontend / backend », un frontend React + Vite + TypeScript, et un Dockerfile par application.

## Décision

Nous séparons le projet en deux applications indépendantes dans un **monorepo** :

```
/
├── backend/         ← Express + TypeScript (API uniquement)
│   ├── src/
│   ├── spec/
│   ├── Dockerfile
│   └── package.json
├── frontend/        ← React + Vite + TypeScript (SPA)
│   ├── src/
│   ├── e2e/
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

**Communication** : le frontend appelle le backend via des requêtes HTTP. En développement, Vite proxy les requêtes `/items` et `/auth` vers `localhost:3000`. En production, Nginx fait le reverse proxy vers le service `backend`.

**Client API centralisé** : un module `frontend/src/api/client.ts` encapsule tous les appels `fetch` avec gestion automatique du token JWT et des erreurs. Les composants n'appellent jamais `fetch` directement.

## Alternatives envisagées

**1. Garder le monolithe (Express sert le frontend)**
Pas de séparation, Express continue à servir les fichiers statiques. Plus simple, un seul Dockerfile. Rejeté car c'est explicitement contraire au sujet, et ça rend impossible l'utilisation de Vite, du HMR, et du type checking frontend.

**2. Multi-repo (deux repositories Git séparés)**
Un repo `todo-frontend`, un repo `todo-backend`. Meilleure isolation, chaque équipe a son propre CI. Rejeté car le sujet demande « Code Front & Back dans un repository GitHub » (slide 8). De plus, pour un projet à 2 personnes sur 6 semaines, le multi-repo ajoute de la friction inutile (sync des versions, PR croisées).

**3. Monorepo avec workspace npm**
Un `package.json` racine avec `workspaces: ["backend", "frontend"]` pour partager des dépendances et des types. Envisageable, mais les deux applications n'ont aucune dépendance commune (l'une est Node/Express, l'autre est React/Vite). Les types partagés (`TodoItem`) sont suffisamment simples pour être dupliqués. Rejeté car la complexité de configuration des workspaces n'apporte rien ici.

## Conséquences

### Positives

- **Déploiement indépendant** : le frontend est une SPA servie par Nginx (image Alpine légère), le backend est un serveur Node. On peut scaler, déployer ou remplacer l'un sans toucher l'autre.
- **DX améliorée** : Vite offre le HMR instantané en dev. TypeScript vérifie les types des composants React. Les tests E2E Playwright tournent contre le vrai frontend buildé.
- **Sécurité** : le backend ne sert plus de fichiers statiques, réduisant la surface d'attaque. CORS est configuré pour n'accepter que l'origine autorisée.
- **Docker Compose simple** : deux services (`backend`, `frontend`), un volume pour les données SQLite. `docker compose up --build` lance tout.

### Négatives

- **Duplication des types** : `TodoItem` est défini dans `backend/src/domain/TodoItem.ts` et dans `frontend/src/types/index.ts`. Si le schéma évolue, il faut synchroniser manuellement. Acceptable pour 2 interfaces simples, mais un workspace npm ou un package partagé deviendrait nécessaire sur un projet plus grand.
- **Configuration proxy** : il faut maintenir la configuration proxy en dev (Vite) et en prod (Nginx). C'est un point de friction classique des architectures SPA + API, mais bien documenté dans le README.
- **Deux `node_modules`** : deux installations npm séparées. Léger inconvénient en espace disque et temps de CI, négligeable en pratique.
