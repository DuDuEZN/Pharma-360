-- 002_cash_sessions.sql
-- Module de gestion de caisse : sessions, rapport d'écart et rattachement
-- des ventes encaissées. Idempotent : peut être rejoué.

CREATE TABLE IF NOT EXISTS cash_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    opening_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    closing_amount NUMERIC(12, 2),
    cash_sales NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_sales NUMERIC(12, 2) NOT NULL DEFAULT 0,
    sales_count INTEGER NOT NULL DEFAULT 0,
    cash_sales_count INTEGER NOT NULL DEFAULT 0,
    actual_revenue NUMERIC(12, 2),
    difference NUMERIC(12, 2),
    opening_at TIMESTAMPTZ NOT NULL,
    closing_at TIMESTAMPTZ,
    notes TEXT,
    closing_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_cash_sessions_status CHECK (status IN ('open', 'closed'))
);

CREATE INDEX IF NOT EXISTS ix_cash_sessions_user_id ON cash_sessions (user_id);
CREATE INDEX IF NOT EXISTS ix_cash_sessions_status ON cash_sessions (status);
CREATE INDEX IF NOT EXISTS ix_cash_sessions_opening_at ON cash_sessions (opening_at);

-- Un caissier ne peut avoir qu'une seule session ouverte à la fois.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_sessions_one_open_per_user
    ON cash_sessions (user_id)
    WHERE status = 'open';

-- Rattachement des ventes à la session qui les a encaissées.
ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS cash_session_id INTEGER
    REFERENCES cash_sessions (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_sales_cash_session_id ON sales (cash_session_id);
