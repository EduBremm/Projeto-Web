// importa os hooks do React e bibliotecas de navegação, requisição HTTP e gráficos
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
// ícones do lucide pra usar nos cards e transações
import {
  Wallet, ArrowUpCircle, ArrowDownCircle, PlusCircle, History,
  PieChart as PieIcon, PiggyBank, AlertTriangle, AlertCircle,
  TrendingUp, TrendingDown, ChevronRight, Minus,
} from 'lucide-react';
// importa o Chart.js e os tipos de gráfico que vão ser usados
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// registra os componentes do Chart.js que vão ser utilizados na página
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// endereço base da API do backend
const API = 'http://127.0.0.1:5000';
// função auxiliar pra formatar números como moeda brasileira
const fmt = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

// ---- Card de resumo com gradiente ----
// componente reutilizável que mostra um valor financeiro com tendência em relação ao mês anterior
function CardResumo({ titulo, valor, icone: Icone, gradiente, tendencia, descricao }) {
  const temTendencia = tendencia !== null && tendencia !== undefined;
  const positivo     = tendencia >= 0;

  return (
    <div className={`card-hover rounded-2xl p-5 text-white ${gradiente} shadow-lg relative overflow-hidden`}>
      {/* Círculo decorativo de fundo */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">{titulo}</span>
          <div className="bg-white/20 p-2 rounded-xl">
            <Icone size={16} className="text-white" />
          </div>
        </div>

        <p className="text-2xl font-bold tracking-tight count-up mb-1">R$ {fmt(valor)}</p>

        {/* mostra seta de tendência comparando com o mês anterior */}
        {temTendencia && (
          <div className={`flex items-center gap-1 text-xs font-medium ${positivo ? 'text-white/90' : 'text-white/90'}`}>
            {positivo
              ? <TrendingUp size={12} />
              : tendencia === 0 ? <Minus size={12} /> : <TrendingDown size={12} />}
            <span>
              {tendencia === 0 ? 'Igual ao mês anterior' : `${positivo ? '+' : ''}${tendencia.toFixed(1)}% vs mês anterior`}
            </span>
          </div>
        )}
        {descricao && !temTendencia && (
          <p className="text-white/60 text-xs mt-1">{descricao}</p>
        )}
      </div>
    </div>
  );
}

// ---- Item de transação (inclui transferências) ----
// componente que renderiza uma linha de transação na lista de histórico
function ItemTransacao({ t }) {
  const receita      = t.transaction_type === 'Receita';
  const transferencia = t.transaction_type === 'Transferência';

  // Estilos e ícone variam por tipo
  const estiloIcone = transferencia
    ? 'bg-blue-50 text-blue-500'
    : receita ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500';

  const icone = transferencia
    ? <ArrowUpCircle size={16} style={{ transform: 'rotate(45deg)' }} />
    : receita ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />;

  // cor e prefixo do valor mudam dependendo do tipo da transação
  const corValor = transferencia ? 'text-blue-600' : receita ? 'text-emerald-600' : 'text-red-500';
  const prefixo  = transferencia ? '⇄' : receita ? '+' : '-';

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors group">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${estiloIcone}`}>{icone}</div>
        <div>
          <p className="font-semibold text-slate-800 text-sm leading-tight">{t.description || '—'}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(t.transaction_date).toLocaleDateString('pt-BR')}
            {/* Transferência mostra "Conta A → Conta B"; demais mostram a categoria */}
            {transferencia && t.account_name && t.to_account_name
              ? <span className="ml-1.5 bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">
                  {t.account_name} → {t.to_account_name}
                </span>
              : t.category_name && <span className="ml-1.5 bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{t.category_name}</span>
            }
          </p>
        </div>
      </div>
      <span className={`font-bold text-sm ${corValor}`}>
        {prefixo} R$ {fmt(t.amount)}
      </span>
    </div>
  );
}

// ---- Barra de insight ----
// componente pequeno que exibe uma mensagem colorida de alerta ou dica financeira
function InsightBar({ texto, cor = 'blue' }) {
  const cores = {
    blue:   'bg-blue-50 border-blue-200 text-blue-800',
    green:  'bg-emerald-50 border-emerald-200 text-emerald-800',
    yellow: 'bg-amber-50 border-amber-200 text-amber-800',
    red:    'bg-red-50 border-red-200 text-red-800',
  };
  return (
    <div className={`text-xs px-3 py-2 rounded-lg border ${cores[cor]}`}>{texto}</div>
  );
}

export default function Dashboard() {
  // pega o usuário salvo no localStorage pra saber quem está logado
  const navigate  = useNavigate();
  const usuario   = JSON.parse(localStorage.getItem('usuario') || '{}');
  const userId    = usuario?.user_id;
  // extrai só o primeiro nome pra usar na saudação
  const primeiroNome = (usuario.full_name || 'Utilizador').split(' ')[0];

  // estados que guardam os dados carregados do backend
  const [dashboard,   setDashboard]   = useState(null);
  const [transacoes,  setTransacoes]  = useState([]);
  const [dadosGrafico, setDadosGrafico] = useState(null);
  const [fluxo6m,     setFluxo6m]     = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [contas,      setContas]      = useState([]);
  // guarda receitas e despesas do mês anterior pra calcular tendência
  const [mesAnterior, setMesAnterior] = useState({ receitas: 0, despesas: 0 });
  // estado do formulário de nova transação rápida
  const [form, setForm] = useState({
    descricao: '', valor: '', tipo: 'Despesa',
    category_id: '', account_id: '',
    transaction_date: new Date().toISOString().slice(0, 10),
  });

  // calcula a saudação baseada na hora atual do dia
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  // ao montar o componente, redireciona se não estiver logado e carrega os dados
  useEffect(() => {
    if (!userId) { navigate('/'); return; }
    buscarTudo();
    // Escuta o evento disparado pelo ChatBot quando uma transação é criada via IA
    // Assim os dados atualizam automaticamente sem precisar recarregar a página
    window.addEventListener('finann:transacao-criada', buscarTudo);
    return () => window.removeEventListener('finann:transacao-criada', buscarTudo);
  }, [userId]);

  // busca todos os dados do dashboard em paralelo pra não fazer uma requisição por vez
  const buscarTudo = async () => {
    try {
      const anoAtual = new Date().getFullYear();
      // calcula o mês anterior (0-based, então 0 = janeiro = mês anterior é dezembro do ano passado)
      const mesAnteriorNum = new Date().getMonth(); // 0-based = mês anterior
      const anoMesAnterior = mesAnteriorNum === 0 ? anoAtual - 1 : anoAtual;
      const mesPrev = mesAnteriorNum === 0 ? 12 : mesAnteriorNum;

      // dispara todas as requisições ao mesmo tempo usando Promise.all
      const [dash, trans, graf, cats, conts, flx, prevRes] = await Promise.all([
        axios.get(`${API}/dashboard/${userId}`),
        axios.get(`${API}/transacoes/${userId}`),
        axios.get(`${API}/relatorios/despesas-categoria/${userId}`),
        axios.get(`${API}/categorias/${userId}`),
        axios.get(`${API}/contas/${userId}`),
        axios.get(`${API}/relatorios/fluxo-caixa/${userId}`, { params: { periodo: 'mensal', ano: anoAtual } }),
        axios.get(`${API}/transacoes/${userId}`, { params: { mes: mesPrev, ano: anoMesAnterior } }),
      ]);

      // atualiza todos os estados com os dados recebidos
      setDashboard(dash.data);
      setTransacoes(trans.data);
      setCategorias(cats.data);
      setContas(conts.data);
      setFluxo6m(flx.data.slice(-6)); // últimos 6 meses

      // Calcular mês anterior
      const prevTransacoes = prevRes.data;
      setMesAnterior({
        receitas: prevTransacoes.filter(t => t.transaction_type === 'Receita').reduce((s, t) => s + parseFloat(t.amount), 0),
        despesas: prevTransacoes.filter(t => t.transaction_type === 'Despesa').reduce((s, t) => s + parseFloat(t.amount), 0),
      });

      // Gráfico pizza — monta os dados no formato que o Chart.js espera
      if (graf.data.length > 0) {
        setDadosGrafico({
          labels: graf.data.map(i => i.category_name),
          datasets: [{
            data: graf.data.map(i => parseFloat(i.total)),
            backgroundColor: graf.data.map(i => i.color || '#6b7280'),
            borderWidth: 2,
            borderColor: '#fff',
            hoverOffset: 6,
          }],
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // envia o formulário de nova transação rápida pro backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.descricao || !form.valor) return;
    try {
      await axios.post(`${API}/transacoes`, {
        user_id: userId, amount: parseFloat(form.valor),
        category_id: form.category_id || null, account_id: form.account_id || null,
        description: form.descricao, transaction_type: form.tipo,
        status: 'Pago', transaction_date: form.transaction_date,
      });
      // limpa o formulário inteiro para o próximo lançamento
      setForm({
        descricao: '', valor: '', tipo: 'Despesa',
        category_id: '', account_id: '',
        transaction_date: new Date().toISOString().slice(0, 10),
      });
      buscarTudo();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar transação.');
    }
  };

  // Tendências vs mês anterior — calcula a variação percentual das receitas e despesas
  const receitasMes = parseFloat(dashboard?.receitas_mes || 0);
  const despesasMes  = parseFloat(dashboard?.despesas_mes || 0);
  const tReceit = mesAnterior.receitas > 0 ? ((receitasMes - mesAnterior.receitas) / mesAnterior.receitas) * 100 : null;
  const tDesp   = mesAnterior.despesas > 0 ? ((despesasMes - mesAnterior.despesas) / mesAnterior.despesas) * 100 : null;

  // Insights automáticos — gera mensagens inteligentes baseadas nos dados do mês
  const insights = [];
  if (tDesp !== null && tDesp > 20)
    insights.push({ texto: `⚠️ Despesas este mês estão ${tDesp.toFixed(0)}% acima do mês anterior.`, cor: 'red' });
  if (tDesp !== null && tDesp < -10)
    insights.push({ texto: `🎉 Parabéns! Despesas reduziram ${Math.abs(tDesp).toFixed(0)}% em relação ao mês passado.`, cor: 'green' });
  if (dashboard?.alertas?.filter(a => a.tipo === 'fatura').length > 0)
    insights.push({ texto: `🔔 Você tem faturas a vencer nos próximos 7 dias.`, cor: 'yellow' });
  if (dashboard?.alertas?.filter(a => a.tipo === 'orcamento').length > 0)
    insights.push({ texto: `🚨 Um ou mais orçamentos foram excedidos este mês.`, cor: 'red' });
  if (insights.length === 0 && receitasMes > despesasMes)
    insights.push({ texto: `✅ Mês positivo! Suas receitas superam as despesas em R$ ${fmt(receitasMes - despesasMes)}.`, cor: 'green' });

  // filtra as categorias de acordo com o tipo selecionado no formulário (Despesa ou Receita)
  const catsFiltradas = categorias.filter(c => c.category_type === form.tipo);

  // Dados do gráfico de barras (fluxo 6 meses) — converte os dados da API pro formato do Chart.js
  const dadosFluxo = fluxo6m.length > 0 ? {
    labels: fluxo6m.map(r => {
      const [, m] = r.periodo.split('-');
      return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(m) - 1] || r.periodo;
    }),
    datasets: [
      { label: 'Receitas', data: fluxo6m.map(r => parseFloat(r.receitas)), backgroundColor: '#10b981', borderRadius: 6 },
      { label: 'Despesas', data: fluxo6m.map(r => parseFloat(r.despesas)), backgroundColor: '#ef4444', borderRadius: 6 },
    ],
  } : null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Cabeçalho — saudação com nome e botão pra ver relatórios */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {saudacao}, {primeiroNome}! 👋
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Link to="/relatorios"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors">
            Ver relatórios <ChevronRight size={14} />
          </Link>
        </div>

        {/* Insights — mensagens automáticas geradas com base nos dados financeiros */}
        {insights.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {insights.map((ins) => <InsightBar key={ins.texto} texto={ins.texto} cor={ins.cor} />)}
          </div>
        )}

        {/* Alertas urgentes — mostra no máximo 3 alertas de faturas ou orçamentos */}
        {dashboard?.alertas?.length > 0 && (
          <div className="space-y-2">
            {dashboard.alertas.slice(0, 3).map((a) => (
              <div key={a.mensagem} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
                a.tipo === 'fatura'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {a.tipo === 'fatura' ? <AlertCircle size={15} /> : <AlertTriangle size={15} />}
                {a.mensagem}
              </div>
            ))}
          </div>
        )}

        {/* Cards de resumo — saldo total, receitas e despesas do mês */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CardResumo
            titulo="Saldo Total"
            valor={dashboard?.saldo_total}
            icone={Wallet}
            gradiente="card-blue"
            descricao="Soma de todas as contas"
          />
          <CardResumo
            titulo="Receitas (mês)"
            valor={dashboard?.receitas_mes}
            icone={ArrowUpCircle}
            gradiente="card-green"
            tendencia={tReceit}
          />
          <CardResumo
            titulo="Despesas (mês)"
            valor={dashboard?.despesas_mes}
            icone={ArrowDownCircle}
            gradiente="card-red"
            // inverte o sinal pra que redução de despesas apareça como positivo
            tendencia={tDesp !== null ? -tDesp : null}
          />
        </div>

        {/* Gráficos — fluxo de caixa em barras e pizza de despesas por categoria */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Fluxo de caixa — gráfico de barras com os últimos 6 meses */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800">Fluxo de Caixa</h3>
                <p className="text-slate-400 text-xs mt-0.5">Últimos 6 meses</p>
              </div>
              <Link to="/relatorios" className="text-blue-600 text-xs hover:underline flex items-center gap-0.5">
                Ver completo <ChevronRight size={12} />
              </Link>
            </div>
            <div className="h-52">
              {dadosFluxo ? (
                <Bar data={dadosFluxo} options={{
                  maintainAspectRatio: false, responsive: true,
                  plugins: { legend: { position: 'top', labels: { font: { size: 11, family: 'Inter' }, boxWidth: 10 } } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, callback: v => `R$${(v/1000).toFixed(0)}k` } },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  },
                }} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-slate-400 text-sm">Sem dados de transações ainda.</p>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico pizza — mostra a distribuição de despesas por categoria */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieIcon size={16} className="text-blue-600" />
              <h3 className="font-bold text-slate-800">Despesas</h3>
            </div>
            <div className="h-52 flex items-center justify-center">
              {dadosGrafico ? (
                <Pie data={dadosGrafico} options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 10, family: 'Inter' }, boxWidth: 10, padding: 10 } },
                  },
                }} />
              ) : (
                <div className="text-center">
                  <PieIcon size={32} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Sem despesas com categoria.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Formulário de nova transação + Histórico de transações recentes */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Nova transação — formulário rápido pra lançar receita ou despesa */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <PlusCircle size={14} className="text-white" />
              </div>
              Nova Transação
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Toggle Receita/Despesa — alterna o tipo e limpa a categoria */}
              <div className="flex rounded-xl overflow-hidden border border-slate-200 p-1 gap-1 bg-slate-50">
                {['Despesa', 'Receita'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, tipo: t, category_id: '' }))}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                      form.tipo === t
                        ? t === 'Despesa'
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'bg-emerald-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >{t}</button>
                ))}
              </div>

              {/* campo de descrição da transação */}
              <input type="text" required placeholder="Descrição" maxLength={255}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50"
                value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              />

              {/* campo de valor com prefixo R$ */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                <input type="number" required min="0.01" step="0.01" placeholder="0,00"
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50"
                  value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                />
              </div>

              {/* seletor de categoria — só mostra categorias do tipo selecionado */}
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50 text-slate-600"
                value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Sem categoria</option>
                {catsFiltradas.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
              </select>

              {/* seletor de conta bancária */}
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50 text-slate-600"
                value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                <option value="">Selecionar conta</option>
                {contas.map(c => <option key={c.account_id} value={c.account_id}>{c.account_name}</option>)}
              </select>

              {/* data da transação */}
              <input type="date"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50"
                value={form.transaction_date} onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))}
              />

              {/* botão de submissão — muda de cor conforme o tipo */}
              <button type="submit"
                className={`w-full py-2.5 rounded-xl font-bold text-white text-sm transition-all shadow-lg active:scale-95 ${
                  form.tipo === 'Despesa'
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
                }`}>
                Registar {form.tipo}
              </button>
            </form>
          </div>

          {/* Histórico — lista as transações mais recentes (até 15) */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <History size={16} className="text-blue-600" /> Transações Recentes
              </h3>
              <span className="text-slate-400 text-xs">{transacoes.length} registos</span>
            </div>
            <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
              {transacoes.length === 0 ? (
                <div className="p-12 text-center">
                  <History size={32} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Nenhuma transação ainda.</p>
                </div>
              ) : transacoes.slice(0, 15).map(t => (
                <ItemTransacao key={t.id ?? t.transaction_id} t={t} />
              ))}
            </div>
          </div>
        </div>

        {/* Metas de poupança — só renderiza se houver metas cadastradas */}
        {dashboard?.metas?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <PiggyBank size={16} className="text-blue-600" /> Progresso das Metas
              </h3>
              <Link to="/metas" className="text-blue-600 text-xs hover:underline flex items-center gap-0.5">
                Ver todas <ChevronRight size={12} />
              </Link>
            </div>
            {/* grid de cards de meta com barra de progresso */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboard.metas.map((m) => {
                // limita em 100% pra não ultrapassar a barra visualmente
                const pct = Math.min(parseFloat(m.progress_pct || 0), 100);
                const atingida = pct >= 100;
                return (
                  <div key={m.goal_id} className="border border-slate-100 rounded-xl p-4 hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-slate-700 text-sm">{m.goal_name}</p>
                      {atingida && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">✓ Meta</span>}
                    </div>
                    {/* barra de progresso da meta — fica verde quando atingida */}
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                      <div
                        className={`progress-bar h-2 rounded-full ${atingida ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400">
                      R$ {fmt(m.current_amount)} / R$ {fmt(m.target_amount)}
                      <span className="ml-1 font-semibold text-slate-600">{pct.toFixed(0)}%</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
