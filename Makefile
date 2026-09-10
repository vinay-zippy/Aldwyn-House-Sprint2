.PHONY: up down logs seed test lint sync

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

seed:
	docker compose exec backend python -m app.seed

sync:
	cd backend && uv sync --group dev

test: sync
	cd backend && uv run pytest

lint: sync
	cd backend && uv run ruff check app tests
