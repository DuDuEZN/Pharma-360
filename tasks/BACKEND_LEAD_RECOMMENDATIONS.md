# 🎯 **Tâches Recommandées - Backend Lead**

**Agent** : `agent-d-veloppeur-backend-lead`  
**Date** : 2025-01-06 (J2)  
**Statut** : ⏳ **À DÉMARRER**  
**Priorité** : ⭐⭐⭐⭐⭐ (Critique pour la Phase 1)  

---

## 📋 **Contexte**

Suite à la **revue collective de ARCH-002** (Modèle PostgreSQL), vous avez **2 recommandations à implémenter** pour améliorer la robustesse du système. Ces tâches sont **critiques** pour garantir la traçabilité complète des mouvements de stock et doivent être **terminées avant J4** pour permettre le démarrage de BKND-001.

---

## 🎯 **Vos Tâches (J3 - 2025-01-07)**

---

### **📌 Tâche 1 : REC-001 - Corriger le trigger `movements.user_id`**

**ID** : REC-001  
**Sévérité** : ⚠️ Moyen  
**Durée estimée** : 2-3 heures  
**Échéance** : **J3 (2025-01-07)**  
**Priorité** : ⭐⭐⭐⭐  
**Dépendances** : ARCH-002 (Modèle PostgreSQL)  

---

#### **📌 Description du Problème**

Le trigger actuel `log_batch_quantity_change_simple()` dans `scripts/init-db.sql` insère **`NULL`** dans le champ `movements.user_id` car il n'a pas accès à l'ID de l'utilisateur courant qui effectue la modification.

**Impact** :
- La **traçabilité** des mouvements de stock est **incomplète** (on ne sait pas qui a effectué la modification)
- Impossible de filtrer les mouvements par utilisateur
- Non conforme aux exigences de **sécurité et audit**

---

#### **🔧 Solution à Implémenter**

**1. Modifier la fonction `log_batch_quantity_change_simple()`** dans `scripts/init-db.sql` :

```sql
-- Remplacer la fonction existante par cette version :
CREATE OR REPLACE FUNCTION log_batch_quantity_change()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id_val INTEGER;
BEGIN
    -- Récupérer l'ID de l'utilisateur depuis la variable de session PostgreSQL
    -- Cette variable sera définie par l'application via SET LOCAL app.current_user_id = X;
    SELECT current_setting('app.current_user_id')::INTEGER INTO current_user_id_val;
    
    -- Si la variable n'est pas définie, utiliser l'utilisateur système (ID 1)
    IF current_user_id_val IS NULL THEN
        current_user_id_val := 1;
    END IF;
    
    -- Ne logger que si la quantité a réellement changé
    IF NEW.quantity != OLD.quantity THEN
        INSERT INTO movements (
            type, 
            reference_id, 
            reference_type, 
            product_id, 
            batch_id,
            old_quantity, 
            new_quantity, 
            quantity_change, 
            user_id, 
            notes
        ) VALUES (
            -- Déterminer le type de mouvement
            CASE 
                WHEN NEW.quantity > OLD.quantity THEN 'purchase'
                WHEN NEW.quantity < OLD.quantity THEN 'sale'
                ELSE 'adjustment'
            END,
            NEW.id,                  -- ID du batch
            'batch',                 -- Type de référence
            NEW.product_id,          -- ID du produit
            NEW.id,                  -- ID du batch (redondant mais utile)
            OLD.quantity,             -- Ancienne quantité
            NEW.quantity,             -- Nouvelle quantité
            NEW.quantity - OLD.quantity,  -- Changement
            current_user_id_val,     -- ⭐ ID de l'utilisateur (corrigé)
            'Automatic quantity update via trigger'
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';
```

**2. Mettre à jour le trigger** :

```sql
-- Remplacer le trigger existant :
CREATE TRIGGER log_batch_quantity_change_trigger
    AFTER UPDATE ON batches
    FOR EACH ROW
    WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
    EXECUTE FUNCTION log_batch_quantity_change();  -- Note: plus de _simple
```

---

#### **✅ Livrables Attendus**

1. **Fichier modifié** : `scripts/init-db.sql`
   - Fonction `log_batch_quantity_change()` corrigée
   - Trigger `log_batch_quantity_change_trigger` mis à jour

2. **Test de validation** :
   ```sql
   -- 1. Définir l'utilisateur courant (simulation)
   SET LOCAL app.current_user_id = 2;  -- ID de l'utilisateur test
   
   -- 2. Mettre à jour un batch
   UPDATE batches SET quantity = quantity + 5 WHERE id = 1;
   
   -- 3. Vérifier que le mouvement a été logged avec le bon user_id
   SELECT * FROM movements WHERE reference_id = 1 AND user_id = 2;
   
   -- Résultat attendu: 1 ligne avec user_id = 2
   ```

3. **Documentation** :
   - Mettre à jour `docs/ARCH-002_POSTGRESQL.md` avec la nouvelle fonction
   - Ajouter un commentaire expliquant le mécanisme de `current_setting`

---

#### **📝 Notes Techniques**

- **`current_setting('app.current_user_id')`** :
  - Variable de session PostgreSQL qui sera définie par l'application Backend
  - Dans FastAPI, avant chaque requête de modification de stock, faire :
    ```python
    # Exemple dans le backend (à implémenter dans BKND-*)
    from sqlalchemy import text
    
    async def update_batch_quantity(db: Session, batch_id: int, new_quantity: int, user_id: int):
        # Définir la variable de session PostgreSQL
        await db.execute(text("SET LOCAL app.current_user_id = :user_id"), {"user_id": user_id})
        
        # Exécuter la mise à jour (le trigger utilisera la variable)
        await db.execute(
            text("UPDATE batches SET quantity = :new_quantity WHERE id = :batch_id"),
            {"new_quantity": new_quantity, "batch_id": batch_id}
        )
    ```

- **Fallback sur user_id = 1** :
  - Si la variable n'est pas définie, on utilise l'ID 1 (utilisateur système)
  - Cela évite les erreurs mais doit être surveillé en production

---

---

### **📌 Tâche 2 : REC-002 - Ajouter trigger pour `sale_items.expiry_date` sur UPDATE**

**ID** : REC-002  
**Sévérité** : ⚠️ Faible  
**Durée estimée** : 1-2 heures  
**Échéance** : **J3 (2025-01-07)**  
**Priorité** : ⭐⭐⭐  
**Dépendances** : ARCH-002 (Modèle PostgreSQL)  

---

#### **📌 Description du Problème**

La table `sale_items` a un champ `expiry_date` qui est **automatiquement rempli** lors de l'insertion (via trigger `update_sale_item_expiry_date`). Cependant, si un `batch_id` est **mis à jour**, le champ `expiry_date` **n'est pas recalculé**, ce qui peut entraîner une **incohérence** entre `batch_id` et `expiry_date`.

**Impact** :
- Données incohérentes dans `sale_items`
- Impossible de connaître la date de péremption réelle du lot vendu
- Problème pour l'historique et les rapports

---

#### **🔧 Solution à Implémenter**

**1. Créer une nouvelle fonction** dans `scripts/init-db.sql` :

```sql
-- Ajouter après la fonction set_sale_item_expiry_date()
CREATE OR REPLACE FUNCTION update_sale_item_expiry_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Si batch_id a changé, recalculer expiry_date
    IF NEW.batch_id IS DISTINCT FROM OLD.batch_id THEN
        NEW.expiry_date := (
            SELECT expiry_date 
            FROM batches 
            WHERE id = NEW.batch_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';
```

**2. Créer le trigger correspondant** :

```sql
-- Ajouter après le trigger BEFORE INSERT
CREATE TRIGGER update_sale_item_expiry_date_on_update
    BEFORE UPDATE ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sale_item_expiry_date();
```

---

#### **✅ Livrables Attendus**

1. **Fichier modifié** : `scripts/init-db.sql`
   - Fonction `update_sale_item_expiry_date()` ajoutée
   - Trigger `update_sale_item_expiry_date_on_update` créé

2. **Test de validation** :
   ```sql
   -- 1. Insérer un sale_item avec batch_id = 1
   INSERT INTO sale_items (sale_id, batch_id, product_id, quantity, unit_price, total_price)
   VALUES (1, 1, 1, 2, 1000, 2000);
   
   -- 2. Vérifier expiry_date
   SELECT expiry_date FROM sale_items WHERE id = 1;
   
   -- 3. Mettre à jour batch_id
   UPDATE sale_items SET batch_id = 2 WHERE id = 1;
   
   -- 4. Vérifier que expiry_date a été recalculé
   SELECT expiry_date FROM sale_items WHERE id = 1;
   -- Doit correspondre à batches.expiry_date WHERE id = 2
   ```

3. **Documentation** :
   - Mettre à jour `docs/ARCH-002_POSTGRESQL.md` avec le nouveau trigger
   - Expliquer le mécanisme de synchronisation `batch_id` ↔ `expiry_date`

---

---

## 📅 **Calendrier et Priorités**

| **Tâche** | **Durée** | **Priorité** | **Échéance** | **Statut** |
|-----------|-----------|--------------|--------------|------------|
| REC-001 | 2-3h | ⭐⭐⭐⭐ | J3 | ⏳ |
| REC-002 | 1-2h | ⭐⭐⭐ | J3 | ⏳ |

**Total estimé** : **4-5 heures** (à répartir sur J3)

---

## 🎯 **Objectifs**

- ✅ **Garantir la traçabilité complète** des mouvements de stock
- ✅ **Éviter les incohérences** dans les données
- ✅ **Préparer le terrain** pour BKND-001 (Authentification RBAC)
- ✅ **Valider la robustesse** du modèle avant le développement

---

## 📚 **Ressources Utiles**

1. **Fichiers à modifier** :
   - [`scripts/init-db.sql`](https://github.com/DuDuEZN/Pharma-360/blob/main/scripts/init-db.sql)
   - [`docs/ARCH-002_POSTGRESQL.md`](https://github.com/DuDuEZN/Pharma-360/blob/main/docs/ARCH-002_POSTGRESQL.md)

2. **Documentation PostgreSQL** :
   - [Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
   - [current_setting](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET)

3. **Outils** :
   - PostgreSQL (psql)
   - Docker (pour tester localement)

---

## ✅ **Checklist de Validation**

### **Pour REC-001**
- [ ] Fonction `log_batch_quantity_change()` modifiée
- [ ] Trigger `log_batch_quantity_change_trigger` mis à jour
- [ ] Test de validation passé (user_id ≠ NULL)
- [ ] Documentation mise à jour

### **Pour REC-002**
- [ ] Fonction `update_sale_item_expiry_date()` créée
- [ ] Trigger `update_sale_item_expiry_date_on_update` créé
- [ ] Test de validation passé (expiry_date recalculé)
- [ ] Documentation mise à jour

### **Validation Finale**
- [ ] Tous les tests passent
- [ ] Aucune incohérence dans les données
- [ ] Documentation complète

---

## 📞 **Support et Communication**

| **Question** | **Contact** | **Canal** |
|--------------|-------------|-----------|
| Problème avec PostgreSQL | Superviseur | `#architecture` |
| Intégration avec Backend | Superviseur | `#architecture` |
| Validation des tests | QA/DevOps | `#qa` |

---

## 🚀 **Prochaines Étapes Après J3**

1. **J4** :
   - Attendre la validation de vos corrections par QA/DevOps
   - Préparer l'environnement pour BKND-001 (à démarrer J5)

2. **J5** :
   - **Démarrer BKND-001** (Système Authentification RBAC)
   - Utiliser le modèle PostgreSQL validé

---

## 💡 **Conseils**

1. **Testez en local** :
   ```bash
   # Lancer PostgreSQL en Docker
   docker run -d --name test-db -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:15-alpine
   
   # Exécuter le script
   psql -h localhost -U postgres -f scripts/init-db.sql
   
   # Tester vos modifications
   psql -h localhost -U postgres -d pharma360
   ```

2. **Validez avec QA/DevOps** :
   - Faites vérifier vos modifications par QA/DevOps avant de merger
   - Utilisez les canaux Slack `#backend` et `#qa`

3. **Documentez** :
   - Ajoutez des commentaires dans le code SQL
   - Mettez à jour la documentation Markdown

---

**Document créé** : 2025-01-06 (J2)  
**Responsable** : `agent-d-veloppeur-backend-lead`  
**Échéance** : J3 (2025-01-07)  
**Statut** : ⏳ **À DÉMARRER**

---

**© 2025 Pharmacie 360° - Tous droits réservés**
