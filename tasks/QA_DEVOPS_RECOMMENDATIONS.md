# 🐳 **Tâches Recommandées - QA/DevOps**

**Agent** : `agent-qa-quality-assurance-devops-engineer`  
**Date** : 2025-01-06 (J2)  
**Statut** : ⏳ **À DÉMARRER**  
**Priorité** : ⭐⭐⭐⭐⭐ (Critique pour la Phase 1)  

---

## 📋 **Contexte**

Suite à la **revue collective de ARCH-002** (Modèle PostgreSQL), vous avez **3 recommandations à implémenter** pour valider la configuration Docker et la base de données. Ces tâches sont **critiques** pour garantir que l'environnement Docker est prêt pour le développement Backend/Frontend et doivent être **terminées avant J4**.

---

## 🎯 **Vos Tâches (J3 - 2025-01-07)**

---

### **📌 Tâche 1 : REC-004 - Tester `init-db.sql` dans conteneur PostgreSQL**

**ID** : REC-004  
**Sévérité** : ⚠️ Moyen  
**Durée estimée** : 2-3 heures  
**Échéance** : **J3 (2025-01-07)**  
**Priorité** : ⭐⭐⭐⭐  
**Dépendances** : ARCH-002 (Modèle PostgreSQL)  

---

#### **📌 Description du Problème**

Le script `scripts/init-db.sql` a été créé pour initialiser la base de données PostgreSQL, mais il **n'a pas encore été testé** dans un environnement Docker réel. Il est **essentiel** de valider que :
- Toutes les tables sont créées correctement
- Tous les index sont créés
- Tous les triggers fonctionnent
- Aucune erreur ne se produit

**Impact** :
- Si le script échoue, **tout le déploiement Docker sera bloqué**
- Les développeurs Backend/Frontend ne pourront pas travailler
- Risque de retard sur tout le projet

---

#### **🔧 Solution à Implémenter**

**Étape 1 : Lancer un conteneur PostgreSQL de test**

```bash
# Créer un conteneur PostgreSQL dédié aux tests
docker run -d \
  --name pharma360-test-db \
  -e POSTGRES_PASSWORD=test_pass \
  -e POSTGRES_USER=test_user \
  -e POSTGRES_DB=pharma360_test \
  -p 5433:5432 \
  postgres:15-alpine

# Attendre que le conteneur soit prêt
docker exec -it pharma360-test-db pg_isready -U test_user -d pharma360_test
```

**Étape 2 : Exécuter le script d'initialisation**

```bash
# Copier le script dans le conteneur (méthode 1: via docker cp)
docker cp scripts/init-db.sql pharma360-test-db:/docker-entrypoint-initdb.d/init-db.sql

# Redémarrer le conteneur pour exécuter le script (méthode recommandée)
docker restart pharma360-test-db

# Alternative: Exécuter le script manuellement (méthode 2)
docker exec -i pharma360-test-db psql -U test_user -d pharma360_test < scripts/init-db.sql
```

**Étape 3 : Vérifier les résultats**

```bash
# Se connecter au conteneur
docker exec -it pharma360-test-db psql -U test_user -d pharma360_test
```

**Requêtes de vérification** :

```sql
-- 1. Lister toutes les tables
\dt

-- Résultat attendu: 11 tables
--   categories, customers, invoices, movements, products, returns,
--   sale_items, sales, suppliers, batches, users

-- 2. Vérifier une table spécifique (ex: batches)
\d batches

-- Résultat attendu: Toutes les colonnes définies dans ARCH-002

-- 3. Lister tous les index
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Résultat attendu: Tous les index définis dans ARCH-002
--   idx_batches_product_id, idx_batches_expiry_date, etc.

-- 4. Lister tous les triggers
SELECT tgname, tgrelid::regclass, tgfoid::regproc, tgtype 
FROM pg_trigger 
WHERE tgisinternal = false;

-- Résultat attendu: Tous les triggers définis dans ARCH-002

-- 5. Tester une requête FEFO
SELECT b.* 
FROM batches b 
WHERE b.product_id = 1 AND b.quantity > 0 AND b.status = 'active'
ORDER BY b.expiry_date ASC 
LIMIT 1;

-- Résultat attendu: Requête exécutée sans erreur
```

---

#### **✅ Livrables Attendus**

1. **Rapport de test** :
   - Fichier `tasks/REC-004_TEST_REPORT.md`
   - Contenu :
     - Date et heure du test
     - Version de PostgreSQL utilisée
     - Liste des tables créées
     - Liste des index créés
     - Liste des triggers créés
     - Résultats des requêtes de test
     - Temps d'exécution des requêtes critiques

2. **Validation** :
   - [ ] Toutes les tables créées avec succès
   - [ ] Tous les index créés
   - [ ] Tous les triggers fonctionnels
   - [ ] Aucune erreur lors de l'exécution

3. **Améliorations** :
   - Si des erreurs sont trouvées, **corriger le script** et retester
   - Optimiser le script si nécessaire (ex: ordre de création des tables)

---

#### **📝 Notes Techniques**

- **Ordre de création** : Les tables doivent être créées dans l'ordre des dépendances (ex: `categories` avant `products`)
- **Variables de session** : Le script utilise `current_setting('app.current_user_id')` pour les triggers. Assurez-vous que cela fonctionne comme attendu
- **Compatibilité Docker** : Le script doit fonctionner avec l'image `postgres:15-alpine`

---

---

### **📌 Tâche 2 : REC-005 - Vérifier création des index**

**ID** : REC-005  
**Sévérité** : ⚠️ Faible  
**Durée estimée** : 1 heure  
**Échéance** : **J3 (2025-01-07)**  
**Priorité** : ⭐⭐⭐  
**Dépendances** : REC-004 (Test init-db.sql)  

---

#### **📌 Description du Problème**

Il faut **vérifier explicitement** que tous les index définis dans `ARCH-002_POSTGRESQL.md` sont bien créés par le script `init-db.sql`. Cela inclut les **index critiques pour FEFO/FIFO**.

**Impact** :
- Sans ces index, les requêtes FEFO seront **lentes** (scan séquentiel au lieu d'index)
- Performance dégradée pour les opérations de vente

---

#### **🔧 Solution à Implémenter**

**1. Exécuter la requête de vérification complète** :

```sql
-- Lister tous les index avec leurs définitions
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**2. Vérifier la présence de chaque index critique** :

| **Index** | **Table** | **Statut** | **Commentaire** |
|----------|-----------|------------|----------------|
| `idx_users_username` | users | ⏳ | Index sur username |
| `idx_users_email` | users | ⏳ | Index sur email |
| `idx_users_role` | users | ⏳ | Index sur role |
| `idx_categories_name` | categories | ⏳ | Index sur name |
| `idx_products_name` | products | ⏳ | Index sur name |
| `idx_products_barcode` | products | ⏳ | **Index critique pour scan** |
| `idx_products_category` | products | ⏳ | Index sur category_id |
| `idx_batches_product_id` | batches | ⏳ | **Index critique pour FEFO** |
| `idx_batches_expiry_date` | batches | ⏳ | **Index critique pour FEFO** |
| `idx_batches_quantity` | batches | ⏳ | Index filtré (quantity > 0) |
| `idx_batches_status` | batches | ⏳ | Index sur status |
| `idx_batches_product_expiry` | batches | ⏳ | **Index composite critique** |
| `idx_batches_active_quantity` | batches | ⏳ | Index composite filtré |
| `idx_sales_date` | sales | ⏳ | Index sur created_at |
| `idx_sale_items_batch` | sale_items | ⏳ | Index sur batch_id |

**3. Vérifier les index composites** :

```sql
-- Vérifier l'index composite pour FEFO
SELECT indexdef 
FROM pg_indexes 
WHERE indexname = 'idx_batches_product_expiry';

-- Résultat attendu: 
-- CREATE INDEX idx_batches_product_expiry ON public.batches USING btree (product_id, expiry_date)
```

---

#### **✅ Livrables Attendus**

1. **Rapport de vérification des index** :
   - Fichier `tasks/REC-005_INDEX_REPORT.md`
   - Contenu :
     - Liste complète des index trouvés
     - Statut de chaque index (✅ Créé / ❌ Manquant)
     - Définition SQL de chaque index
     - Recommandations pour les index manquants

2. **Corrections** :
   - Si des index sont manquants, **mettre à jour `scripts/init-db.sql`**
   - Retester avec REC-004

---

---

### **📌 Tâche 3 : REC-006 - Valider performances requêtes FEFO**

**ID** : REC-006  
**Sévérité** : 🟢 Info  
**Durée estimée** : 1-2 heures  
**Échéance** : **J4 (2025-01-08)**  
**Priorité** : ⭐⭐  
**Dépendances** : REC-004, REC-005 (Test init-db.sql + Vérification index)  

---

#### **📌 Description du Problème**

Il faut **valider que les requêtes FEFO** (First Expired, First Out) sont **performantes** avec un jeu de données réaliste. Cela garantit que l'optimisation des index fonctionne comme prévu.

**Impact** :
- Si les requêtes sont lentes, l'expérience utilisateur sera dégradée
- Risque de timeout lors des ventes en période de forte charge

---

#### **🔧 Solution à Implémenter**

**Étape 1 : Insérer des données de test réalistes**

```sql
-- Activer le timing
\timing on

-- Créer 100 produits
INSERT INTO products (name, barcode, price, stock_min, stock_max)
SELECT 
    'Produit ' || i,
    'BARCODE' || LPAD(i::text, 5, '0'),
    (random() * 10000 + 100)::numeric(10,2),
    (random() * 50)::integer,
    (random() * 200 + 50)::integer
FROM generate_series(1, 100) AS i;

-- Créer 1000 lots avec dates de péremption variées
INSERT INTO batches (product_id, batch_number, expiry_date, quantity, initial_quantity, status)
SELECT 
    (random() * 100 + 1)::integer,
    'BATCH' || LPAD(i::text, 6, '0'),
    CURRENT_DATE + (random() * 730 - 365)::integer,  -- Dates entre -1 an et +1 an
    (random() * 1000)::integer,
    (random() * 1000)::integer,
    CASE WHEN random() > 0.1 THEN 'active' ELSE 'expired' END
FROM generate_series(1, 1000) AS i;

-- Créer quelques ventes pour test
INSERT INTO sales (sale_number, user_id, status, subtotal, total)
SELECT 
    'SALE' || LPAD(i::text, 5, '0'),
    1,  -- user_id = 1 (admin)
    CASE WHEN random() > 0.2 THEN 'paid' ELSE 'pending' END,
    (random() * 50000)::numeric(10,2),
    (random() * 50000)::numeric(10,2)
FROM generate_series(1, 100) AS i;
```

**Étape 2 : Tester les requêtes FEFO critiques**

```sql
-- Requête 1: Sélection FEFO pour un produit (la plus critique)
SELECT b.id, b.batch_number, b.expiry_date, b.quantity
FROM batches b
WHERE b.product_id = 1
  AND b.quantity > 0
  AND b.status = 'active'
ORDER BY b.expiry_date ASC
LIMIT 1;

-- Résultat attendu: Temps < 10ms

-- Requête 2: Sélection FEFO avec jointure
SELECT b.id, b.batch_number, p.name as product_name, b.expiry_date
FROM batches b
JOIN products p ON b.product_id = p.id
WHERE p.barcode = 'BARCODE00001'
  AND b.quantity > 0
  AND b.status = 'active'
ORDER BY b.expiry_date ASC
LIMIT 1;

-- Résultat attendu: Temps < 15ms

-- Requête 3: Stock total pour un produit
SELECT 
    p.id,
    p.name,
    COALESCE(SUM(b.quantity), 0) as total_quantity
FROM products p
LEFT JOIN batches b ON p.id = b.product_id AND b.status = 'active'
WHERE p.id = 1
GROUP BY p.id, p.name;

-- Résultat attendu: Temps < 5ms

-- Requête 4: Alertes de péremption proche (30 jours)
SELECT b.id, b.batch_number, p.name, b.expiry_date
FROM batches b
JOIN products p ON b.product_id = p.id
WHERE b.status = 'active'
  AND b.quantity > 0
  AND b.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY b.expiry_date ASC;

-- Résultat attendu: Temps < 20ms
```

**Étape 3 : Analyser les résultats**

- **Temps d'exécution** : Doit être **< 10ms** pour les requêtes simples, **< 20ms** pour les requêtes complexes
- **Utilisation des index** : Vérifier avec `EXPLAIN ANALYZE` que les index sont bien utilisés

```sql
-- Exemple avec EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT b.*
FROM batches b
WHERE b.product_id = 1
  AND b.quantity > 0
  AND b.status = 'active'
ORDER BY b.expiry_date ASC
LIMIT 1;

-- Résultat attendu: Utilisation de l'index idx_batches_product_expiry
```

---

#### **✅ Livrables Attendus**

1. **Rapport de performance** :
   - Fichier `tasks/REC-006_PERFORMANCE_REPORT.md`
   - Contenu :
     - Jeu de données utilisé (nombre de produits, lots, ventes)
     - Temps d'exécution de chaque requête testée
     - Plans d'exécution (EXPLAIN ANALYZE)
     - Recommandations d'optimisation si nécessaire

2. **Validation** :
   - [ ] Toutes les requêtes FEFO < 20ms
   - [ ] Index utilisés correctement
   - [ ] Aucune requête séquentielle (Seq Scan)

---

---

## 📅 **Calendrier et Priorités**

| **Tâche** | **Durée** | **Priorité** | **Échéance** | **Statut** | **Dépendances** |
|-----------|-----------|--------------|--------------|------------|----------------|
| REC-004 | 2-3h | ⭐⭐⭐⭐ | J3 | ⏳ | ARCH-002 |
| REC-005 | 1h | ⭐⭐⭐ | J3 | ⏳ | REC-004 |
| REC-006 | 1-2h | ⭐⭐ | J4 | ⏳ | REC-004, REC-005 |

**Total estimé** : **4-6 heures** (à répartir sur J3-J4)

---

## 🎯 **Objectifs**

- ✅ **Valider la configuration Docker** pour PostgreSQL
- ✅ **Garantir la performance** des requêtes FEFO/FIFO
- ✅ **Préparer l'environnement** pour le développement Backend/Frontend
- ✅ **Éviter les problèmes** de déploiement

---

## 📚 **Ressources Utiles**

1. **Fichiers à utiliser** :
   - [`scripts/init-db.sql`](https://github.com/DuDuEZN/Pharma-360/blob/main/scripts/init-db.sql)
   - [`docs/ARCH-002_POSTGRESQL.md`](https://github.com/DuDuEZN/Pharma-360/blob/main/docs/ARCH-002_POSTGRESQL.md)
   - [`tasks/RECOMMENDATIONS_ARCH-002.md`](https://github.com/DuDuEZN/Pharma-360/blob/main/tasks/RECOMMENDATIONS_ARCH-002.md)

2. **Documentation PostgreSQL** :
   - [Index](https://www.postgresql.org/docs/current/indexes.html)
   - [EXPLAIN ANALYZE](https://www.postgresql.org/docs/current/using-explain.html)
   - [Performance Tuning](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server)

3. **Outils** :
   - Docker
   - PostgreSQL (psql)
   - pgAdmin (optionnel)

---

## ✅ **Checklist de Validation**

### **Pour REC-004**
- [ ] Conteneur PostgreSQL lancé
- [ ] Script `init-db.sql` exécuté sans erreur
- [ ] Toutes les tables créées
- [ ] Tous les triggers fonctionnels
- [ ] Rapport de test généré

### **Pour REC-005**
- [ ] Tous les index vérifiés
- [ ] Aucun index manquant
- [ ] Rapport de vérification généré

### **Pour REC-006**
- [ ] Jeu de données de test inséré
- [ ] Toutes les requêtes FEFO testées
- [ ] Temps d'exécution < 20ms
- [ ] Index utilisés correctement
- [ ] Rapport de performance généré

### **Validation Finale**
- [ ] Tous les rapports générés
- [ ] Aucune erreur critique
- [ ] Performance validée

---

## 📞 **Support et Communication**

| **Question** | **Contact** | **Canal** |
|--------------|-------------|-----------|
| Problème avec PostgreSQL | Superviseur | `#architecture` |
| Intégration avec Docker | Superviseur | `#architecture` |
| Validation des index | Backend Lead | `#backend` |
| Performance des requêtes | Backend Lead | `#backend` |

---

## 🚀 **Prochaines Étapes Après J4**

1. **J4** :
   - Finaliser REC-006
   - Valider avec Superviseur et Backend Lead

2. **J5** :
   - **Démarrer QA-004** (docker-compose.yml) si REC-004 est validé
   - Préparer l'environnement complet

---

## 💡 **Conseils**

1. **Testez en local** :
   ```bash
   # Lancer PostgreSQL en Docker
   docker run -d --name test-db -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:15-alpine
   
   # Exécuter le script
   psql -h localhost -U postgres -f scripts/init-db.sql
   
   # Tester les requêtes
   psql -h localhost -U postgres
   ```

2. **Utilisez EXPLAIN ANALYZE** :
   ```sql
   EXPLAIN ANALYZE SELECT * FROM batches WHERE product_id = 1 ORDER BY expiry_date ASC LIMIT 1;
   ```

3. **Documentez tout** :
   - Créez des rapports détaillés pour chaque recommandation
   - Utilisez des tableaux pour les résultats
   - Ajoutez des captures d'écran si nécessaire

---

**Document créé** : 2025-01-06 (J2)  
**Responsable** : `agent-qa-quality-assurance-devops-engineer`  
**Échéance** : J3-J4 (2025-01-07 à 2025-01-08)  
**Statut** : ⏳ **À DÉMARRER**

---

**© 2025 Pharmacie 360° - Tous droits réservés**
