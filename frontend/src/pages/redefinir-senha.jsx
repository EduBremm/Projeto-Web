// ============================================================
// redefinir-senha.jsx — Página de redefinição de senha
//
// O que faz:
//   Permite que o utilizador defina uma nova senha usando o token
//   recebido por email. O token vem como parâmetro na URL:
//   /redefinir-senha?token=abc123...
//
// Fluxo:
//   1. Utilizador chega nesta página vindo do link do email
//   2. useSearchParams lê o token da URL
//   3. Utilizador digita a nova senha (com confirmação)
//   4. Frontend valida os requisitos e envia POST /auth/redefinir-senha
//   5. Backend valida o token, atualiza a senha e retorna sucesso
//   6. Utilizador é redirecionado para o login após 3 segundos
// ============================================================

import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import Logo from '../components/Logo';

// Endereço base do backend
const API = 'http://127.0.0.1:5000';

// Verifica cada requisito de segurança da senha
const REQUISITOS = [
  { id: 'len',     label: 'Mínimo 8 caracteres',         test: v => v.length >= 8 },
  { id: 'upper',   label: 'Uma letra maiúscula',          test: v => /[A-Z]/.test(v) },
  { id: 'lower',   label: 'Uma letra minúscula',          test: v => /[a-z]/.test(v) },
  { id: 'number',  label: 'Um número',                    test: v => /\d/.test(v) },
  { id: 'symbol',  label: 'Um símbolo (@$!%*?&#^)',       test: v => /[@$!%*?&\#\^]/.test(v) },
];

export default function RedefinirSenha() {
  // Lê os parâmetros da URL (?token=...)
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const navigate = useNavigate();

  // Estados do formulário
  const [senha,      setSenha]      = useState('');
  const [confirma,   setConfirma]   = useState('');
  const [mostrarS,   setMostrarS]   = useState(false); // toggle visibilidade senha
  const [mostrarC,   setMostrarC]   = useState(false); // toggle visibilidade confirmação
  const [erro,       setErro]       = useState('');
  const [sucesso,    setSucesso]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [countdown,  setCountdown]  = useState(3); // contagem regressiva após sucesso

  // Se não houver token na URL, exibe erro imediatamente
  const tokenInvalido = !token;

  // Calcula quais requisitos foram atendidos para exibir o indicador visual
  const requisitosOk = REQUISITOS.map(r => ({ ...r, ok: r.test(senha) }));
  const todosOk      = requisitosOk.every(r => r.ok);

  // Após sucesso, conta 3 segundos e redireciona para o login
  useEffect(() => {
    if (!sucesso) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/'); // redireciona para o login
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sucesso, navigate]);

  // Função chamada ao submeter o formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    // Valida se as senhas coincidem
    if (senha !== confirma) {
      setErro('As senhas não coincidem.');
      return;
    }

    // Valida todos os requisitos de força
    if (!todosOk) {
      setErro('A senha não atende a todos os requisitos.');
      return;
    }

    setLoading(true);
    try {
      // Envia o token + nova senha para o backend
      await axios.post(`${API}/auth/redefinir-senha`, { token, senha_nova: senha });
      setSucesso(true);

    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Painel esquerdo de branding — igual ao login */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)' }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-blue-600/10" />
          <div className="absolute top-1/2 -left-32 w-64 h-64 rounded-full bg-indigo-600/10" />
          <div className="absolute -bottom-20 right-20 w-72 h-72 rounded-full bg-blue-400/5" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <Logo size={40} />
            <span className="text-white text-2xl font-bold tracking-tight">FinanN</span>
          </div>
          <p className="text-blue-300 text-sm font-medium">Plataforma de Gestão Financeira Pessoal</p>
        </div>

        <div className="relative space-y-3">
          <p className="text-white text-3xl font-bold leading-tight">
            Crie uma nova<br />senha segura.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Escolha uma senha forte para proteger suas informações financeiras.
            Use letras, números e símbolos.
          </p>
        </div>

        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
              <ShieldCheck size={16} className="text-blue-300" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Dados protegidos</p>
              <p className="text-slate-400 text-xs">Senha armazenada com criptografia bcrypt</p>
            </div>
          </div>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Logo size={32} />
            <span className="text-slate-800 text-xl font-bold">FinanN</span>
          </div>

          {/* Token ausente na URL — link inválido */}
          {tokenInvalido ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Lock size={28} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Link inválido</h2>
              <p className="text-slate-500 text-sm mb-6">
                Este link de recuperação é inválido ou não contém um token.
                Solicite um novo link pela página de recuperação.
              </p>
              <Link
                to="/esqueci-senha"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all"
              >
                Solicitar novo link
              </Link>
            </div>

          ) : sucesso ? (
            // Tela de sucesso com contagem regressiva para o login
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Senha redefinida!</h2>
              <p className="text-slate-500 text-sm mb-6">
                Sua senha foi alterada com sucesso. Você será redirecionado para
                o login em <strong>{countdown}</strong> segundo{countdown !== 1 ? 's' : ''}.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-blue-600 font-semibold text-sm hover:underline"
              >
                <ArrowLeft size={14} /> Ir para o login agora
              </Link>
            </div>

          ) : (
            // Formulário de nova senha
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Redefinir senha</h2>
                <p className="text-slate-500 text-sm mt-1">Crie uma nova senha para sua conta.</p>
              </div>

              {/* Caixa de erro */}
              {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl mb-5 flex items-center gap-2">
                  <span className="text-red-500">✕</span> {erro}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Campo nova senha */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nova senha</label>
                  <div className="relative">
                    <input
                      type={mostrarS ? 'text' : 'password'}
                      required
                      autoFocus
                      autoComplete="new-password"
                      className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                      placeholder="••••••••"
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarS(!mostrarS)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {mostrarS ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Indicador visual dos requisitos — aparece quando o utilizador começa a digitar */}
                  {senha.length > 0 && (
                    <div className="mt-3 p-3 bg-slate-100 rounded-xl space-y-1.5">
                      {requisitosOk.map(r => (
                        <div key={r.id} className="flex items-center gap-2">
                          {/* Bolinha verde se atendido, cinza se não */}
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.ok ? 'bg-green-500' : 'bg-slate-300'}`} />
                          <span className={`text-xs ${r.ok ? 'text-green-700' : 'text-slate-500'}`}>{r.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Campo confirmar senha */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirmar nova senha</label>
                  <div className="relative">
                    <input
                      type={mostrarC ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      className={`w-full border rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:ring-2 transition-all bg-white
                        ${confirma.length > 0
                          ? senha === confirma
                            ? 'border-green-400 focus:ring-green-500/30'
                            : 'border-red-300 focus:ring-red-500/30'
                          : 'border-slate-200 focus:ring-blue-500/30 focus:border-blue-400'
                        }`}
                      placeholder="••••••••"
                      value={confirma}
                      onChange={e => setConfirma(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarC(!mostrarC)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {mostrarC ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Feedback inline de confirmação */}
                  {confirma.length > 0 && (
                    <p className={`text-xs mt-1.5 ${senha === confirma ? 'text-green-600' : 'text-red-500'}`}>
                      {senha === confirma ? '✓ As senhas coincidem' : '✕ As senhas não coincidem'}
                    </p>
                  )}
                </div>

                {/* Botão de submissão */}
                <button
                  type="submit"
                  disabled={loading || !todosOk || senha !== confirma}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    <><Lock size={15} /> Redefinir senha</>
                  )}
                </button>
              </form>

              {/* Link voltar ao login */}
              <p className="mt-6 text-center">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-slate-500 text-sm hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft size={14} /> Voltar ao login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
