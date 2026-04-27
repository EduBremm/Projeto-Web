// ============================================================
// Layout.jsx — Estrutura principal de todas as páginas autenticadas
//
// O que faz:
//   Define a estrutura visual comum a todas as páginas internas
//   (Dashboard, Contas, Categorias, etc.), composta por:
//     - Sidebar lateral com navegação (desktop)
//     - Sidebar deslizante com overlay (mobile)
//     - Ticker de cotações no topo (CotacaoTicker)
//     - Header mobile com botão de menu
//     - Área de conteúdo principal ({children})
//     - Botão flutuante de IA (ChatBot)
//
// Como é utilizado:
//   Cada página "envolve" o seu conteúdo com <Layout>:
//     <Layout><Dashboard /></Layout>
//   O parâmetro {children} é o conteúdo específico de cada página.
//
// Dados do utilizador:
//   Lidos do localStorage (chave 'usuario'), guardados no login.
//   Exibe nome e email na sidebar. A inicial é gerada do nome.
//
// Navegação:
//   navGroups define os grupos e itens do menu, com ícones Lucide.
//   NavItem destaca o item ativo comparando com location.pathname.
//
// Dependências:
//   - react-router-dom: Link, useLocation, useNavigate
//   - lucide-react: ícones da sidebar e header
//   - CotacaoTicker: ticker de cotações em tempo real
//   - Logo: logotipo SVG do FinanN
//   - ChatBot: assistente de IA flutuante
// ============================================================

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, Tag, ArrowLeftRight,
  FileText, Target, TrendingUp, PiggyBank, BarChart2,
  LogOut, Menu, X, ChevronRight, Sparkles, Settings,
} from 'lucide-react';
import CotacaoTicker from './CotacaoTicker';
import Logo from './Logo';
import ChatBot from './ChatBot';

// ---- Estrutura de navegação da sidebar ----
// Dividida em grupos temáticos para facilitar a orientação do utilizador.
// Cada item tem: path (rota), label (texto exibido) e icon (componente Lucide).
const navGroups = [
  {
    label: 'Visão Geral',
    items: [{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Gestão',
    items: [
      { path: '/contas',         label: 'Contas',         icon: CreditCard },
      { path: '/categorias',     label: 'Categorias',     icon: Tag },
      { path: '/transferencias', label: 'Transferências', icon: ArrowLeftRight },
      { path: '/faturas',        label: 'Faturas',        icon: FileText },
    ],
  },
  {
    label: 'Planeamento',
    items: [
      { path: '/orcamentos',    label: 'Orçamentos',      icon: Target },
      { path: '/metas',         label: 'Metas',           icon: PiggyBank },
      { path: '/investimentos', label: 'Investimentos',   icon: TrendingUp },
    ],
  },
  {
    label: 'Análise',
    items: [{ path: '/relatorios', label: 'Relatórios', icon: BarChart2 }],
  },
];

export default function Layout({ children }) {
  const location  = useLocation();  // rota atual (para destacar item ativo na sidebar)
  const navigate  = useNavigate();  // função para redirecionar programaticamente
  const [open, setOpen] = useState(false); // controla abertura da sidebar mobile

  // Lê dados do utilizador do localStorage (guardados no login)
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  // Extrai a primeira letra do nome para o avatar circular
  const inicial = (usuario.full_name || 'U').charAt(0).toUpperCase();

  // Remove dados do localStorage e redireciona para a página de login
  const handleLogout = () => {
    localStorage.removeItem('usuario');
    navigate('/');
  };

  // ---- Componente interno: item individual do menu ----
  // Recebe path, label e icon. Destaca com fundo azul se for a rota atual.
  const NavItem = ({ path, label, icon: Icon }) => {
    const active = location.pathname === path;
    return (
      <Link
        to={path}
        onClick={() => setOpen(false)} // fecha a sidebar mobile ao navegar
        className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
          active
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'  // item ativo
            : 'text-slate-400 hover:bg-slate-700/60 hover:text-white' // item inativo
        }`}
      >
        <Icon size={16} className={active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />
        <span>{label}</span>
        {/* Seta à direita indica o item ativo visualmente */}
        {active && <ChevronRight size={12} className="ml-auto opacity-70" />}
      </Link>
    );
  };

  // ---- Componente interno: barra lateral (sidebar) ----
  // Reutilizado tanto no desktop (fixo) como no mobile (deslizante).
  const Sidebar = () => (
    <aside className="sidebar-bg flex flex-col h-full w-64 border-r border-slate-700/50">

      {/* Logo do FinanN com badge "Pro" */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
        <Logo size={36} />
        <div>
          <span className="text-white font-bold text-lg tracking-tight">FinanN</span>
          <div className="flex items-center gap-1">
            <Sparkles size={9} className="text-blue-400" />
            <span className="text-blue-400 text-[10px] font-medium tracking-widest uppercase">Pro</span>
          </div>
        </div>
      </div>

      {/* Avatar do utilizador com nome, email e link para o perfil */}
      <Link to="/perfil" onClick={() => setOpen(false)}
        className="flex items-center gap-3 px-5 py-4 mx-3 mt-3 rounded-xl bg-slate-800/60 border border-slate-700/40 hover:bg-slate-700/60 transition-colors group">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0">
          {inicial}
        </div>
        <div className="overflow-hidden flex-1">
          <p className="text-white font-semibold text-sm truncate leading-tight">{usuario.full_name}</p>
          <p className="text-slate-400 text-xs truncate">{usuario.email}</p>
        </div>
        <Settings size={14} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
      </Link>

      {/* Navegação principal — renderiza os grupos e itens definidos em navGroups */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navGroups.map(({ label, items }) => (
          <div key={label}>
            {/* Label do grupo (ex: "GESTÃO") em uppercase pequeno */}
            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5">{label}</p>
            <div className="space-y-0.5">
              {items.map(item => <NavItem key={item.path} {...item} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* Rodapé da sidebar: botão de logout */}
      <div className="p-3 border-t border-slate-700/50">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 text-slate-400 hover:text-white text-sm w-full px-3 py-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors group"
        >
          <LogOut size={15} className="group-hover:text-red-400" />
          Terminar sessão
        </button>
      </div>
    </aside>
  );

  // ---- Estrutura principal da página ----
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Overlay escuro que aparece atrás da sidebar mobile quando ela está aberta */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setOpen(false)} // clica fora fecha a sidebar
        />
      )}

      {/* Sidebar fixa no desktop (lg+) — sempre visível, não desliza */}
      <div className="hidden lg:flex flex-col h-full">
        <Sidebar />
      </div>

      {/* Sidebar deslizante no mobile — usa translate para entrar/sair da tela */}
      <div className={`fixed inset-y-0 left-0 z-30 lg:hidden transition-transform duration-200 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="relative h-full">
          <Sidebar />
          {/* Botão X para fechar a sidebar manualmente no mobile */}
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Área principal (à direita da sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Ticker de cotações em tempo real (USD, EUR, BTC, etc.) */}
        {/* Fica no topo, acima de tudo o conteúdo */}
        <CotacaoTicker />

        {/* Header do mobile — aparece só em telas pequenas (abaixo de lg) */}
        {/* Contém botão de menu hamburguer + logo */}
        <header className="lg:hidden bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setOpen(true)} className="text-slate-400 hover:text-white">
            <Menu size={20} />
          </button>
          <Logo size={26} />
          <span className="font-bold text-white">FinanN</span>
        </header>

        {/* Conteúdo da página ({children}) — ocupa o restante do espaço */}
        {/* overflow-y-auto permite scroll dentro da área de conteúdo */}
        <main className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Assistente de IA flutuante — disponível em todas as páginas autenticadas */}
      {/* Renderizado fora do <main> para sobrepor todo o conteúdo */}
      <ChatBot />
    </div>
  );
}
