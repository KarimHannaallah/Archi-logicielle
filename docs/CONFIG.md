# Configuration

## Variables d'environnement

Chaque service a un fichier `.env.example` à la racine de son dossier.
Pour configurer un service en local, copier le fichier et le renommer :

```bash
cp services/task-service/.env.example services/task-service/.env
cp services/project-service/.env.example services/project-service/.env
cp services/notification-service/.env.example services/notification-service/.env
```

### Modes de persistence (task-service)

| Mode | Variables | Usage |
|------|-----------|-------|
| SQLite (défaut) | `SQLITE_DB_LOCATION=/data/task.db` | Production, Docker |
| InMemory | `USE_INMEMORY=true` | Tests, développement rapide |
| MySQL | `MYSQL_HOST=localhost` `MYSQL_USER=...` `MYSQL_PASSWORD=...` `MYSQL_DB=...` | Production scale |

### Docker Compose

En Docker Compose, les variables sont définies dans `docker-compose.yml`.
Les `.env` ne sont utilisés qu'en développement local.

Pour démarrer tous les services (Redis inclus) :

```bash
docker compose up --build
```

### MySQL (optionnel)

Pour utiliser MySQL au lieu de SQLite dans le task-service, décommenter le service `mysql`
dans `docker-compose.yml` et ajouter `MYSQL_HOST=mysql` dans les variables d'environnement
de `task-service`.

### Redis

Tous les services nécessitent Redis pour la communication par événements.

- **Docker Compose** : le service `redis` est défini automatiquement, aucune configuration supplémentaire requise.
- **Développement local** (sans Docker Compose) : `docker run --rm -p 6379:6379 redis:7-alpine`
