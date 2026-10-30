#!/bin/sh

# =============================================================================
# PHARMACIE 360 - Script de Sauvegarde Automatique de la Base de Données
# =============================================================================
# ID Tâche: QA-012
# Responsable: QA/DevOps
# Durée: 2 jours
# Statut: EN COURS
# Description: Système de sauvegardes automatiques quotidiennes de PostgreSQL
# =============================================================================

# Ce script effectue des sauvegardes automatiques de la base de données PostgreSQL
# Il peut être exécuté manuellement ou via une tâche cron

# =============================================================================
# CONFIGURATION
# =============================================================================

# Chemins
BACKUP_DIR="/var/backups/pharma360"
LOG_FILE="/var/log/pharma360/backup.log"
DATE=$(date +%Y%m%d_%H%M%S)

# Configuration PostgreSQL (peut être écrasée par les variables d'environnement)
DB_HOST=${POSTGRES_HOST:="localhost"}
DB_PORT=${POSTGRES_PORT:="5432"}
DB_NAME=${POSTGRES_DB:="pharma360_dev"}
DB_USER=${POSTGRES_USER:="pharma_user"}
DB_PASSWORD=${POSTGRES_PASSWORD:="pharma_pass_2025"}

# Nombre de sauvegardes à conserver
MAX_BACKUPS=${MAX_BACKUPS:="30"}

# Compression
COMPRESS=${COMPRESS:="true"}

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
    
    if ! command -v pg_dump &> /dev/null; then
        log "ERREUR: pg_dump n'est pas installé"
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        log "ERREUR: psql n'est pas installé"
        exit 1
    fi
    
    if [ "$COMPRESS" = "true" ] && ! command -v gzip &> /dev/null; then
        log "ERREUR: gzip n'est pas installé"
        exit 1
    fi
    
    log "Toutes les dépendances sont satisfaites"
}

# Créer les répertoires
create_directories() {
    log "Création des répertoires..."
    
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log "ERREUR: Impossible de créer le répertoire de sauvegarde"
        exit 1
    fi
    
    log "Répertoires créés avec succès"
}

# Tester la connexion à la base de données
test_connection() {
    log "Test de la connexion à la base de données..."
    
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &> /dev/null; then
        log "ERREUR: Impossible de se connecter à la base de données"
        exit 1
    fi
    
    log "Connexion à la base de données réussie"
}

# Effectuer la sauvegarde
perform_backup() {
    local backup_file="$BACKUP_DIR/${DB_NAME}_$DATE.sql"
    local final_file="$backup_file"
    
    log "Début de la sauvegarde de $DB_NAME..."
    
    # Effectuer le dump
    if ! PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$backup_file"; then
        log "ERREUR: Échec du dump de la base de données"
        rm -f "$backup_file"
        exit 1
    fi
    
    # Compresser si nécessaire
    if [ "$COMPRESS" = "true" ]; then
        log "Compression de la sauvegarde..."
        gzip "$backup_file"
        final_file="$backup_file.gz"
    fi
    
    # Vérifier que la sauvegarde existe
    if [ ! -f "$final_file" ]; then
        log "ERREUR: Fichier de sauvegarde non trouvé"
        exit 1
    fi
    
    local file_size=$(stat -c%s "$final_file" 2>/dev/null || stat -f%z "$final_file" 2>/dev/null)
    log "Sauvegarde terminée avec succès: $final_file (taille: $file_size octets)"
    
    echo "$final_file"
}

# Nettoyer les anciennes sauvegardes
cleanup_old_backups() {
    log "Nettoyage des anciennes sauvegardes..."
    
    # Lister toutes les sauvegardes
    local backups=($BACKUP_DIR/${DB_NAME}_*.sql* 2>/dev/null)
    
    if [ ${#backups[@]} -le $MAX_BACKUPS ]; then
        log "Aucune ancienne sauvegarde à supprimer (${#backups[@]} <= $MAX_BACKUPS)"
        return
    fi
    
    # Trier par date (les plus anciennes en premier)
    # et supprimer les sauvegardes en trop
    local count=0
    for backup in $(ls -t "$BACKUP_DIR"/${DB_NAME}_*.sql* 2>/dev/null | tail -n +$((MAX_BACKUPS + 1))); do
        if [ -f "$backup" ]; then
            log "Suppression de l'ancienne sauvegarde: $backup"
            rm -f "$backup"
            ((count++))
        fi
    done
    
    log "Suppression de $count anciennes sauvegardes"
}

# Vérifier l'intégrité de la sauvegarde
verify_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log "ERREUR: Fichier de sauvegarde non trouvé pour vérification"
        return 1
    fi
    
    log "Vérification de l'intégrité de la sauvegarde: $backup_file"
    
    # Vérifier la taille du fichier
    local file_size=$(stat -c%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file" 2>/dev/null)
    if [ "$file_size" -lt 100 ]; then
        log "ERREUR: Fichier de sauvegarde trop petit (${file_size} octets)"
        return 1
    fi
    
    # Pour les fichiers compressés, vérifier qu'ils peuvent être décompressés
    if [[ "$backup_file" == *.gz ]]; then
        if ! gzip -t "$backup_file" &> /dev/null; then
            log "ERREUR: Fichier de sauvegarde compressé corrompu"
            return 1
        fi
        log "Fichier de sauvegarde compressé valide"
    else
        # Vérifier que c'est un fichier SQL valide
        if ! head -1 "$backup_file" | grep -q "POSTGRESQL\|pg_dump\|--"; then
            log "AVERTISSEMENT: Fichier de sauvegarde peut ne pas être un SQL valide"
        fi
        log "Fichier de sauvegarde SQL valide"
    fi
    
    return 0
}

# Envoyer une notification (optionnel)
send_notification() {
    local backup_file="$1"
    local status="$2"
    
    # Si une URL de webhook est configurée, envoyer une notification
    if [ -n "$WEBHOOK_URL" ]; then
        log "Envoi de notification à $WEBHOOK_URL"
        
        local message
        if [ "$status" = "success" ]; then
            message="{\"status\":\"success\",\"message\":\"Sauvegarde réussie\",\"file\":\"$backup_file\"}"
        else
            message="{\"status\":\"error\",\"message\":\"Échec de la sauvegarde\"}"
        fi
        
        # Utiliser curl pour envoyer la notification
        if command -v curl &> /dev/null; then
            curl -X POST -H "Content-Type: application/json" -d "$message" "$WEBHOOK_URL" &> /dev/null
        fi
    fi
}

# =============================================================================
# EXÉCUTION PRINCIPALE
# =============================================================================

main() {
    log "=========================================="
    log "Début de la sauvegarde automatique"
    log "=========================================="
    
    # Vérifier les dépendances
    check_dependencies
    
    # Créer les répertoires
    create_directories
    
    # Tester la connexion
    test_connection
    
    # Effectuer la sauvegarde
    local backup_file=$(perform_backup)
    
    # Vérifier la sauvegarde
    if ! verify_backup "$backup_file"; then
        log "ERREUR: Vérification de la sauvegarde échouée"
        send_notification "$backup_file" "error"
        exit 1
    fi
    
    # Nettoyer les anciennes sauvegardes
    cleanup_old_backups
    
    # Envoyer une notification de succès
    send_notification "$backup_file" "success"
    
    log "=========================================="
    log "Sauvegarde terminée avec succès"
    log "=========================================="
}

# Exécuter le script principal
main "$@"

exit 0
