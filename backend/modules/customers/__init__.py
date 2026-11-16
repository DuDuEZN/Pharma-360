"""Module métier Clients — bloc autonome du monolithe modulaire.

API publique du module :
- ``router`` : les endpoints FastAPI du domaine ;
- ``CustomerService`` / ``customer_service`` : les cas d'usage ;
- ``schemas`` : les contrats d'entrée/sortie ;
- ``models`` : le modèle exposé (réexporté pour l'instant).

Aucun autre module ne doit importer les fichiers internes ``router``,
``service`` ou ``schemas`` directement : il doit passer par ce point d'entrée.
"""

from .router import router
from .service import CustomerService, customer_service
from . import models, schemas

__all__ = ["router", "CustomerService", "customer_service", "models", "schemas"]
