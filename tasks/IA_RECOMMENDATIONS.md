# 🤖 **Tâches Recommandées - IA**

**Agent** : `agent-data-scientist-expert-ia`  
**Date** : 2025-01-06 (J2)  
**Statut** : ⏳ **À DÉMARRER**  
**Priorité** : ⭐⭐ (Préparation pour la Phase 3)  

---

## 📋 **Contexte**

Suite à la **revue collective de ARCH-002** (Modèle PostgreSQL), vous avez **1 recommandation à valider** concernant la structure des données pour le module OCR. Cette tâche est **importante** pour garantir que le module IA peut correctement traiter les factures fournisseurs et doit être **terminée avant J5** pour permettre le démarrage de IA-001.

---

## 🎯 **Votre Tâche (J5 - 2025-01-08)**

---

### **📌 Tâche : REC-003 - Valider structure de `invoices.ocr_data` (JSONB)**

**ID** : REC-003  
**Sévérité** : 🟢 Info  
**Durée estimée** : 1-2 heures  
**Échéance** : **J5 (2025-01-08)**  
**Priorité** : ⭐⭐  
**Dépendances** : ARCH-002 (Modèle PostgreSQL)  

---

#### **📌 Description du Problème**

La table `invoices` dans le modèle PostgreSQL contient une colonne `ocr_data` de type **JSONB**, destinée à stocker les données extraites par le module OCR (Reconnaissance Optique de Caractères) des factures fournisseurs.

**Problème** :
- La **structure exacte** de ce JSON n'est pas encore définie
- Le module IA (OCR) et le Backend doivent **s'entendre** sur cette structure
- Une **mauvaise définition** pourrait entraîner des incompatibilités

**Impact** :
- Incohérence entre le module IA et le Backend
- Difficulté à traiter les données OCR
- Risque d'erreurs lors de l'intégration

---

#### **🔧 Solution à Implémenter**

**1. Définir la structure JSON pour `ocr_data`**

Proposition de structure **standardisée** :

```json
{
  "metadata": {
    "ocr_engine": "pytesseract",
    "ocr_version": "0.3.10",
    "processing_time_seconds": 2.5,
    "confidence_score": 0.95,
    "timestamp": "2025-01-08T10:00:00Z",
    "file_name": "facture_fournisseur_001.png",
    "file_size_bytes": 1024000,
    "mime_type": "image/png"
  },
  "supplier": {
    "name": "Pharma Distributeur SARL",
    "tax_id": "RCCM-BJ-12345",
    "address": "123 Rue de la Santé, Cotonou, Bénin",
    "phone": "+229 12 34 56 78",
    "email": "contact@pharmadist.com"
  },
  "invoice": {
    "number": "FACT-2025-001",
    "date": "2025-01-05",
    "due_date": "2025-02-04",
    "reference": "REF-12345",
    "currency": "XOF"
  },
  "totals": {
    "subtotal": 500000.00,
    "tax_rate": 18.0,
    "tax_amount": 90000.00,
    "discount_rate": 5.0,
    "discount_amount": 25000.00,
    "total": 565000.00
  },
  "items": [
    {
      "line_number": 1,
      "product_name": "Paracétamol 500mg",
      "dci": "Paracétamol",
      "barcode": "3400932123456",
      "batch_number": "BATCH-2025-001",
      "expiry_date": "2026-12-31",
      "quantity": 100,
      "unit": "boîte",
      "unit_price": 5000.00,
      "total_price": 500000.00,
      "manufacturer": "Labo Pharma",
      "confidence": 0.98
    },
    {
      "line_number": 2,
      "product_name": "Amoxicilline 1g",
      "dci": "Amoxicilline",
      "barcode": "3400932123457",
      "batch_number": "BATCH-2025-002",
      "expiry_date": "2027-06-30",
      "quantity": 50,
      "unit": "boîte",
      "unit_price": 2500.00,
      "total_price": 125000.00,
      "manufacturer": "Medic SA",
      "confidence": 0.92
    }
  ],
  "raw_text": {
    "full_text": "PHARMA DISTRIBUTEUR SARL\nRCCM-BJ-12345\n123 Rue de la Santé...",
    "supplier_section": "...",
    "invoice_section": "...",
    "items_section": "...",
    "totals_section": "..."
  },
  "warnings": [
    "Barcode non reconnu pour le produit Amoxicilline 1g",
    "Date de péremption illisible pour le lot BATCH-2025-002"
  ]
}
```

**2. Valider la structure avec le Backend Lead**

- **Discuter** avec `agent-d-veloppeur-backend-lead` pour :
  - Confirmer que la structure répond aux besoins du Backend
  - Valider les champs obligatoires
  - Définir les champs optionnels
  - S'assurer de la compatibilité avec les modèles SQLAlchemy

**3. Documenter la structure**

Ajouter une **section dédiée** dans `docs/ARCH-002_POSTGRESQL.md` :

```markdown
## 📄 Structure de `invoices.ocr_data` (JSONB)

La colonne `ocr_data` de la table `invoices` stocke les données extraites par le module OCR.

### Schéma JSON

```json
{
  "metadata": { ... },
  "supplier": { ... },
  "invoice": { ... },
  "totals": { ... },
  "items": [ ... ],
  "raw_text": { ... },
  "warnings": [ ... ]
}
```

### Champs Obligatoires

| Champ | Type | Description |
|-------|------|-------------|
| `metadata` | object | Métadonnées de traitement OCR |
| `metadata.ocr_engine` | string | Moteur OCR utilisé (ex: "pytesseract") |
| `metadata.timestamp` | string | Date/heure du traitement (ISO 8601) |
| `supplier` | object | Informations du fournisseur |
| `supplier.name` | string | Nom du fournisseur |
| `invoice` | object | Informations de la facture |
| `invoice.number` | string | Numéro de la facture |
| `invoice.date` | string | Date de la facture (YYYY-MM-DD) |
| `totals` | object | Totaux de la facture |
| `totals.subtotal` | number | Sous-total (sans taxe) |
| `totals.total` | number | Total final |
| `items` | array | Liste des articles |

### Champs Optionnels

| Champ | Type | Description |
|-------|------|-------------|
| `metadata.confidence_score` | number | Score de confiance (0-1) |
| `metadata.processing_time_seconds` | number | Temps de traitement |
| `supplier.tax_id` | string | Numéro fiscal |
| `supplier.address` | string | Adresse complète |
| `invoice.due_date` | string | Date d'échéance |
| `invoice.reference` | string | Référence fournisseur |
| `totals.tax_rate` | number | Taux de taxe (%) |
| `totals.tax_amount` | number | Montant de la taxe |
| `totals.discount_rate` | number | Taux de remise (%) |
| `items[*].dci` | string | Dénomination Commune Internationale |
| `items[*].barcode` | string | Code-barres du produit |
| `items[*].expiry_date` | string | Date de péremption (YYYY-MM-DD) |
| `raw_text` | object | Texte brut extrait par OCR |
| `warnings` | array | Avertissements de traitement |

### Exemple Complet

Voir [exemple ci-dessus](#📌-solution-à-implémenter).

### Validation

- ✅ Validé par IA (`agent-data-scientist-expert-ia`)
- ✅ Validé par Backend Lead (`agent-d-veloppeur-backend-lead`)
- Date de validation : 2025-01-08
```

---

#### **✅ Livrables Attendus**

1. **Structure JSON validée** :
   - Schéma JSON complet et documenté
   - Champs obligatoires et optionnels définis
   - Exemple concret

2. **Validation croisée** :
   - [ ] Validation par Backend Lead
   - [ ] Validation par Superviseur

3. **Documentation** :
   - [ ] Section ajoutée dans `docs/ARCH-002_POSTGRESQL.md`
   - [ ] Exemple JSON complet

4. **Implémentation** :
   - [ ] Vérifier que le module IA peut générer ce JSON
   - [ ] Vérifier que le Backend peut traiter ce JSON

---

#### **📝 Notes Techniques**

- **JSONB vs JSON** :
  - **JSONB** est utilisé car il est **plus performant** pour les requêtes
  - Permet l'indexation des champs JSON (ex: `CREATE INDEX ON invoices((ocr_data->'invoice'->>'number'))`)

- **Indexation** :
  - On peut créer des index sur des champs spécifiques du JSON :
    ```sql
    -- Index sur le numéro de facture dans ocr_data
    CREATE INDEX idx_invoices_ocr_number ON invoices ((ocr_data->'invoice'->>'number'));
    
    -- Index sur le nom du fournisseur
    CREATE INDEX idx_invoices_ocr_supplier ON invoices ((ocr_data->'supplier'->>'name'));
    ```

- **Requêtes typiques** :
  ```sql
  -- Trouver les factures avec un fournisseur spécifique
  SELECT * FROM invoices 
  WHERE ocr_data->'supplier'->>'name' = 'Pharma Distributeur SARL';
  
  -- Trouver les factures avec un produit spécifique
  SELECT * FROM invoices 
  WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(ocr_data->'items') AS item
    WHERE item->>'product_name' = 'Paracétamol 500mg'
  );
  ```

---

---

## 📅 **Calendrier**

| **Tâche** | **Durée** | **Priorité** | **Échéance** | **Statut** |
|-----------|-----------|--------------|--------------|------------|
| REC-003 | 1-2h | ⭐⭐ | J5 | ⏳ |

---

## 🎯 **Objectifs**

- ✅ **Standardiser** la structure des données OCR
- ✅ **Garantir l'interopérabilité** entre IA et Backend
- ✅ **Faciliter le développement** du module OCR (IA-002)
- ✅ **Préparer l'intégration** avec le Backend

---

## 📚 **Ressources Utiles**

1. **Fichiers à consulter** :
   - [`docs/ARCH-002_POSTGRESQL.md`](https://github.com/DuDuEZN/Pharma-360/blob/main/docs/ARCH-002_POSTGRESQL.md) (table `invoices`)
   - [`tasks/RECOMMENDATIONS_ARCH-002.md`](https://github.com/DuDuEZN/Pharma-360/blob/main/tasks/RECOMMENDATIONS_ARCH-002.md)

2. **Documentation PostgreSQL** :
   - [JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
   - [JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)
   - [JSONB Indexing](https://www.postgresql.org/docs/current/datatype-json.html#JSON-INDEXING)

3. **Documentation pytesseract** :
   - [pytesseract Documentation](https://pypi.org/project/pytesseract/)
   - [OCR Best Practices](https://github.com/tesseract-ocr/tesseract/wiki)

4. **Outils** :
   - Python (pytesseract, OpenCV)
   - PostgreSQL (psql)

---

## ✅ **Checklist de Validation**

### **Pour REC-003**
- [ ] Structure JSON définie et documentée
- [ ] Champs obligatoires identifiés
- [ ] Champs optionnels identifiés
- [ ] Exemple concret créé
- [ ] Validation par Backend Lead
- [ ] Validation par Superviseur
- [ ] Documentation ajoutée dans ARCH-002
- [ ] Compatibilité vérifiée avec le module IA

---

## 📞 **Support et Communication**

| **Question** | **Contact** | **Canal** |
|--------------|-------------|-----------|
| Structure des données | Backend Lead | `#backend` |
| Intégration avec PostgreSQL | Superviseur | `#architecture` |
| Validation de la structure | Superviseur | `#architecture` |

---

## 🚀 **Prochaines Étapes Après J5**

1. **J6** :
   - Attendre la validation finale de REC-003
   - Préparer l'environnement pour IA-001 (à démarrer J46)

2. **Phase 3 (J46-J73)** :
   - **Démarrer IA-001** (Analyse Rotation Stocks)
   - **Démarrer IA-002** (Module OCR Factures)
   - Utiliser la structure `ocr_data` validée

---

## 💡 **Conseils**

1. **Collaborez avec Backend Lead** :
   - Organisez une réunion ou un appel pour valider la structure
   - Utilisez le canal `#backend` ou `#architecture` sur Slack

2. **Testez avec des données réelles** :
   - Utilisez des images de factures réelles pour tester l'OCR
   - Générez le JSON et vérifiez qu'il correspond à la structure

3. **Documentez bien** :
   - Ajoutez des exemples concrets
   - Expliquez les choix de conception
   - Mettez à jour la documentation existante

4. **Pensez à l'extensibilité** :
   - La structure doit permettre d'ajouter de nouveaux champs
   - Prévoir des champs optionnels pour les futures évolutions

---

**Document créé** : 2025-01-06 (J2)  
**Responsable** : `agent-data-scientist-expert-ia`  
**Échéance** : J5 (2025-01-08)  
**Statut** : ⏳ **À DÉMARRER**

---

**© 2025 Pharmacie 360° - Tous droits réservés**
