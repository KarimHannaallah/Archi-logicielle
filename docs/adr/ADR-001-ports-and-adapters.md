# ADR-001 — Adoption de l'architecture Ports & Adapters (Hexagonal)

**Date :** février 2026
**Statut :** Accepté
**Contexte projet :** Refonte Todo App — M1 Architecture Logicielle

---

## Contexte

L'application initiale (`docker/getting-started-app`) reposait sur une architecture plate à deux couches : les routes Express appellent directement les modules de persistence SQLite/MySQL. L'audit (cf. `docs/AUDIT.md`) a identifié plusieurs problèmes critiques :

- **P1 — Absence de couche métier** : la logique (génération UUID, valeurs par défaut) vit dans les handlers HTTP.
- **P2 — Couplage direct routes → persistence** : chaque route fait `require('../persistence')`, rendant le remplacement de la DB impossible sans modifier les 4 fichiers de routes.
- **P11 — Tests couplés à l'implémentation** : tester le métier nécessite de mocker Express (`req`/`res`) et la persistence via des chemins de fichiers.

Le sujet impose un « métier découplé des briques techniques » et une « couverture de tests des cas métiers ».

## Décision

Nous adoptons le pattern **Ports & Adapters** (architecture hexagonale) avec trois couches :

```
src/
├── domain/          ← noyau métier (interfaces + services)
│   ├── TodoItem.ts
│   ├── TodoRepository.ts    (port)
│   ├── TodoService.ts       (logique métier)
│   ├── User.ts
│   ├── UserRepository.ts    (port)
│   └── AuthService.ts       (logique métier)
├── persistence/     ← adapters (implémentations concrètes)
│   ├── inmemory.ts
│   ├── sqlite.ts
│   ├── mysql.ts
│   ├── userInmemory.ts
│   └── userSqlite.ts
├── routes/          ← adapters HTTP (reçoivent les services par injection)
├── middleware/       
└── index.ts         ← composition root
```

Le **domaine** ne dépend de rien d'externe : ni `express`, ni `sqlite3`, ni `mysql2`. Il définit des **ports** (interfaces `TodoRepository`, `UserRepository`) et contient la logique métier (`TodoService`, `AuthService`).

Les **adapters** implémentent ces ports : `InMemoryTodoRepository` pour les tests, `SqliteTodoRepository` pour la production.

## Alternatives envisagées

**1. Couche service sans inversion de dépendance**
Un `TodoService` qui importe directement `persistence/index.ts`. Plus simple, mais le domaine dépend toujours du mécanisme de résolution. Les tests doivent mocker des chemins de fichiers. Rejeté car ça ne résout pas P2 ni P11.

**2. Clean Architecture complète (use cases, entities, DTOs)**
Séparer les use cases (`CreateTodoUseCase`, `DeleteTodoUseCase`) des entités, avec des DTOs aux frontières. Trop verbeux pour une Todo App : ça ajouterait une dizaine de fichiers pour 4 opérations CRUD. Rejeté car le rapport complexité/bénéfice est défavorable.

**3. Architecture en couches classique (Controller → Service → Repository)**
Sans inversion de dépendance, le service référence le repository concret. Plus facile à comprendre mais ne permet pas de swapper l'implémentation sans modifier le service. Rejeté car ça ne satisfait pas l'exigence « métier découplé des briques techniques ».

## Conséquences

### Positives

- **Testabilité** : les tests d'intégration utilisent `InMemoryTodoRepository` — pas de DB, exécution instantanée, isolation totale.
- **Interchangeabilité** : passer de SQLite à MySQL ne nécessite que de changer une ligne dans la composition root, sans toucher ni au domaine ni aux routes.
- **Enforceability** : les règles `dependency-cruiser` interdisent à `src/domain/` d'importer `express`, `sqlite3`, `mysql2` ou `src/persistence/`. L'architecture est vérifiable par CI.
- **Test anti-régression** : `no-sqlite-in-test.spec.js` vérifie que `sqlite3` n'est jamais chargé en mode test.

### Négatives

- **Indirection supplémentaire** : il faut naviguer interface → implémentation → composition root pour comprendre le wiring. Sur un projet plus grand, ça se justifie. Sur une Todo App, c'est un overhead assumé à des fins pédagogiques.
- **Duplication partielle des signatures** : l'interface `TodoRepository` et les implémentations ont des méthodes identiques. Inévitable en l'absence de concepts comme les traits ou les classes abstraites en TypeScript pur.
