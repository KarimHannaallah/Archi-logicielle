# API Versioning

## Stratégie

Le projet utilise le **versionning sémantique** (MAJOR.MINOR.PATCH) dans le `package.json`
de chaque service. La version est exposée à l'exécution via `GET /health` et `GET /version`.

## Périmètre du versionning REST

Le versionning des routes REST (préfixe `/v1/`) est appliqué **uniquement sur auth-service**,
car c'est le seul service dont le contrat API est consommé directement par le frontend et
susceptible d'évoluer de manière non rétrocompatible (ex : ajout de la date de naissance
obligatoire dans la Partie I).

### Pourquoi pas les autres services ?

| Service | Versionning REST | Raison |
|---|---|---|
| auth-service | `/v1/auth/*` | Contrat client → serveur, évolution prévue (v2) |
| task-service | Non | Communique via événements versionnés (`TaskCompleted.v1.json`) |
| project-service | Non | Idem — consomme/publie des événements versionnés |
| notification-service | Non | Consomme des événements, pas d'API publique complexe |

C'est un **compromis reconnu** : versionner uniquement là où c'est nécessaire évite la
complexité inutile tout en gardant la possibilité d'évoluer le contrat d'authentification.

## Routes versionnées (auth-service)

| Route | Méthode | Description |
|---|---|---|
| `/v1/auth/register` | POST | Inscription avec consentement RGPD |
| `/v1/auth/login` | POST | Connexion, retourne un JWT |
| `/v1/auth/logout` | POST | Déconnexion |
| `/v1/auth/profile` | GET | Consultation du profil |
| `/v1/auth/profile` | PUT | Modification du profil |
| `/v1/auth/profile` | DELETE | Suppression du compte |
| `/v1/auth/verify` | GET | Vérification du token |

Les routes legacy sans préfixe (`/auth/*`) restent fonctionnelles pour la rétrocompatibilité.

## Healthcheck et version

Chaque service expose `GET /health` (sans préfixe de version) :

```json
{
  "service": "auth-service",
  "version": "1.0.0",
  "status": "ok"
}
```

auth-service expose aussi `GET /version` pour interroger la version sans healthcheck.

## API Gateway — Nginx

Nginx joue le rôle de **gateway API léger** devant les micro-services :

```
Client (navigateur)
      |
      v
  Nginx (:80)
      |
      +-- /api/auth/v1/*           --> auth-service:3001/v1/auth  (versionné)
      +-- /api/auth/*              --> auth-service:3001/auth     (legacy)
      +-- /api/items/*             --> task-service:3000/items
      +-- /api/projects/*          --> project-service:3002/projects
      +-- /api/notifications/*     --> notification-service:3003/notifications
      +-- /*                       --> SPA (index.html)
```

### Évolution future

Pour ajouter une v2 d'auth-service (Partie I — date de naissance obligatoire) :
1. Ajouter les routes `/v2/auth/*` dans auth-service
2. Ajouter un bloc `location /api/auth/v2` dans `nginx.conf`
3. Mettre à jour le frontend pour pointer vers `/api/auth/v2`
4. Déprécier `/v1/auth/*` (header `Deprecation` ou doc)