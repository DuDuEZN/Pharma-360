#!/bin/bash

# =============================================================================
# PHARMACIE 360 - Script de Restauration de la Base de Données
# =============================================================================
# ID Tâche: QA-012
# Responsable: QA/DevOps
# Durée: 2 jours
# Statut: EN COURS
# Description: Script pour restaurer la base de données à partir d'une sauvegarde
# =============================================================================

# Ce script permet de restaurer la base de données PostgreSQL à partir d'une
# sauvegarde créée par backup-db.sh

# =============================================================================
# CONFIGURATION
# =============================================================================

# Chemins
BACKUP_DIR="/var/backups/pharma360"
LOG_FILE="/var/log/pharma360/restore.log"

# Configuration PostgreSQL (peut être écrasée par les variables d'environnement)
DB_HOST=${POSTGRES_HOST:="localhost"}
DB_PORT=${POSTGRES_PORT:="5432"}
DB_NAME=${POSTGRES_DB:="pharma360_dev"}
DB_USER=${POSTGRES_USER:="pharma_user"}
DB_PASSWORD=${POSTGRES_PASSWORD:="pharma_pass_2025"}

# =============================================================================
# FONCTIONS
# =============================================================================

# Logger
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Vérifier les dépendances
check_dependencies() {
    log "Vérification des dépendances..."
    
    if ! command -v psql &> /dev/null; then
        log "ERREUR: psql n'est pas installé"
        exit 1
    fi
    
    if ! command -v pg_restore &> /dev/null; then
        log "AVERTISSEMENT: pg_restore n'est pas disponible, restauration via psql"
    fi
    
    if ! command -v gzip &> /dev/null; then
        log "AVERTISSEMENT: gzip n'est pas disponible"
    fi
    
    log "Dépendances vérifiées"
}

# Lister les sauvegardes disponibles
list_backups() {
    log "Liste des sauvegardes disponibles dans $BACKUP_DIR:"
    
    local backups=($BACKUP_DIR/${DB_NAME}_*.sql* 2>/dev/null)
    
    if [ ${#backups[@]} -eq 0 ]; then
        log "Aucune sauvegarde trouvée"
        return 1
    fi
    
    # Trier par date (les plus récentes en premier)
    for backup in $(ls -t "$BACKUP_DIR"/${DB_NAME}_*.sql* 2>/dev/null); do
        local file_size=$(stat -c%s "$backup" 2>/dev/null || stat -f%z "$backup" 2>/dev/null)
        local file_date=$(stat -c%y "$backup" 2>/dev/null | cut -d' ' -f1)
        echo "  $backup (${file_size} octets, $file_date)"
    done
    
    return 0
}

# Tester la connexion à la base de données
test_connection() {
    log "Test de la connexion à la base de données..."
    
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "SELECT 1" &> /dev/null; then
        log "ERREUR: Impossible de se connecter à PostgreSQL"
        exit 1
    fi
    
    log "Connexion à PostgreSQL réussie"
}

# Vérifier que la base de données existe
check_database_exists() {
    log "Vérification de l'existence de la base de données $DB_NAME..."
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q "1 row"; then
        log "La base de données $DB_NAME existe"
        return 0
    else
        log "La base de données $DB_NAME n'existe pas"
        return 1
    fi
}

# Créer la base de données si elle n'existe pas
create_database() {
    log "Création de la base de données $DB_NAME..."
    
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "CREATE DATABASE \"$DB_NAME\""; then
        log "ERREUR: Impossible de créer la base de données"
        exit 1
    fi
    
    log "Base de données créée avec succès"
}

# Supprimer la base de données existante (optionnel)
drop_database() {
    if [ "$DROP_EXISTING" != "true" ]; then
        return
    fi
    
    log "Suppression de la base de données existante $DB_NAME..."
    
    # Déconnecter tous les utilisateurs
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c \
        "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$DB_NAME' AND pid <> pg_backend_pid()" &> /dev/null
    
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "DROP DATABASE IF EXISTS \"$DB_NAME\""; then
        log "ERREUR: Impossible de supprimer la base de données"
        exit 1
    fi
    
    log "Base de données supprimée avec succès"
}

# Restaurer la sauvegarde
restore_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log "ERREUR: Fichier de sauvegarde non trouvé: $backup_file"
        exit 1
    fi
    
    log "Début de la restauration depuis $backup_file..."
    
    # Décompresser si nécessaire
    local temp_file=""
    if [[ "$backup_file" == *.gz ]]; then
        log "Décompression de la sauvegarde..."
        temp_file="/tmp/${DB_NAME}_restore_$(date +%s).sql"
        gunzip -c "$backup_file" > "$temp_file"
        backup_file="$temp_file"
    fi
    
    # Effectuer la restauration
    log "Restauration de la base de données..."
    
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$backup_file" &> /dev/null; then
        log "ERREUR: Échec de la restauration"
        
        # Nettoyer le fichier temporaire
        if [ -n "$temp_file" ] && [ -f "$temp_file" ]; then
            rm -f "$temp_file"
        fi
        
        exit 1
    fi
    
    # Nettoyer le fichier temporaire
    if [ -n "$temp_file" ] && [ -f "$temp_file" ]; then
        rm -f "$temp_file"
    fi
    
    log "Restauration terminée avec succès"
}

# Vérifier la restauration
verify_restore() {
    log "Vérification de la restauration..."
    
    # Vérifier que la base de données existe
    if ! check_database_exists; then
        log "ERREUR: La base de données n'existe pas après la restauration"
        exit 1
    fi
    
    # Vérifier que des tables existent
    local table_count
    table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" | grep -v "count" | tr -d ' ')
    
    if [ "$table_count" -eq 0 ]; then
        log "AVERTISSEMENT: Aucune table trouvée dans la base de données restaurée"
    else
        log "Base de données restaurée avec $table_count tables"
    fi
    
    return 0
}

# =============================================================================
# EXÉCUTION PRINCIPALE
# =============================================================================

main() {
    local backup_file=""
    local list_only=false
    
    # Analyser les arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            -l|--list)
                list_only=true
                shift
                ;;
            -f|--file)
                backup_file="$2"
                shift 2
                ;;
            --drop)
                DROP_EXISTING="true"
                shift
                ;;
            *)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  -l, --list       Lister les sauvegardes disponibles"
                echo "  -f, --file FILE  Spécifier le fichier de sauvegarde"
                echo "  --drop           Supprimer la base de données existante avant la restauration"
                exit 1
                ;;
        esac
    done
    
    log "=========================================="
    log "Début de la restauration de la base de données"
    log "=========================================="
    
    # Vérifier les dépendances
    check_dependencies
    
    # Lister les sauvegardes si demandé
    if [ "$list_only" = true ]; then
        list_backups
        exit 0
    fi
    
    # Tester la connexion
    test_connection
    
    # Si aucun fichier spécifié, utiliser le plus récent
    if [ -z "$backup_file" ]; then
        log "Aucun fichier spécifié, recherche du plus récent..."
        local backups=($(ls -t "$BACKUP_DIR"/${DB_NAME}_*.sql* 2>/dev/null | head -1))
        
        if [ -z "$backups" ]; then
            log "ERREUR: Aucune sauvegarde trouvée"
            exit 1
        fi
        
        backup_file="$backups"
        log "Utilisation de la sauvegarde la plus récente: $backup_file"
    fi
    
    # Vérifier que le fichier existe
    if [ ! -f "$backup_file" ]; then
        log "ERREUR: Fichier de sauvegarde non trouvé: $backup_file"
        exit 1
    fi
    
    # Supprimer la base de données existante si demandé
    if check_database_exists; then
        drop_database
    fi
    
    # Créer la base de données
    create_database
    
    # Restaurer la sauvegarde
    restore_backup "$backup_file"
    
    # Vérifier la restauration
    verify_restore
    
    log "=========================================="
    log "Restauration terminée avec succès"
    log "=========================================="
}

# Exécuter le script principal
main "$@"

exit 0
