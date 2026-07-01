# ADR-007 : Extraction du service d'authentification (auth-service)

## Status

Accepted

## Context

L'authentification était initialement gérée dans task-service (middleware JWT local). Cette approche posait plusieurs problèmes : duplication de la logique auth dans chaque service, impossibilité de centraliser la gestion des comptes, et couplage fort entre les responsabilités métier et sécurité.

## Decision

Extraire toute la logique d'authentification dans un service dédié `auth-service` (port 3001) avec :
- Sa propre base SQLite dédiée (`/data/auth.db`)
- Routes versionnées : `/v1/auth/register`, `/v1/auth/login`, `/v1/auth/verify`
- JWT vérifié **localement** dans chaque service via `@archi/shared-auth` — pas de validation centralisée à chaque requête
- Middleware partagé extrait dans `packages/shared-auth`

## Consequences

### Positif
- Séparation claire des responsabilités
- Un seul endroit pour gérer les comptes, le consentement RGPD, les migrations utilisateurs
- Les autres services ne dépendent que du JWT (découplage fort)
- Permet le versionning REST sur auth-service uniquement (Partie B)

### Négatif
- Dépendance réseau au démarrage (auth-service doit être healthy avant les autres)
- Complexité opérationnelle accrue (un service de plus à déployer)