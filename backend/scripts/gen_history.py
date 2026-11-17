"""
Generate a large historical volume of sales + purchases (orders/deliveries)
to feed the IA recommendation engine.

Run inside the backend container:
    python /app/backend/scripts/gen_history.py
"""
import asyncio
import os
import random
from datetime import date, datetime, timedelta

import asyncpg

random.seed(42)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = (
        f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}"
        f"@{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}"
    )

NUM_SALES = 40000
NUM_ORDERS = 4000
ITEMS_PER_SALE = (1, 6)
ITEMS_PER_ORDER = (2, 8)
MONTHS_BACK = 24


async def main():
    conn = await asyncpg.connect(
        host=os.getenv("POSTGRES_HOST", "pharma360-db"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        user=os.getenv("POSTGRES_USER", "pharma_admin"),
        password=os.getenv("POSTGRES_PASSWORD"),
        database=os.getenv("POSTGRES_DB", "pharma360_prod"),
    )
    try:
        products = await conn.fetch(
            "SELECT id, price, cost_price FROM products WHERE is_active = TRUE"
        )
        suppliers = [r["id"] for r in await conn.fetch("SELECT id FROM suppliers")]
        customers = [r["id"] for r in await conn.fetch("SELECT id FROM customers")]
        users = [r["id"] for r in await conn.fetch("SELECT id FROM users WHERE is_active = TRUE")]
        if not products:
            raise SystemExit("No products found")
        if not users:
            raise SystemExit("No users found")
        if not suppliers:
            suppliers = [None]
        if not customers:
            customers = [None]

        product_ids = [p["id"] for p in products]
        price_map = {p["id"]: float(p["price"] or 0) for p in products}
        cost_map = {p["id"]: float(p["cost_price"] or 0) for p in products}

        now = datetime.utcnow()
        start = now - timedelta(days=30 * MONTHS_BACK)

        # ---- Create batches (stock) for every product ----
        print("Creating batches...")
        batch_ids_by_product = {pid: [] for pid in product_ids}
        for pid in product_ids:
            for _ in range(6):
                expiry = date.today() + timedelta(days=random.randint(90, 720))
                q = random.randint(5000, 20000)
                bid = await conn.fetchval(
                    """INSERT INTO batches (product_id, batch_number, expiry_date, quantity,
                       bulk_quantity, reserved_quantity, initial_quantity, location,
                       received_date, cost_price, selling_price, status, created_at, updated_at)
                       VALUES ($1,$2,$3,$4,0,0,$4,$5,$6,$7,$8,'active',NOW(),NOW())
                       RETURNING id""",
                    pid,
                    f"LOT-{pid}-{random.randint(1000,9999)}",
                    expiry,
                    q,
                    random.choice(["A1", "A2", "B1", "B2", "C1", "Reception", "T1", "T5"]),
                    date.today() - timedelta(days=random.randint(0, 60)),
                    cost_map[pid],
                    price_map[pid],
                )
                batch_ids_by_product[pid].append(bid)
        await conn.execute("COMMIT")

        # ---- Orders + deliveries (purchases) ----
        print(f"Creating {NUM_ORDERS} orders/deliveries...")
        order_rows = []
        order_item_rows = []
        delivery_rows = []
        delivery_item_rows = []

        order_id_counter = (await conn.fetchval("SELECT COALESCE(MAX(id),0) FROM orders")) + 1
        # We'll insert one by one to get ids; batch via executemany is trickier with FK.
        # Use transaction and individual inserts but in chunks of 100.
        chunk = 0
        for i in range(NUM_ORDERS):
            supplier_id = random.choice(suppliers)
            order_date = start + timedelta(days=random.randint(0, 30 * MONTHS_BACK - 5))
            expected = order_date + timedelta(days=random.randint(3, 21))
            status = random.choice(["confirmed", "delivered", "pending", "confirmed", "delivered"])
            priority = random.choice(["low", "normal", "normal", "high", "urgent"])
            ref = f"CMD-HIST-{i+1:06d}"
            oid = await conn.fetchval(
                """INSERT INTO orders (supplier_id, reference, order_date, expected_delivery_date,
                   status, priority, notes, created_at, updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING id""",
                supplier_id, ref, order_date.date(), expected.date(), status, priority,
                "Commande historique générée", order_date,
            )
            n_items = random.randint(*ITEMS_PER_ORDER)
            chosen = random.sample(product_ids, min(n_items, len(product_ids)))
            total = 0.0
            for pid in chosen:
                qty = random.randint(5, 60)
                up = cost_map[pid] or random.uniform(100, 5000)
                tp = round(qty * up, 2)
                total += tp
                await conn.execute(
                    """INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, created_at)
                       VALUES ($1,$2,$3,$4,$5,$6)""",
                    oid, pid, qty, up, tp, order_date,
                )
            # total_amount is computed from items; no column to update
            # delivery
            if status in ("delivered", "confirmed") and random.random() < 0.75:
                ddate = order_date + timedelta(days=random.randint(1, 14))
                dstatus = "delivered" if status == "delivered" else random.choice(["in_transit", "pending"])
                did = await conn.fetchval(
                    """INSERT INTO deliveries (supplier_id, reference, tracking_number, delivery_date,
                       expected_date, status, notes, order_id, received_at, stock_applied, created_at, updated_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING id""",
                    supplier_id, f"LIV-HIST-{i+1:06d}", f"TRK{random.randint(100000,999999)}",
                    ddate.date(), expected.date(), dstatus, "Livraison historique",
                    oid, ddate if dstatus == "delivered" else None, dstatus == "delivered", ddate,
                )
                for pid in chosen:
                    qty = random.randint(1, 40)
                    up = cost_map[pid] or random.uniform(100, 5000)
                    sp = price_map[pid] or up * 1.3
                    tp = round(qty * up, 2)
                    await conn.execute(
                        """INSERT INTO delivery_items (delivery_id, product_id, quantity, unit_price, selling_price,
                           total_price, received_quantity, non_conforming_quantity, expiry_date, location,
                           batch_number, barcode, created_at)
                           VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8,$9,$10,$11,$12)""",
                        did, pid, qty, up, sp, tp, qty,
                        (date.today() + timedelta(days=random.randint(60, 720))),
                        random.choice(["A1", "A2", "B1", "Reception", "T1"]),
                        f"LOT-{pid}-{random.randint(1000,9999)}",
                        None, ddate,
                    )
            if i % 500 == 0:
                await conn.execute("COMMIT")
                print(f"  orders {i}/{NUM_ORDERS}")

        await conn.execute("COMMIT")
        print("Orders/deliveries done.")

        # ---- Sales ----
        print(f"Creating {NUM_SALES} sales...")
        payment_methods = ["cash", "card", "mobile_money", "insurance", "cash", "cash", "card"]
        statuses = ["paid", "paid", "paid", "paid", "pending", "cancelled", "refunded"]
        for i in range(NUM_SALES):
            cust = random.choice(customers)
            uid = random.choice(users)
            sale_date = start + timedelta(
                days=random.randint(0, 30 * MONTHS_BACK - 1),
                hours=random.randint(7, 21),
                minutes=random.randint(0, 59),
            )
            n_items = random.randint(*ITEMS_PER_SALE)
            chosen = random.sample(product_ids, min(n_items, len(product_ids)))
            items = []
            subtotal = 0.0
            for pid in chosen:
                bid = random.choice(batch_ids_by_product[pid])
                qty = random.randint(1, 12)
                up = price_map[pid] or random.uniform(200, 8000)
                tp = round(qty * up, 2)
                subtotal += tp
                items.append((bid, pid, qty, up, tp))
            discount = round(subtotal * random.choice([0, 0, 0, 0.05, 0.1]) , 2)
            tax = round(subtotal * 0.18, 2) if random.random() < 0.3 else 0.0
            total = round(subtotal - discount + tax, 2)
            status = random.choice(statuses)
            pm = random.choice(payment_methods)
            sale_number = f"VTE-HIST-{i+1:07d}"
            sid = await conn.fetchval(
                """INSERT INTO sales (sale_number, customer_id, user_id, status, subtotal, tax_amount,
                   discount, total, payment_method, payment_reference, payment_date, notes, created_at, updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13) RETURNING id""",
                sale_number, cust, uid, status, subtotal, tax, discount, total, pm,
                f"REF-{random.randint(100000,999999)}" if status == "paid" else None,
                sale_date if status == "paid" else None,
                "Vente historique générée", sale_date,
            )
            for bid, pid, qty, up, tp in items:
                await conn.execute(
                    """INSERT INTO sale_items (sale_id, batch_id, product_id, quantity, sale_unit, unit_price,
                       total_price, expiry_date, created_at)
                       VALUES ($1,$2,$3,$4,'box',$5,$6,$7,$8)""",
                    sid, bid, pid, qty, up, tp,
                    (date.today() + timedelta(days=random.randint(30, 720))),
                    sale_date,
                )
            if i % 1000 == 0:
                await conn.execute("COMMIT")
                print(f"  sales {i}/{NUM_SALES}")

        await conn.execute("COMMIT")
        print("Sales done.")
        print("ALL DONE")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
