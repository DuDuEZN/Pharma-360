"""Règles métier pures de la vente (testables sans base de données).

Cette couche centralise les calculs qui doivent rester identiques côté
backend et côté interface :

- part assurance / part client par ligne, avec verrou ``is_reimbursable`` ;
- TVA par ligne et proratisation de la remise ;
- verrou ordonnance ;
- disponibilité réelle d'un lot (physique - réservé).

Aucune dépendance à SQLAlchemy ni à FastAPI : uniquement des valeurs.
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Iterable, Mapping, Optional

MONEY = Decimal("0.01")
ZERO = Decimal("0")
HUNDRED = Decimal("100")

PRESCRIPTION_TYPES = ("SIMPLE", "ASSURANCE")


def as_decimal(value) -> Decimal:
    """Convertit une valeur numérique (str, float, Decimal, None) en Decimal."""
    if value is None:
        return ZERO
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def money(value) -> Decimal:
    """Arrondit au centime (arrondi commercial)."""
    return as_decimal(value).quantize(MONEY, rounding=ROUND_HALF_UP)


def normalize_rate(rate) -> Decimal:
    """Borne un taux de couverture dans l'intervalle 0–100 %."""
    value = as_decimal(rate)
    if value <= ZERO:
        return ZERO
    if value >= HUNDRED:
        return HUNDRED
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def effective_insurance_rate(
    *,
    is_reimbursable: bool = True,
    insurance_mode: bool = False,
    coverage_rate=0,
) -> Decimal:
    """Taux réellement appliqué à une ligne.

    Le mode assurance et l'éligibilité produit sont tous deux nécessaires.
    Un produit ``is_reimbursable=False`` est donc forcé à 0 %, même si le
    client bénéficie d'un taux élevé.
    """
    if not insurance_mode or not is_reimbursable:
        return ZERO
    return normalize_rate(coverage_rate)


@dataclass(frozen=True)
class LinePricing:
    """Résultat du calcul d'une ligne de panier."""

    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total: Decimal
    insurance_rate: Decimal
    insurance_amount: Decimal
    patient_amount: Decimal
    is_reimbursable: bool


def price_line(
    *,
    unit_price,
    quantity,
    tax_rate=0,
    apply_tax: bool = True,
    is_reimbursable: bool = True,
    insurance_mode: bool = False,
    coverage_rate=0,
) -> LinePricing:
    """Calcule une ligne : sous-total, TVA, total, part assurance et part client.

    La part assurance est calculée sur le total de ligne hors TVA. La part
    client complète le total TTC : ``patient = total TTC - assurance``.
    """
    qty = int(quantity or 0)
    subtotal = money(as_decimal(unit_price) * qty)
    line_tax_rate = normalize_rate(tax_rate) if apply_tax else ZERO
    tax_amount = money(subtotal * line_tax_rate / HUNDRED)
    total = money(subtotal + tax_amount)

    rate = effective_insurance_rate(
        is_reimbursable=is_reimbursable,
        insurance_mode=insurance_mode,
        coverage_rate=coverage_rate,
    )
    insurance_amount = money(subtotal * rate / HUNDRED)
    if insurance_amount > total:
        insurance_amount = total
    patient_amount = money(total - insurance_amount)

    return LinePricing(
        subtotal=subtotal,
        tax_rate=line_tax_rate,
        tax_amount=tax_amount,
        total=total,
        insurance_rate=rate,
        insurance_amount=insurance_amount,
        patient_amount=patient_amount,
        is_reimbursable=bool(is_reimbursable),
    )


@dataclass(frozen=True)
class SaleTotals:
    """Totaux d'une vente après remise."""

    subtotal: Decimal
    discount: Decimal
    tax_amount: Decimal
    total: Decimal
    insurance_amount: Decimal
    patient_amount: Decimal
    ratio: Decimal


def aggregate_sale(pricings: Iterable[LinePricing], discount=0) -> SaleTotals:
    """Agrège les lignes et proratise remise, TVA et part assurance.

    La remise est répartie proportionnellement sur le sous-total. La part
    assurance suit la même proratisation afin de ne jamais dépasser le total.
    """
    lines = list(pricings)
    gross_subtotal = money(sum((line.subtotal for line in lines), ZERO))
    gross_tax = money(sum((line.tax_amount for line in lines), ZERO))
    gross_insurance = money(sum((line.insurance_amount for line in lines), ZERO))

    discount_amount = money(discount)
    if discount_amount < ZERO:
        discount_amount = ZERO
    if discount_amount > gross_subtotal:
        discount_amount = gross_subtotal

    ratio = ZERO
    if gross_subtotal > ZERO:
        ratio = (gross_subtotal - discount_amount) / gross_subtotal

    tax_amount = money(gross_tax * ratio)
    total = money(gross_subtotal - discount_amount + tax_amount)
    insurance_amount = money(gross_insurance * ratio)
    if insurance_amount > total:
        insurance_amount = total
    patient_amount = money(total - insurance_amount)

    return SaleTotals(
        subtotal=gross_subtotal,
        discount=discount_amount,
        tax_amount=tax_amount,
        total=total,
        insurance_amount=insurance_amount,
        patient_amount=patient_amount,
        ratio=ratio,
    )


def requires_prescription(products: Iterable) -> bool:
    """Vrai dès qu'un produit du panier exige une ordonnance."""
    return any(bool(getattr(product, "requires_prescription", False)) for product in products)


def prescription_errors(prescription) -> list[str]:
    """Liste les champs manquants d'une ordonnance (dict ou objet)."""

    def _get(name):
        if prescription is None:
            return None
        if isinstance(prescription, Mapping):
            return prescription.get(name)
        return getattr(prescription, name, None)

    errors: list[str] = []
    if prescription is None:
        return ["Ordonnance obligatoire pour un produit du panier"]

    required = {
        "prescription_type": "type d'ordonnance",
        "prescriber_name": "nom du prescripteur",
        "prescriber_registration": "numéro d'enregistrement du prescripteur",
        "health_structure": "structure sanitaire",
        "patient_name": "nom du patient",
    }
    for field, label in required.items():
        value = _get(field)
        if not (str(value).strip() if value is not None else ""):
            errors.append(f"Ordonnance : {label} requis")

    prescription_type = str(_get("prescription_type") or "").strip().upper()
    if prescription_type and prescription_type not in PRESCRIPTION_TYPES:
        errors.append("Ordonnance : type invalide (SIMPLE ou ASSURANCE)")
    return errors


def available_quantity(batch) -> int:
    """Disponible réel d'un lot : physique - réservé, jamais négatif."""
    if batch is None:
        return 0
    physical = int(getattr(batch, "quantity", 0) or 0)
    reserved = int(getattr(batch, "reserved_quantity", 0) or 0)
    return max(physical - reserved, 0)


def bulk_capacity(batch, units_per_box: int = 1) -> int:
    """Unités de vrac mobilisables sans toucher aux boîtes réservées."""
    if batch is None:
        return 0
    units_per_box = max(int(units_per_box or 1), 1)
    return int(getattr(batch, "bulk_quantity", 0) or 0) + available_quantity(batch) * units_per_box


def can_supply(batch, quantity: int, *, units_per_box: int = 1, bulk: bool = False) -> bool:
    """Vrai si le lot peut fournir la quantité demandée."""
    needed = int(quantity or 0)
    if bulk:
        return bulk_capacity(batch, units_per_box) >= needed
    return available_quantity(batch) >= needed


def boxes_to_open(batch, bulk_quantity: int, units_per_box: int = 1) -> int:
    """Nombre de boîtes à ouvrir pour couvrir un besoin de vrac."""
    units_per_box = max(int(units_per_box or 1), 1)
    missing = int(bulk_quantity or 0) - int(getattr(batch, "bulk_quantity", 0) or 0)
    if missing <= 0:
        return 0
    return -(-missing // units_per_box)


def build_pickup_code(prefix: str = "PK") -> str:
    """Code de retrait lisible (6 caractères sans ambiguïté)."""
    import secrets

    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    suffix = "".join(secrets.choice(alphabet) for _ in range(6))
    return f"{prefix}-{suffix}"


def insurance_mode_enabled(
    *, structure_id: Optional[int], client_id: Optional[int], explicit: bool = False
) -> bool:
    """Le mode assurance est actif si une structure ou un client est fourni."""
    return bool(explicit or structure_id or client_id)
