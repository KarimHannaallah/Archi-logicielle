# ADR-006 : Pipeline de Déploiement Continu (CD)

## Status

Accepted

## Context

Avec la mise en place du pipeline CI (ADR implicite), nous devons définir comment les microservices sont déployés sur les environnements d'intégration et de production. Plusieurs approches ont été considérées :

**Option A — Build sur la VM** : La VM clone le repo et fait `docker compose up --build`. Simple, mais lent (build à chaque deploy), consomme des ressources CPU/RAM sur la VM, et ne garantit pas que ce qui est testé en CI est exactement ce qui tourne en prod.

**Option B — Images Docker versionnées (GHCR)** : La CI construit les images, les pousse dans un registry (GHCR), et les VMs téléchargent les images pré-construites. Séparation claire entre build et deploy. Ce qui est testé est exactement ce qui est déployé.

**Option C — Deploy continu sans gate** : Chaque merge sur main déclenche automatiquement un deploy en intégration ET en production. Risqué — une régression en prod sans filet.

## Decision

Nous adoptons l'**Option B** avec deux workflows distincts et un gate de release pour la production.

### Flux complet

```
merge main
    │
    ▼
CI — tests + build Docker → push :latest + :sha-xxx → GHCR
    │
    ▼ (workflow_run on success)
CD Integration — pull :latest → VM intégration → healthcheck
    │
    ▼ (validation manuelle — créer une Release GitHub)
CD Production — pull :1.0.0 → VM production → restart séquentiel → healthcheck
```

### Tags d'images

| Tag | Quand | Usage |
|-----|-------|-------|
| `:latest` | Chaque merge sur main | VM intégration |
| `:sha-abc1234` | Chaque commit | Traçabilité / rollback ciblé |
| `:1` | Changement de version majeure | Référence stable |
| `:1.0.0` | Changement de version dans package.json | VM production via Release |

### Déclencheurs

| Workflow | Déclencheur | Gate |
|----------|-------------|------|
| `cd-integration.yml` | `workflow_run` sur CI success (main) | Aucun — automatique |
| `cd-production.yml` | `release: published` sur GitHub | Release GitHub créée manuellement |

### Stratégie de rollback

Pas de git checkout — les images précédentes restent en cache Docker sur la VM. En cas d'échec, le workflow relance `docker compose up -d` avec les images en cache local (avant le pull).

### Restart séquentiel (production)

Les services sont redémarrés un par un dans l'ordre de dépendance :
`auth-service` → `task-service` → `project-service` → `notification-service` → `frontend`

Chaque service est attendu healthy avant de passer au suivant, ce qui minimise le downtime.

## Consequences

### Positif
- Ce qui est testé en CI est exactement ce qui est déployé (même image)
- Gate naturel entre intégration et production (la Release est un acte délibéré)
- Rollback rapide sans re-build (images en cache sur la VM)
- Les VMs n'ont pas besoin de Git, Node.js, ni d'accès au code source
- Traçabilité complète : chaque image est taguée avec le SHA du commit

### Négatif
- GHCR doit être accessible depuis les VMs (login Docker requis au deploy)
- Si une image n'a pas été construite (service inchangé = skippé en CI), le tag `:latest` pointe vers la dernière image construite pour ce service, pas forcément ce commit
- Le restart séquentiel en prod allonge le temps de déploiement

### Chemin de migration future
Release manuelle → Release automatique via semantic-release → Blue/green deployment → Kubernetes avec rolling update