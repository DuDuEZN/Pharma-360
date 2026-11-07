#!/usr/bin/env python3
"""
Script simple pour tester les pages frontend
"""

import os
import json
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path("/workspace/github__DuDuEZN__Pharma-360")
PAGES_DIR = PROJECT_ROOT / "frontend" / "src" / "pages"
REPORT_FILE = PROJECT_ROOT / "scripts" / "test_pages_simple_report.json"


def test_pages():
    """Teste toutes les pages"""
    print("=" * 80)
    print("🧪 TEST SIMPLE DES PAGES FRONTEND")
    print("=" * 80)
    
    # Trouver toutes les pages
    all_pages = list(PAGES_DIR.rglob("*.jsx"))
    all_pages = [p for p in all_pages if p.name != 'index.js']
    
    print(f"\n📄 Pages trouvées: {len(all_pages)}")
    print("-" * 80)
    
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_pages": len(all_pages),
        "pages": [],
        "success_count": 0,
        "failure_count": 0
    }
    
    # Tester chaque page
    for page in all_pages:
        page_path = page.relative_to(PAGES_DIR)
        page_name = str(page_path).replace(os.sep, '/').replace('.jsx', '')
        
        print(f"⏳ Vérification: {page_name}")
        
        try:
            # Vérifier que le fichier existe
            if not page.exists():
                results["pages"].append({
                    "path": str(page_path),
                    "status": "file_not_found"
                })
                results["failure_count"] += 1
                print(f"  ❌ {page_name} - Fichier non trouvé")
                continue
            
            # Lire le contenu
            with open(page, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Vérifier les imports
            has_relative_imports = "from './" in content or "from '../" in content or "from '../../" in content
            
            if has_relative_imports:
                results["pages"].append({
                    "path": str(page_path),
                    "status": "has_relative_imports",
                    "file": str(page.relative_to(PROJECT_ROOT))
                })
                results["failure_count"] += 1
                print(f"  ⚠️  {page_name} - Contient des imports relatifs")
            else:
                results["pages"].append({
                    "path": str(page_path),
                    "status": "ok",
                    "file": str(page.relative_to(PROJECT_ROOT))
                })
                results["success_count"] += 1
                print(f"  ✅ {page_name} - OK")
                
        except Exception as e:
            results["pages"].append({
                "path": str(page_path),
                "status": "error",
                "error": str(e)
            })
            results["failure_count"] += 1
            print(f"  ❌ {page_name} - Erreur: {str(e)}")
    
    # Calculer le pourcentage de succès
    success_rate = (results["success_count"] / results["total_pages"]) * 100 if results["total_pages"] > 0 else 0
    
    print("\n" + "=" * 80)
    print("📊 RÉSULTATS")
    print("=" * 80)
    print(f"Total des pages: {results['total_pages']}")
    print(f"Pages réussies: {results['success_count']} ({success_rate:.1f}%)")
    print(f"Pages avec problèmes: {results['failure_count']} ({100-success_rate:.1f}%)")
    
    if results["failure_count"] > 0:
        print("\n⚠️  Pages avec problèmes:")
        for page in results["pages"]:
            if page["status"] != "ok":
                print(f"  - {page['path']}: {page['status']}")
    else:
        print("\n✅ Toutes les pages sont valides!")
    
    # Sauvegarder le rapport
    REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 Rapport sauvegardé: {REPORT_FILE}")
    
    return results


if __name__ == "__main__":
    test_pages()
