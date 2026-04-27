-- =============================================
-- FinanN - Schema do Banco de Dados PostgreSQL
-- =============================================

-- Módulo 1: Utilizadores
CREATE TABLE IF NOT EXISTS users (
    user_id         SERIAL PRIMARY KEY,
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    profile_photo   TEXT,                          -- caminho do ficheiro
    notif_budget    BOOLEAN DEFAULT TRUE,          -- notificação: orçamento excedido
    notif_bill      BOOLEAN DEFAULT TRUE,          -- notificação: conta a vencer
    notif_goal      BOOLEAN DEFAULT TRUE,          -- notificação: meta atingida
    currency        VARCHAR(10) DEFAULT 'BRL',
    timezone        VARCHAR(100) DEFAULT 'America/Sao_Paulo',
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Módulo 2: Contas Financeiras
CREATE TABLE IF NOT EXISTS accounts (
    account_id      SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    account_name    VARCHAR(50) NOT NULL,
    account_type    VARCHAR(30) NOT NULL CHECK (account_type IN ('Corrente','Poupança','Investimento','Dinheiro','Cartão de Crédito')),
    initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    bank_name       VARCHAR(100),
    account_number  VARCHAR(30),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Módulo 3: Categorias
CREATE TABLE IF NOT EXISTS categories (
    category_id     SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(user_id) ON DELETE CASCADE,  -- NULL = categoria global
    category_name   VARCHAR(50) NOT NULL,
    category_type   VARCHAR(20) NOT NULL CHECK (category_type IN ('Receita','Despesa')),
    subcategories   TEXT,                          -- JSON array de subcategorias
    icon            VARCHAR(100),
    color           VARCHAR(7),
    UNIQUE NULLS NOT DISTINCT (category_name, category_type, user_id)
);

-- Categorias padrão do sistema
INSERT INTO categories (user_id, category_name, category_type, color) VALUES
(NULL, 'Alimentação',     'Despesa', '#ef4444'),
(NULL, 'Transporte',      'Despesa', '#f97316'),
(NULL, 'Moradia',         'Despesa', '#eab308'),
(NULL, 'Saúde',           'Despesa', '#22c55e'),
(NULL, 'Educação',        'Despesa', '#3b82f6'),
(NULL, 'Lazer',           'Despesa', '#8b5cf6'),
(NULL, 'Vestuário',       'Despesa', '#ec4899'),
(NULL, 'Outros (Despesa)','Despesa', '#6b7280'),
(NULL, 'Salário',         'Receita', '#10b981'),
(NULL, 'Freelance',       'Receita', '#06b6d4'),
(NULL, 'Investimentos',   'Receita', '#f59e0b'),
(NULL, 'Outros (Receita)','Receita', '#84cc16')
ON CONFLICT DO NOTHING;

-- Módulo 4: Transações (Receitas e Despesas)
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id   SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    amount           DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    category_id      INTEGER NOT NULL REFERENCES categories(category_id),
    account_id       INTEGER NOT NULL REFERENCES accounts(account_id),
    description      VARCHAR(255),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('Receita','Despesa')),
    status           VARCHAR(20) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pago','Pendente')),
    recurrence       VARCHAR(50),                  -- 'Única','Mensal','Anual'
    attachment       TEXT,                          -- caminho do ficheiro
    transaction_date TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Módulo 5: Transferências
CREATE TABLE IF NOT EXISTS transfers (
    transfer_id     SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    amount          DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    from_account_id INTEGER NOT NULL REFERENCES accounts(account_id),
    to_account_id   INTEGER NOT NULL REFERENCES accounts(account_id),
    description     VARCHAR(255),
    transfer_date   TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (from_account_id <> to_account_id)
);

-- Módulo 6: Faturas / Contas a Pagar
CREATE TABLE IF NOT EXISTS bills (
    bill_id         SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    bill_name       VARCHAR(100) NOT NULL,
    amount          DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    due_date        DATE NOT NULL,
    payment_date    DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Paga','Pendente','Atrasada')),
    recurrence      VARCHAR(50),
    category_id     INTEGER NOT NULL REFERENCES categories(category_id),
    account_id      INTEGER NOT NULL REFERENCES accounts(account_id)
);

-- Módulo 7: Orçamentos
CREATE TABLE IF NOT EXISTS budgets (
    budget_id       SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    budget_name     VARCHAR(100) NOT NULL,
    category_id     INTEGER NOT NULL REFERENCES categories(category_id),
    limit_amount    DECIMAL(15,2) NOT NULL CHECK (limit_amount > 0),
    period          VARCHAR(20) NOT NULL CHECK (period IN ('Mensal','Semestral','Anual')),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Módulo 8: Metas de Poupança
CREATE TABLE IF NOT EXISTS savings_goals (
    goal_id         SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    goal_name       VARCHAR(100) NOT NULL,
    target_amount   DECIMAL(15,2) NOT NULL CHECK (target_amount > 0),
    current_amount  DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    deadline        DATE,
    account_id      INTEGER REFERENCES accounts(account_id),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Módulo 9: Investimentos
CREATE TABLE IF NOT EXISTS investments (
    investment_id       SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    investment_type     VARCHAR(50) NOT NULL CHECK (investment_type IN ('Ações','Fundos Imobiliários','Criptomoedas','Renda Fixa','Imóveis','Outros')),
    asset_name          VARCHAR(100) NOT NULL,
    quantity_invested   DECIMAL(20,8) NOT NULL CHECK (quantity_invested > 0),
    average_price       DECIMAL(20,8) NOT NULL CHECK (average_price > 0),
    current_market_value DECIMAL(20,8),
    broker              VARCHAR(100),
    created_at          TIMESTAMP DEFAULT NOW()
);
