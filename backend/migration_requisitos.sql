-- ============================================================
-- FinanN — Migração para conformidade com Documento de Requisitoscd c
-- ============================================================

-- 1. Corrigir NULLs existentes em transactions antes de adicionar NOT NULL
--    (usa a primeira categoria/conta do próprio utilizador como fallback)
UPDATE transactions
SET category_id = (
    SELECT category_id FROM categories
    WHERE category_type = 'Despesa' AND user_id IS NULL
    ORDER BY category_id LIMIT 1
)
WHERE category_id IS NULL;

UPDATE transactions
SET account_id = (
    SELECT account_id FROM accounts
    WHERE accounts.user_id = transactions.user_id
    ORDER BY account_id LIMIT 1
)
WHERE account_id IS NULL;

-- 2. Tornar category_id e account_id obrigatórios em transactions
ALTER TABLE transactions ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN account_id  SET NOT NULL;

-- 3. Alterar default do status de 'Pago' para 'Pendente' em transactions
ALTER TABLE transactions ALTER COLUMN status SET DEFAULT 'Pendente';

-- 4. Corrigir NULLs existentes em bills antes de adicionar NOT NULL
UPDATE bills
SET category_id = (
    SELECT category_id FROM categories
    WHERE category_type = 'Despesa' AND user_id IS NULL
    ORDER BY category_id LIMIT 1
)
WHERE category_id IS NULL;

UPDATE bills
SET account_id = (
    SELECT account_id FROM accounts
    WHERE accounts.user_id = bills.user_id
    ORDER BY account_id LIMIT 1
)
WHERE account_id IS NULL;

-- 5. Tornar category_id e account_id obrigatórios em bills
ALTER TABLE bills ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE bills ALTER COLUMN account_id  SET NOT NULL;

-- Verificação final
SELECT
    'transactions.category_id' AS campo,
    is_nullable
FROM information_schema.columns
WHERE table_name='transactions' AND column_name='category_id'
UNION ALL
SELECT 'transactions.account_id', is_nullable
FROM information_schema.columns
WHERE table_name='transactions' AND column_name='account_id'
UNION ALL
SELECT 'transactions.status default', column_default
FROM information_schema.columns
WHERE table_name='transactions' AND column_name='status'
UNION ALL
SELECT 'bills.category_id', is_nullable
FROM information_schema.columns
WHERE table_name='bills' AND column_name='category_id'
UNION ALL
SELECT 'bills.account_id', is_nullable
FROM information_schema.columns
WHERE table_name='bills' AND column_name='account_id';
