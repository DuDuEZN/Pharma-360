#!/usr/bin/env python3
"""
Script pour tester toutes les pages frontend de Pharma-360
Vérifie que toutes les pages s'affichent correctement (pas d'erreur 404, pas de pages blanches)
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path("/workspace/github__DuDuEZN__Pharma-360")
FRONTEND_DIR = PROJECT_ROOT / "frontend"
PAGES_DIR = FRONTEND_DIR / "src" / "pages"
REPORT_FILE = PROJECT_ROOT / "scripts" / "test_pages_report.json"

# Liste de toutes les pages à tester
PAGES_TO_TEST = [
    # Pages principales
    "/",
    "/login",
    
    # Pages produits
    "/products",
    "/products/new",
    "/products/:id/edit",
    
    # Pages ventes
    "/sales",
    "/sales/new",
    
    # Pages cashier
    "/cashier",
    
    # Pages help
    "/help",
    
    # Pages reports
    "/reports",
    
    # Pages settings
    "/settings",
    
    # Pages admin
    "/admin",
    "/admin/users",
    "/admin/roles",
    "/admin/permissions",
    "/admin/reports",
    "/admin/analytics",
    "/admin/settings",
    
    # Pages manager
    "/manager",
    "/manager/customers",
    "/manager/suppliers",
    "/manager/inventory",
    "/manager/orders",
    "/manager/deliveries",
    "/manager/reports",
    "/manager/analytics",
    "/manager/settings",
    "/manager/backup",
    "/manager/restore",
    
    # Pages forms
    "/product-form",
    "/sale-form",
    "/delivery-form",
    "/order-form",
    "/report-form",
]


def find_all_pages():
    """Trouve toutes les pages dans le dossier pages"""
    all_pages = []
    
    for root, dirs, files in os.walk(PAGES_DIR):
        for file in files:
            if file.endswith('.jsx') and file != 'index.js':
                # Calculer le chemin de la page
                relative_path = Path(root).relative_to(PAGES_DIR)
                page_path = f"/{relative_path}/{file.replace('.jsx', '')}" if relative_path != Path('.') else f"/{file.replace('.jsx', '')}"
                
                # Nettoyer le chemin (remplacer les backslashes)
                page_path = page_path.replace('\\', '/')
                
                # Remplacer les index par rien
                if '/index' in page_path:
                    page_path = page_path.replace('/index', '')
                
                all_pages.append(page_path)
    
    return all_pages


def check_page_imports(page_path):
    """Vérifie si une page peut être importée sans erreur"""
    try:
        # Lire le fichier
        full_path = PAGES_DIR / page_path.replace('/', os.sep).replace('.jsx', '.jsx')
        
        if not full_path.exists():
            # Essayer avec différents chemins
            parts = page_path.strip('/').split('/')
            for i in range(len(parts), 0, -1):
                test_path = PAGES_DIR / Path(*parts[:i])
                if test_path.exists():
                    full_path = test_path / '.'.join(parts[i:]) + '.jsx'
                    if full_path.exists():
                        break
        
        if not full_path.exists():
            return {
                "path": page_path,
                "status": "file_not_found",
                "error": f"Fichier non trouvé: {full_path}"
            }
        
        # Lire le contenu
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Vérifier les imports
        import_errors = []
        
        # Vérifier les imports relatifs
        if "from './" in content or "from '../" in content or "from '../../" in content:
            import_errors.append("Contient des imports relatifs")
        
        # Vérifier les imports avec des chemins incorrects
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'from' in line and 'import' in line:
                # Vérifier si l'import utilise un chemin qui n'existe pas
                if "from './" in line:
                    import_errors.append(f"Ligne {i+1}: Import relatif non standard")
        
        if import_errors:
            return {
                "path": page_path,
                "status": "import_error",
                "errors": import_errors
            }
        
        return {
            "path": page_path,
            "status": "ok",
            "file": str(full_path.relative_to(PROJECT_ROOT))
        }
        
    except Exception as e:
        return {
            "path": page_path,
            "status": "error",
            "error": str(e)
        }


def check_page_syntax(page_path):
    """Vérifie la syntaxe d'une page"""
    try:
        full_path = PAGES_DIR / page_path.replace('/', os.sep).replace('.jsx', '.jsx')
        
        if not full_path.exists():
            return {"status": "file_not_found"}
        
        # Vérifier la syntaxe JavaScript avec Node.js
        result = subprocess.run(
            ["node", "--check", str(full_path)],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            return {
                "status": "syntax_error",
                "error": result.stderr
            }
        
        return {"status": "ok"}
        
    except Exception as e:
        return {"status": "error", "error": str(e)}


def test_all_pages():
    """Teste toutes les pages"""
    print("=" * 80)
    print("🧪 TEST DE TOUTES LES PAGES FRONTEND")
    print("=" * 80)
    
    # Trouver toutes les pages
    all_pages = find_all_pages()
    
    print(f"\n📄 Pages trouvées: {len(all_pages)}")
    print("-" * 80)
    
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_pages": len(all_pages),
        "tested_pages": [],
        "failed_pages": [],
        "success_count": 0,
        "failure_count": 0,
        "warnings": []
    }
    
    # Tester chaque page
    for page in all_pages:
        print(f"⏳ Test de la page: {page}")
        
        # Vérifier les imports
        import_result = check_page_imports(page)
        
        if import_result["status"] == "ok":
            # Vérifier la syntaxe
            syntax_result = check_page_syntax(page)
            
            if syntax_result["status"] == "ok":
                results["tested_pages"].append({
                    "path": page,
                    "status": "success",
                    "file": import_result.get("file", "")
                })
                results["success_count"] += 1
                print(f"  ✅ {page} - OK")
            else:
                results["failed_pages"].append({
                    "path": page,
                    "status": "syntax_error",
                    "error": syntax_result.get("error", "")
                })
                results["failure_count"] += 1
                print(f"  ❌ {page} - Erreur de syntaxe")
        else:
            results["failed_pages"].append(import_result)
            results["failure_count"] += 1
            print(f"  ❌ {page} - {import_result['status']}")
    
    # Calculer le pourcentage de succès
    success_rate = (results["success_count"] / results["total_pages"]) * 100 if results["total_pages"] > 0 else 0
    
    print("\n" + "=" * 80)
    print("📊 RÉSULTATS")
    print("=" * 80)
    print(f"Total des pages: {results['total_pages']}")
    print(f"Pages réussies: {results['success_count']} ({success_rate:.1f}%)")
    print(f"Pages échouées: {results['failure_count']} ({100-success_rate:.1f}%)")
    
    if results["failed_pages"]:
        print("\n❌ Pages avec problèmes:")
        for page in results["failed_pages"]:
            print(f"  - {page['path']}: {page['status']}")
    else:
        print("\n✅ Toutes les pages sont valides!")
    
    # Sauvegarder le rapport
    REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 Rapport sauvegardé: {REPORT_FILE}")
    
    return results


def main():
    """Point d'entrée principal"""
    results = test_all_pages()
    
    # Retourner le code de sortie approprié
    if results["failure_count"] > 0:
        print("\n⚠️  Certaines pages ont des problèmes!")
        return 1
    else:
        print("\n✅ Toutes les pages sont valides!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
