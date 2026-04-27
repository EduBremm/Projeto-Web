// ============================================================
// App.jsx — Ponto de entrada principal do frontend React
//
// O que faz:
//   Define todas as rotas da aplicação usando React Router DOM.
//   Cada rota mapeia uma URL para um componente de página.
//
// Como funciona:
//   O BrowserRouter usa a API de histórico do browser (sem # na URL).
//   O Routes verifica a URL atual e renderiza apenas o componente
//   que corresponde ao path — os outros não são montados.
//
// Rotas públicas (sem autenticação):
//   /          → Página de Login
//   /cadastro  → Página de Registo
//
// Rotas privadas (requerem login — o utilizador precisa estar logado):
//   /dashboard      → Painel principal com resumo financeiro
//   /contas         → Gestão de contas bancárias
//   /categorias     → Categorias de despesas e receitas
//   /transferencias → Transferências entre contas
//   /faturas        → Contas a pagar / faturas
//   /orcamentos     → Orçamentos por categoria
//   /metas          → Metas de poupança
//   /investimentos  → Carteira de investimentos
//   /relatorios     → Relatórios e exportação de dados
//
// Nota: a proteção de rota (redirecionar se não logado) é feita
// individualmente por cada página que lê o localStorage.
//
// Dependências:
//   - react-router-dom: BrowserRouter, Routes, Route
// ============================================================

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login          from './pages/login';
import Cadastro       from './pages/cadastro';
import EsqueciSenha   from './pages/esqueci-senha';
import RedefinirSenha from './pages/redefinir-senha';
import Dashboard     from './pages/dashboard';
import Contas        from './pages/contas';
import Categorias    from './pages/categorias';
import Transferencias from './pages/transferencias';
import Faturas       from './pages/faturas';
import Orcamentos    from './pages/orcamentos';
import Metas         from './pages/metas';
import Investimentos from './pages/investimentos';
import Relatorios    from './pages/relatorios';
import Perfil        from './pages/perfil';

function App() {
  return (
    // Router: fornece o contexto de navegação para todos os componentes filhos
    <Router>
      {/* Routes: renderiza apenas a rota que corresponde à URL atual */}
      <Routes>
        {/* Rotas públicas — acessíveis sem login */}
        <Route path="/"                element={<Login />} />
        <Route path="/cadastro"        element={<Cadastro />} />
        <Route path="/esqueci-senha"   element={<EsqueciSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />

        {/* Rotas privadas — cada página redireciona para / se não houver utilizador */}
        <Route path="/dashboard"       element={<Dashboard />} />
        <Route path="/contas"          element={<Contas />} />
        <Route path="/categorias"      element={<Categorias />} />
        <Route path="/transferencias"  element={<Transferencias />} />
        <Route path="/faturas"         element={<Faturas />} />
        <Route path="/orcamentos"      element={<Orcamentos />} />
        <Route path="/metas"           element={<Metas />} />
        <Route path="/investimentos"   element={<Investimentos />} />
        <Route path="/relatorios"      element={<Relatorios />} />
        <Route path="/perfil"          element={<Perfil />} />
      </Routes>
    </Router>
  );
}

export default App;
