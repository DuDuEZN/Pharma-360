# Migration d'un autre ERP vers Pharma-360

Ce guide décrit comment migrer l'inventaire (et les données associées) d'un
autre ERP vers Pharma-360. La migration se fait en **plusieurs étapes**,
dans un ordre précis, pour respecter les dépendances entre domaines.

## Ordre recommandé

1. **Catégories** (référentiel).
2. **Fournisseurs**.
3. **Produits** (avec leur catégorie).
4. **Clients** (optionnel, si on veut migrer l'historique).
5. **Stock / lots** (via l'import CSV).
6. **Historique de ventes** (optionnel, lecture seule recommandée).

## 1. Catégories et fournisseurs

Pas d'import en masse pour l'instant : les créer via l'interface
(`/products/categories` n'est pas exposé en CRUD direct ; les catégories
sont créées automatiquement lors de l'ajout de produits, ou via SQL).

Fournisseurs : créer via `/manager/suppliers` (interface) ou via l'API
`POST /api/v1/suppliers/`.

## 2. Produits (API)

Pharma-360 n'a pas d'import CSV pour les produits. Utiliser l'API
authentifiée `POST /api/v1/products/` avec le payload `ProductCreate`.

Champs principaux :
- `name` (obligatoire), `dci`, `code`, `barcode`
- `category_id`, `description`, `manufacturer`
- `price`, `cost_price`, `stock_min`, `stock_max`
- `unit`, `is_active`, `requires_prescription`
- `is_bulk`, `units_per_box`, `bulk_price`

Un script modèle est fourni : `scripts/migration/import_products.py`.

### Étapes
1. Exporter la liste des produits de l'ancien ERP en CSV.
2. Adapter le CSV au format attendu (voir le script).
3. Obtenir un token JWT (`POST /api/v1/auth/login`).
4. Lancer `python import_products.py --csv produits.csv --token <JWT>`.
5. Vérifier dans `/products`.

**Important** : conserver une table de correspondance `ancien_code → nouvel_id`
pour l'étape du stock.

## 3. Clients (optionnel)

Créer via `POST /api/v1/customers/` (champs : `name`, `contact`, `email`,
`phone`, `address`, `city`, `country`, `tax_id`). Un script similaire peut
être écrit en s'inspirant de `import_products.py`.

## 4. Stock / lots (import CSV natif)

Pharma-360 possède un import CSV natif : **Stock → Importer CSV** (ou
`POST /api/v1/inventory/import`).

### Format CSV requis

```csv
product_id,batch_number,quantity,expiry_date,location
1,LOT-001,100,2027-12-31,Réception
2,LOT-002,50,2026-06-30,Étagère A
```

Colonnes obligatoires : `product_id`, `batch_number`, `quantity`, `expiry_date`.
Colonne optionnelle : `location` (défaut : `Réception`).

Règles :
- `product_id` doit exister dans Pharma-360 (d'où l'étape 2).
- `batch_number` doit être unique.
- `expiry_date` au format ISO `YYYY-MM-DD`.
- Le fichier doit être encodé en UTF-8.
- Les lots expirés sont acceptés mais marqués comme tels.

Un modèle est fourni : `scripts/migration/stock_template.csv`.

## 5. Historique de ventes (optionnel)

Non recommandé en masse (complexité des lots FEFO). Si nécessaire :
- Réinjecter via `POST /api/v1/sales/` avec les données historiques.
- Attention : cela décrémentera le stock. À faire **avant** l'import de stock,
  ou désactiver temporairement la gestion de stock.

## 6. Vérification post-migration

1. Comparer les totaux : nombre de produits, quantités totales par produit,
   nombre de clients.
2. Vérifier les alertes de stock bas et de péremption.
3. Tester une vente complète (scan, FEFO, paiement, ticket).
4. Sauvegarder la base (`scripts/backup-db.sh`).

## Rollback

- Avant la migration, faire un backup complet :
  ```bash
  docker compose exec pharma360-db pg_dump -U pharma_admin pharma360_prod > backup_pre_migration.sql
  ```
- En cas d'échec, restaurer :
  ```bash
  docker compose exec -T pharma360-db psql -U pharma_admin pharma360_prod < backup_pre_migration.sql
  ```

## Conseils

- Faire la migration sur un **environnement de test** d'abord.
- Garder l'ancien ERP en lecture seule pendant la transition.
- Migrer par lots (ex. une catégorie à la fois) plutôt qu'en une fois.
- Documenter la table de correspondance des codes pour la traçabilité.
