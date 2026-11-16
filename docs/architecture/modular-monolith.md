# Architecture — monolithe modulaire par domaine

Pharma-360 évolue d'un monolithe organisé **par couche technique**
(`api/`, `services/`, `models/`, `schemas/`) vers un **monolithe modulaire
par domaine métier**. L'objectif est de rendre chaque domaine remplaçable et
activables par licence, sans introduire de microservices ni de refonte
big-bang.

## Principes

1. **Un déploiement, une base.** Les modules partagent le même processus
   FastAPI, le même frontend et la même base PostgreSQL.
2. **Un module = un dossier métier.** Chaque module possède son routeur, son
   service, ses schémas et son point d'entrée public.
3. **API publique explicite.** Les autres domaines n'importent que
   `backend.modules.<domaine>` (son `__init__.py`), jamais ses fichiers
   internes.
4. **Ports pour les dépendances croisées.** Un module ne dépend pas de
   l'implémentation interne d'un autre module : il passe par un port
   (interface/adaptateur), par exemple `modules/sales/catalog.py`.
5. **Compatibilité ascendante.** Les anciens chemins d'import restent valides
   via des shims pendant toute la migration.
6. **Activation par registre.** Chaque module est déclaré dans
   `backend/modules/registry.py`, avec un flag d'activation et une clé de
   licence.

## Structure backend

```text
backend/
  modules/
    registry.py            # registre des modules + flags + licence
    cash/                  # module Caisse
      __init__.py          # API publique du module
      router.py            # endpoints du domaine
      service.py           # cas d'usage métier
      schemas.py           # contrats Pydantic du domaine
      models.py            # modèle exposé (réexporté en phase 1)
    cash/                  # module Caisse
      __init__.py          # API publique du module
      router.py            # endpoints du domaine
      service.py           # cas d'usage métier
      schemas.py           # contrats Pydantic du domaine
      models.py            # modèle exposé (réexporté en phase 1)
    catalog/               # module Catalogue
      __init__.py          # API publique du module
      router.py            # endpoints du domaine
      service.py           # cas d'usage métier
      schemas.py           # contrats Pydantic du domaine
      models.py            # modèles exposés (réexportés en phase 1)
    customers/             # module Clients
      __init__.py          # API publique du module
      router.py            # endpoints du domaine
      service.py           # cas d'usage métier
      schemas.py           # contrats Pydantic du domaine
      models.py            # modèle exposé (réexporté en phase 1)
    inventory/             # module Stock
      __init__.py          # API publique du module
      router.py            # endpoints du domaine
      service.py           # cas d'usage métier
      schemas.py           # contrats Pydantic du domaine
      models.py            # modèles exposés (lots et mouvements)
    sales/                 # module Ventes
      __init__.py          # API publique du module
      router.py            # endpoints du domaine
      service.py           # cas d'usage métier
      schemas.py           # contrats Pydantic du domaine
      models.py            # modèles exposés (réexportés en phase 1)
      catalog.py           # port vers le domaine Catalogue
  api/v1/
    cash.py                # shim -> backend.modules.cash.router
    customers.py           # shim -> backend.modules.customers.router
    inventory.py           # shim -> backend.modules.inventory.router
    orders.py              # shim -> backend.modules.orders.router
    products.py            # shim -> backend.modules.catalog.router
    sales.py               # shim -> backend.modules.sales.router
  services/
    cash_service.py        # shim -> backend.modules.cash.service
    customer_service.py    # shim -> backend.modules.customers.service
    inventory_service.py   # shim -> backend.modules.inventory.service
    order_service.py       # shim -> backend.modules.orders.service
    product_service.py     # shim -> backend.modules.catalog.service
    sale_service.py        # shim -> backend.modules.sales.service
  schemas/
    cash.py                # shim -> backend.modules.cash.schemas
    customer.py            # shim -> backend.modules.customers.schemas
    inventory.py           # shim -> backend.modules.inventory.schemas
    order.py               # shim -> backend.modules.orders.schemas
    product.py             # shim -> backend.modules.catalog.schemas
    sale.py                # shim -> backend.modules.sales.schemas
```

### Registre de modules

`ModuleSpec` décrit un bloc :

| Champ | Rôle |
|---|---|
| `name` | identifiant du module (`sales`) |
| `router` | routeur FastAPI inclus dans l'application |
| `enabled` | activation effective |
| `depends_on` | dépendances déclaratives entre modules |
| `license_feature` | clé de licence/abonnement |
| `description` | description lisible |

L'activation se fait par variable d'environnement :

```text
MODULE_CASH_ENABLED=true|false
MODULE_CATALOG_ENABLED=true|false
MODULE_CUSTOMERS_ENABLED=true|false
MODULE_INVENTORY_ENABLED=true|false
MODULE_ORDERS_ENABLED=true|false
MODULE_SALES_ENABLED=true|false
```

`enabled_modules()` renvoie les modules actifs **dont toutes les dépendances
sont actives**. Les dépendances déclarées sont :

```text
catalog     -> (aucune)
inventory   -> catalog
orders      -> catalog
sales       -> catalog
cash        -> sales
customers   -> sales
```

Désactiver le Catalogue désactive donc Ventes, Clients, Caisse, Commandes et Stock en cascade.

`backend/main.py` inclut automatiquement leur routeur sous le préfixe
`/api/v1`.

### Ajouter un module

1. Créer `backend/modules/<domaine>/` avec `router.py`, `service.py`,
   `schemas.py`, `models.py` et `__init__.py`.
2. Exposer uniquement l'API publique dans `__init__.py`.
3. Isoler les dépendances croisées derrière un port.
4. Enregistrer un `ModuleSpec` dans `registry.py`.
5. Créer les shims des anciens chemins si nécessaire.
6. Ajouter un test de registre/module.

## Structure frontend

```text
frontend/src/
  features/
    cash/
      index.js             # manifeste public du module
      api.js               # couche d'accès au domaine
      pages/               # écrans du domaine
    catalog/
      index.js             # manifeste public du module
      api.js               # couche d'accès au domaine
      pages/               # écrans du domaine
    customers/
      index.js             # manifeste public du module
      api.js               # couche d'accès au domaine
      pages/               # écrans du domaine
    inventory/
      index.js             # manifeste public du module
      api.js               # couche d'accès au domaine
      pages/               # écrans du domaine
    orders/
      index.js             # manifeste public du module
      api.js               # couche d'accès au domaine
      pages/               # écrans du domaine
    sales/
      index.js             # manifeste public du module
      api.js               # couche d'accès au domaine
      pages/               # écrans du domaine
      components/          # composants du domaine
  pages/
    CashierPage.jsx        # shim -> features/cash
    ProductsPage.jsx       # shim -> features/catalog
    ProductFormPage.jsx    # shim -> features/catalog
    CustomersPage.jsx      # shim -> features/customers
    InventoryPage.jsx      # shim -> features/inventory (pages/manager/)
    SalesPage.jsx          # shim -> features/sales
    SaleFormPage.jsx       # shim -> features/sales
  pages/manager/
    OrdersPage.jsx         # shim -> features/orders
    OrderFormPage.jsx      # shim -> features/orders
```

Le manifeste expose les pages, les composants, l'API et l'entrée de
navigation. `App.jsx` et `Sidebar.jsx` consomment le module via
`@/features/sales`, plus via les anciens chemins.

### Règles frontend

- Les appels au domaine passent par `features/<domaine>/api.js`.
- Les appels à d'autres domaines (produits, clients…) restent explicites et
  seront progressivement remplacés par les API des modules correspondants.
- Les pages ne doivent pas importer les fichiers internes d'un autre module.

## État de la migration

| Domaine | Backend | Frontend | Statut |
|---|---|---|---|
| Catalogue | `modules/catalog/` | `features/catalog/` | ✅ Migré |
| Ventes | `modules/sales/` | `features/sales/` | ✅ Pilote |
| Clients | `modules/customers/` | `features/customers/` | ✅ Migré |
| Stock | `modules/inventory/` | `features/inventory/` | ✅ Migré |
| Caisse | `modules/cash/` | `features/cash/` | ✅ Migré |
| Achats / commandes | `modules/orders/` | `features/orders/` | ✅ Migré |
| Rapports | `services/report_service.py` | `pages/manager/*Page.jsx` | ⏳ À migrer |

## Compatibilité

Les shims suivants restent valides et seront supprimés après migration
complète :

- `backend.api.v1.sales` → `backend.modules.sales.router`
- `backend.services.sale_service` → `backend.modules.sales.service`
- `backend.schemas.sale` → `backend.modules.sales.schemas`
- `backend.api.v1.products` → `backend.modules.catalog.router`
- `backend.services.product_service` → `backend.modules.catalog.service`
- `backend.schemas.product` → `backend.modules.catalog.schemas`
- `backend.api.v1.cash` → `backend.modules.cash.router`
- `backend.services.cash_service` → `backend.modules.cash.service`
- `backend.schemas.cash` → `backend.modules.cash.schemas`
- `backend.api.v1.customers` → `backend.modules.customers.router`
- `backend.services.customer_service` → `backend.modules.customers.service`
- `backend.schemas.customer` → `backend.modules.customers.schemas`
- `backend.api.v1.inventory` → `backend.modules.inventory.router`
- `backend.services.inventory_service` → `backend.modules.inventory.service`
- `backend.schemas.inventory` → `backend.modules.inventory.schemas`
- `backend.api.v1.cash` → `backend.modules.cash.router`
- `backend.services.cash_service` → `backend.modules.cash.service`
- `backend.schemas.cash` → `backend.modules.cash.schemas`
- `frontend/src/pages/CashierPage.jsx` → `features/cash`
- `frontend/src/pages/ProductFormPage.jsx` → `features/catalog`
- `frontend/src/pages/CustomersPage.jsx` → `features/customers`
- `frontend/src/pages/SalesPage.jsx` → `features/sales`
- `frontend/src/pages/SaleFormPage.jsx` → `features/sales`
- `frontend/src/components/sales/BulkLabelSheet.jsx` → `features/sales`
