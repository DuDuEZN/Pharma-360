"""Module métier Stock — bloc autonome du monolithe modulaire.

API publique du module :
- ``router`` : les endpoints FastAPI du domaine ;
- ``InventoryService`` / ``inventory_service`` : les cas d'usage ;
- ``schemas`` : les contrats d'entrée/sortie ;
- ``models`` : les modèles exposés (lots et mouvements).

Aucun autre module ne doit importer les fichiers internes ``router``,
``service`` ou ``schemas`` directement : il doit passer par ce point d'entrée.
"""

from .router import router
from .service import InventoryService, inventory_service
from . import models, schemas

__all__ = ["router", "InventoryService", "inventory_service", "models", "schemas"]
