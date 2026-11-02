#!/usr/bin/env python3
"""
Generate Visual Preview Report for Pharma-360 Pages
Analyzes each page source code and generates a report showing what it displays
"""

import re
from pathlib import Path
from typing import Dict, List, Optional


class PageAnalyzer:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.pages_dir = self.project_root / "frontend" / "src" / "pages"
        self.components_dir = self.project_root / "frontend" / "src" / "components"
        
    def get_page_files(self) -> List[Path]:
        """Get all page files"""
        pages = []
        
        # Main pages
        for ext in ['*.jsx', '*.js']:
            pages.extend(self.pages_dir.glob(f'**/{ext}'))
        
        return sorted(set(pages))
    
    def analyze_page(self, page_path: Path) -> Dict:
        """Analyze a single page"""
        try:
            content = page_path.read_text()
            
            # Extract page name
            page_name = page_path.stem
            
            # Extract title/h1
            titles = re.findall(r'<(h1|h2|h3|title)([^>]*?)>([^<]+)</\1>', content, re.IGNORECASE | re.DOTALL)
            page_titles = [t[2].strip() for t in titles if t[2].strip()]
            
            # Extract buttons
            buttons = re.findall(r'<Button[^>]*?>([^<]+)</Button>', content, re.IGNORECASE | re.DOTALL)
            button_texts = [b.strip() for b in buttons if b.strip()]
            
            # Extract inputs
            inputs = re.findall(r'<Input[^>]*?placeholder="([^"]+)"', content)
            input_placeholders = [i for i in inputs if i]
            
            # Extract forms
            has_form = 'form' in content.lower() and ('onsubmit' in content or 'handleSubmit' in content)
            
            # Extract tables
            has_table = 'table' in content.lower() or 'Table' in content
            
            # Extract cards
            has_cards = 'Card' in content or 'card' in content.lower()
            
            # Extract charts
            has_charts = 'Chart' in content or 'chart' in content.lower()
            
            # Extract API calls
            api_calls = re.findall(r'api\.(get|post|put|delete)\([^)]+\)', content)
            
            # Extract hooks
            hooks = re.findall(r'use\w+\(', content)
            
            # Extract icons
            icons = re.findall(r'<([A-Z]\w+)', content)
            
            # Count lines
            line_count = len(content.split('\n'))
            
            # Get file size
            file_size = len(content)
            
            return {
                'path': str(page_path.relative_to(self.project_root)),
                'name': page_name,
                'titles': page_titles[:5],  # First 5 titles
                'buttons': button_texts[:10],  # First 10 buttons
                'inputs': input_placeholders[:10],  # First 10 inputs
                'has_form': has_form,
                'has_table': has_table,
                'has_cards': has_cards,
                'has_charts': has_charts,
                'api_calls': api_calls[:10],
                'hooks': list(set(hooks))[:10],
                'icons': list(set(icons))[:10],
                'line_count': line_count,
                'file_size': file_size,
                'content_preview': content[:500] + '...' if len(content) > 500 else content
            }
        except Exception as e:
            return {
                'path': str(page_path),
                'name': page_path.stem,
                'error': str(e)
            }
    
    def generate_html_preview(self, page_data: Dict) -> str:
        """Generate HTML preview for a page"""
        html = f"""
<div style="border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; background: #fff;">
    <h2 style="color: #2563eb; margin-bottom: 15px;">
        <span style="background: #dbeafe; padding: 5px 10px; border-radius: 4px; font-size: 0.9em;">Page</span>
        {page_data['name']}
    </h2>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0;">
        <div style="background: #f8fafc; padding: 10px; border-radius: 4px;">
            <strong style="color: #475569; display: block; margin-bottom: 5px;">Fichier</strong>
            <code style="font-size: 0.85em;">{page_data['path']}</code>
        </div>
        <div style="background: #f8fafc; padding: 10px; border-radius: 4px;">
            <strong style="color: #475569; display: block; margin-bottom: 5px;">Lignes</strong>
            {page_data['line_count']}
        </div>
        <div style="background: #f8fafc; padding: 10px; border-radius: 4px;">
            <strong style="color: #475569; display: block; margin-bottom: 5px;">Taille</strong>
            {page_data['file_size'] / 1024:.1f} KB
        </div>
    </div>
    
    <h3 style="color: #1e40af; margin: 20px 0 10px; font-size: 1.1em;">📋 Contenu Affiché</h3>
    
    <div style="margin: 10px 0;">
        <strong>Titres/En-têtes:</strong>
        <div style="margin-top: 5px;">
            {'<br>'.join([f'• {t}' for t in page_data.get('titles', [])]) or '<em style="color: #94a3b8;">Aucun titre trouvé</em>'}
        </div>
    </div>
    
    <div style="margin: 10px 0;">
        <strong>Boutons:</strong>
        <div style="margin-top: 5px;">
            {'<br>'.join([f'• {b}' for b in page_data.get('buttons', [])]) or '<em style="color: #94a3b8;">Aucun bouton trouvé</em>'}
        </div>
    </div>
    
    <div style="margin: 10px 0;">
        <strong>Champs de saisie:</strong>
        <div style="margin-top: 5px;">
            {'<br>'.join([f'• {i}' for i in page_data.get('inputs', [])]) or '<em style="color: #94a3b8;">Aucun champ trouvé</em>'}
        </div>
    </div>
    
    <div style="margin: 10px 0;">
        <strong>Fonctionnalités:</strong>
        <div style="margin-top: 5px;">
            {'✓ ' if page_data.get('has_form') else '✗ '}Formulaire
            {' | '}
            {'✓ ' if page_data.get('has_table') else '✗ '}Tableau
            {' | '}
            {'✓ ' if page_data.get('has_cards') else '✗ '}Cartes
            {' | '}
            {'✓ ' if page_data.get('has_charts') else '✗ '}Graphiques
        </div>
    </div>
    
    <div style="margin: 10px 0;">
        <strong>Appels API:</strong>
        <div style="margin-top: 5px;">
            {'<br>'.join([f'• {method}' for method in page_data.get('api_calls', [])]) or '<em style="color: #94a3b8;">Aucun appel API trouvé</em>'}
        </div>
    </div>
    
    <div style="margin: 10px 0;">
        <strong>Hooks utilisés:</strong>
        <div style="margin-top: 5px;">
            {'<br>'.join([f'• {h}' for h in page_data.get('hooks', [])]) or '<em style="color: #94a3b8;">Aucun hook trouvé</em>'}
        </div>
    </div>
    
    <div style="margin: 10px 0;">
        <strong>Icônes:</strong>
        <div style="margin-top: 5px;">
            {'<br>'.join([f'• {i}' for i in page_data.get('icons', [])]) or '<em style="color: #94a3b8;">Aucune icône trouvée</em>'}
        </div>
    </div>
    
    <details style="margin-top: 15px;">
        <summary style="cursor: pointer; color: #2563eb; font-weight: 600;">
            Aperçu du code source
        </summary>
        <pre style="background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 0.85em; margin-top: 10px;">{page_data.get('content_preview', 'No preview available')}</pre>
    </details>
</div>
"""
        return html
    
    def generate_full_report(self) -> str:
        """Generate full HTML report"""
        pages = self.get_page_files()
        
        html_parts = [f"""
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pharma-360 - Aperçu Visuel des Pages</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f8fafc;
        }}
        h1 {{
            color: #2563eb;
            text-align: center;
            margin-bottom: 30px;
        }}
        .subtitle {{
            text-align: center;
            color: #64748b;
            margin-bottom: 40px;
        }}
        .summary {{
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #e2e8f0;
        }}
        .summary h2 {{
            color: #1e40af;
            margin-bottom: 15px;
        }}
        .summary-item {{
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }}
        .summary-item:last-child {{
            border-bottom: none;
        }}
        .back-to-top {{
            text-align: center;
            margin: 40px 0;
        }}
        .back-to-top a {{
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            text-decoration: none;
        }}
        .timestamp {{
            text-align: right;
            color: #94a3b8;
            font-size: 0.9em;
            margin-top: 20px;
        }}
    </style>
</head>
<body>
    <h1>🏥 Pharma-360 - Aperçu Visuel des Pages</h1>
    <p class="subtitle">Analyse du contenu affiché par chaque page de l'application</p>
    
    <div class="summary">
        <h2>📊 Résumé</h2>
        <div class="summary-item">
            <span>Nombre total de pages:</span>
            <strong>{len(pages)}</strong>
        </div>
        <div class="summary-item">
            <span>Pages avec formulaires:</span>
            <strong>{sum(1 for p in pages if self.analyze_page(p).get('has_form'))}</strong>
        </div>
        <div class="summary-item">
            <span>Pages avec tableaux:</span>
            <strong>{sum(1 for p in pages if self.analyze_page(p).get('has_table'))}</strong>
        </div>
        <div class="summary-item">
            <span>Pages avec graphiques:</span>
            <strong>{sum(1 for p in pages if self.analyze_page(p).get('has_charts'))}</strong>
        </div>
    </div>
"""
        ]
        
        # Analyze each page and add to report
        for page_path in pages:
            page_data = self.analyze_page(page_path)
            html_parts.append(self.generate_html_preview(page_data))
        
        # Add closing tags
        html_parts.append("""
    <div class="back-to-top">
        <a href="#">Retour en haut</a>
    </div>
    <div class="timestamp">
        Généré le: <script>document.write(new Date().toLocaleString('fr-FR'))</script>
    </div>
</body>
</html>
""")
        
        return '\n'.join(html_parts)


if __name__ == "__main__":
    analyzer = PageAnalyzer()
    report = analyzer.generate_full_report()
    
    # Save report
    output_file = analyzer.project_root / "reports" / "page_preview_report.html"
    output_file.parent.mkdir(exist_ok=True)
    output_file.write_text(report)
    
    print(f"✅ Rapport généré: {output_file}")
    print(f"📊 Nombre de pages analysées: {len(analyzer.get_page_files())}")
    
    # Also generate a text summary
    print("\n" + "="*80)
    print("RESUME VISUEL DES PAGES PHARMA-360")
    print("="*80)
    
    pages = analyzer.get_page_files()
    for i, page_path in enumerate(pages, 1):
        page_data = analyzer.analyze_page(page_path)
        print(f"\n{i}. {page_data['name']}")
        print(f"   Fichier: {page_data['path']}")
        print(f"   Titres: {', '.join(page_data.get('titles', [])[:3]) or 'Aucun'}")
        print(f"   Boutons: {', '.join(page_data.get('buttons', [])[:3]) or 'Aucun'}")
        print(f"   Champs: {', '.join(page_data.get('inputs', [])[:3]) or 'Aucun'}")
        print(f"   Fonctionnalités: Formulaire={'✓' if page_data.get('has_form') else '✗'}, Tableau={'✓' if page_data.get('has_table') else '✗'}, Cartes={'✓' if page_data.get('has_cards') else '✗'}, Graphiques={'✓' if page_data.get('has_charts') else '✗'}")
