# ===========================================
# Makefile for Pharma 360 Deployment
# ===========================================

.PHONY: help build test deploy down logs clean

# Default target
help:
	@echo "Pharma 360 Deployment Commands:"
	@echo ""
	@echo "  make build          - Build all Docker images"
	@echo "  make up             - Start all services (docker-compose up -d)"
	@echo "  make down           - Stop all services (docker-compose down)"
	@echo "  make restart        - Restart all services"
	@echo "  make logs           - View logs from all services"
	@echo "  make logs-backend   - View backend logs"
	@echo "  make logs-ia        - View IA service logs"
	@echo "  make logs-frontend  - View frontend logs"
	@echo "  make test           - Run deployment tests"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make init-db        - Initialize database"
	@echo "  make backup-db      - Backup database"
	@echo ""

# Build all Docker images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Stop all services
down:
	docker-compose down

# Restart all services
restart:
	docker-compose down
	docker-compose up -d

# View logs
logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f pharma360-backend

logs-ia:
	docker-compose logs -f pharma360-ia

logs-frontend:
	docker-compose logs -f pharma360-frontend

# Run deployment tests
test:
	python scripts/test_deployment.py

# Clean build artifacts
clean:
	docker-compose down --rmi all -v
	rm -rf backend/logs backend/uploads backend/__pycache__
	rm -rf ia/logs ia/uploads ia/models ia/__pycache__
	rm -rf frontend/node_modules frontend/dist

# Initialize database
init-db:
	docker-compose exec pharma360-db psql -U pharma_user -d pharma360_dev -f /docker-entrypoint-initdb.d/init-db.sql

# Backup database
backup-db:
	docker-compose exec pharma360-db pg_dump -U pharma_user -d pharma360_dev > backup_$$(date +%Y%m%d_%H%M%S).sql

# Run backend tests
test-backend:
	docker-compose exec pharma360-backend pytest backend/tests/ -v

# Run IA tests
test-ia:
	docker-compose exec pharma360-ia pytest ia/tests/ -v

# Run frontend tests
test-frontend:
	docker-compose exec pharma360-frontend npm test

# Build and deploy in one command
deploy: build up test
