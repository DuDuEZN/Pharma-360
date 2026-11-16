"""Module métier Rapports — bloc autonome du monolithe modulaire.

API publique du module :
- ``router`` : les endpoints FastAPI du domaine (rapports et rapports
  gestionnaire) ;
- ``ReportService`` : les cas d'usage ;
- ``schemas`` : les contrats d'entrée/sortie ;
- ``models`` : le modèle exposé (réexporté pour l'instant).

Aucun autre module ne doit importer les fichiers internes ``router``,
``reports_router``, ``manager_router``, ``service`` ou ``schemas`` directement :
il doit passer par ce point d'entrée.
"""

from .router import router
from .service import ReportService, report_service
from . import models, schemas

__all__ = ["router", "ReportService", "report_service", "models", "schemas"]
