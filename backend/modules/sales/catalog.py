"""Port du module Ventes vers le catalogue produits.

Le module Ventes ne dépend pas directement de l'implémentation interne du
catalogue : ce fichier est son unique point de contact. Lors de la migration
du domaine Catalogue, seul cet adaptateur sera remplacé par le contrat public
du module Catalogue.

Les imports sont volontairement paresseux pour éviter tout cycle
d'initialisation entre ``backend.services`` et ``backend.modules.sales``.
"""


class CatalogPort:
    """Adaptateur temporaire vers l'ancien ``ProductService``."""

    @staticmethod
    async def get_product_by_id(*args, **kwargs):
        from ...services.product_service import ProductService

        return await ProductService.get_product_by_id(*args, **kwargs)

    @staticmethod
    async def get_fefo_batch(*args, **kwargs):
        from ...services.product_service import ProductService

        return await ProductService.get_fefo_batch(*args, **kwargs)

    @staticmethod
    async def get_batch_for_bulk(*args, **kwargs):
        from ...services.product_service import ProductService

        return await ProductService.get_batch_for_bulk(*args, **kwargs)


catalog = CatalogPort()


__all__ = ["CatalogPort", "catalog"]
