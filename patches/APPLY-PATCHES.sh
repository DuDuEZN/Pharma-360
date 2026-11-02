#!/bin/bash

# =============================================================================
# PHARMA 360 - Script d'Application des Patchs
# =============================================================================
# Ce script applique tous les patchs de correction dans l'ordre recommandé
# =============================================================================

set -e

echo "============================================================"
echo "PHARMA 360 - APPLICATION DES PATCHS"
echo "============================================================"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Erreur: Exécutez ce script depuis la racine du projet Pharma-360"
    exit 1
fi

# Créer le répertoire patches s'il n'existe pas
mkdir -p patches

echo "✓ Répertoire: $(pwd)"
echo ""

# Compter les patchs
PATCH_COUNT=$(ls patches/*.patch 2>/dev/null | wc -l)
echo "Nombre de patchs à appliquer: $PATCH_COUNT"
echo ""

# Appliquer chaque patch
for patch_file in patches/0*.patch; do
    if [ -f "$patch_file" ]; then
        echo "------------------------------------------------------------"
        echo "Application de: $patch_file"
        echo "------------------------------------------------------------"
        
        # Vérifier si le patch peut être appliqué
        if patch --dry-run -p1 < "$patch_file" 2>/dev/null; then
            # Appliquer le patch
            if patch -p1 < "$patch_file"; then
                echo "✅ Patch appliqué avec succès"
            else
                echo "❌ Erreur lors de l'application du patch"
                exit 1
            fi
        else
            echo "⚠️  Patch déjà appliqué ou non applicable"
        fi
        echo ""
    fi
done

echo "============================================================"
echo "✅ TOUS LES PATCHS ONT ÉTÉ APPLIQUÉS"
echo "============================================================"
echo ""
echo "Prochaines étapes recommandées:"
echo "  1. Vérifier les modifications: git diff"
echo "  2. Tester le déploiement: docker compose build --no-cache && docker compose up -d"
echo "  3. Exécuter les tests: pytest backend/tests/ && cd frontend && npm test"
echo "  4. Valider les changements: git add -A && git commit -m 'Apply patches'"
echo ""
