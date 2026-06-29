# Pipeline CD (Continuous Deployment)

## Vue d'ensemble

Le deploiement continu s'appuie sur deux workflows GitHub Actions distincts, chacun cible un environnement specifique.

```
CI (main) ──success──> cd-integration.yml ──auto──> VM integration
                                                       │
                                                  healthcheck
                                                       │
                                              rollback si echec

workflow_dispatch ──confirm='deploy'──> cd-production.yml ──> VM production
                                                                  │
                                                          restart sequentiel
                                                                  │
                                                         rollback si echec
```

## cd-integration.yml

| Propriete         | Valeur                                      |
|-------------------|---------------------------------------------|
| Declencheur       | `workflow_run` sur CI success (branche main)|
| Concurrence       | `cd-integration`, sans annulation           |
| Environnement     | `integration`                               |

### Etapes

1. **Checkout** du code source
2. **SSH vers la VM** d'integration :
   - Sauvegarde des images Docker courantes (rollback)
   - `git pull origin main`
   - `docker compose --profile mysql up --build -d`
   - Attente de 4 services healthy (30 tentatives, 10s d'intervalle)
3. **Healthcheck post-deploiement** : curl sur `/health` de chaque service (ports 3001, 3000, 3002, 3003)
4. **Rollback automatique** si echec : `git checkout HEAD~1` + rebuild
5. **Resume** dans `$GITHUB_STEP_SUMMARY`

### Secrets requis

| Secret                 | Description                        |
|------------------------|------------------------------------|
| `INTEGRATION_HOST`     | Adresse IP/DNS de la VM            |
| `INTEGRATION_USER`     | Utilisateur SSH                    |
| `INTEGRATION_SSH_KEY`  | Cle privee SSH                     |
| `INTEGRATION_APP_DIR`  | Repertoire de l'application        |

## cd-production.yml

| Propriete         | Valeur                                       |
|-------------------|----------------------------------------------|
| Declencheur       | `workflow_dispatch` (manuel)                 |
| Gate              | L'input `confirm` doit valoir `deploy`       |
| Concurrence       | `cd-production`, sans annulation             |
| Environnement     | `production`                                 |

### Etapes

1. **Checkout** du code source
2. **SSH vers la VM** de production :
   - Sauvegarde du commit courant et des images Docker
   - `git pull origin main`
   - Redemarrage sequentiel de chaque service (auth → task → project → notification → frontend)
   - Chaque service est attendu healthy avant de passer au suivant (20 tentatives, 10s)
3. **Healthcheck post-deploiement** : curl sur `/health` de chaque service + frontend sur port 80
4. **Rollback automatique** si echec : retour au commit sauvegarde + rebuild complet
5. **Resume** dans `$GITHUB_STEP_SUMMARY`

### Secrets requis

| Secret                | Description                        |
|-----------------------|------------------------------------|
| `PRODUCTION_HOST`     | Adresse IP/DNS de la VM            |
| `PRODUCTION_USER`     | Utilisateur SSH                    |
| `PRODUCTION_SSH_KEY`  | Cle privee SSH                     |
| `PRODUCTION_APP_DIR`  | Repertoire de l'application        |

## Strategie de rollback

| Environnement | Strategie                                                    |
|---------------|--------------------------------------------------------------|
| Integration   | `git checkout HEAD~1` + `docker compose up --build -d`       |
| Production    | Retour au commit sauvegarde avant deploiement + rebuild      |

## Ordre de deploiement (production)

Le redemarrage sequentiel minimise le downtime :

1. `auth-service` — dependance de tous les autres services
2. `task-service`
3. `project-service`
4. `notification-service`
5. `frontend`

## Lien avec la CI

Le job `integration-tests` dans `ci.yml` valide le bon fonctionnement des services via Docker Compose avant tout deploiement. Le CD integration ne se declenche que si la CI reussit.