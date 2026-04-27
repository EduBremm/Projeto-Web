// ============================================================
// FinanN — Backend Principal (API REST)
//
// Tecnologias utilizadas:
//   - Node.js + Express 5: servidor web e roteamento HTTP
//   - PostgreSQL (via pg): banco de dados relacional
//   - bcrypt: encriptação de senhas (hash seguro)
//   - multer: upload de arquivos (fotos de perfil, anexos)
//   - dotenv: leitura de variáveis de ambiente do arquivo .env
//   - fetch (nativo Node 18+): chamadas HTTP à API da Groq (IA)
//
// Todas as variáveis sensíveis (senha do banco, chave da IA, etc.)
// ficam no arquivo .env e NUNCA devem ser enviadas ao GitHub.
// ============================================================

const express = require('express');
const { Pool } = require('pg');        // Pool mantém conexões abertas ao banco
const cors = require('cors');          // Permite que o frontend (porta 5173) acesse o backend (porta 5000)
const bcrypt = require('bcrypt');      // Hashing de senha — nunca armazenamos senha em texto puro
const multer = require('multer');      // Middleware para receber arquivos via multipart/form-data
const path = require('path');          // Manipulação de caminhos de arquivo
const fs = require('fs');              // Sistema de arquivos (verificar/criar pasta uploads)
const crypto = require('crypto');      // Geração de tokens aleatórios seguros (recuperação de senha)
const nodemailer = require('nodemailer'); // Envio de emails (recuperação de senha)
require('dotenv').config();            // Carrega o arquivo .env para process.env

// Armazena temporariamente os tokens de recuperação de senha na memória.
// Formato: Map { token -> { userId, email, expires } }
// Os tokens expiram em 1 hora e são deletados após uso.
const resetTokens = new Map();

// ---- Configuração do servidor Express ----
const app = express();
app.use(cors());                       // Libera CORS para qualquer origem (desenvolvimento)
app.use(express.json());               // Permite receber corpo JSON nas requisições
// Serve os arquivos da pasta uploads/ como URL pública (ex: /uploads/foto.jpg)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Cria a pasta uploads/ se não existir (evita erro no primeiro deploy)
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// ---- Conexão com o banco de dados PostgreSQL ----
// O Pool gerencia múltiplas conexões simultâneas com eficiência.
// As credenciais vêm do arquivo .env (nunca hardcoded aqui).
const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port:     process.env.DB_PORT,
});

// ---- Configuração do Multer (upload de arquivos) ----
// diskStorage define onde e com qual nome os arquivos são salvos.
// O nome usa Date.now() para evitar colisões (dois arquivos com mesmo nome).
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads'),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },  // Tamanho máximo: 5 MB
  fileFilter: (req, file, cb) => {
    // Aceita apenas imagens (jpeg/jpg/png/gif) e PDFs
    const ok = /jpeg|jpg|png|gif|pdf/.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Formato não suportado'), ok);
  },
});

// ---- Funções de Validação de Campos ----
// Usadas nos endpoints de cadastro e login para garantir dados corretos.
// validarNome: aceita letras (incluindo acentos), espaços, hífens e apóstrofos, mín. 4 chars
const validarNome  = (v) => /^[a-zA-ZÀ-ÿ\s\-']{4,}$/.test(v.trim());
// validarEmail: formato básico usuario@dominio.extensao
const validarEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
// validarSenha: mín. 8 chars, precisa de: maiúscula + minúscula + número + caractere especial
const validarSenha = (v) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\#\^])[A-Za-z\d@$!%*?&\#\^]{8,}$/.test(v);

// ============================================================
// MÓDULO 1 – UTILIZADORES / AUTENTICAÇÃO
//
// Rotas:
//   GET  /teste-db               → verifica se o banco está conectado
//   POST /auth/register          → cria novo utilizador (aceita foto de perfil)
//   POST /auth/login             → autentica e retorna dados do utilizador
//   PUT  /utilizadores/:userId   → atualiza perfil (nome, moeda, timezone, notificações)
//
// Segurança: a senha nunca é armazenada em texto puro.
// bcrypt.hash() gera um hash com 12 "salt rounds" (quanto maior, mais seguro e mais lento).
// bcrypt.compare() verifica a senha digitada contra o hash salvo no banco.
// ============================================================


app.post('/auth/register', upload.single('profile_photo'), async (req, res) => {
  const {
    full_name, email, password,
    currency = 'BRL', timezone = 'America/Sao_Paulo',
    notif_budget = true, notif_bill = true, notif_goal = true,
  } = req.body;

  if (!validarNome(full_name))
    return res.status(400).json({ error: 'Nome inválido. Use apenas letras, espaços, hífens ou apóstrofos (mín. 4 caracteres).' });
  if (!validarEmail(email))
    return res.status(400).json({ error: 'Formato de email inválido.' });
  if (!validarSenha(password))
    return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial.' });

  try {
    const existe = await pool.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existe.rows.length > 0) return res.status(400).json({ error: 'Email já registado.' });

    const hash = await bcrypt.hash(password, 12);
    const photoPath = req.file ? req.file.filename : null;

    const novo = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, profile_photo, notif_budget, notif_bill, notif_goal, currency_preference, timezone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING user_id, full_name, email, currency_preference, timezone`,
      [full_name.trim(), email.toLowerCase(), hash, photoPath,
       notif_budget === 'true' || notif_budget === true,
       notif_bill   === 'true' || notif_bill   === true,
       notif_goal   === 'true' || notif_goal   === true,
       currency, timezone]
    );

    // Carteira padrão
    await pool.query(
      `INSERT INTO accounts (user_id, account_name, account_type, initial_balance, current_balance)
       VALUES ($1,'Minha Carteira','Dinheiro',0,0)`,
      [novo.rows[0].user_id]
    );

    res.status(201).json(novo.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar conta.' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Email ou senha incorretos.' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Email ou senha incorretos.' });

    const { password_hash, ...userSafe } = user;
    res.json({ message: 'Login realizado!', user: userSafe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor.' });
  }
});

app.put('/utilizadores/:userId', upload.single('profile_photo'), async (req, res) => {
  const { userId } = req.params;
  const { full_name, currency, timezone, notif_budget, notif_bill, notif_goal } = req.body;
  try {
    const fields = []; const vals = []; let i = 1;
    if (full_name)                { fields.push(`full_name=$${i++}`);            vals.push(full_name.trim()); }
    if (currency)                 { fields.push(`currency_preference=$${i++}`);  vals.push(currency); }
    if (timezone)                 { fields.push(`timezone=$${i++}`);             vals.push(timezone); }
    if (notif_budget !== undefined){ fields.push(`notif_budget=$${i++}`);        vals.push(notif_budget); }
    if (notif_bill   !== undefined){ fields.push(`notif_bill=$${i++}`);          vals.push(notif_bill); }
    if (notif_goal   !== undefined){ fields.push(`notif_goal=$${i++}`);          vals.push(notif_goal); }
    if (req.file)                 { fields.push(`profile_photo=$${i++}`);        vals.push(req.file.filename); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    vals.push(userId);
    const r = await pool.query(
      `UPDATE users SET ${fields.join(',')} WHERE user_id=$${i}
       RETURNING user_id, full_name, email, currency_preference, timezone, notif_budget, notif_bill, notif_goal, profile_photo`,
      vals
    );
    res.json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao atualizar utilizador.' }); }
});

// Endpoint de alteração de senha — separado do PUT geral
// Verifica a senha actual com bcrypt antes de permitir a troca
app.put('/utilizadores/:userId/senha', async (req, res) => {
  const { senha_atual, senha_nova } = req.body;
  if (!senha_atual || !senha_nova)
    return res.status(400).json({ error: 'Senha actual e nova são obrigatórias.' });
  if (!validarSenha(senha_nova))
    return res.status(400).json({ error: 'Nova senha deve ter mín. 8 chars com maiúscula, minúscula, número e caractere especial.' });
  try {
    const r = await pool.query('SELECT password_hash FROM users WHERE user_id=$1', [req.params.userId]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Utilizador não encontrado.' });
    const match = await bcrypt.compare(senha_atual, r.rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Senha actual incorrecta.' });
    const novoHash = await bcrypt.hash(senha_nova, 12);
    await pool.query('UPDATE users SET password_hash=$1 WHERE user_id=$2', [novoHash, req.params.userId]);
    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao alterar senha.' }); }
});

// ============================================================
// MÓDULO 2 – CONTAS FINANCEIRAS
//
// Tabela no banco: accounts
// Coluna real: bank_institution (não bank_name — nome diferente do esperado)
//
// Rotas:
//   GET    /contas/:userId         → lista todas as contas do utilizador
//   POST   /contas                 → cria nova conta
//   PUT    /contas/:accountId      → atualiza dados da conta
//   DELETE /contas/:accountId      → remove conta
//
// Nota: o initial_balance e current_balance são iniciados com o mesmo valor.
// O current_balance é atualizado automaticamente a cada transação.
// ============================================================

app.get('/contas/:userId', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM accounts WHERE user_id=$1 ORDER BY created_at',
      [req.params.userId]
    );
    res.json(r.rows);
  } catch { res.status(500).json({ error: 'Erro ao buscar contas.' }); }
});

app.post('/contas', async (req, res) => {
  const { user_id, account_name, account_type, initial_balance, bank_name, account_number } = req.body;
  if (!account_name || account_name.length < 3 || account_name.length > 50)
    return res.status(400).json({ error: 'Nome da conta deve ter entre 3 e 50 caracteres.' });
  try {
    const r = await pool.query(
      `INSERT INTO accounts (user_id, account_name, account_type, initial_balance, current_balance, bank_institution, account_number)
       VALUES ($1,$2,$3,$4,$4,$5,$6) RETURNING *`,
      [user_id, account_name, account_type, parseFloat(initial_balance) || 0,
       bank_name || null, account_number || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar conta.' });
  }
});

app.put('/contas/:accountId', async (req, res) => {
  const { account_name, account_type, bank_name, account_number } = req.body;
  try {
    const r = await pool.query(
      `UPDATE accounts SET account_name=$1, account_type=$2, bank_institution=$3, account_number=$4
       WHERE account_id=$5 RETURNING *`,
      [account_name, account_type, bank_name || null, account_number || null, req.params.accountId]
    );
    res.json(r.rows[0]);
  } catch { res.status(500).json({ error: 'Erro ao atualizar conta.' }); }
});

app.delete('/contas/:accountId', async (req, res) => {
  try {
    await pool.query('DELETE FROM accounts WHERE account_id=$1', [req.params.accountId]);
    res.json({ message: 'Conta removida.' });
  } catch { res.status(500).json({ error: 'Erro ao remover conta.' }); }
});

// ============================================================
// MÓDULO 3 – CATEGORIAS
//
// Tabela no banco: categories
// Tipos possíveis: 'Receita' ou 'Despesa'
//
// Rotas:
//   GET    /categorias/:userId     → lista categorias do utilizador + categorias do sistema
//   POST   /categorias             → cria categoria personalizada
//   PUT    /categorias/:catId      → edita categoria
//   DELETE /categorias/:catId      → remove categoria (apenas as do utilizador)
//
// Importante: user_id IS NULL significa "categoria do sistema" (ex: Alimentação, Transporte).
// Essas categorias são partilhadas por todos os utilizadores e não podem ser editadas/removidas.
// O frontend identifica isso e exibe um ícone de cadeado.
// ============================================================

app.get('/categorias/:userId', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM categories
       WHERE user_id=$1 OR user_id IS NULL
       ORDER BY category_type, category_name`,
      [req.params.userId]
    );
    res.json(r.rows);
  } catch { res.status(500).json({ error: 'Erro ao buscar categorias.' }); }
});

app.post('/categorias', async (req, res) => {
  const { user_id, category_name, category_type, subcategories, icon, color } = req.body;
  if (!category_name || category_name.length < 2 || category_name.length > 50)
    return res.status(400).json({ error: 'Nome deve ter entre 2 e 50 caracteres.' });
  if (!['Receita','Despesa'].includes(category_type))
    return res.status(400).json({ error: 'Tipo deve ser Receita ou Despesa.' });
  try {
    const r = await pool.query(
      `INSERT INTO categories (user_id, category_name, category_type, subcategories, icon, color)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user_id, category_name, category_type,
       subcategories ? JSON.stringify(subcategories) : null,
       icon || null, color || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Já existe uma categoria com este nome e tipo.' });
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar categoria.' });
  }
});

app.put('/categorias/:categoryId', async (req, res) => {
  const { category_name, category_type, subcategories, icon, color } = req.body;
  try {
    const r = await pool.query(
      `UPDATE categories SET category_name=$1, category_type=$2, subcategories=$3, icon=$4, color=$5
       WHERE category_id=$6 AND user_id IS NOT NULL RETURNING *`,
      [category_name, category_type,
       subcategories ? JSON.stringify(subcategories) : null,
       icon || null, color || null, req.params.categoryId]
    );
    if (r.rows.length === 0) return res.status(403).json({ error: 'Não é possível editar categorias do sistema.' });
    res.json(r.rows[0]);
  } catch { res.status(500).json({ error: 'Erro ao atualizar categoria.' }); }
});

app.delete('/categorias/:categoryId', async (req, res) => {
  try {
    const r = await pool.query(
      'DELETE FROM categories WHERE category_id=$1 AND user_id IS NOT NULL RETURNING category_id',
      [req.params.categoryId]
    );
    if (r.rows.length === 0) return res.status(403).json({ error: 'Não é possível remover categorias do sistema.' });
    res.json({ message: 'Categoria removida.' });
  } catch { res.status(500).json({ error: 'Erro ao remover categoria.' }); }
});

// ============================================================
// MÓDULO 4 – TRANSAÇÕES
//
// Tabela no banco: transactions
// Coluna real: proof_attachment_url (não attachment — nome diferente)
// ENUMs usados:
//   recurrence_enum: 'Única' | 'Mensal' | 'Anual'
//   transaction_status_enum: 'Confirmada' | 'Pendente' | 'Cancelada'
//
// Rotas:
//   GET    /transacoes/:userId     → lista transações com filtros opcionais (?tipo=&mes=&ano=)
//   POST   /transacoes             → cria transação (aceita anexo de comprovante)
//   PUT    /transacoes/:id         → edita transação
//   DELETE /transacoes/:id         → remove transação e reverte o saldo da conta
//
// Lógica de saldo:
//   - Ao criar uma Receita: current_balance += amount
//   - Ao criar uma Despesa: current_balance -= amount
//   - Ao remover: a operação inversa é aplicada
// ============================================================

app.get('/transacoes/:userId', async (req, res) => {
  const { tipo, mes, ano } = req.query;
  const uid = req.params.userId;

  // Quando há filtro por tipo específico (Receita/Despesa), busca só na tabela transactions.
  // Quando não há filtro de tipo (ou seja, "mostrar tudo"), inclui também as transferências
  // via UNION ALL para aparecerem nas Transações Recentes do dashboard.
  try {
    let rows;

    if (tipo && tipo !== 'Transferência') {
      // Filtro por Receita ou Despesa — só transactions, sem transferências
      let q = `
        SELECT t.transaction_id AS id, t.description,
               t.transaction_type::text AS transaction_type,
               t.amount, t.transaction_date,
               t.status::text AS status,
               c.category_name, c.color,
               a.account_name, NULL::text AS to_account_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.category_id
        LEFT JOIN accounts   a ON t.account_id  = a.account_id
        WHERE t.user_id=$1 AND t.transaction_type=$2`;
      const p = [uid, tipo]; let idx = 3;
      if (mes) { q += ` AND EXTRACT(MONTH FROM t.transaction_date)=$${idx++}`; p.push(mes); }
      if (ano) { q += ` AND EXTRACT(YEAR  FROM t.transaction_date)=$${idx++}`; p.push(ano); }
      q += ' ORDER BY transaction_date DESC';
      const r = await pool.query(q, p);
      rows = r.rows;
    } else {
      // Sem filtro de tipo — junta transações normais + transferências com UNION ALL
      // Transferências aparecem com transaction_type='Transferência' e mostram as duas contas
      // Filtros usam os nomes reais de cada tabela (não aliases do SELECT)
      // transactions usa t.transaction_date; transfers usa tr.transfer_date
      let filtroTransMes = ''; let filtroTransAno = '';
      let filtroTrMes   = ''; let filtroTrAno   = '';
      const p = [uid, uid]; let idx = 3;
      if (mes) {
        filtroTransMes = `AND EXTRACT(MONTH FROM t.transaction_date)=$${idx}`;
        filtroTrMes    = `AND EXTRACT(MONTH FROM tr.transfer_date)=$${idx}`;
        p.push(mes); idx++;
      }
      if (ano) {
        filtroTransAno = `AND EXTRACT(YEAR FROM t.transaction_date)=$${idx}`;
        filtroTrAno    = `AND EXTRACT(YEAR FROM tr.transfer_date)=$${idx}`;
        p.push(ano);
      }

      const r = await pool.query(`
        SELECT t.transaction_id AS id, t.description,
               t.transaction_type::text AS transaction_type,
               t.amount, t.transaction_date,
               t.status::text AS status,
               c.category_name, c.color,
               a.account_name, NULL::text AS to_account_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.category_id
        LEFT JOIN accounts   a ON t.account_id  = a.account_id
        WHERE t.user_id=$1 ${filtroTransMes} ${filtroTransAno}

        UNION ALL

        SELECT tr.transfer_id AS id,
               COALESCE(tr.description, 'Transferência entre contas') AS description,
               'Transferência'::text AS transaction_type,
               tr.amount,
               tr.transfer_date AS transaction_date,
               'Confirmada'::text AS status,
               NULL::text AS category_name,
               NULL::text AS color,
               a1.account_name,
               a2.account_name AS to_account_name
        FROM transfers tr
        JOIN accounts a1 ON tr.origin_account_id      = a1.account_id
        JOIN accounts a2 ON tr.destination_account_id = a2.account_id
        WHERE tr.user_id=$2 ${filtroTrMes} ${filtroTrAno}

        ORDER BY transaction_date DESC
      `, p);
      rows = r.rows;
    }

    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar transações.' }); }
});

app.post('/transacoes', upload.single('attachment'), async (req, res) => {
  const { user_id, amount, category_id, account_id, description, transaction_type, status, recurrence, transaction_date } = req.body;
  if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Valor deve ser positivo.' });
  if (!['Receita','Despesa'].includes(transaction_type)) return res.status(400).json({ error: 'Tipo inválido.' });
  if (!category_id) return res.status(400).json({ error: 'Categoria é obrigatória.' });
  if (!account_id)  return res.status(400).json({ error: 'Conta é obrigatória.' });
  const attachUrl = req.file ? req.file.filename : null;
  try {
    const r = await pool.query(
      `INSERT INTO transactions
         (user_id, amount, category_id, account_id, description, transaction_type, status, recurrence, proof_attachment_url, transaction_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [user_id, parseFloat(amount), category_id, account_id,
       description || null, transaction_type,
       status || 'Pendente', recurrence || 'Única', attachUrl,
       transaction_date || new Date()]
    );
    if (account_id) {
      const op = transaction_type === 'Receita' ? '+' : '-';
      await pool.query(
        `UPDATE accounts SET current_balance = current_balance ${op} $1 WHERE account_id=$2`,
        [parseFloat(amount), account_id]
      );
    }
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao inserir transação.' });
  }
});

app.put('/transacoes/:transactionId', async (req, res) => {
  const { amount, category_id, account_id, description, transaction_type, status, recurrence, transaction_date } = req.body;
  try {
    const r = await pool.query(
      `UPDATE transactions SET amount=$1, category_id=$2, account_id=$3, description=$4,
       transaction_type=$5, status=$6, recurrence=$7, transaction_date=$8
       WHERE transaction_id=$9 RETURNING *`,
      [amount, category_id || null, account_id || null, description || null,
       transaction_type, status || 'Pendente', recurrence || 'Única',
       transaction_date || new Date(), req.params.transactionId]
    );
    res.json(r.rows[0]);
  } catch { res.status(500).json({ error: 'Erro ao atualizar transação.' }); }
});

app.delete('/transacoes/:transactionId', async (req, res) => {
  try {
    const t = await pool.query('SELECT * FROM transactions WHERE transaction_id=$1', [req.params.transactionId]);
    if (t.rows.length > 0 && t.rows[0].account_id) {
      const op = t.rows[0].transaction_type === 'Receita' ? '-' : '+';
      await pool.query(
        `UPDATE accounts SET current_balance = current_balance ${op} $1 WHERE account_id=$2`,
        [t.rows[0].amount, t.rows[0].account_id]
      );
    }
    await pool.query('DELETE FROM transactions WHERE transaction_id=$1', [req.params.transactionId]);
    res.json({ message: 'Transação removida.' });
  } catch { res.status(500).json({ error: 'Erro ao remover transação.' }); }
});


// ============================================================
// MÓDULO 5 – TRANSFERÊNCIAS
//
// Tabela no banco: transfers
// Colunas reais: origin_account_id, destination_account_id
//
// Rotas:
//   GET    /transferencias/:userId  → lista transferências com nomes das contas (JOIN)
//   POST   /transferencias          → cria transferência entre duas contas
//   DELETE /transferencias/:id      → cancela transferência e estorna os saldos
//
// IMPORTANTE – Transação de banco (BEGIN/COMMIT/ROLLBACK):
//   A transferência envolve 3 operações simultâneas:
//     1. Inserir o registro na tabela transfers
//     2. Debitar a conta de origem
//     3. Creditar a conta de destino
//   Se qualquer uma falhar, o ROLLBACK desfaz tudo — garantindo
//   que o dinheiro não "desapareça" nem seja duplicado.
// ============================================================

app.get('/transferencias/:userId', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT tr.*, a1.account_name AS from_account_name, a2.account_name AS to_account_name
       FROM transfers tr
       JOIN accounts a1 ON tr.origin_account_id      = a1.account_id
       JOIN accounts a2 ON tr.destination_account_id = a2.account_id
       WHERE tr.user_id=$1 ORDER BY tr.transfer_date DESC`,
      [req.params.userId]
    );
    res.json(r.rows);
  } catch { res.status(500).json({ error: 'Erro ao buscar transferências.' }); }
});

app.post('/transferencias', async (req, res) => {
  const { user_id, amount, from_account_id, to_account_id, description, transfer_date } = req.body;
  if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Valor deve ser positivo.' });
  if (String(from_account_id) === String(to_account_id))
    return res.status(400).json({ error: 'Contas de origem e destino devem ser diferentes.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO transfers (user_id, amount, origin_account_id, destination_account_id, description, transfer_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user_id, parseFloat(amount), from_account_id, to_account_id, description || null, transfer_date || new Date()]
    );
    await client.query('UPDATE accounts SET current_balance=current_balance-$1 WHERE account_id=$2', [parseFloat(amount), from_account_id]);
    await client.query('UPDATE accounts SET current_balance=current_balance+$1 WHERE account_id=$2', [parseFloat(amount), to_account_id]);
    await client.query('COMMIT');
    res.status(201).json(r.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erro ao registar transferência.' });
  } finally { client.release(); }
});

app.delete('/transferencias/:transferId', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const t = await client.query('SELECT * FROM transfers WHERE transfer_id=$1', [req.params.transferId]);
    if (t.rows.length > 0) {
      const { amount, origin_account_id, destination_account_id } = t.rows[0];
      await client.query('UPDATE accounts SET current_balance=current_balance+$1 WHERE account_id=$2', [amount, origin_account_id]);
      await client.query('UPDATE accounts SET current_balance=current_balance-$1 WHERE account_id=$2', [amount, destination_account_id]);
    }
    await client.query('DELETE FROM transfers WHERE transfer_id=$1', [req.params.transferId]);
    await client.query('COMMIT');
    res.json({ message: 'Transferência removida.' });
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao remover transferência.' });
  } finally { client.release(); }
});

// ============================================================
// MÓDULO 6 – FATURAS / CONTAS A PAGAR
//
// Tabela no banco: bills
//
// Rotas:
//   GET    /faturas/:userId     → lista faturas (atualiza status automaticamente)
//   POST   /faturas             → cria nova fatura/conta a pagar
//   PUT    /faturas/:id         → edita fatura (incluindo marcar como paga)
//   DELETE /faturas/:id         → remove fatura
//
// Lógica de status automático:
//   Antes de listar, o sistema atualiza para 'Atrasada' qualquer fatura
//   cujo due_date < hoje, sem data de pagamento e status ainda 'Pendente'.
//   Isso elimina a necessidade de um job agendado (cron) para esta tarefa.
// ============================================================

app.get('/faturas/:userId', async (req, res) => {
  try {
    await pool.query(
      `UPDATE bills SET status='Atrasada'
       WHERE user_id=$1 AND due_date < CURRENT_DATE AND payment_date IS NULL AND status='Pendente'`,
      [req.params.userId]
    );
    const r = await pool.query(
      `SELECT b.*, c.category_name, a.account_name
       FROM bills b
       LEFT JOIN categories c ON b.category_id=c.category_id
       LEFT JOIN accounts   a ON b.account_id =a.account_id
       WHERE b.user_id=$1 ORDER BY b.due_date`,
      [req.params.userId]
    );
    res.json(r.rows);
  } catch { res.status(500).json({ error: 'Erro ao buscar faturas.' }); }
});

app.post('/faturas', async (req, res) => {
  const { user_id, bill_name, amount, due_date, recurrence, category_id, account_id } = req.body;
  if (!bill_name || bill_name.length < 3 || bill_name.length > 100)
    return res.status(400).json({ error: 'Nome deve ter entre 3 e 100 caracteres.' });
  if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Valor deve ser positivo.' });
  if (!due_date)     return res.status(400).json({ error: 'Data de vencimento obrigatória.' });
  if (!category_id)  return res.status(400).json({ error: 'Categoria é obrigatória.' });
  if (!account_id)   return res.status(400).json({ error: 'Conta de origem é obrigatória.' });
  try {
    const r = await pool.query(
      `INSERT INTO bills (user_id, bill_name, amount, due_date, recurrence, category_id, account_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [user_id, bill_name, parseFloat(amount), due_date, recurrence || null, category_id, account_id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao criar fatura.' }); }
});

app.put('/faturas/:billId', async (req, res) => {
  const { bill_name, amount, due_date, payment_date, status, recurrence, category_id, account_id } = req.body;
  try {
    const r = await pool.query(
      `UPDATE bills SET bill_name=$1, amount=$2, due_date=$3, payment_date=$4, status=$5,
       recurrence=$6, category_id=$7, account_id=$8 WHERE bill_id=$9 RETURNING *`,
      [bill_name, amount, due_date, payment_date || null, status || 'Pendente',
       recurrence || null, category_id || null, account_id || null, req.params.billId]
    );
    res.json(r.rows[0]);
  } catch { res.status(500).json({ error: 'Erro ao atualizar fatura.' }); }
});

app.delete('/faturas/:billId', async (req, res) => {
  try {
    await pool.query('DELETE FROM bills WHERE bill_id=$1', [req.params.billId]);
    res.json({ message: 'Fatura removida.' });
  } catch { res.status(500).json({ error: 'Erro ao remover fatura.' }); }
});

// ============================================================
// MÓDULO 7 – ORÇAMENTOS
//
// Tabela no banco: budgets
// ENUM period: 'Mensal' | 'Semestral' | 'Anual'
//
// Rotas:
//   GET    /orcamentos/:userId  → lista orçamentos com o valor já gasto calculado
//   POST   /orcamentos          → cria orçamento para uma categoria
//   PUT    /orcamentos/:id      → edita orçamento
//   DELETE /orcamentos/:id      → remove orçamento
//
// Lógica do "spent" (valor gasto):
//   Uma subquery calcula a soma das transações do tipo Despesa
//   para a mesma categoria, no período correto (mês/semestre/ano atual).
//   Isso é calculado em tempo real pelo banco, sem precisar armazenar.
// ============================================================

app.get('/orcamentos/:userId', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT b.*, c.category_name,
        COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          WHERE t.category_id=b.category_id AND t.user_id=b.user_id
            AND t.transaction_type='Despesa'
            AND CASE b.period
              WHEN 'Mensal'    THEN DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', NOW())
              WHEN 'Semestral' THEN t.transaction_date >= NOW() - INTERVAL '6 months'
              WHEN 'Anual'     THEN DATE_TRUNC('year',  t.transaction_date) = DATE_TRUNC('year',  NOW())
            END
        ),0) AS spent
       FROM budgets b
       JOIN categories c ON b.category_id=c.category_id
       WHERE b.user_id=$1 ORDER BY b.created_at`,
      [req.params.userId]
    );
    res.json(r.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar orçamentos.' }); }
});

app.post('/orcamentos', async (req, res) => {
  const { user_id, budget_name, category_id, limit_amount, period } = req.body;
  if (!budget_name || budget_name.length < 3 || budget_name.length > 100)
    return res.status(400).json({ error: 'Nome deve ter entre 3 e 100 caracteres.' });
  if (!limit_amount || parseFloat(limit_amount) <= 0) return res.status(400).json({ error: 'Valor limite deve ser positivo.' });
  if (!['Mensal','Semestral','Anual'].includes(period)) return res.status(400).json({ error: 'Período inválido.' });
  try {
    const r = await pool.query(
      `INSERT INTO budgets (user_id, budget_name, category_id, limit_amount, period)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [user_id, budget_name, category_id, parseFloat(limit_amount), period]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao criar orçamento.' }); }
});

app.put('/orcamentos/:budgetId', async (req, res) => {
  const { budget_name, category_id, limit_amount, period } = req.body;
  try {
    const r = await pool.query(
      `UPDATE budgets SET budget_name=$1, category_id=$2, limit_amount=$3, period=$4
       WHERE budget_id=$5 RETURNING *`,
      [budget_name, category_id, parseFloat(limit_amount), period, req.params.budgetId]
    );
    res.json(r.rows[0]);
  } catch { res.status(500).json({ error: 'Erro ao atualizar orçamento.' }); }
});

app.delete('/orcamentos/:budgetId', async (req, res) => {
  try {
    await pool.query('DELETE FROM budgets WHERE budget_id=$1', [req.params.budgetId]);
    res.json({ message: 'Orçamento removido.' });
  } catch { res.status(500).json({ error: 'Erro ao remover orçamento.' }); }
});

// ============================================================
// MÓDULO 8 – METAS DE POUPANÇA
//
// Tabela no banco: savings_goals
// Colunas reais: due_date (não deadline), associated_account_id (não account_id)
//
// Rotas:
//   GET    /metas/:userId   → lista metas com % de progresso calculado
//   POST   /metas           → cria nova meta
//   PUT    /metas/:id       → atualiza meta (inclui depositar valor)
//   DELETE /metas/:id       → remove meta
//
// O progress_pct é calculado no banco: (current_amount / target_amount) * 100
// NULLIF(target_amount, 0) evita divisão por zero caso o alvo seja 0.
// ============================================================

app.get('/metas/:userId', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT sg.*, a.account_name,
        ROUND((sg.current_amount / NULLIF(sg.target_amount,0)) * 100, 2) AS progress_pct
       FROM savings_goals sg
       LEFT JOIN accounts a ON sg.associated_account_id=a.account_id
       WHERE sg.user_id=$1 ORDER BY sg.created_at`,
      [req.params.userId]
    );
    res.json(r.rows);
  } catch { res.status(500).json({ error: 'Erro ao buscar metas.' }); }
});

app.post('/metas', async (req, res) => {
  const { user_id, goal_name, target_amount, current_amount, deadline, account_id } = req.body;
  if (!goal_name || goal_name.length < 3 || goal_name.length > 100)
    return res.status(400).json({ error: 'Nome deve ter entre 3 e 100 caracteres.' });
  if (!target_amount || parseFloat(target_amount) <= 0) return res.status(400).json({ error: 'Valor alvo deve ser positivo.' });
  try {
    const r = await pool.query(
      `INSERT INTO savings_goals (user_id, goal_name, target_amount, current_amount, due_date, associated_account_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user_id, goal_name, parseFloat(target_amount), parseFloat(current_amount) || 0,
       deadline || null, account_id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao criar meta.' }); }
});

app.put('/metas/:goalId', async (req, res) => {
  const { goal_name, target_amount, current_amount, deadline, account_id } = req.body;
  try {
    const r = await pool.query(
      `UPDATE savings_goals SET goal_name=$1, target_amount=$2, current_amount=$3,
       due_date=$4, associated_account_id=$5 WHERE goal_id=$6 RETURNING *`,
      [goal_name, parseFloat(target_amount), parseFloat(current_amount),
       deadline || null, account_id || null, req.params.goalId]
    );
    res.json(r.rows[0]);
  } catch { res.status(500).json({ error: 'Erro ao atualizar meta.' }); }
});

app.delete('/metas/:goalId', async (req, res) => {
  try {
    await pool.query('DELETE FROM savings_goals WHERE goal_id=$1', [req.params.goalId]);
    res.json({ message: 'Meta removida.' });
  } catch { res.status(500).json({ error: 'Erro ao remover meta.' }); }
});

// ============================================================
// MÓDULO 9 – INVESTIMENTOS
// Colunas reais: average_buy_price (não average_price), brokerage_platform (não broker)
// ENUM: 'Ações','Fundos Imobiliários','Criptomoedas','Renda Fixa','Imóveis','Outros'
// ============================================================

app.get('/investimentos/:userId', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT *,
        CASE WHEN current_market_value IS NOT NULL AND average_buy_price > 0
          THEN ROUND(((current_market_value - average_buy_price) / average_buy_price) * 100, 2)
          ELSE NULL
        END AS rentabilidade_pct
       FROM investments WHERE user_id=$1 ORDER BY created_at`,
      [req.params.userId]
    );
    res.json(r.rows);
  } catch { res.status(500).json({ error: 'Erro ao buscar investimentos.' }); }
});

app.post('/investimentos', async (req, res) => {
  const { user_id, investment_type, asset_name, quantity_invested, average_price, current_market_value, broker } = req.body;
  if (!asset_name || asset_name.length < 2) return res.status(400).json({ error: 'Nome do ativo deve ter no mínimo 2 caracteres.' });
  if (!quantity_invested || parseFloat(quantity_invested) <= 0) return res.status(400).json({ error: 'Quantidade deve ser positiva.' });
  if (!average_price || parseFloat(average_price) <= 0) return res.status(400).json({ error: 'Preço médio deve ser positivo.' });
  try {
    const r = await pool.query(
      `INSERT INTO investments (user_id, investment_type, asset_name, quantity_invested, average_buy_price, current_market_value, brokerage_platform)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [user_id, investment_type, asset_name, parseFloat(quantity_invested),
       parseFloat(average_price), current_market_value ? parseFloat(current_market_value) : null,
       broker || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao criar investimento.' }); }
});

app.put('/investimentos/:investmentId', async (req, res) => {
  const { investment_type, asset_name, quantity_invested, average_price, current_market_value, broker } = req.body;
  try {
    const r = await pool.query(
      `UPDATE investments SET investment_type=$1, asset_name=$2, quantity_invested=$3,
       average_buy_price=$4, current_market_value=$5, brokerage_platform=$6
       WHERE investment_id=$7 RETURNING *`,
      [investment_type, asset_name, parseFloat(quantity_invested), parseFloat(average_price),
       current_market_value ? parseFloat(current_market_value) : null,
       broker || null, req.params.investmentId]
    );
    res.json(r.rows[0]);
  } catch { res.status(500).json({ error: 'Erro ao atualizar investimento.' }); }
});

app.delete('/investimentos/:investmentId', async (req, res) => {
  try {
    await pool.query('DELETE FROM investments WHERE investment_id=$1', [req.params.investmentId]);
    res.json({ message: 'Investimento removido.' });
  } catch { res.status(500).json({ error: 'Erro ao remover investimento.' }); }
});

// ============================================================
// MÓDULO 10 – DASHBOARD GERAL
// ============================================================

app.get('/dashboard/:userId', async (req, res) => {
  const uid = req.params.userId;
  try {
    const [saldo, resumoMes, metas, faturas, orcamentos] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(current_balance),0) AS total FROM accounts WHERE user_id=$1', [uid]),
      pool.query(
        `SELECT
          COALESCE(SUM(CASE WHEN transaction_type='Receita' THEN amount END),0) AS receitas,
          COALESCE(SUM(CASE WHEN transaction_type='Despesa' THEN amount END),0) AS despesas
         FROM transactions
         WHERE user_id=$1 AND DATE_TRUNC('month',transaction_date)=DATE_TRUNC('month',NOW())`,
        [uid]
      ),
      pool.query(
        `SELECT goal_name, target_amount, current_amount,
          ROUND((current_amount/NULLIF(target_amount,0))*100,2) AS progress_pct
         FROM savings_goals WHERE user_id=$1 ORDER BY created_at LIMIT 5`,
        [uid]
      ),
      pool.query(
        `SELECT bill_name, amount, due_date, status
         FROM bills WHERE user_id=$1 AND status != 'Paga'
           AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         ORDER BY due_date`,
        [uid]
      ),
      pool.query(
        `SELECT b.budget_name, b.limit_amount,
          COALESCE((
            SELECT SUM(t.amount) FROM transactions t
            WHERE t.category_id=b.category_id AND t.user_id=b.user_id
              AND t.transaction_type='Despesa'
              AND DATE_TRUNC('month',t.transaction_date)=DATE_TRUNC('month',NOW())
          ),0) AS spent
         FROM budgets b WHERE b.user_id=$1`,
        [uid]
      ),
    ]);

    const alertas = [
      ...faturas.rows.map(f => ({
        tipo: 'fatura',
        mensagem: `Fatura "${f.bill_name}" vence em ${new Date(f.due_date).toLocaleDateString('pt-BR')}`,
        valor: f.amount,
      })),
      ...orcamentos.rows
        .filter(o => parseFloat(o.spent) >= parseFloat(o.limit_amount))
        .map(o => ({ tipo: 'orcamento', mensagem: `Orçamento "${o.budget_name}" excedido!`, valor: o.spent })),
    ];

    res.json({
      saldo_total:  saldo.rows[0].total,
      receitas_mes: resumoMes.rows[0].receitas,
      despesas_mes: resumoMes.rows[0].despesas,
      metas:        metas.rows,
      alertas,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao carregar dashboard.' }); }
});

// ============================================================
// MÓDULO 11 – RELATÓRIOS
// ============================================================

app.get('/relatorios/fluxo-caixa/:userId', async (req, res) => {
  const { periodo = 'mensal', ano = new Date().getFullYear() } = req.query;
  const agrupamento = periodo === 'anual'
    ? "TO_CHAR(transaction_date,'YYYY')"
    : "TO_CHAR(transaction_date,'YYYY-MM')";
  try {
    const r = await pool.query(
      `SELECT ${agrupamento} AS periodo,
        COALESCE(SUM(CASE WHEN transaction_type='Receita' THEN amount END),0) AS receitas,
        COALESCE(SUM(CASE WHEN transaction_type='Despesa' THEN amount END),0) AS despesas
       FROM transactions
       WHERE user_id=$1 AND EXTRACT(YEAR FROM transaction_date)=$2
       GROUP BY 1 ORDER BY 1`,
      [req.params.userId, ano]
    );
    res.json(r.rows);
  } catch { res.status(500).json({ error: 'Erro ao gerar relatório.' }); }
});

app.get('/relatorios/despesas-categoria/:userId', async (req, res) => {
  const { mes, ano } = req.query;
  let where = `WHERE t.user_id=$1 AND t.transaction_type='Despesa'`;
  const params = [req.params.userId]; let idx = 2;
  if (mes) { where += ` AND EXTRACT(MONTH FROM t.transaction_date)=$${idx++}`; params.push(mes); }
  if (ano) { where += ` AND EXTRACT(YEAR  FROM t.transaction_date)=$${idx++}`; params.push(ano); }
  try {
    const r = await pool.query(
      `SELECT c.category_name, c.color, SUM(t.amount) AS total
       FROM transactions t JOIN categories c ON t.category_id=c.category_id
       ${where} GROUP BY c.category_name, c.color ORDER BY total DESC`,
      params
    );
    res.json(r.rows);
  } catch { res.status(500).json({ error: 'Erro ao gerar relatório.' }); }
});

app.get('/relatorios/receitas-fonte/:userId', async (req, res) => {
  const { mes, ano } = req.query;
  let where = `WHERE t.user_id=$1 AND t.transaction_type='Receita'`;
  const params = [req.params.userId]; let idx = 2;
  if (mes) { where += ` AND EXTRACT(MONTH FROM t.transaction_date)=$${idx++}`; params.push(mes); }
  if (ano) { where += ` AND EXTRACT(YEAR  FROM t.transaction_date)=$${idx++}`; params.push(ano); }
  try {
    const r = await pool.query(
      `SELECT c.category_name, c.color, SUM(t.amount) AS total
       FROM transactions t JOIN categories c ON t.category_id=c.category_id
       ${where} GROUP BY c.category_name, c.color ORDER BY total DESC`,
      params
    );
    res.json(r.rows);
  } catch { res.status(500).json({ error: 'Erro ao gerar relatório.' }); }
});

app.get('/relatorios/orcamentos/:userId', async (req, res) => {
  const { mes = new Date().getMonth() + 1, ano = new Date().getFullYear() } = req.query;
  try {
    const r = await pool.query(
      `SELECT b.budget_name, b.limit_amount, b.period,
        COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          WHERE t.category_id=b.category_id AND t.user_id=b.user_id
            AND t.transaction_type='Despesa'
            AND EXTRACT(MONTH FROM t.transaction_date)=$2
            AND EXTRACT(YEAR  FROM t.transaction_date)=$3
        ),0) AS spent
       FROM budgets b WHERE b.user_id=$1`,
      [req.params.userId, mes, ano]
    );
    res.json(r.rows);
  } catch { res.status(500).json({ error: 'Erro ao gerar relatório.' }); }
});

app.get('/relatorios/investimentos/:userId', async (req, res) => {
  const { tipo } = req.query;
  let query = `SELECT *,
    CASE WHEN current_market_value IS NOT NULL
      THEN ROUND(((current_market_value - average_buy_price) / average_buy_price) * 100, 2)
      ELSE NULL END AS rentabilidade_pct,
    (quantity_invested * average_buy_price) AS total_investido
   FROM investments WHERE user_id=$1`;
  const params = [req.params.userId];
  if (tipo) { query += ` AND investment_type=$2`; params.push(tipo); }
  query += ' ORDER BY investment_type, created_at';
  try {
    const r = await pool.query(query, params);
    res.json(r.rows);
  } catch { res.status(500).json({ error: 'Erro ao gerar relatório.' }); }
});

// ============================================================
// MÓDULO 12 – EXPORTAÇÃO DE DADOS (CSV)
// ============================================================

app.get('/export/:userId', async (req, res) => {
  const { tipo = 'transacoes', data_inicio, data_fim } = req.query;
  const uid = req.params.userId;
  try {
    let rows = []; let headers = [];
    if (tipo === 'transacoes') {
      let q = `SELECT t.transaction_date, t.description, t.transaction_type, t.amount, t.status,
                 c.category_name, a.account_name
               FROM transactions t
               LEFT JOIN categories c ON t.category_id=c.category_id
               LEFT JOIN accounts   a ON t.account_id =a.account_id
               WHERE t.user_id=$1`;
      const params = [uid];
      if (data_inicio) { q += ` AND t.transaction_date>=$2`; params.push(data_inicio); }
      if (data_fim)    { q += ` AND t.transaction_date<=$${params.length+1}`; params.push(data_fim); }
      q += ' ORDER BY t.transaction_date DESC';
      const r = await pool.query(q, params);
      headers = ['Data','Descrição','Tipo','Valor','Status','Categoria','Conta'];
      rows = r.rows.map(x => [
        new Date(x.transaction_date).toLocaleDateString('pt-BR'),
        x.description || '', x.transaction_type, x.amount, x.status,
        x.category_name || '', x.account_name || '',
      ]);
    } else if (tipo === 'investimentos') {
      const r = await pool.query('SELECT * FROM investments WHERE user_id=$1', [uid]);
      headers = ['Tipo','Ativo','Quantidade','Preço Médio','Valor de Mercado','Corretora'];
      rows = r.rows.map(x => [
        x.investment_type, x.asset_name, x.quantity_invested,
        x.average_buy_price, x.current_market_value || '', x.brokerage_platform || '',
      ]);
    }
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
      .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="finann_${tipo}_${Date.now()}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao exportar dados.' }); }
});

// ============================================================
// MÓDULO 13 – ASSISTENTE DE IA (FinanN ChatBot)
//
// Rota:
//   POST /chat   → recebe { user_id, message } e retorna { message, action }
//
// Como funciona:
//   1. O backend busca o contexto financeiro do utilizador no banco
//      (contas, categorias, saldo, receitas/despesas do mês)
//   2. Monta um "system prompt" com esse contexto e regras de comportamento
//   3. Envia o system prompt + mensagem do utilizador à API da Groq
//   4. A Groq usa o modelo Llama 3.3 70B para gerar uma resposta em JSON
//   5. O JSON retornado tem dois campos:
//        - "message": texto amigável para exibir no chat
//        - "action": null (apenas conversa) ou objeto para executar uma ação
//   6. Se a ação for "create_transaction", o backend cria a transação
//      automaticamente e atualiza o saldo da conta correspondente
//
// API da Groq (https://console.groq.com):
//   - Gratuita para uso (sem cartão de crédito)
//   - Limites do plano gratuito: 14.400 req/dia, 6.000 tokens/min
//   - Modelo usado: llama-3.3-70b-versatile (muito capaz e rápido)
//   - response_format: json_object garante que a resposta é sempre JSON válido
//   - temperature: 0.7 (0=respostas exatas, 1=mais criativo; 0.7 é equilíbrio)
//   - max_tokens: 600 (limite de comprimento da resposta)
//
// A chave de API fica no .env como GROQ_API_KEY (nunca hardcoded).
// ============================================================

app.post('/chat', async (req, res) => {
  const { user_id, message } = req.body;
  if (!user_id || !message)
    return res.status(400).json({ error: 'user_id e message são obrigatórios.' });

  try {
    // Passo 1: buscar contexto do utilizador em paralelo (mais rápido)
    // Promise.all executa as 3 queries ao mesmo tempo, sem esperar uma por uma
    const [contasRes, categoriasRes, resumoRes] = await Promise.all([
      // Contas: para saber onde depositar a transação
      pool.query(
        'SELECT account_id, account_name, current_balance FROM accounts WHERE user_id=$1',
        [user_id]
      ),
      // Categorias: para classificar a transação corretamente
      pool.query(
        `SELECT category_id, category_name, category_type
         FROM categories WHERE user_id=$1 OR user_id IS NULL
         ORDER BY category_type, category_name`,
        [user_id]
      ),
      // Resumo financeiro do mês atual: saldo, receitas e despesas
      pool.query(
        `SELECT
           COALESCE(SUM(CASE WHEN transaction_type='Receita' THEN amount END),0) AS receitas,
           COALESCE(SUM(CASE WHEN transaction_type='Despesa' THEN amount END),0) AS despesas,
           COALESCE((SELECT SUM(current_balance) FROM accounts WHERE user_id=$1),0) AS saldo
         FROM transactions
         WHERE user_id=$1
           AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', NOW())`,
        [user_id]
      ),
    ]);

    const contas    = contasRes.rows;
    const categorias = categoriasRes.rows;
    const resumo    = resumoRes.rows[0];
    const hoje      = new Date().toISOString().split('T')[0]; // formato YYYY-MM-DD

    // Passo 2: montar o "system prompt" — instrução que define o comportamento da IA
    // Incluímos os dados reais do utilizador para que a IA possa responder
    // com informações precisas e usar os IDs corretos ao criar transações.
    const systemPrompt = `Você é o assistente financeiro pessoal do app FinanN.
Você ajuda o utilizador a gerenciar suas finanças, dar dicas e registrar transações por texto.

DADOS FINANCEIROS ATUAIS DO UTILIZADOR:
- Saldo total: R$ ${parseFloat(resumo.saldo).toFixed(2)}
- Receitas este mês: R$ ${parseFloat(resumo.receitas).toFixed(2)}
- Despesas este mês: R$ ${parseFloat(resumo.despesas).toFixed(2)}

CONTAS DISPONÍVEIS (use os IDs exatos abaixo):
${contas.map(c => `- ID ${c.account_id}: "${c.account_name}" (saldo: R$ ${parseFloat(c.current_balance).toFixed(2)})`).join('\n')}

CATEGORIAS DISPONÍVEIS (use os IDs exatos abaixo):
${categorias.map(c => `- ID ${c.category_id}: "${c.category_name}" (${c.category_type})`).join('\n')}

REGRAS OBRIGATÓRIAS:
1. Responda SEMPRE em JSON válido com exatamente dois campos: "message" e "action"
2. "message": texto amigável em português do Brasil para mostrar ao utilizador
3. "action": null para conversa/dicas, ou objeto de ação para executar algo

AÇÃO SUPORTADA — criar transação:
{
  "type": "create_transaction",
  "data": {
    "description": "nome da transação",
    "amount": número positivo,
    "transaction_type": "Despesa" ou "Receita",
    "category_id": número (usar o ID mais adequado da lista acima),
    "account_id": número (usar a primeira conta disponível se não especificado),
    "transaction_date": "${hoje}"
  }
}

EXEMPLOS DE RESPOSTA:
Entrada: "adicionar despesa roupa 150"
Saída: {"message":"Despesa de R$150,00 em Roupa registada! 👕","action":{"type":"create_transaction","data":{"description":"Roupa","amount":150,"transaction_type":"Despesa","category_id":<id>,"account_id":<id>,"transaction_date":"${hoje}"}}}

Entrada: "qual meu saldo?"
Saída: {"message":"Seu saldo total é R$ ${parseFloat(resumo.saldo).toFixed(2)}. Este mês você recebeu R$ ${parseFloat(resumo.receitas).toFixed(2)} e gastou R$ ${parseFloat(resumo.despesas).toFixed(2)}.","action":null}

Entrada: "dica de economia"
Saída: {"message":"Dica: tente a regra 50/30/20 — 50% necessidades, 30% desejos e 20% poupança. Com suas despesas de R$ ${parseFloat(resumo.despesas).toFixed(2)} este mês, há espaço para melhorar!","action":null}

Seja sempre simpático, conciso e fale em português do Brasil.`;

    // Passo 3: chamar a API da Groq
    // fetch() é nativo no Node.js 18+. Não precisa de biblioteca adicional.
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, // chave do .env
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',         // modelo de IA gratuito da Groq
        messages: [
          { role: 'system', content: systemPrompt }, // comportamento da IA
          { role: 'user',   content: message },       // mensagem do utilizador
        ],
        temperature: 0.7,                            // criatividade moderada
        max_tokens: 600,                             // tamanho máximo da resposta
        response_format: { type: 'json_object' },    // força retorno em JSON válido
      }),
    });

    // Se a API retornar erro (ex: chave inválida, limite excedido)
    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('Groq API error:', errText);
      return res.status(502).json({ error: 'Erro ao comunicar com a IA. Verifique a GROQ_API_KEY.' });
    }

    // Passo 4: extrair e analisar a resposta da IA
    const groqData = await groqResponse.json();
    // choices[0].message.content é a string JSON gerada pelo modelo
    const parsed = JSON.parse(groqData.choices[0].message.content);

    // Passo 5: se a IA detectou uma ação de criar transação, executar no banco
    if (parsed.action?.type === 'create_transaction') {
      const d = parsed.action.data;
      const dataTransacao = d.transaction_date || hoje;

      // Inserir a transação na tabela transactions
      await pool.query(
        `INSERT INTO transactions
           (user_id, account_id, category_id, description, amount, transaction_type, transaction_date, status, recurrence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pago', 'Única')`,
        [user_id, d.account_id, d.category_id, d.description,
         parseFloat(d.amount), d.transaction_type, dataTransacao]
      );

      // Atualizar o saldo da conta: + para Receita, - para Despesa
      const sinal = d.transaction_type === 'Receita' ? '+' : '-';
      await pool.query(
        `UPDATE accounts SET current_balance = current_balance ${sinal} $1 WHERE account_id = $2`,
        [parseFloat(d.amount), d.account_id]
      );
    }

    // Retornar a resposta da IA para o frontend
    res.json(parsed);

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Erro no assistente de IA.' });
  }
});

// ============================================================
// RECUPERAÇÃO DE SENHA
// ============================================================

// POST /auth/esqueci-senha
// Recebe um email, gera um token único de 1 hora e envia um link por email.
// Sempre retorna sucesso para não revelar se o email existe no banco (segurança).
app.post('/auth/esqueci-senha', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório.' });

  try {
    // Busca o utilizador pelo email (case-insensitive)
    const r = await pool.query(
      'SELECT user_id, full_name FROM users WHERE LOWER(email) = $1',
      [email.toLowerCase()]
    );

    // Resposta genérica — não revela se o email está cadastrado
    const msgSucesso = { message: 'Se este email estiver cadastrado, você receberá um link em breve.' };

    if (r.rows.length === 0) return res.json(msgSucesso);

    const user = r.rows[0];

    // Gera token aleatório de 64 caracteres (32 bytes em hex)
    const token = crypto.randomBytes(32).toString('hex');

    // Salva o token na memória com validade de 1 hora
    resetTokens.set(token, {
      userId:  user.user_id,
      email:   email.toLowerCase(),
      expires: Date.now() + 60 * 60 * 1000, // 1 hora
    });

    // Configura o transportador de email usando Gmail SMTP
    const transporter = nodemailer.createTransport({
      host:   'smtp.gmail.com',
      port:   587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Link que o utilizador vai clicar no email
    const link = `http://localhost:5173/redefinir-senha?token=${token}`;

    // Envia o email com o link de recuperação
    await transporter.sendMail({
      from:    `"FinanN" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: 'Recuperação de senha — FinanN',
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0f172a,#1e40af);padding:32px 32px 24px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">FinanN</div>
            <p style="color:#93c5fd;margin:4px 0 0;font-size:13px;">Plataforma de Gestão Financeira Pessoal</p>
          </div>
          <div style="padding:32px;">
            <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Olá, ${user.full_name}!</h2>
            <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Recebemos uma solicitação para redefinir a senha da sua conta FinanN.
              Clique no botão abaixo para criar uma nova senha.
            </p>
            <a href="${link}" style="display:block;background:#2563eb;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:700;font-size:15px;">
              Redefinir minha senha
            </a>
            <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;text-align:center;">
              Este link expira em <strong>1 hora</strong>.<br/>
              Se você não solicitou a recuperação, ignore este email.
            </p>
          </div>
        </div>
      `,
    });

    res.json(msgSucesso);

  } catch (err) {
    console.error('Erro esqueci-senha:', err);
    res.status(500).json({ error: 'Erro ao enviar email. Verifique as configurações de EMAIL_USER e EMAIL_PASS no .env.' });
  }
});

// POST /auth/redefinir-senha
// Recebe o token (da URL do email) e a nova senha.
// Valida o token, verifica se não expirou e atualiza a senha no banco.
app.post('/auth/redefinir-senha', async (req, res) => {
  const { token, senha_nova } = req.body;
  if (!token || !senha_nova) return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });

  // Verifica se o token existe na memória
  const entry = resetTokens.get(token);
  if (!entry) return res.status(400).json({ error: 'Link inválido ou já utilizado.' });

  // Verifica se o token ainda está dentro do prazo de 1 hora
  if (Date.now() > entry.expires) {
    resetTokens.delete(token);
    return res.status(400).json({ error: 'Link expirado. Solicite um novo link de recuperação.' });
  }

  // Valida os requisitos de força da senha (igual ao cadastro)
  const senhaValida = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\#\^])[A-Za-z\d@$!%*?&\#\^]{8,}$/.test(senha_nova);
  if (!senhaValida) return res.status(400).json({ error: 'A senha não atende aos requisitos: mínimo 8 caracteres, maiúscula, minúscula, número e símbolo.' });

  try {
    // Gera o hash da nova senha com bcrypt (12 rounds)
    const hash = await bcrypt.hash(senha_nova, 12);

    // Atualiza a senha no banco de dados
    await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hash, entry.userId]);

    // Remove o token — é de uso único
    resetTokens.delete(token);

    res.json({ message: 'Senha redefinida com sucesso! Faça login com a nova senha.' });

  } catch (err) {
    console.error('Erro redefinir-senha:', err);
    res.status(500).json({ error: 'Erro ao redefinir senha.' });
  }
});

// ============================================================
// SERVIDOR
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));
