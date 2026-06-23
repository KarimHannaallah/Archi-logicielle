.PHONY: all up down clean clean-all install test test-unit test-e2e wait-mysql logs

# ── Cible par défaut : tout lancer ────────────────────────────────────────────
all: up

up:
	docker compose --profile mysql up --build -d
	@echo ""
	@echo "  Frontend  → http://localhost"
	@echo "  Tasks     → http://localhost:3000"
	@echo "  Projects  → http://localhost:3002"
	@echo "  Notifs    → http://localhost:3003"
	@echo ""

# ── Installer les dépendances (dont devDeps pour les tests) ──────────────────
install:
	cd services/task-service && npm install
	cd services/project-service && npm install
	cd services/notification-service && npm install
	cd frontend && npm install

# ── Attendre que MySQL accepte une vraie requête SQL (pas juste un ping TCP)
# La boucle tourne dans le conteneur Linux pour éviter les problèmes Windows
wait-mysql:
	@echo ">>> Attente MySQL..."
	docker compose exec -T mysql sh -c "until mysql -utodo -ptodopass todos -e 'SELECT 1' >/dev/null 2>&1; do printf '.'; sleep 2; done"
	@echo ">>> MySQL OK"

# ── Tests : clean-all + up + unit + e2e ──────────────────────────────────────
test: clean-all install up wait-mysql test-unit test-e2e

test-unit:
	@echo ">>> Tests unitaires : task-service"
	cd services/task-service && npx cross-env MYSQL_HOST=127.0.0.1 MYSQL_PORT=3307 MYSQL_USER=todo MYSQL_PASSWORD=todopass MYSQL_DB=todos npm test -- --forceExit
	@echo ">>> Tests unitaires : project-service"
	cd services/project-service && npm test -- --forceExit

test-e2e:
	@echo ">>> Tests E2E : frontend (Playwright)"
	cd frontend && npx cross-env USE_DOCKER_STACK=1 npx playwright test

# ── Logs en live ──────────────────────────────────────────────────────────────
logs:
	docker compose logs -f

# ── Arrêter les conteneurs sans supprimer les données ─────────────────────────
clean:
	docker compose --profile mysql down --remove-orphans

# ── Nettoyage complet : conteneurs + volumes (supprime toutes les données) ────
clean-all:
	docker compose --profile mysql down -v --remove-orphans
