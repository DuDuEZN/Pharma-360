"""Modules métier de Pharma-360.

Architecture cible : monolithe modulaire par domaine. Chaque dossier expose
une API publique via son ``__init__.py`` ; les autres domaines ne doivent pas
importer ses fichiers internes.
"""

from .registry import MODULES, ModuleSpec, enabled_modules, get_module

__all__ = ["MODULES", "ModuleSpec", "enabled_modules", "get_module"]
