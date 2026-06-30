# Deployment

## Environnements

| Env | VM | Déclencheur | Images |
|-----|----|-------------|--------|
| integration | VM Azure INT | CI success sur `main` (automatique) | `:latest` |
| production | VM Azure PROD | Release GitHub publiée (manuel gate) | `:VERSION` |

## Secrets GitHub requis

| Secret | Description |
|--------|-------------|
| `VM_HOST_INT` | IP/hostname VM intégration |
| `VM_USER_INT` | User SSH VM intégration |
| `SSH_PRIVATE_KEY_INT` | Clé privée SSH VM intégration |
| `VM_HOST_PROD` | IP/hostname VM production |
| `VM_USER_PROD` | User SSH VM production |
| `SSH_PRIVATE_KEY_PROD` | Clé privée SSH VM production |

## Workflows CD

### cd-integration.yml
- Déclenché par : `workflow_run` CI success sur `main`, ou `workflow_dispatch`
- Environnement GitHub : `integration`
- Stratégie : `docker compose up -d` en une fois, attend 4 services healthy
- Rollback automatique si échec

### cd-production.yml
- Déclenché par : `release: published`
- Environnement GitHub : `production` (required reviewers — manual gate)
- Stratégie : déploiement séquentiel service par service
- Rollback automatique si échec

## Script deploy.sh

`scripts/deploy.sh` permet de déclencher un déploiement manuellement depuis une machine locale ou depuis CI.

```bash
# Déploiement intégration (version latest)
export VM_HOST_INT=<ip>
export VM_USER_INT=<user>
export SSH_PRIVATE_KEY_INT="$(cat ~/.ssh/id_ed25519)"
./scripts/deploy.sh int

# Déploiement production (version obligatoire)
export VM_HOST_PROD=<ip>
export VM_USER_PROD=<user>
export SSH_PRIVATE_KEY_PROD="$(cat ~/.ssh/id_ed25519)"
./scripts/deploy.sh prod 1.2.3
```

Le script :
1. Télécharge le bon `docker-compose` depuis GitHub
2. Sauvegarde les images actuelles (pour rollback)
3. Pull les nouvelles images
4. Démarre les services (séquentiel pour prod, parallèle pour int)
5. Vérifie les healthchecks sur tous les endpoints

## Déployer une nouvelle version en production

1. Merger la PR sur `main`
2. Attendre que CI passe et que CD integration déploie sur INT
3. Vérifier sur INT que tout fonctionne
4. Créer une release GitHub : `git tag v1.2.3 && git push origin v1.2.3`, puis créer la release sur GitHub
5. Le workflow `cd-production.yml` se déclenche et attend l'approbation du reviewer
6. Approuver dans GitHub Actions → déploiement prod

## Prérequis VM (H.1 — tâche manuelle)

Chaque VM doit avoir :
- Docker Engine installé
- `docker compose` v2 disponible (`docker compose version`)
- Port 80 ouvert (frontend), ports 3000-3003 accessibles en local
- Dossier `/opt/app` créé (`sudo mkdir -p /opt/app && sudo chown $USER /opt/app`)
- Clé publique SSH ajoutée dans `~/.ssh/authorized_keys`

## GitHub Environment "production" (H.3 — tâche manuelle)

Dans **Settings → Environments → production** :
- ✅ Required reviewers : ajouter les reviewers autorisés
- ✅ Deployment branches : `main` uniquement
- Les secrets `VM_HOST_PROD`, `VM_USER_PROD`, `SSH_PRIVATE_KEY_PROD` peuvent être scopés à cet environment plutôt qu'au repo