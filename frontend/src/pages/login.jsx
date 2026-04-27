// ============================================================
// login.jsx — Página de autenticação do FinanN
//
// O que faz:
//   Permite que utilizadores existentes façam login na aplicação.
//   Após autenticação bem-sucedida, guarda os dados do utilizador
//   no localStorage e redireciona para o Dashboard.
//
// Layout:
//   Dividido em dois painéis lado a lado (apenas desktop — lg+):
//     - Esquerdo: branding com gradiente azul escuro, logo e lista de funcionalidades
//     - Direito: formulário de login com email, senha e botão de entrar
//   Em mobile, apenas o painel direito é exibido, com um logo pequeno no topo.
//
// Funcionalidades:
//   - Toggle de visibilidade da senha (Eye / EyeOff)
//   - Indicador de carregamento (spinner animado) durante a requisição
//   - Exibição de erros vindos do backend (ex: "Email ou senha incorretos")
//   - Email convertido para minúsculas antes de enviar (normalização)
//
// Fluxo de autenticação:
//   1. Utilizador preenche email e senha
//   2. Frontend envia POST /auth/login ao backend
//   3. Backend verifica o email no banco e compara senha com bcrypt
//   4. Se correto: retorna os dados do utilizador (sem a senha)
//   5. Frontend guarda os dados em localStorage('usuario') como JSON
//   6. React Router redireciona para /dashboard
//
// Dependências:
//   - React (useState): estado dos campos, visibilidade, erros e loading
//   - react-router-dom: Link (ir para /cadastro), useNavigate (redirecionar)
//   - lucide-react: ícones LogIn, Eye, EyeOff, TrendingUp, Zap
//   - axios: requisição HTTP POST ao backend
//   - Logo: logotipo SVG do FinanN
// ============================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, TrendingUp, Zap } from 'lucide-react';
import axios from 'axios';
import Logo from '../components/Logo';

// Endereço base do backend — deve coincidir com o PORT do .env
const API = 'http://127.0.0.1:5000';

// Lista de funcionalidades exibidas no painel esquerdo de branding
const FEATURES = [
  { icon: TrendingUp, label: 'Investimentos',   desc: 'Acompanhe rentabilidade em tempo real' },
  { icon: Zap,        label: 'Cotações ao Vivo', desc: 'USD, EUR, BTC atualizados por minuto' },
];

export default function Login() {
  // ---- Estado do formulário ----
  const [email,    setEmail]    = useState('');  // valor do campo email
  const [password, setPassword] = useState('');  // valor do campo senha
  const [mostrar,  setMostrar]  = useState(false); // toggle: mostrar/ocultar senha
  const [erro,     setErro]     = useState('');  // mensagem de erro (vinda do backend)
  const [loading,  setLoading]  = useState(false); // aguardando resposta da API?

  const navigate = useNavigate(); // para redirecionar após login bem-sucedido

  // ---- Função de submissão do formulário ----
  const handleLogin = async (e) => {
    e.preventDefault(); // evita recarregar a página (comportamento padrão do form)
    setErro('');         // limpa erro anterior
    setLoading(true);    // ativa spinner

    try {
      // Envia email (em minúsculas) e senha ao backend
      const res = await axios.post(`${API}/auth/login`, {
        email: email.toLowerCase(),
        password,
      });

      // Guarda os dados do utilizador no localStorage (persistem entre sessões)
      // res.data.user contém: user_id, full_name, email, currency_preference, etc.
      // A senha (password_hash) nunca é retornada pelo backend
      localStorage.setItem('usuario', JSON.stringify(res.data.user));

      // Redireciona para o dashboard após login bem-sucedido
      navigate('/dashboard');

    } catch (err) {
      // Exibe o erro retornado pelo backend, ou mensagem genérica
      setErro(err.response?.data?.error || 'Erro ao fazer login.');
    } finally {
      setLoading(false); // sempre desativa o spinner
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ====================================================
          PAINEL ESQUERDO — Branding (visível apenas em desktop lg+)
          Gradiente azul escuro com logo, slogan e lista de funcionalidades
          ==================================================== */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)' }}
      >
        {/* Decoração geométrica de fundo — círculos semitransparentes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-blue-600/10" />
          <div className="absolute top-1/2 -left-32 w-64 h-64 rounded-full bg-indigo-600/10" />
          <div className="absolute -bottom-20 right-20 w-72 h-72 rounded-full bg-blue-400/5" />
        </div>

        {/* Logo no topo esquerdo */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <Logo size={40} />
            <span className="text-white text-2xl font-bold tracking-tight">FinanN</span>
          </div>
          <p className="text-blue-300 text-sm font-medium">Plataforma de Gestão Financeira Pessoal</p>
        </div>

        {/* Slogan central */}
        <div className="relative space-y-3">
          <p className="text-white text-3xl font-bold leading-tight">
            Tome o controle<br />das suas finanças.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Gerencie contas, investimentos, metas e orçamentos num único lugar — com cotações de mercado em tempo real.
          </p>
        </div>

        {/* Lista de funcionalidades em destaque */}
        <div className="relative space-y-4">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 flex-shrink-0">
                <Icon size={16} className="text-blue-300" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{label}</p>
                <p className="text-slate-400 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ====================================================
          PAINEL DIREITO — Formulário de login
          Fundo cinza claro, centralizado, largura máxima 384px
          ==================================================== */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">

          {/* Logo mobile — visível apenas em telas pequenas (abaixo de lg) */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Logo size={32} />
            <span className="text-slate-800 text-xl font-bold">FinanN</span>
          </div>

          {/* Cabeçalho do formulário */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h2>
            <p className="text-slate-500 text-sm mt-1">Entre na sua conta para continuar</p>
          </div>

          {/* Caixa de erro — aparece apenas se houver mensagem de erro */}
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl mb-5 flex items-center gap-2">
              <span className="text-red-500">✕</span> {erro}
            </div>
          )}

          {/* Formulário de login */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Campo de email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            {/* Campo de senha com toggle de visibilidade */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Senha</label>
                {/* Link de recuperação de senha — vai para /esqueci-senha */}
                <Link to="/esqueci-senha" className="text-xs text-blue-600 hover:underline font-medium">
                  Esqueceu sua senha?
                </Link>
              </div>
              <div className="relative">
                {/* type muda entre 'password' e 'text' conforme o estado mostrar */}
                <input
                  type={mostrar ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                {/* Botão olho para alternar visibilidade da senha */}
                <button
                  type="button"
                  onClick={() => setMostrar(!mostrar)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botão de submissão */}
            {/* disabled enquanto está carregando para evitar duplo envio */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                // Estado de carregamento: spinner animado
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  A entrar...
                </span>
              ) : (
                // Estado normal: ícone + texto
                <><LogIn size={16} /> Entrar</>
              )}
            </button>
          </form>

          {/* Link para a página de registo */}
          <p className="mt-6 text-center text-slate-500 text-sm">
            Não tem conta?{' '}
            <Link to="/cadastro" className="text-blue-600 font-semibold hover:underline">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
