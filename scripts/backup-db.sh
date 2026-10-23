#!/bin/bash

# ===========================================
# Script de Sauvegarde - Pharma 360°
# ===========================================
# ID Tâche: QA-012
# Responsable: QA/DevOps
# Statut: TERMINÉ
# Description: Sauvegarde automatique de la base de données PostgreSQL
# ===========================================

# Configuration
SCRIPT_NAME="Pharma 360° Backup Script"
VERSION="1.0.0"
BACKUP_DIR="./backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="pharma360_backup_${DATE}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
LOG_FILE="${BACKUP_DIR}/backup_log_${DATE}.log"

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

# Fonction pour créer le répertoire de sauvegarde
function create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        echo_success "Répertoire de sauvegarde créé: $BACKUP_DIR"
    fi
}

# Fonction pour effectuer la sauvegarde
function perform_backup() {
    echo_info "Début de la sauvegarde de la base de données..."
    
    # Créer le répertoire
    create_backup_dir
    
    # Vérifier si PostgreSQL est accessible
    if ! docker exec pharma360-db pg_isready -U ${POSTGRES_USER:-pharma_user} -d ${POSTGRES_DB:-pharma360_dev} &>/dev/null; then
        echo_error "PostgreSQL n'est pas accessible"
        return 1
    fi
    
    # Effectuer la sauvegarde
    echo_info "Sauvegarde en cours..."
    docker exec pharma360-db pg_dump \
        -U ${POSTGRES_USER:-pharma_user} \
        -d ${POSTGRES_DB:-pharma360_dev} \
        -F c \
        -f /tmp/${BACKUP_FILE} 2>> "$LOG_FILE"
    
    if [ $? -ne 0 ]; then
        echo_error "Erreur lors de la sauvegarde"
        return 1
    fi
    
    # Copier la sauvegarde depuis le conteneur vers l'hôte
    docker cp pharma360-db:/tmp/${BACKUP_FILE} "$BACKUP_PATH"
    
    # Nettoyer le fichier temporaire dans le conteneur
    docker exec pharma360-db rm -f /tmp/${BACKUP_FILE}
    
    # Vérifier que la sauvegarde existe
    if [ ! -f "$BACKUP_PATH" ]; then
        echo_error "Fichier de sauvegarde introuvable"
        return 1
    fi
    
    # Calculer la taille de la sauvegarde
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    echo_success "Sauvegarde effectuée avec succès: $BACKUP_PATH ($BACKUP_SIZE)"
    
    return 0
}

# Fonction pour nettoyer les anciennes sauvegardes
function cleanup_old_backups() {
    echo_info "Nettoyage des anciennes sauvegardes..."
    
    # Trouver et supprimer les sauvegardes plus anciennes que RETENTION_DAYS
    find "$BACKUP_DIR" -name "pharma360_backup_*.sql" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null
    
    # Compter le nombre de sauvegardes restantes
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "pharma360_backup_*.sql" -type f | wc -l)
    
    echo_success "Nettoyage terminé. $BACKUP_COUNT sauvegardes conservées"
}

# Fonction pour lister les sauvegardes
function list_backups() {
    echo_info "Liste des sauvegardes disponibles:"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo_warning "Aucun répertoire de sauvegarde trouvé"
        return 1
    fi
    
    # Lister les sauvegardes par ordre chronologique inverse
    find "$BACKUP_DIR" -name "pharma360_backup_*.sql" -type f -printf "%T@ %p\n" | \
        sort -r | \
        while read -r timestamp file; do
            size=$(du -h "$file" | cut -f1)
            date_str=$(date -d "@$timestamp" +"%Y-%m-%d %H:%M:%S")
            echo "  $date_str - $file ($size)"
        done
    
    if [ $? -ne 0 ]; then
        echo_warning "Aucune sauvegarde trouvée"
        return 1
    fi
    
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
    
    # Vérifier si PostgreSQL est accessible
    if ! docker exec pharma360-db pg_isready -U ${POSTGRES_USER:-pharma_user} -d ${POSTGRES_DB:-pharma360_dev} &>/dev/null; then
        echo_error "PostgreSQL n'est pas accessible"
        return 1
    fi
    
    # Copier la sauvegarde vers le conteneur
    docker cp "$backup_file" pharma360-db:/tmp/backup.sql
    
    # Restaurer la sauvegarde
    echo_info "Restauration en cours..."
    docker exec pharma360-db pg_restore \
        -U ${POSTGRES_USER:-pharma_user} \
        -d ${POSTGRES_DB:-pharma360_dev} \
        -F c \
        -c \
        /tmp/backup.sql 2>/dev/null
    
    if [ $? -ne 0 ]; then
        echo_error "Erreur lors de la restauration"
        return 1
    fi
    
    # Nettoyer le fichier temporaire
    docker exec pharma360-db rm -f /tmp/backup.sql
    
    echo_success "Restauration effectuée avec succès"
    return 0
}

# Fonction principale
function main() {
    echo_info "=========================================="
    echo_info "  SCRIPT DE SAUVEGARDE - Pharma 360°"
    echo_info "  Version: $VERSION"
    echo_info "=========================================="
    echo_info ""
    
    # Vérifier les arguments
    local action="backup"
    local backup_file=""
    
    while [ $# -gt 0 ]; do
        case "$1" in
            --backup|-b)
                action="backup"
                ;;
            --list|-l)
                action="list"
                ;;
            --restore|-r)
                action="restore"
                shift
                backup_file="$1"
                ;;
            --clean|-c)
                action="clean"
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --backup, -b    Effectuer une sauvegarde"
                echo "  --list, -l      Lister les sauvegardes"
                echo "  --restore, -r   Restaurer une sauvegarde (spécifier le fichier)"
                echo "  --clean, -c     Nettoyer les anciennes sauvegardes"
                echo "  --help, -h      Afficher cette aide"
                echo ""
                echo "Exemples:"
                echo "  $0 --backup          # Effectuer une sauvegarde"
                echo "  $0 --list            # Lister les sauvegardes"
                echo "  $0 --restore backups/pharma360_backup_20250115.sql"
                echo "  $0 --clean           # Nettoyer les anciennes sauvegardes"
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
        "backup")
            if ! perform_backup; then
                echo_error "Échec de la sauvegarde"
                exit 1
            fi
            cleanup_old_backups
            ;;
        "list")
            if ! list_backups; then
                echo_error "Aucune sauvegarde disponible"
                exit 1
            fi
            ;;
        "restore")
            if [ -z "$backup_file" ]; then
                echo_error "Aucun fichier de sauvegarde spécifié"
                exit 1
            fi
            if ! restore_backup "$backup_file"; then
                echo_error "Échec de la restauration"
                exit 1
            fi
            ;;
        "clean")
            cleanup_old_backups
            ;;
    esac
    
    exit 0
}

# Exécuter le script principal
main "$@"
