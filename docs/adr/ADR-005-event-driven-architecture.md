# ADR-005 : Architecture Event-Driven

## Status

Accepted

## Context

Notre application est désormais découpée en 3 microservices (Task, Project, Notification). Nous devons choisir comment ces services communiquent entre eux. Trois options ont été considérées :

**Option A — Appels HTTP synchrones** : Le task-service appelle directement le project-service via HTTP quand une tâche est complétée. Simple à implémenter, mais crée un couplage fort : si le project-service est down, le task-service échoue. Chaque service doit connaître l'URL des autres.

**Option B — Base de données partagée** : Les 3 services lisent et écrivent dans la même base de données. Pas de communication réseau entre services, mais viole le principe d'encapsulation des bounded contexts. Un changement de schéma impacte tous les services.

**Option C — Communication par événements (event-driven)** : Les services publient des événements sur un broker (Redis Pub/Sub). Les autres services s'abonnent aux événements qui les intéressent. Découplage total : un service peut être down sans impacter les autres.

## Decision

Nous adoptons l'**architecture event-driven** (Option C) avec Redis Pub/Sub comme broker (voir ADR-004).

### Événements définis

| Channel | Producteur | Consommateurs | Déclencheur |
|---------|-----------|---------------|-------------|
| TaskCreated | task-service | project-service | POST /items avec projectId |
| TaskCompleted | task-service | project-service, notification-service | Tâche cochée (completed: false → true) |
| TaskReopened | task-service | project-service, notification-service | Tâche décochée (completed: true → false) |
| TaskDeleted | task-service | project-service | DELETE /items/:id |
| ProjectClosed | project-service | notification-service | Toutes les tâches d'un projet terminées |

### Format des événements (contract-first)
```json
{
  "eventId": "uuid-v4",
  "eventType": "TaskCompleted",
  "version": 1,
  "occurredAt": "2026-03-15T14:30:00.000Z",
  "projectId": "uuid-v4",
  "taskId": "uuid-v4",
  "userId": "uuid-v4"
}
```

### Garanties

- **Idempotence** : chaque consumer maintient un Set des `eventId` déjà traités (cappé à 10 000 entrées FIFO)
- **Résilience** : si Redis est down, les services continuent de fonctionner (événements perdus mais pas de crash)
- **Projection locale** : le project-service maintient un compteur `completedTasks/totalTasks` via les events, sans appeler le task-service

## Consequences

### Positif
- Découplage total entre les services (aucun ne connaît l'URL des autres)
- Scalabilité : on peut ajouter un consumer sans modifier le producteur
- Le notification-service peut être down sans impacter le workflow principal
- Cohérent avec les principes DDD (chaque bounded context est autonome)

### Négatif
- Eventual consistency : l'UI peut ne pas refléter l'état immédiatement
- Debugging plus complexe (suivre un événement à travers 3 logs)
- Redis Pub/Sub est fire-and-forget (pas d'ack, pas de persistance)
- Si un consumer est down au moment de l'event, l'event est perdu

### Chemin de migration future
Redis Pub/Sub → Redis Streams (persistance + consumer groups) → RabbitMQ (ack, DLQ, retry) → Kafka (ordering, replay)