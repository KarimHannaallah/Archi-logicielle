# ADR-004 — Choix du Message Broker

## Status

Accepted

## Context

Dans le cadre de la Partie 2 du projet, on fait évoluer la Todo App d'un monolithe
Ports & Adapters (Express + TypeScript + SQLite) vers une **architecture microservices
event-driven** avec 3 services indépendants :

- **task-service** : CRUD des tâches, publie des événements de cycle de vie
- **project-service** : CRUD des projets, réagit aux événements de tâches
- **notification-service** : consumer pur, log et expose les événements reçus

Ces services ont besoin d'un **canal de communication asynchrone** pour s'échanger
des événements sans couplage direct (pas d'appels HTTP synchrones inter-services).

Deux candidats ont été évalués : **Redis Pub/Sub** et **RabbitMQ**.

---

## Comparaison Redis Pub/Sub vs RabbitMQ

| Critère | Redis Pub/Sub | RabbitMQ |
|---|---|---|
| **Simplicité de setup (Docker)** | ✅ 1 seul container, image `redis:alpine`, aucune config | ⚠️ 1 container + configuration exchanges/queues + plugin management UI |
| **Persistance des messages** | ❌ Aucune persistance native — message perdu si le consumer est offline | ✅ Persistance durable sur disque, messages survivent aux redémarrages |
| **Acknowledgment / retry** | ❌ Pas d'ack — fire-and-forget, pas de retry automatique | ✅ ACK/NACK natif, retry configurable par message |
| **Dead Letter Queue (DLQ)** | ❌ Pas de DLQ native | ✅ DLQ intégrée, messages en erreur redirigés automatiquement |
| **Ordering des messages** | ✅ Ordre de publication garanti dans un canal (FIFO) | ⚠️ Garanti par queue, mais complexe avec plusieurs consumers ou exchanges |
| **Overhead opérationnel** | ✅ Très faible — Redis fait déjà partie de nombreuses stacks | ⚠️ Élevé — AMQP, virtual hosts, bindings, policies, monitoring dédié |

---

## Decision

**On choisit Redis Pub/Sub.**

### Justification

Ce projet est un contexte **pédagogique de niveau M1**. L'objectif est de comprendre
les patterns event-driven (publish/subscribe, bounded contexts, contracts d'événements)
sans se noyer dans la complexité opérationnelle d'un broker enterprise.

Redis Pub/Sub répond exactement à ce besoin :

1. **Un seul container** `redis:alpine` suffit — pas de configuration d'exchanges,
   de queues, de bindings ou de virtual hosts.
2. **API minimaliste** : `PUBLISH channel message` / `SUBSCRIBE channel` — trivial
   à intégrer avec la librairie `ioredis` en TypeScript.
3. **Déjà connu** des équipes : Redis est une brique standard dans les stacks Node.js
   (cache, sessions). Réutiliser le même outil réduit la charge cognitive.
4. **Docker Compose simplifié** : l'ajout d'un seul service `redis` dans
   `docker-compose.yml` suffit à démarrer l'infrastructure complète.

### Limites acceptées

| Limite | Pourquoi acceptable dans ce contexte |
|---|---|
| **Pas de persistance** | Les 3 services sont démarrés ensemble via Docker Compose. Si un service redémarre, il se reconnecte immédiatement. Aucun message critique n'est censé transiter pendant un downtime en dev. |
| **Pas d'ack / retry** | Le notification-service est un consumer "best effort" — une notification ratée n'est pas critique. Le project-service pourra être rendu idempotent. |
| **Pas de DLQ** | En contexte pédagogique, les erreurs sont loguées en console. Pas de besoin de retraitement automatique. |
| **Fan-out seulement** | Redis Pub/Sub broadcast à tous les abonnés actifs. C'est exactement ce qu'on veut : plusieurs services (project + notification) écoutent le même événement `task.completed`. |

---

## Consequences

### Positives

- Infrastructure prête en < 5 minutes (`docker compose up`)
- Code d'intégration minimal (< 50 lignes par service)
- Facilite la compréhension des patterns event-driven sans friction opérationnelle
- Cohérence avec l'ADR-001 (simplicité avant sophistication)

### Négatives / Contraintes

- **Couplage temporel** : un consumer offline au moment de la publication rate
  l'événement définitivement. À mitiger en production par une couche de persistance
  (Redis Streams, ou migration vers RabbitMQ/Kafka).
- **Pas de replay** : impossible de rejouer l'historique des événements. Pour un
  système de production, préférer Redis Streams ou Apache Kafka.
- **Pas de backpressure** : si le notification-service est lent, les messages sont
  tout de même publiés et peuvent être perdus. Acceptable en contexte M1.

### Migration future (hors scope M1)

Si le projet évoluait vers un contexte production, l'ordre de migration conseillé
serait : Redis Pub/Sub → **Redis Streams** (persistance + consumer groups, même
infrastructure) → RabbitMQ (ack/DLQ/retry, AMQP) → Apache Kafka (ordering fort,
replay, event sourcing à grande échelle).

---

## Références

- [Redis Pub/Sub documentation](https://redis.io/docs/manual/pubsub/)
- [ioredis — Node.js Redis client](https://github.com/redis/ioredis)
- ADR-001 — Choix architecture Ports & Adapters
- Contrats d'événements : `docs/events/TaskCompleted.v1.json`, `TaskReopened.v1.json`, `ProjectClosed.v1.json`