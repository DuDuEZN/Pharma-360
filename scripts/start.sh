#!/bin/bash

# ===========================================
# Script de Démarrage - Pharma 360°
# ===========================================
# ID Tâche: TEST-001
# Responsable: QA/DevOps
# Durée: 1 jour
# Statut: TERMINÉ
# Description: Script pour démarrer l'ensemble des services
# ===========================================

# Configuration
SCRIPT_NAME="Pharma 360° Start Script"
VERSION="1.0.0"
AUTHOR="QA/DevOps Team"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
function echo_color() {
    local color=$1
    local message=$2
    echo -e "${color}[${SCRIPT_NAME}] ${message}${NC}"
}

function echo_success() {
    echo_color "${GREEN}" "$1"
}

function echo_error() {
    echo_color "${RED}" "$1"
}

function echo_warning() {
    echo_color "${YELLOW}" "$1"
}

function echo_info() {
    echo_color "${BLUE}" "$1"
}

# Fonction pour vérifier les prérequis
function check_prerequisites() {
    echo_info "Vérification des prérequis..."
    
    local all_ok=true
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        echo_error "Docker n'est pas installé"
        all_ok=false
    else
        echo_success "Docker: $(docker --version)"
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo_error "Docker Compose n'est pas installé"
        all_ok=false
    else
        echo_success "Docker Compose: $(docker-compose --version)"
    fi
    
    # Vérifier Git
    if ! command -v git &> /dev/null; then
        echo_error "Git n'est pas installé"
        all_ok=false
    else
        echo_success "Git: $(git --version)"
    fi
    
    # Vérifier le fichier .env
    if [ ! -f ".env" ]; then
        echo_warning "Fichier .env introuvable, création à partir de .env.example"
        cp .env.example .env
        echo_success "Fichier .env créé"
    else
        echo_success "Fichier .env trouvé"
    fi
    
    # Vérifier le fichier docker-compose.yml
    if [ ! -f "docker/docker-compose.yml" ]; then
        echo_error "Fichier docker-compose.yml introuvable"
        all_ok=false
    else
        echo_success "Fichier docker-compose.yml trouvé"
    fi
    
    if [ "$all_ok" = false ]; then
        echo_error "Certains prérequis ne sont pas satisfaits. Installation impossible."
        exit 1
    fi
    
    echo_success "Tous les prérequis sont satisfaits"
}

# Fonction pour nettoyer l'environnement
function cleanup() {
    echo_info "Nettoyage de l'environnement..."
    
    # Arrêter et supprimer les conteneurs
    docker-compose --project-directory . -f docker/docker-compose.yml down 2>/dev/null
    
    # Supprimer les images inutilisées (optionnel)
    docker system prune -f
    
    echo_success "Environnement nettoyé"
}

# Fonction pour construire les images
function build_images() {
    echo_info "Construction des images Docker..."
    
    cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
    
    # Construire toutes les images
    docker-compose --project-directory . -f docker/docker-compose.yml build --no-cache
    
    if [ $? -ne 0 ]; then
        echo_error "Erreur lors de la construction des images"
        exit 1
    fi
    
    echo_success "Images Docker construites avec succès"
}

# Fonction pour démarrer les services
function start_services() {
    echo_info "Démarrage des services..."
    
    # Démarrer en mode détaché
    docker-compose --project-directory . -f docker/docker-compose.yml up -d
    
    if [ $? -ne 0 ]; then
        echo_error "Erreur lors du démarrage des services"
        exit 1
    fi
    
    echo_success "Services démarrés en arrière-plan"
}

# Fonction pour vérifier l'état des services
function check_services() {
    echo_info "Vérification de l'état des services..."
    
    # Attendre que les services soient prêts
    local max_attempts=30
    local attempt=1
    local all_ready=false
    
    while [ $attempt -le $max_attempts ] && [ "$all_ready" = false ]; do
        echo_info "Tentative $attempt/$max_attempts..."
        
        # Vérifier PostgreSQL
        if docker exec pharma360-db pg_isready -U ${POSTGRES_USER:-pharma_user} -d ${POSTGRES_DB:-pharma360_dev} &>/dev/null; then
            echo_success "PostgreSQL: ✓ Prêt"
        else
            echo_warning "PostgreSQL: ⏳ En cours..."
        fi
        
        # Vérifier Backend
        if docker exec pharma360-backend python -c "import httpx; httpx.get('http://localhost:8000/api/health').raise_for_status()" &>/dev/null; then
            echo_success "Backend: ✓ Prêt"
        else
            echo_warning "Backend: ⏳ En cours..."
        fi
        
        # Vérifier Frontend
        if wget --no-verbose --tries=1 --spider http://localhost:3000 &>/dev/null; then
            echo_success "Frontend: ✓ Prêt"
        else
            echo_warning "Frontend: ⏳ En cours..."
        fi
        
        # Vérifier IA
        if docker exec pharma360-ia python -c "import httpx; httpx.get('http://localhost:8001/api/health').raise_for_status()" &>/dev/null; then
            echo_success "IA: ✓ Prêt"
        else
            echo_warning "IA: ⏳ En cours..."
        fi
        
        # Vérifier Nginx
        if wget --no-verbose --tries=1 --spider http://localhost &>/dev/null; then
            echo_success "Nginx: ✓ Prêt"
            all_ready=true
        else
            echo_warning "Nginx: ⏳ En cours..."
        fi
        
        sleep 5
        attempt=$((attempt + 1))
    done
    
    if [ "$all_ready" = false ]; then
        echo_error "Les services ne sont pas tous prêts après $max_attempts tentatives"
        echo_warning "Vérifiez les logs avec: docker-compose --project-directory . -f docker/docker-compose.yml logs -f"
        return 1
    fi
    
    echo_success "Tous les services sont prêts"
    return 0
}

# Fonction pour afficher les informations de connexion
function display_connection_info() {
    echo_info ""
    echo_info "=========================================="
    echo_info "  INFORMATIONS DE CONNEXION - Pharma 360°"
    echo_info "=========================================="
    echo_info ""
    echo_success "Application: http://localhost"
    echo_success "Backend API: http://localhost/api"
    echo_success "Backend Docs: http://localhost/api/docs"
    echo_success "Frontend Dev: http://localhost:3000"
    echo_success "Backend Dev: http://localhost:8000"
    echo_success "IA Service: http://localhost:8001"
    echo_info ""
    echo_info "Base de données PostgreSQL:"
    echo_success "  Host: localhost"
    echo_success "  Port: 5432"
    echo_success "  Database: pharma360_dev"
    echo_success "  User: pharma_user"
    echo_success "  Password: (voir .env)"
    echo_info ""
    echo_info "Commandes utiles:"
    echo_success "  docker-compose --project-directory . -f docker/docker-compose.yml ps"
    echo_success "  docker-compose --project-directory . -f docker/docker-compose.yml logs -f"
    echo_success "  docker exec -it pharma360-db psql -U pharma_user -d pharma360_dev"
    echo_info ""
}

# Fonction pour initialiser la base de données
function init_database() {
    echo_info "Initialisation de la base de données..."
    
    # Attendre que PostgreSQL soit prêt
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec pharma360-db pg_isready -U ${POSTGRES_USER:-pharma_user} -d ${POSTGRES_DB:-pharma360_dev} &>/dev/null; then
            echo_success "PostgreSQL est prêt"
            break
        fi
        sleep 3
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo_error "PostgreSQL n'est pas prêt après $max_attempts tentatives"
        return 1
    fi
    
    # Exécuter le script d'initialisation
    docker exec -i pharma360-db psql -U ${POSTGRES_USER:-pharma_user} -d ${POSTGRES_DB:-pharma360_dev} < scripts/init-db.sql
    
    if [ $? -ne 0 ]; then
        echo_error "Erreur lors de l'initialisation de la base de données"
        return 1
    fi
    
    echo_success "Base de données initialisée avec succès"
    return 0
}

# Fonction pour tester les endpoints
function test_endpoints() {
    echo_info "Test des endpoints..."
    
    local all_ok=true
    
    # Tester le health check du backend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health | grep -q "200"; then
        echo_success "Backend Health Check: ✓ OK"
    else
        echo_error "Backend Health Check: ✗ ÉCHOUÉ"
        all_ok=false
    fi
    
    # Tester le frontend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        echo_success "Frontend: ✓ OK"
    else
        echo_error "Frontend: ✗ ÉCHOUÉ"
        all_ok=false
    fi
    
    # Tester le proxy Nginx
    if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
        echo_success "Nginx Proxy: ✓ OK"
    else
        echo_error "Nginx Proxy: ✗ ÉCHOUÉ"
        all_ok=false
    fi
    
    if [ "$all_ok" = false ]; then
        echo_warning "Certains tests ont échoué"
        return 1
    fi
    
    echo_success "Tous les endpoints sont fonctionnels"
    return 0
}

# Fonction principale
function main() {
    echo_info "=========================================="
    echo_info "  SCRIPT DE DÉMARRAGE - Pharma 360°"
    echo_info "  Version: $VERSION"
    echo_info "  Auteur: $AUTHOR"
    echo_info "=========================================="
    echo_info ""
    
    # Vérifier les arguments
    local action="start"
    local force_build=false
    
    while [ $# -gt 0 ]; do
        case "$1" in
            --clean|-c)
                action="clean"
                ;;
            --build|-b)
                force_build=true
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --clean, -c    Nettoyer l'environnement avant démarrage"
                echo "  --build, -b    Forcer la reconstruction des images"
                echo "  --help, -h     Afficher cette aide"
                echo ""
                exit 0
                ;;
            *)
                echo_error "Option inconnue: $1"
                exit 1
                ;;
        esac
        shift
    done
    
    # Exécuter les actions
    case "$action" in
        "clean")
            cleanup
            echo_success "Nettoyage terminé"
            exit 0
            ;;
        "start")
            # Vérifier les prérequis
            check_prerequisites
            
            # Nettoyer si demandé
            if [ "$force_build" = true ]; then
                cleanup
            fi
            
            # Construire les images
            build_images
            
            # Démarrer les services
            start_services
            
            # Initialiser la base de données
            init_database
            
            # Vérifier que les services sont prêts
            if ! check_services; then
                echo_error "Certains services n'ont pas pu démarrer correctement"
                exit 1
            fi
            
            # Tester les endpoints
            if ! test_endpoints; then
                echo_error "Certains endpoints ne sont pas accessibles"
                exit 1
            fi
            
            # Afficher les informations de connexion
            display_connection_info
            
            echo_success "Pharma 360° est démarré avec succès !"
            exit 0
            ;;
    esac
}

# Exécuter le script principal
main "$@"
