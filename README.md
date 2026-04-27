# FinanN — Sistema de Gestão Financeira Pessoal

Aplicação web fullstack para gestão de finanças pessoais, desenvolvida como projeto universitário.
Permite ao utilizador controlar contas, transações, orçamentos, metas e investimentos num único lugar.

---

## Tecnologias Utilizadas

**Frontend**
- React 18 + Vite
- Tailwind CSS
- React Router DOM
- Chart.js (gráficos)
- Axios (requisições HTTP)
- Lucide React (ícones)

**Backend**
- Node.js + Express
- PostgreSQL (banco de dados relacional)
- bcrypt (criptografia de senhas)
- Multer (upload de arquivos)
- Nodemailer (envio de emails)
- Groq API — Llama 3.3 70B (assistente de IA)

---

## Funcionalidades

- Cadastro e autenticação de utilizadores (com criptografia bcrypt)
- Recuperação de senha por email
- Dashboard com resumo financeiro, gráficos e alertas
- Gestão de contas financeiras (corrente, poupança, investimento, etc.)
- Registo de receitas e despesas com categorias personalizadas
- Transferências entre contas
- Faturas e contas a pagar
- Orçamentos por categoria com acompanhamento de progresso
- Metas de poupança
- Carteira de investimentos com rentabilidade
- Relatórios e exportação de dados (CSV)
- Cotações em tempo real (USD, EUR, BTC)
- Assistente de IA para registar transações por texto e dar dicas financeiras
- Perfil do utilizador com foto e preferências

---

## Como Executar o Projeto

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+

### 1. Banco de dados

Crie o banco e execute o schema:

```bash
psql -U postgres -c "CREATE DATABASE finann;"
psql -U postgres -d finann -f backend/schema.sql
```

### 2. Backend

```bash
cd backend
npm install
```

Crie o arquivo `.env` com as seguintes variáveis:

```env
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=finann
DB_PASSWORD=sua_senha
DB_PORT=5432
PORT=5000
GROQ_API_KEY=sua_chave_groq
EMAIL_USER=seu@gmail.com
EMAIL_PASS=senha_de_app_gmail
```

Inicie o servidor:

```bash
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse em: `http://localhost:5173`

---

## Estrutura do Projeto

```
finann/
├── backend/
│   ├── index.js          # API REST (Express)
│   ├── schema.sql        # Estrutura do banco de dados
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/        # Páginas da aplicação
│   │   ├── components/   # Componentes reutilizáveis
│   │   └── App.jsx       # Rotas
│   └── package.json
└── README.md
```

---

## Módulos do Sistema

| Módulo | Descrição |
|--------|-----------|
| Autenticação | Login, cadastro e recuperação de senha |
| Contas | Gestão de contas bancárias e carteiras |
| Categorias | Categorias de receitas e despesas |
| Transações | Registo de receitas e despesas |
| Transferências | Movimentação entre contas |
| Faturas | Contas a pagar com controlo de vencimento |
| Orçamentos | Limites de gastos por categoria |
| Metas | Objetivos de poupança com progresso |
| Investimentos | Carteira com cálculo de rentabilidade |
| Relatórios | Gráficos, análises e exportação CSV |
| Assistente IA | Chat inteligente para gestão financeira |

---

Desenvolvido por **Eduardo Bremm**
