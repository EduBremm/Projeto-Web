// ============================================================
// esqueci-senha.jsx — Página de recuperação de senha
//
// O que faz:
//   Permite que o utilizador solicite um link de recuperação de senha
//   digitando o seu email. O backend envia um email com um link único
//   que expira em 1 hora.
//
// Fluxo:
//   1. Utilizador digita o email e clica em "Enviar link"
//   2. Frontend envia POST /auth/esqueci-senha com o email
//   3. Backend gera token, envia email e retorna mensagem genérica
//   4. Frontend exibe mensagem de sucesso com instruções
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import axios from 'axios';
import Logo from '../components/Logo';

// Endereço base do backend
const API = 'http://127.0.0.1:5000';

export default function EsqueciSenha() {
  // Estado do campo email
  const [email,   setEmail]   = useState('');
  // Mensagem de sucesso após envio
  const [sucesso, setSucesso] = useState(false);
  // Mensagem de erro do backend
  const [erro,    setErro]    = useState('');
  // Controla o spinner durante a requisição
  const [loading, setLoading] = useState(false);

  // Função chamada ao submeter o formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      // Envia o email para o backend solicitar recuperação
      await axios.post(`${API}/auth/esqueci-senha`, { email: email.toLowerCase() });

      // Exibe a mensagem de sucesso (independente de o email existir)
      setSucesso(true);

    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao enviar email. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Painel esquerdo de branding — igual ao login, visível só em desktop */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)' }}
      >
        {/* Decoração geométrica de fundo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-blue-600/10" />
          <div className="absolute top-1/2 -left-32 w-64 h-64 rounded-full bg-indigo-600/10" />
          <div className="absolute -bottom-20 right-20 w-72 h-72 rounded-full bg-blue-400/5" />
        </div>

        {/* Logo no topo */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <Logo size={40} />
            <span className="text-white text-2xl font-bold tracking-tight">FinanN</span>
          </div>
          <p className="text-blue-300 text-sm font-medium">Plataforma de Gestão Financeira Pessoal</p>
        </div>

        {/* Mensagem central */}
        <div className="relative space-y-3">
          <p className="text-white text-3xl font-bold leading-tight">
            Recupere o acesso<br />à sua conta.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Esqueceu sua senha? Sem problemas. Informe seu email e enviaremos
            um link seguro para você criar uma nova senha.
          </p>
        </div>

        {/* Rodapé com ícone */}
        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
              <Mail size={16} className="text-blue-300" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Email seguro</p>
              <p className="text-slate-400 text-xs">Link expira em 1 hora por segurança</p>
            </div>
          </div>
        </div>
      </div>

      {/* Painel direito — formulário de recuperação */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Logo size={32} />
            <span className="text-slate-800 text-xl font-bold">FinanN</span>
          </div>

          {/* Se já enviou, mostra tela de sucesso */}
          {sucesso ? (
            <div className="text-center">
              {/* Ícone de envelope animado */}
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Mail size={28} className="text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Verifique seu email</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Se <strong>{email}</strong> estiver cadastrado, você receberá
                um link de recuperação em breve. Verifique também a pasta de spam.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left mb-6">
                <p className="text-blue-800 text-xs font-semibold mb-1">O que fazer agora?</p>
                <ol className="text-blue-700 text-xs space-y-1 list-decimal list-inside">
                  <li>Abra o email enviado pelo FinanN</li>
                  <li>Clique no botão "Redefinir minha senha"</li>
                  <li>Crie uma nova senha segura</li>
                </ol>
              </div>
              <Link
                to="/"
                className="flex items-center justify-center gap-2 text-blue-600 font-semibold text-sm hover:underline"
              >
                <ArrowLeft size={14} /> Voltar ao login
              </Link>
            </div>

          ) : (
            // Formulário de solicitação
            <>
              {/* Cabeçalho */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Esqueceu sua senha?</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Digite seu email e enviaremos um link para redefinir sua senha.
                </p>
              </div>

              {/* Caixa de erro */}
              {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl mb-5 flex items-center gap-2">
                  <span className="text-red-500">✕</span> {erro}
                </div>
              )}

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email cadastrado
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                {/* Botão de envio */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    <><Send size={15} /> Enviar link de recuperação</>
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
