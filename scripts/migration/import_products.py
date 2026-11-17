"""
Modèle d'import de produits depuis un autre ERP vers Pharma-360.

Usage :
    python import_products.py --csv produits.csv --base-url http://192.168.1.100 --token <JWT>

Le CSV doit contenir au minimum la colonne `name`. Les colonnes optionnelles
sont mappées automatiquement si présentes.

Colonnes reconnues :
    name, dci, code, barcode, category_id, description, price, cost_price,
    stock_min, stock_max, unit, manufacturer, is_active, requires_prescription,
    is_bulk, units_per_box, bulk_price
"""

import argparse
import csv
import json
import sys

try:
    import httpx
except ImportError:
    print("Installer httpx : pip install httpx")
    sys.exit(1)


def parse_bool(value):
    if value is None or value == "":
        return None
    return str(value).strip().lower() in {"1", "true", "yes", "oui", "o"}


def parse_decimal(value):
    if value is None or value == "":
        return None
    return str(value).strip()


def row_to_payload(row):
    payload = {"name": row["name"].strip()}
    mapping = {
        "dci": "dci",
        "code": "code",
        "barcode": "barcode",
        "category_id": "category_id",
        "description": "description",
        "price": "price",
        "cost_price": "cost_price",
        "stock_min": "stock_min",
        "stock_max": "stock_max",
        "unit": "unit",
        "manufacturer": "manufacturer",
        "is_active": "is_active",
        "requires_prescription": "requires_prescription",
        "is_bulk": "is_bulk",
        "units_per_box": "units_per_box",
        "bulk_price": "bulk_price",
    }
    for csv_col, api_col in mapping.items():
        if csv_col in row and row[csv_col] not in (None, ""):
            val = row[csv_col].strip()
            if api_col in {"is_active", "requires_prescription", "is_bulk"}:
                b = parse_bool(val)
                if b is not None:
                    payload[api_col] = b
            elif api_col in {"category_id", "stock_min", "stock_max", "units_per_box"}:
                try:
                    payload[api_col] = int(val)
                except ValueError:
                    pass
            elif api_col in {"price", "cost_price", "bulk_price"}:
                payload[api_col] = parse_decimal(val)
            else:
                payload[api_col] = val
    return payload


def main():
    parser = argparse.ArgumentParser(description="Import de produits vers Pharma-360")
    parser.add_argument("--csv", required=True, help="Chemin du fichier CSV source")
    parser.add_argument("--base-url", default="http://localhost", help="URL de base de Pharma-360")
    parser.add_argument("--token", required=True, help="Token JWT (Bearer)")
    parser.add_argument("--dry-run", action="store_true", help="Affiche les payloads sans envoyer")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    url = f"{base}/api/v1/products/"
    headers = {"Authorization": f"Bearer {args.token}"}

    with open(args.csv, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if "name" not in (reader.fieldnames or []):
            print("Colonne 'name' manquante dans le CSV.")
            sys.exit(1)

        ok = 0
        fail = 0
        for i, row in enumerate(reader, start=2):
            payload = row_to_payload(row)
            if args.dry_run:
                print(f"Ligne {i}: {json.dumps(payload, ensure_ascii=False)}")
                continue
            try:
                r = httpx.post(url, json=payload, headers=headers, timeout=30)
                if r.status_code in (200, 201):
                    ok += 1
                    new_id = r.json().get("id")
                    print(f"Ligne {i}: OK (id={new_id}) - {payload['name']}")
                else:
                    fail += 1
                    print(f"Ligne {i}: ERREUR {r.status_code} - {r.text}")
            except Exception as e:
                fail += 1
                print(f"Ligne {i}: EXCEPTION {e}")

        if not args.dry_run:
            print(f"\nTerminé : {ok} créés, {fail} échecs.")


if __name__ == "__main__":
    main()
