.PHONY: all up down clean clean-all install test test-unit test-e2e wait-mysql logs check-env

# ── Vérification du fichier .env ──────────────────────────────────────────────
check-env:
	@if [ ! -f .env ]; then \
		echo ""; \
		echo "  ❌ Fichier .env manquant."; \
		echo "  Copier l'exemple et adapter :"; \
		echo ""; \
		echo "    cp .env.example .env"; \
		echo ""; \
		exit 1; \
	fi

# ── Cible par défaut ──────────────────────────────────────────────────────────
all: up

up: check-env
	docker compose --profile mysql up --build -d
	@echo ""
	@echo "  Frontend  → http://localhost"
	@echo "  Tasks     → http://localhost:3000"
	@echo "  Auth	   → http://localhost:3001"
	@echo "  Projects  → http://localhost:3002"
	@echo "  Notifs    → http://localhost:3003"
	@echo ""

# ── Installer les dépendances ─────────────────────────────────────────────────
install:
	cd services/auth-service && npm install
	cd services/task-service && npm install
	cd services/project-service && npm install
	cd services/notification-service && npm install
	cd frontend && npm install

# ── Attendre que MySQL soit prêt ──────────────────────────────────────────────
wait-mysql:
	@echo ">>> Attente MySQL..."
	docker compose exec -T mysql sh -c "until mysql -utodo -ptodopass todos -e 'SELECT 1' >/dev/null 2>&1; do printf '.'; sleep 2; done"
	@echo ">>> MySQL OK"

# ── Tests unitaires ───────────────────────────────────────────────────────────
test-unit:
	@echo ">>> Tests unitaires : auth-service"
	cd services/auth-service && npm test -- --forceExit
	@echo ">>> Tests unitaires : task-service"
	cd services/task-service && npx cross-env MYSQL_HOST=127.0.0.1 MYSQL_PORT=3307 MYSQL_USER=todo MYSQL_PASSWORD=todopass MYSQL_DB=todos npm test -- --forceExit
	@echo ">>> Tests unitaires : project-service"
	cd services/project-service && npm test -- --forceExit

# ── Tests E2E Playwright ──────────────────────────────────────────────────────
test-e2e: up
	@echo ">>> Tests E2E : frontend (Playwright)"
	cd frontend && npx cross-env USE_DOCKER_STACK=1 npx playwright test

# ── Suite complète ────────────────────────────────────────────────────────────
test: check-env clean-all install up wait-mysql test-unit test-e2e

# ── Logs en live ──────────────────────────────────────────────────────────────
logs: check-env
	docker compose --profile mysql logs -f

# ── Arrêter les conteneurs ────────────────────────────────────────────────────
clean: check-env
	docker compose --profile mysql down --remove-orphans

clean-all: check-env
	docker compose --profile mysql down -v --remove-orphans

# ── Supprimer conteneurs + volumes + images ───────────────────────────────────
down: check-env
	docker compose --profile mysql down -v --rmi all --remove-orphans