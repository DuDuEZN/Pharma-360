"""Tests des règles métier pures de la vente."""

from decimal import Decimal

from backend.modules.sales import rules


def test_price_line_no_insurance():
    result = rules.price_line(
        unit_price="10.00", quantity=2, tax_rate=18, apply_tax=True
    )
    assert result.subtotal == Decimal("20.00")
    assert result.tax_amount == Decimal("3.60")
    assert result.total == Decimal("23.60")
    assert result.insurance_amount == Decimal("0.00")
    assert result.patient_amount == Decimal("23.60")


def test_price_line_non_reimbursable_forced_zero():
    result = rules.price_line(
        unit_price="10.00",
        quantity=1,
        tax_rate=0,
        is_reimbursable=False,
        insurance_mode=True,
        coverage_rate=80,
    )
    assert result.insurance_rate == Decimal("0.00")
    assert result.insurance_amount == Decimal("0.00")
    assert result.patient_amount == result.total


def test_price_line_insurance_mode_active():
    result = rules.price_line(
        unit_price="10.00",
        quantity=1,
        tax_rate=0,
        is_reimbursable=True,
        insurance_mode=True,
        coverage_rate=80,
    )
    assert result.insurance_rate == Decimal("80.00")
    assert result.insurance_amount == Decimal("8.00")
    assert result.patient_amount == Decimal("2.00")


def test_effective_rate_clamped():
    assert rules.normalize_rate(150) == Decimal("100.00")
    assert rules.normalize_rate(-5) == Decimal("0.00")


def test_aggregate_sale_prorates_discount_and_insurance():
    p1 = rules.price_line(
        unit_price="10.00", quantity=1, tax_rate=0, is_reimbursable=True,
        insurance_mode=True, coverage_rate=50,
    )
    p2 = rules.price_line(
        unit_price="10.00", quantity=1, tax_rate=0, is_reimbursable=True,
        insurance_mode=True, coverage_rate=50,
    )
    totals = rules.aggregate_sale([p1, p2], discount=4)
    assert totals.subtotal == Decimal("20.00")
    assert totals.discount == Decimal("4.00")
    assert totals.total == Decimal("16.00")
    assert totals.insurance_amount == Decimal("8.00")
    assert totals.patient_amount == Decimal("8.00")


def test_prescription_required_only_if_product_requires():
    class P:
        requires_prescription = False

    class Q:
        requires_prescription = True

    assert rules.requires_prescription([P()]) is False
    assert rules.requires_prescription([P(), Q()]) is True


def test_prescription_errors_missing():
    errors = rules.prescription_errors(None)
    assert errors
    errors = rules.prescription_errors(
        {"prescription_type": "SIMPLE", "prescriber_name": "Dr X"}
    )
    assert len(errors) >= 3


def test_prescription_errors_valid():
    rx = {
        "prescription_type": "SIMPLE",
        "prescriber_name": "Dr X",
        "prescriber_registration": "123",
        "health_structure": "Hopital",
        "patient_name": "Patient",
    }
    assert rules.prescription_errors(rx) == []


def test_available_quantity_never_negative():
    class B:
        quantity = 5
        reserved_quantity = 7

    assert rules.available_quantity(B()) == 0


def test_pickup_code_format():
    code = rules.build_pickup_code()
    assert code.startswith("PK-")
    assert len(code) == 9


def test_insurance_mode_enabled():
    assert rules.insurance_mode_enabled(structure_id=None, client_id=None) is False
    assert rules.insurance_mode_enabled(structure_id=1, client_id=None) is True
    assert rules.insurance_mode_enabled(structure_id=None, client_id=None, explicit=True) is True


def test_bulk_capacity():
    class B:
        quantity = 2
        reserved_quantity = 1
        bulk_quantity = 3

    assert rules.bulk_capacity(B(), 4) == 3 + 1 * 4
    assert rules.can_supply(B(), 5, units_per_box=4, bulk=True) is True
    assert rules.can_supply(B(), 8, units_per_box=4, bulk=True) is False
