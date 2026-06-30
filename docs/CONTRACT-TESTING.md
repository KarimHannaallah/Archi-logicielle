# Contract Testing avec Pact

## Pourquoi

Le contract testing garantit que le frontend et l'auth-service s'accordent sur le format des requêtes et réponses HTTP, sans avoir besoin de démarrer tous les services ensemble. Si l'auth-service change sa réponse de `/auth/login`, le test provider échoue en CI avant le deploy.

## Structure

```
pacts/
├── frontend-auth-service.json   # Contrat généré (source de vérité)
├── consumer/
│   └── frontend-auth.pact.spec.ts   # Tests côté frontend (consumer)
├── provider/
│   └── auth-service.pact.spec.ts    # Vérification côté auth-service (provider)
├── package.json
└── tsconfig.json
```

## Contrats définis

### frontend → auth-service

| Interaction | Method | Path | Status |
|-------------|--------|------|--------|
| register a new user | POST | /auth/register | 201 |
| login with valid credentials | POST | /auth/login | 200 |
| login with wrong password | POST | /auth/login | 401 |
| verify a valid token | GET | /auth/verify | 200 |

### Matching rules

Les contrats utilisent des matching rules plutôt que des valeurs fixes :
- `$.token` — type string (pas la valeur exacte du JWT)
- `$.user.id` — format UUID
- `$.user.email` / `$.user.name` — type string

Cela permet au provider de changer ses données de test sans casser le contrat.

## Flow CI

```
build-services (tests unitaires)
        │
        ▼
     pact job
        │
        ├── npm run test:consumer → génère/valide pacts/frontend-auth-service.json
        │
        └── npm run test:provider → vérifie que auth-service respecte le contrat
```

Le job `pact` tourne après `build-services` et en parallèle de `integration-tests`.

## Lancer en local

```bash
cd pacts
npm ci
npm run test:consumer   # génère le fichier JSON de contrat
npm run test:provider   # vérifie l'implémentation auth-service
```

## Ajouter un nouveau contrat

1. Ajouter une interaction dans `pacts/consumer/frontend-auth.pact.spec.ts`
2. Lancer `npm run test:consumer` — le fichier `pacts/frontend-auth-service.json` se met à jour automatiquement
3. Ajouter le `stateHandler` correspondant dans `pacts/provider/auth-service.pact.spec.ts`
4. Vérifier avec `npm run test:provider`

## Extension future

- Ajouter un contrat `frontend → task-service` pour les endpoints `/items`
- Publier les contrats sur un Pact Broker (ex: pactflow.io) pour un suivi centralisé
- Utiliser `can-i-deploy` avant chaque deploy en CD