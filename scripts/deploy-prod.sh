#!/bin/bash

# ===========================================
# Pharma 360 - Script de Déploiement Production
# ===========================================
# ID Tâche: QA-016
# Responsable: QA/DevOps
# Statut: EN COURS
# Description: Script pour déployer l'application en production
# ===========================================

set -e

# =============================================================================
# CONFIGURATION
# =============================================================================

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Chemins
PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)
LOG_FILE="/var/log/pharma360/deploy.log"
BACKUP_DIR="/var/backups/pharma360"

# =============================================================================
# FONCTIONS
# =============================================================================

# Logger avec couleurs
log_info() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN: $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

log_step() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] STEP: $1${NC}" | tee -a "$LOG_FILE"
}

# Vérifier les dépendances
check_dependencies() {
    log_step "Vérification des dépendances..."
    
    local missing=0
    
    # Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé. Veuillez installer Docker."
        missing=1
    fi
    
    # Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose n'est pas installé. Veuillez installer Docker Compose."
        missing=1
    fi
    
    # Git
    if ! command -v git &> /dev/null; then
        log_error "Git n'est pas installé. Veuillez installer Git."
        missing=1
    fi
    
    if [ $missing -eq 0 ]; then
        log_info "Toutes les dépendances sont installées."
    fi
}

# Créer les répertoires nécessaires
create_directories() {
    log_step "Création des répertoires..."
    
    mkdir -p "$BACKUP_DIR"
    mkdir -p "/var/log/pharma360"
    mkdir -p "$PROJECT_DIR/backups"
    mkdir -p "$PROJECT_DIR/logs"
    mkdir -p "$PROJECT_DIR/frontend/dist"
    mkdir -p "$PROJECT_DIR/backend/logs"
    mkdir -p "$PROJECT_DIR/backend/uploads"
    mkdir -p "$PROJECT_DIR/ia/logs"
    mkdir -p "$PROJECT_DIR/ia/models"
    mkdir -p "$PROJECT_DIR/ia/uploads"
    mkdir -p "$PROJECT_DIR/docker/nginx/ssl"
    
    log_info "Répertoires créés avec succès."
}

# Charger les variables d'environnement
load_env() {
    log_step "Chargement de la configuration..."
    
    if [ -f "$PROJECT_DIR/.env.production" ]; then
        log_info "Chargement de .env.production"
        set -a
        source <(sed 's/\r$//' "$PROJECT_DIR/.env.production")
        set +a
    else
        log_error ".env.production non trouvé. Veuillez créer le fichier."
    fi
}

# Construire les images Docker
build_images() {
    log_step "Construction des images Docker..."
    
    cd "$PROJECT_DIR"
    
    # Backend
    log_info "Construction de l'image Backend..."
    docker-compose --project-directory . -f docker/docker-compose.prod.yml build pharma360-backend || \
        log_error "Échec de la construction de l'image Backend"
    
    # Frontend
    log_info "Construction de l'image Frontend..."
    docker-compose --project-directory . -f docker/docker-compose.prod.yml build pharma360-frontend || \
        log_error "Échec de la construction de l'image Frontend"
    
    # IA
    log_info "Construction de l'image IA..."
    docker-compose --project-directory . -f docker/docker-compose.prod.yml build pharma360-ia || \
        log_error "Échec de la construction de l'image IA"
    
    log_info "Toutes les images Docker construites avec succès."
}

# Démarrer les conteneurs
start_containers() {
    log_step "Démarrage des conteneurs..."
    
    cd "$PROJECT_DIR"
    
    # Arrêter les conteneurs existants
    log_info "Arrêt des conteneurs existants..."
    docker-compose --project-directory . -f docker/docker-compose.prod.yml down || true
    
    # Démarrer les conteneurs
    log_info "Démarrage des conteneurs..."
    docker-compose --project-directory . -f docker/docker-compose.prod.yml up -d || \
        log_error "Échec du démarrage des conteneurs"
    
    log_info "Conteneurs démarrés avec succès."
}

# Vérifier la santé des services
check_health() {
    log_step "Vérification de la santé des services..."
    
    local max_retries=30
    local retry=0
    local all_healthy=false
    
    while [ $retry -lt $max_retries ] && [ "$all_healthy" = false ]; do
        retry=$((retry + 1))
        sleep 5
        
        # Vérifier la base de données
        if docker exec pharma360-db-prod pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &> /dev/null; then
            log_info "Base de données: HEALTHY"
        else
            log_warn "Base de données: Unhealthy (attempt $retry/$max_retries)"
            continue
        fi
        
        # Vérifier le backend
        if docker exec pharma360-backend-prod python -c "import httpx; httpx.get('http://localhost:8000/api/health', timeout=5).raise_for_status()" &> /dev/null; then
            log_info "Backend: HEALTHY"
        else
            log_warn "Backend: Unhealthy (attempt $retry/$max_retries)"
            continue
        fi
        
        # Vérifier le frontend
        if docker exec pharma360-frontend-prod wget --no-verbose --tries=1 --spider http://localhost/ &> /dev/null; then
            log_info "Frontend: HEALTHY"
        else
            log_warn "Frontend: Unhealthy (attempt $retry/$max_retries)"
            continue
        fi
        
        # Vérifier IA
        if docker exec pharma360-ia-prod python -c "import httpx; httpx.get('http://localhost:8001/api/health', timeout=5).raise_for_status()" &> /dev/null; then
            log_info "IA: HEALTHY"
        else
            log_warn "IA: Unhealthy (attempt $retry/$max_retries)"
            continue
        fi
        
        # Vérifier Nginx
        if docker exec pharma360-nginx-prod wget --no-verbose --tries=1 --spider http://localhost/ &> /dev/null; then
            log_info "Nginx: HEALTHY"
        else
            log_warn "Nginx: Unhealthy (attempt $retry/$max_retries)"
            continue
        fi
        
        all_healthy=true
    done
    
    if [ "$all_healthy" = false ]; then
        log_error "Échec de la vérification de santé après $max_retries tentatives"
    fi
    
    log_info "Tous les services sont en santé."
}

# Initialiser la base de données
init_database() {
    log_step "Initialisation de la base de données..."
    
    cd "$PROJECT_DIR"
    
    # Attendre que la base soit prête
    log_info "Attente de la disponibilité de la base de données..."
    local max_retries=30
    local retry=0
    
    while [ $retry -lt $max_retries ]; do
        retry=$((retry + 1))
        if docker exec pharma360-db-prod pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &> /dev/null; then
            break
        fi
        sleep 2
    done
    
    if [ $retry -eq $max_retries ]; then
        log_error "La base de données n'est pas prête après $max_retries tentatives"
    fi
    
    # Exécuter les migrations
    log_info "Exécution des migrations..."
    docker exec pharma360-backend-prod alembic upgrade head || \
        log_error "Échec des migrations"
    
    log_info "Base de données initialisée avec succès."
}

# Configurer les sauvegardes automatiques
setup_backups() {
    log_step "Configuration des sauvegardes automatiques..."
    
    # Copier le script de sauvegarde
    cp "$PROJECT_DIR/scripts/backup-db.sh" /usr/local/bin/pharma360-backup
    chmod +x /usr/local/bin/pharma360-backup
    
    # Configurer cron pour les sauvegardes quotidiennes
    if ! crontab -l | grep -q "pharma360-backup"; then
        (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/pharma360-backup") | crontab -
        log_info "Sauvegardes automatiques configurées (tous les jours à 2h)."
    else
        log_info "Sauvegardes automatiques déjà configurées."
    fi
}

# Vérifications finales
final_checks() {
    log_step "Vérifications finales..."
    
    # Vérifier les ports
    log_info "Vérification des ports..."
    if docker ps | grep -q "0.0.0.0:80->80/tcp"; then
        log_info "Port 80 (Nginx): OK"
    else
        log_warn "Port 80 (Nginx): Non trouvé"
    fi
    
    if docker ps | grep -q "0.0.0.0:8000->8000/tcp"; then
        log_info "Port 8000 (Backend): OK"
    else
        log_warn "Port 8000 (Backend): Non trouvé"
    fi
    
    if docker ps | grep -q "0.0.0.0:8001->8001/tcp"; then
        log_info "Port 8001 (IA): OK"
    else
        log_warn "Port 8001 (IA): Non trouvé"
    fi
    
    # Tester l'API
    log_info "Test de l'API..."
    local api_response=$(curl -s http://localhost/api/health || echo "")
    if echo "$api_response" | grep -q "healthy"; then
        log_info "API Health Check: OK"
    else
        log_warn "API Health Check: Échec"
    fi
    
    # Tester le frontend
    log_info "Test du Frontend..."
    local frontend_response=$(curl -s http://localhost/ || echo "")
    if echo "$frontend_response" | grep -q "Pharma"; then
        log_info "Frontend: OK"
    else
        log_warn "Frontend: Échec ou contenu inattendu"
    fi
}

# Afficher le résumé
show_summary() {
    log_step "Résumé du déploiement"
    echo ""
    echo "============================================================================"
    echo "                    PHARMA 360 - DÉPLOIEMENT PRODUCTION"
    echo "============================================================================"
    echo ""
    echo "  Statut: ${GREEN}TERMINÉ${NC}"
    echo ""
    echo "  Services déployés:"
    echo "    - Base de données PostgreSQL: pharma360-db-prod"
    echo "    - Backend FastAPI: pharma360-backend-prod (port 8000)"
    echo "    - Frontend React: pharma360-frontend-prod (port 3000)"
    echo "    - IA Service: pharma360-ia-prod (port 8001)"
    echo "    - Nginx Proxy: pharma360-nginx-prod (port 80)"
    echo ""
    echo "  URLs d'accès:"
    echo "    - Application: http://localhost"
    echo "    - API Backend: http://localhost/api"
    echo "    - IA Service: http://localhost/ia"
    echo "    - Health Check: http://localhost/api/health"
    echo ""
    echo "  Sauvegardes:"
    echo "    - Répertoire: $BACKUP_DIR"
    echo "    - Fréquence: Tous les jours à 2h"
    echo "    - Rétention: 30 jours"
    echo ""
    echo "  Logs:"
    echo "    - Déploiement: $LOG_FILE"
    echo "    - Application: /var/log/pharma360/"
    echo ""
    echo "============================================================================"
}

# =============================================================================
# EXÉCUTION PRINCIPALE
# =============================================================================

main() {
    # Créer le fichier de log
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    echo ""
    echo "============================================================================"
    echo "              PHARMA 360 - DÉPLOIEMENT PRODUCTION"
    echo "              ID Tâche: QA-016"
    echo "============================================================================"
    echo ""
    
    # Exécuter les étapes
    check_dependencies
    create_directories
    load_env
    build_images
    start_containers
    check_health
    init_database
    setup_backups
    final_checks
    show_summary
    
    log_info "Déploiement terminé avec succès!"
}

# Exécuter le script
main "$@"
