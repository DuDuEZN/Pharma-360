# Architecture â€” monolithe modulaire par domaine

Pharma-360 Ã©volue d'un monolithe organisÃ© **par couche technique**
(`api/`, `services/`, `models/`, `schemas/`) vers un **monolithe modulaire
par domaine mÃ©tier**. L'objectif est de rendre chaque domaine remplaÃ§able et
activables par licence, sans introduire de microservices ni de refonte
big-bang.

## Principes

1. **Un dÃ©ploiement, une base.** Les modules partagent le mÃªme processus
   FastAPI, le mÃªme frontend et la mÃªme base PostgreSQL.
2. **Un module = un dossier mÃ©tier.** Chaque module possÃ¨de son routeur, son
   service, ses schÃ©mas et son point d'entrÃ©e public.
3. **API publique explicite.** Les autres domaines n'importent que
   `backend.modules.<domaine>` (son `__init__.py`), jamais ses fichiers
   internes.
4. **Ports pour les dÃ©pendances croisÃ©es.** Un module ne dÃ©pend pas de
   l'implÃ©mentation interne d'un autre module : il passe par un port
   (interface/adaptateur), par exemple `modules/sales/catalog.py`.
5. **CompatibilitÃ© ascendante.** Les anciens chemins d'import restent valides
   via des shims pendant toute la migration.
6. **Activation par registre.** Chaque module est dÃ©clarÃ© dans
   `backend/modules/registry.py`, avec un flag d'activation et une clÃ© de
   licence.

## Structure backend

```text
backend/
  modules/
    registry.py            # registre des modules + flags + licence
    cash/                  # module Caisse
      __init__.py          # API publique du module
      router.py            # endpoints du domaine
      service.py           # cas d'usage mÃ©tier
      schemas.py           # contrats Pydantic du domaine
      models.py            # modÃ¨le exposÃ© (rÃ©exportÃ© en phase 1)
    cash/                  # module Caisse
      __init__.py          # API publique du module
      router.py            # endpoints du domaine
      service.py           # cas d'usage mÃ©tier
      schemas.py           # contrats Pydantic du domaine
      models.py            # modÃ¨le exposÃ© (rÃ©exportÃ© en phase 1)
    catalog/               # module Catalogue
      __init__.py          # API publique du module
      router.py            # endpoints du domaine
      service.py           # cas d'usage mÃ©tier
      schemas.py           # contrats Pydantic du domaine
      models.py            # modÃ¨les exposÃ©s (rÃ©exportÃ©s en phase 1)
    customers/             # module Clients
      __init__.py          # API publique du module
      router.py            # endpoints du domaine
      service.py           # cas d'usage mÃ©tier
      schemas.py           # contrats Pydantic du domaine
      models.py            # modÃ¨le exposÃ© (rÃ©exportÃ© en phase 1)
    inventory/             # module Stock
      __init__.py          # API publique du module
      router.py            # endpoints du domaine
      service.py           # cas d'usage mÃ©tier
      schemas.py           # contrats Pydantic du domaine
      models.py            # modÃ¨les exposÃ©s (lots et mouvements)
    orders/                # module Commandes / Achats
      __init__.py          # API publique du module
      router.py            # endpoints du domaine
      service.py           # cas d'usage mÃ©tier
      schemas.py           # contrats Pydantic du domaine
      models.py            # modÃ¨les exposÃ©s (rÃ©exportÃ©s en phase 1)
    reports/               # module Rapports
      __init__.py          # API publique du module
      router.py            # routeur composite (/reports + /manager/reports)
      reports_router.py    # endpoints rapports standards
      manager_router.py    # endpoints rapports gestionnaire
      service.py           # cas d'usage mÃ©tier
      schemas.py           # contrats Pydantic du domaine
      models.py            # modÃ¨le exposÃ© (rÃ©exportÃ© en phase 1)
    sales/                 # module Ventes
      __init__.py          # API publique du module
      router.py            # endpoints du domaine
      service.py           # cas d'usage mÃ©tier
      schemas.py           # contrats Pydantic du domaine
      models.py            # modÃ¨les exposÃ©s (rÃ©exportÃ©s en phase 1)
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

`ModuleSpec` dÃ©crit un bloc :

| Champ | RÃ´le |
|---|---|
| `name` | identifiant du module (`sales`) |
| `router` | routeur FastAPI inclus dans l'application |
| `enabled` | activation effective |
| `depends_on` | dÃ©pendances dÃ©claratives entre modules |
| `license_feature` | clÃ© de licence/abonnement |
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

`enabled_modules()` renvoie les modules actifs **dont toutes les dÃ©pendances
sont actives**. Les dÃ©pendances dÃ©clarÃ©es sont :

```text
catalog     -> (aucune)
inventory   -> catalog
orders      -> catalog
sales       -> catalog
cash        -> sales
customers   -> sales
```

DÃ©sactiver le Catalogue dÃ©sactive donc Ventes, Clients, Caisse, Commandes et Stock en cascade.

`backend/main.py` inclut automatiquement leur routeur sous le prÃ©fixe
`/api/v1`.

### Ajouter un module

1. CrÃ©er `backend/modules/<domaine>/` avec `router.py`, `service.py`,
   `schemas.py`, `models.py` et `__init__.py`.
2. Exposer uniquement l'API publique dans `__init__.py`.
3. Isoler les dÃ©pendances croisÃ©es derriÃ¨re un port.
4. Enregistrer un `ModuleSpec` dans `registry.py`.
5. CrÃ©er les shims des anciens chemins si nÃ©cessaire.
6. Ajouter un test de registre/module.

## Structure frontend

```text
frontend/src/
  features/
    cash/
      index.js             # manifeste public du module
      api.js               # couche d'accÃ¨s au domaine
      pages/               # Ã©crans du domaine
    catalog/
      index.js             # manifeste public du module
      api.js               # couche d'accÃ¨s au domaine
      pages/               # Ã©crans du domaine
    customers/
      index.js             # manifeste public du module
      api.js               # couche d'accÃ¨s au domaine
      pages/               # Ã©crans du domaine
    inventory/
      index.js             # manifeste public du module
      api.js               # couche d'accÃ¨s au domaine
      pages/               # Ã©crans du domaine
    orders/
      index.js             # manifeste public du module
      api.js               # couche d'accÃ¨s au domaine
      pages/               # Ã©crans du domaine
    reports/
      index.js             # manifeste public du module
      api.js               # couche d'accÃ¨s au domaine
      pages/               # Ã©crans du domaine
    sales/
      index.js             # manifeste public du module
      api.js               # couche d'accÃ¨s au domaine
      pages/               # Ã©crans du domaine
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

Le manifeste expose les pages, les composants, l'API et l'entrÃ©e de
navigation. `App.jsx` et `Sidebar.jsx` consomment le module via
`@/features/sales`, plus via les anciens chemins.

### RÃ¨gles frontend

- Les appels au domaine passent par `features/<domaine>/api.js`.
- Les appels Ã  d'autres domaines (produits, clientsâ€¦) restent explicites et
  seront progressivement remplacÃ©s par les API des modules correspondants.
- Les pages ne doivent pas importer les fichiers internes d'un autre module.

## Ã‰tat de la migration

| Domaine | Backend | Frontend | Statut |
|---|---|---|---|
| Catalogue | `modules/catalog/` | `features/catalog/` | âœ… MigrÃ© |
| Ventes | `modules/sales/` | `features/sales/` | âœ… Pilote |
| Clients | `modules/customers/` | `features/customers/` | âœ… MigrÃ© |
| Stock | `modules/inventory/` | `features/inventory/` | âœ… MigrÃ© |
| Caisse | `modules/cash/` | `features/cash/` | âœ… MigrÃ© |
| Achats / commandes | `modules/orders/` | `features/orders/` | âœ… MigrÃ© |
| Rapports | `services/report_service.py` | `pages/manager/*Page.jsx` | â³ Ã€ migrer |

## CompatibilitÃ©

Les shims suivants restent valides et seront supprimés après migration complète :

- `backend.api.v1.cash` → `backend.modules.cash.router`
- `backend.services.cash_service` → `backend.modules.cash.service`
- `backend.schemas.cash` → `backend.modules.cash.schemas`
- `backend.api.v1.customers` → `backend.modules.customers.router`
- `backend.services.customer_service` → `backend.modules.customers.service`
- `backend.schemas.customer` → `backend.modules.customers.schemas`
- `backend.api.v1.inventory` → `backend.modules.inventory.router`
- `backend.services.inventory_service` → `backend.modules.inventory.service`
- `backend.schemas.inventory` → `backend.modules.inventory.schemas`
- `backend.api.v1.orders` → `backend.modules.orders.router`
- `backend.services.order_service` → `backend.modules.orders.service`
- `backend.schemas.order` → `backend.modules.orders.schemas`
- `backend.api.v1.products` → `backend.modules.catalog.router`
- `backend.services.product_service` → `backend.modules.catalog.service`
- `backend.schemas.product` → `backend.modules.catalog.schemas`
- `backend.api.v1.reports` → `backend.modules.reports.router`
- `backend.api.v1.manager_reports` → `backend.modules.reports.router`
- `backend.services.report_service` → `backend.modules.reports.service`
- `backend.schemas.report` → `backend.modules.reports.schemas`
- `backend.api.v1.sales` → `backend.modules.sales.router`
- `backend.services.sale_service` → `backend.modules.sales.service`
- `backend.schemas.sale` → `backend.modules.sales.schemas`
- `frontend/src/pages/CashierPage.jsx` → `features/cash`
- `frontend/src/pages/ProductsPage.jsx` → `features/catalog`
- `frontend/src/pages/ProductFormPage.jsx` → `features/catalog`
- `frontend/src/pages/CustomersPage.jsx` → `features/customers`
- `frontend/src/pages/manager/InventoryPage.jsx` → `features/inventory`
- `frontend/src/pages/manager/OrdersPage.jsx` → `features/orders`
- `frontend/src/pages/manager/OrderFormPage.jsx` → `features/orders`
- `frontend/src/pages/admin/ReportsPage.jsx` → `features/reports`
- `frontend/src/pages/manager/ReportsPage.jsx` → `features/reports`
- `frontend/src/pages/manager/ReportFormPage.jsx` → `features/reports`
- `frontend/src/pages/SalesPage.jsx` → `features/sales`
- `frontend/src/pages/SaleFormPage.jsx` → `features/sales`
- `frontend/src/components/sales/BulkLabelSheet.jsx` → `features/sales`
