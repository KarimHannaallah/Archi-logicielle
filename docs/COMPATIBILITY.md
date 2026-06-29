# Compatibilite entre services

## Manifeste de compatibilite

Le fichier `compatibility-manifest.yml` a la racine du projet liste les versions compatibles de chaque microservice pour chaque release. Il est distinct du versioning REST (Partie B / `docs/API_VERSIONING.md`) qui concerne les endpoints HTTP.

```yaml
releases:
  - version: "2026-06-29"
    services:
      auth-service: v1.0.0
      task-service: v1.0.0
      project-service: v1.0.0
      notification-service: v1.0.0
    api-gateway-version: v1
```

## Mise a jour automatique

Le job CI `update-compatibility-manifest` se declenche sur `main` apres le succes des tests et du build Docker. Il lit la version de chaque `package.json` et regenere le manifeste.

## Labels Docker

Chaque image Docker porte des labels de compatibilite :

| Service              | Labels                                                        |
|----------------------|---------------------------------------------------------------|
| auth-service         | `provides.api-version=v1`, `provides.service=auth-service`   |
| task-service         | `provides.api-version=v1`, `requires.auth-service>=1.0.0`    |
| project-service      | `provides.api-version=v1`, `requires.auth-service>=1.0.0`    |
| notification-service | `provides.api-version=v1`, `requires.auth-service>=1.0.0`    |

## Graphe de dependances

```
frontend --> auth-service
frontend --> task-service --> auth-service
frontend --> project-service --> auth-service
frontend --> notification-service --> auth-service
```

## Verification au deploiement

```bash
./scripts/check-compatibility.sh
```

Ce script inspecte les labels Docker des images locales et verifie la coherence des dependances. Il peut aussi recevoir des noms d'images en argument.