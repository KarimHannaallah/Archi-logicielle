# Pipeline CD (Continuous Deployment)

## Vue d'ensemble

Le deploiement continu s'appuie sur deux workflows GitHub Actions distincts. Les VMs ne clonent pas le repo — elles utilisent des images Docker pre-construites depuis GHCR.

```
CI (main) ──success──> cd-integration.yml ──auto──> VM integration
                           │                            │
                      SCP compose file            docker compose pull
                                                        │
                                                   healthcheck
                                                        │
                                               rollback si echec

workflow_dispatch ──confirm='deploy'──> cd-production.yml ──> VM production
                                            │                      │
                                       SCP compose file      pull + restart sequentiel
                                                                   │
                                                          rollback si echec
```

## Fichiers compose

| Fichier                  | Usage                          |
|--------------------------|--------------------------------|
| `docker-compose.yml`     | Dev local (build depuis source)|
| `docker-compose.int.yml` | VM integration (images GHCR)   |
| `docker-compose.prod.yml`| VM production (images GHCR + restart: always) |

## cd-integration.yml

| Propriete         | Valeur                                      |
|-------------------|---------------------------------------------|
| Declencheur       | `workflow_run` sur CI success (branche main)|
| Concurrence       | `cd-integration`, sans annulation           |
| Environnement     | `integration`                               |

### Etapes

1. **Checkout** du code source
2. **SCP** du fichier `docker-compose.int.yml` vers la VM
3. **SSH vers la VM** d'integration :
   - Sauvegarde des images Docker courantes (rollback)
   - `docker compose pull` (images GHCR)
   - `docker compose up -d`
   - Attente de 4 services healthy (30 tentatives, 10s d'intervalle)
4. **Healthcheck post-deploiement** : curl sur `/health` de chaque service (ports 3001, 3000, 3002, 3003)
5. **Rollback automatique** si echec : redemarrage avec les images precedentes
6. **Resume** dans `$GITHUB_STEP_SUMMARY`

### Secrets requis

| Secret                 | Description                        |
|------------------------|------------------------------------|
| `VM_HOST_INT`          | Adresse IP/DNS de la VM            |
| `VM_USER_INT`          | Utilisateur SSH                    |
| `SSH_PRIVATE_KEY_INT`  | Cle privee SSH                     |

## cd-production.yml

| Propriete         | Valeur                                       |
|-------------------|----------------------------------------------|
| Declencheur       | `workflow_dispatch` (manuel)                 |
| Gate              | L'input `confirm` doit valoir `deploy`       |
| Concurrence       | `cd-production`, sans annulation             |
| Environnement     | `production`                                 |

### Etapes

1. **Checkout** du code source
2. **SCP** du fichier `docker-compose.prod.yml` vers la VM
3. **SSH vers la VM** de production :
   - Sauvegarde des images Docker courantes
   - `docker compose pull` (images GHCR)
   - Redemarrage sequentiel de chaque service (auth -> task -> project -> notification -> frontend)
   - Chaque service est attendu healthy avant de passer au suivant (20 tentatives, 10s)
4. **Healthcheck post-deploiement** : curl sur `/health` de chaque service + frontend sur port 80
5. **Rollback automatique** si echec : redemarrage avec les images precedentes
6. **Resume** dans `$GITHUB_STEP_SUMMARY`

### Secrets requis

| Secret                 | Description                        |
|------------------------|------------------------------------|
| `VM_HOST_PROD`         | Adresse IP/DNS de la VM            |
| `VM_USER_PROD`         | Utilisateur SSH                    |
| `SSH_PRIVATE_KEY_PROD` | Cle privee SSH                     |

## Strategie de rollback

| Environnement | Strategie                                                    |
|---------------|--------------------------------------------------------------|
| Integration   | `docker compose down` + `docker compose up -d` (images precedentes en cache) |
| Production    | Meme strategie, les images precedentes restent en cache local |

## Ordre de deploiement (production)

Le redemarrage sequentiel minimise le downtime :

1. `auth-service` — dependance de tous les autres services
2. `task-service`
3. `project-service`
4. `notification-service`
5. `frontend`

## Prerequis sur les VMs

1. Docker + Docker Compose installes
2. `/opt/app/.env` cree avec `JWT_SECRET`, `MYSQL_*`, `REDIS_*`
3. Ports ouverts : 80, 3000-3003
4. Acces SSH configure (cle dans les secrets GitHub)

## Lien avec la CI

Le job `integration-tests` dans `ci.yml` valide le bon fonctionnement des services via Docker Compose avant tout deploiement. Le CD integration ne se declenche que si la CI reussit.