"""Module métier Ventes — bloc autonome du monolithe modulaire.

API publique du module :
- ``router`` : les endpoints FastAPI du domaine ;
- ``SaleService`` / ``sale_service`` : les cas d'usage ;
- ``schemas`` : les contrats d'entrée/sortie ;
- ``models`` : les modèles exposés (réexportés pour l'instant).

Aucun autre module ne doit importer les fichiers internes ``router``,
``service``, ``schemas`` ou ``catalog`` directement : il doit passer par ce
point d'entrée.
"""

from .router import router
from .service import SaleService, sale_service
from . import models, schemas

__all__ = ["router", "SaleService", "sale_service", "models", "schemas"]
