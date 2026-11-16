"""Module métier Commandes / Achats — bloc autonome du monolithe modulaire.

API publique du module :
- ``router`` : les endpoints FastAPI du domaine ;
- ``OrderService`` / ``DeliveryService`` : les cas d'usage ;
- ``schemas`` : les contrats d'entrée/sortie ;
- ``models`` : les modèles exposés (réexportés pour l'instant).

Aucun autre module ne doit importer les fichiers internes ``router``,
``service`` ou ``schemas`` directement : il doit passer par ce point d'entrée.
"""

from .router import router
from .service import DeliveryService, OrderService
from . import models, schemas

__all__ = [
    "router",
    "OrderService",
    "DeliveryService",
    "models",
    "schemas",
]
