#!/bin/bash

# ===========================================
# Script de Restauration - Pharma 360°
# ===========================================
# ID Tâche: QA-012
# Responsable: QA/DevOps
# Statut: TERMINÉ
# Description: Restauration de la base de données PostgreSQL
# ===========================================

# Configuration
SCRIPT_NAME="Pharma 360° Restore Script"
VERSION="1.0.0"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${BACKUP_DIR}/restore_log_${DATE}.log"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        echo_error "Docker n'est pas installé"
        exit 1
    fi
    
    # Vérifier PostgreSQL
    if ! docker exec pharma360-db pg_isready -U ${POSTGRES_USER:-pharma_user} -d ${POSTGRES_DB:-pharma360_dev} &>/dev/null; then
        echo_error "PostgreSQL n'est pas accessible"
        exit 1
    fi
    
    echo_success "Prérequis vérifiés"
}

# Fonction pour lister les sauvegardes disponibles
function list_available_backups() {
    echo_info "Sauvegardes disponibles:"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo_warning "Aucun répertoire de sauvegarde trouvé"
        return 1
    fi
    
    local count=0
    local backups=()
    
    while IFS= read -r -d $'\n' file; do
        if [ -n "$file" ]; then
            backups+=("$file")
            count=$((count + 1))
        fi
    done < <(find "$BACKUP_DIR" -name "pharma360_backup_*.sql" -type f | sort -r)
    
    if [ $count -eq 0 ]; then
        echo_warning "Aucune sauvegarde trouvée"
        return 1
    fi
    
    for i in "${!backups[@]}"; do
        file="${backups[$i]}"
        size=$(du -h "$file" | cut -f1)
        echo "  $((i+1)). $file ($size)"
    done
    
    return 0
}

# Fonction pour restaurer une sauvegarde
function restore_backup() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        echo_error "Aucun fichier de sauvegarde spécifié"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        echo_error "Fichier de sauvegarde introuvable: $backup_file"
        return 1
    fi
    
    echo_info "Restauration de la sauvegarde: $backup_file"
    
    # Vérifier les prérequis
    check_prerequisites
    
    # Confirmer la restauration
    read -p "Êtes-vous sûr de vouloir restaurer cette sauvegarde ? (O/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
        echo_info "Restauration annulée"
        return 0
    fi
    
    # Copier la sauvegarde vers le conteneur
    echo_info "Copie de la sauvegarde vers le conteneur..."
    docker cp "$backup_file" pharma360-db:/tmp/backup.sql
    
    if [ $? -ne 0 ]; then
        echo_error "Erreur lors de la copie de la sauvegarde"
        return 1
    fi
    
    # Restaurer la sauvegarde
    echo_info "Restauration en cours..."
    docker exec pharma360-db pg_restore \
        -U ${POSTGRES_USER:-pharma_user} \
        -d ${POSTGRES_DB:-pharma360_dev} \
        -F c \
        -c \
        /tmp/backup.sql 2>> "$LOG_FILE"
    
    if [ $? -ne 0 ]; then
        echo_error "Erreur lors de la restauration"
        echo_warning "Vérifiez le fichier de log: $LOG_FILE"
        return 1
    fi
    
    # Nettoyer le fichier temporaire
    docker exec pharma360-db rm -f /tmp/backup.sql
    
    echo_success "Restauration effectuée avec succès"
    
    # Réinitialiser les séquences PostgreSQL
    echo_info "Réinitialisation des séquences..."
    docker exec pharma360-db psql \
        -U ${POSTGRES_USER:-pharma_user} \
        -d ${POSTGRES_DB:-pharma360_dev} \
        -c "SELECT setval(pg_get_serial_sequence('\"users\"', 'id'), COALESCE(MAX(id), 1), max(id) IS NOT null) FROM \"users\";" \
        -c "SELECT setval(pg_get_serial_sequence('\"products\"', 'id'), COALESCE(MAX(id), 1), max(id) IS NOT null) FROM \"products\";" \
        -c "SELECT setval(pg_get_serial_sequence('\"batches\"', 'id'), COALESCE(MAX(id), 1), max(id) IS NOT null) FROM \"batches\";" \
        -c "SELECT setval(pg_get_serial_sequence('\"sales\"', 'id'), COALESCE(MAX(id), 1), max(id) IS NOT null) FROM \"sales\";" \
        -c "SELECT setval(pg_get_serial_sequence('\"invoices\"', 'id'), COALESCE(MAX(id), 1), max(id) IS NOT null) FROM \"invoices\";" \
        2>> "$LOG_FILE"
    
    echo_success "Séquences réinitialisées"
    return 0
}

# Fonction principale
function main() {
    echo_info "=========================================="
    echo_info "  SCRIPT DE RESTAURATION - Pharma 360°"
    echo_info "  Version: $VERSION"
    echo_info "=========================================="
    echo_info ""
    
    # Vérifier les arguments
    local action="list"
    local backup_file=""
    
    while [ $# -gt 0 ]; do
        case "$1" in
            --list|-l)
                action="list"
                ;;
            --restore|-r)
                action="restore"
                shift
                backup_file="$1"
                ;;
            --latest)
                action="restore_latest"
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --list, -l      Lister les sauvegardes disponibles"
                echo "  --restore, -r   Restaurer une sauvegarde (spécifier le fichier)"
                echo "  --latest        Restaurer la sauvegarde la plus récente"
                echo "  --help, -h      Afficher cette aide"
                echo ""
                echo "Exemples:"
                echo "  $0 --list                     # Lister les sauvegardes"
                echo "  $0 --restore backups/pharma360_backup_20250115.sql"
                echo "  $0 --latest                   # Restaurer la dernière sauvegarde"
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
        "list")
            if ! list_available_backups; then
                echo_error "Aucune sauvegarde disponible"
                exit 1
            fi
            ;;
        "restore")
            if [ -z "$backup_file" ]; then
                echo_error "Aucun fichier de sauvegarde spécifié"
                list_available_backups
                exit 1
            fi
            if ! restore_backup "$backup_file"; then
                echo_error "Échec de la restauration"
                exit 1
            fi
            ;;
        "restore_latest")
            # Trouver la sauvegarde la plus récente
            local latest_backup=$(find "$BACKUP_DIR" -name "pharma360_backup_*.sql" -type f -printf "%T@ %p\n" | sort -r | head -n 1 | cut -d' ' -f2-)
            
            if [ -z "$latest_backup" ]; then
                echo_error "Aucune sauvegarde trouvée"
                exit 1
            fi
            
            echo_info "Dernière sauvegarde: $latest_backup"
            if ! restore_backup "$latest_backup"; then
                echo_error "Échec de la restauration"
                exit 1
            fi
            ;;
    esac
    
    exit 0
}

# Exécuter le script principal
main "$@"
