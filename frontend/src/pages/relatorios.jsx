import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { BarChart2, Download, TrendingUp, PieChart as PieIcon, ArrowUpCircle, Target } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Tooltip, Legend, Title,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// registo dos componentes do Chart.js que vou usar nos gráficos
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Tooltip, Legend, Title);

// endereço da API
const API = 'http://127.0.0.1:5000';

// nomes curtos dos meses para os eixos dos gráficos
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// paleta de cores para os gráficos de pizza e barra
const CORES_CHART = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6b7280'];

// calcula os anos disponíveis no filtro: ano atual e os dois anteriores
const anoAtual = new Date().getFullYear();
const ANOS = [anoAtual - 2, anoAtual - 1, anoAtual];

export default function Relatorios() {
  // lê o utilizador do localStorage e guarda o user_id numa variável curta
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const uid = usuario.user_id;

  // aba ativa no momento (controla qual relatório está visível)
  const [aba, setAba] = useState('fluxo');

  // filtros de ano, mês e período usados nos relatórios
  const [ano, setAno] = useState(anoAtual);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [periodo, setPeriodo] = useState('mensal');

  // dados de cada relatório ficam em estados separados
  const [fluxo, setFluxo] = useState([]);
  const [despCat, setDespCat] = useState([]);
  const [recFonte, setRecFonte] = useState([]);
  const [orcComp, setOrcComp] = useState([]);
  const [investRel, setInvestRel] = useState([]);

  // Exportação
  // estado do formulário de exportação CSV
  const [expTipo, setExpTipo] = useState('transacoes');
  const [expInicio, setExpInicio] = useState('');
  const [expFim, setExpFim] = useState('');

  // sempre que a aba ou os filtros mudam, recarrego os dados correspondentes
  useEffect(() => { buscarDados(); }, [aba, ano, mes, periodo]);

  // busca os dados da aba ativa na API com os filtros selecionados
  const buscarDados = async () => {
    try {
      if (aba === 'fluxo') {
        // fluxo de caixa pode ser mensal ou anual
        const res = await axios.get(`${API}/relatorios/fluxo-caixa/${uid}`, { params: { periodo, ano } });
        setFluxo(res.data);
      } else if (aba === 'despesas') {
        // despesas agrupadas por categoria para um mês específico
        const res = await axios.get(`${API}/relatorios/despesas-categoria/${uid}`, { params: { mes, ano } });
        setDespCat(res.data);
      } else if (aba === 'receitas') {
        // receitas agrupadas por fonte para um mês específico
        const res = await axios.get(`${API}/relatorios/receitas-fonte/${uid}`, { params: { mes, ano } });
        setRecFonte(res.data);
      } else if (aba === 'orcamentos') {
        // comparativo entre limite e gasto real de cada orçamento
        const res = await axios.get(`${API}/relatorios/orcamentos/${uid}`, { params: { mes, ano } });
        setOrcComp(res.data);
      } else if (aba === 'investimentos') {
        // relatório de investimentos não tem filtro de período
        const res = await axios.get(`${API}/relatorios/investimentos/${uid}`);
        setInvestRel(res.data);
      }
    } catch (err) { console.error(err); }
  };

  // função de exportação: monta a URL com os parâmetros e abre em nova aba para download
  const exportar = () => {
    const params = new URLSearchParams({ tipo: expTipo });
    // adiciona datas à query apenas se foram preenchidas
    if (expInicio) params.append('data_inicio', expInicio);
    if (expFim)    params.append('data_fim', expFim);
    window.open(`${API}/export/${uid}?${params.toString()}`);
  };

  // configuração das abas com id, label e ícone de cada uma
  const abas = [
    { id: 'fluxo',        label: 'Fluxo de Caixa',    icon: TrendingUp },
    { id: 'despesas',     label: 'Despesas/Categoria', icon: PieIcon },
    { id: 'receitas',     label: 'Receitas/Fonte',     icon: ArrowUpCircle },
    { id: 'orcamentos',   label: 'Comparativo Orç.',   icon: Target },
    { id: 'investimentos',label: 'Investimentos',      icon: BarChart2 },
    { id: 'exportar',     label: 'Exportar Dados',     icon: Download },
  ];

  // função auxiliar para formatar número em moeda brasileira
  const fmt = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6">
          <BarChart2 className="text-blue-600" /> Relatórios e Análises
        </h1>

        {/* navegação entre as abas de relatório */}
        <div className="flex gap-2 flex-wrap mb-6">
          {abas.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setAba(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                aba === id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* filtros de ano/mês/período – só aparecem nas abas que precisam deles */}
        {aba !== 'exportar' && aba !== 'investimentos' && (
          <div className="bg-white rounded-2xl border p-4 mb-5 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ano</label>
              <select className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={ano} onChange={e => setAno(e.target.value)}>
                {ANOS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            {/* filtro de mês aparece em todas as abas exceto fluxo de caixa */}
            {aba !== 'fluxo' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mês</label>
                <select className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={mes} onChange={e => setMes(e.target.value)}>
                  {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
            )}
            {/* filtro de período (mensal/anual) só aparece na aba de fluxo de caixa */}
            {aba === 'fluxo' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Período</label>
                <select className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={periodo} onChange={e => setPeriodo(e.target.value)}>
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
            )}
            <button onClick={buscarDados}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
              Atualizar
            </button>
          </div>
        )}

        {/* Fluxo de Caixa – gráfico de barras com receitas e despesas por período */}
        {aba === 'fluxo' && (
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-bold text-gray-800 mb-4">Fluxo de Caixa — {ano}</h3>
            {fluxo.length === 0 ? (
              <p className="text-gray-400 text-center py-12">Sem dados para o período selecionado.</p>
            ) : (
              <div className="h-72">
                {/* gráfico de barras com receitas em verde e despesas em vermelho */}
                <Bar
                  data={{
                    labels: fluxo.map(r => r.periodo),
                    datasets: [
                      { label: 'Receitas', data: fluxo.map(r => r.receitas), backgroundColor: '#10b981' },
                      { label: 'Despesas', data: fluxo.map(r => r.despesas), backgroundColor: '#ef4444' },
                    ],
                  }}
                  options={{ maintainAspectRatio: false, responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true } } }}
                />
              </div>
            )}
          </div>
        )}

        {/* Despesas por Categoria – pizza + tabela de detalhes lado a lado */}
        {aba === 'despesas' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-bold text-gray-800 mb-4">Despesas por Categoria — {MESES[mes - 1]}/{ano}</h3>
              {despCat.length === 0 ? (
                <p className="text-gray-400 text-center py-12">Sem despesas no período.</p>
              ) : (
                <div className="h-64">
                  {/* gráfico de pizza com a distribuição das despesas por categoria */}
                  <Pie
                    data={{
                      labels: despCat.map(d => d.category_name),
                      datasets: [{ data: despCat.map(d => d.total), backgroundColor: despCat.map((d, i) => d.color || CORES_CHART[i % CORES_CHART.length]), borderWidth: 1 }],
                    }}
                    options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } } }}
                  />
                </div>
              )}
            </div>
            {/* tabela de detalhe com o valor de cada categoria */}
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-bold text-gray-800 mb-4">Detalhes</h3>
              <div className="space-y-3">
                {despCat.map(d => (
                  <div key={d.category_name} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      {/* bolinha colorida correspondente à cor no gráfico */}
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color || '#6b7280' }} />
                      <span className="text-gray-700">{d.category_name}</span>
                    </div>
                    <span className="font-medium text-gray-800">R$ {fmt(d.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Receitas por Fonte – mesma estrutura de pizza + tabela das despesas */}
        {aba === 'receitas' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-bold text-gray-800 mb-4">Receitas por Fonte — {MESES[mes - 1]}/{ano}</h3>
              {recFonte.length === 0 ? (
                <p className="text-gray-400 text-center py-12">Sem receitas no período.</p>
              ) : (
                <div className="h-64">
                  {/* gráfico de pizza com a distribuição das receitas por fonte */}
                  <Pie
                    data={{
                      labels: recFonte.map(r => r.category_name),
                      datasets: [{ data: recFonte.map(r => r.total), backgroundColor: recFonte.map((r, i) => r.color || CORES_CHART[i % CORES_CHART.length]), borderWidth: 1 }],
                    }}
                    options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } } }}
                  />
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-bold text-gray-800 mb-4">Detalhes</h3>
              <div className="space-y-3">
                {recFonte.map(r => (
                  <div key={r.category_name} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color || '#10b981' }} />
                      <span className="text-gray-700">{r.category_name}</span>
                    </div>
                    {/* valores de receita em verde para diferenciar das despesas */}
                    <span className="font-medium text-green-700">R$ {fmt(r.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Comparativo de Orçamentos – barra dupla (limite vs gasto) + tabela percentual */}
        {aba === 'orcamentos' && (
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-bold text-gray-800 mb-4">Comparativo de Orçamentos — {MESES[mes - 1]}/{ano}</h3>
            {orcComp.length === 0 ? (
              <p className="text-gray-400 text-center py-12">Nenhum orçamento definido.</p>
            ) : (
              <>
                <div className="h-64 mb-6">
                  {/* barras azuis = limite definido, barras verdes/vermelhas = gasto real */}
                  <Bar
                    data={{
                      labels: orcComp.map(o => o.budget_name),
                      datasets: [
                        { label: 'Limite', data: orcComp.map(o => o.limit_amount), backgroundColor: '#3b82f680' },
                        // a barra de gasto fica vermelha se excedeu o limite, verde se ainda está dentro
                        { label: 'Gasto', data: orcComp.map(o => o.spent), backgroundColor: orcComp.map(o => parseFloat(o.spent) >= parseFloat(o.limit_amount) ? '#ef444480' : '#10b98180') },
                      ],
                    }}
                    options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }}
                  />
                </div>
                {/* tabela detalhada com percentual de consumo de cada orçamento */}
                <div className="space-y-2">
                  {orcComp.map(o => {
                    // calcula o percentual de consumo do orçamento
                    const pct = ((parseFloat(o.spent) / parseFloat(o.limit_amount)) * 100).toFixed(1);
                    return (
                      <div key={o.budget_name} className="flex justify-between text-sm">
                        <span className="text-gray-700">{o.budget_name} ({o.period})</span>
                        {/* texto fica vermelho se o orçamento foi excedido */}
                        <span className={parseFloat(o.spent) >= parseFloat(o.limit_amount) ? 'text-red-600 font-medium' : 'text-gray-700'}>
                          R$ {fmt(o.spent)} / R$ {fmt(o.limit_amount)} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Relatório de Investimentos – tabela com totais e rentabilidade */}
        {aba === 'investimentos' && (
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="font-bold text-gray-800">Relatório de Investimentos</h3>
            </div>
            {investRel.length === 0 ? (
              <p className="text-gray-400 text-center py-12">Nenhum investimento registado.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Tipo','Ativo','Total Investido','Valor Mercado','Rentabilidade','Corretora'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {investRel.map(i => (
                        <tr key={i.investment_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs text-gray-600">{i.investment_type}</td>
                          <td className="px-4 py-3 font-medium">{i.asset_name}</td>
                          <td className="px-4 py-3">R$ {fmt(i.total_investido)}</td>
                          {/* calcula valor de mercado total: usa preço de mercado ou preço médio se não tiver */}
                          <td className="px-4 py-3">{i.current_market_value ? `R$ ${parseFloat(i.current_market_value * i.quantity_invested).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : (i.average_buy_price ? `R$ ${parseFloat(i.average_buy_price * i.quantity_invested).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—')}</td>
                          <td className="px-4 py-3">
                            {/* rentabilidade em verde com + se positiva, vermelho se negativa */}
                            {i.rentabilidade_pct !== null ? (
                              <span className={parseFloat(i.rentabilidade_pct) >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                {parseFloat(i.rentabilidade_pct) >= 0 ? '+' : ''}{parseFloat(i.rentabilidade_pct).toFixed(2)}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{i.brokerage_platform || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* rodapé com o total geral investido em todos os ativos */}
                <div className="p-4 bg-gray-50 border-t text-sm text-gray-600">
                  Total investido: <strong>R$ {fmt(investRel.reduce((s, i) => s + parseFloat(i.total_investido), 0))}</strong>
                </div>
              </>
            )}
          </div>
        )}

        {/* Exportação de Dados – formulário para baixar CSV */}
        {aba === 'exportar' && (
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Download size={18} className="text-blue-600" /> Exportar Dados (CSV)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                {/* tipo de dado a exportar: transações ou investimentos */}
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Dados *</label>
                <select className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={expTipo} onChange={e => setExpTipo(e.target.value)}>
                  <option value="transacoes">Transações</option>
                  <option value="investimentos">Investimentos</option>
                </select>
              </div>
              <div>
                {/* filtro de data início opcional para o CSV */}
                <label className="block text-xs font-medium text-gray-500 mb-1">Data Início</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={expInicio} onChange={e => setExpInicio(e.target.value)} />
              </div>
              <div>
                {/* filtro de data fim opcional para o CSV */}
                <label className="block text-xs font-medium text-gray-500 mb-1">Data Fim</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={expFim} onChange={e => setExpFim(e.target.value)} />
              </div>
            </div>
            {/* botão que abre o download direto em nova aba */}
            <button onClick={exportar}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
              <Download size={16} /> Baixar CSV
            </button>
            <p className="text-xs text-gray-400 mt-3">O ficheiro CSV pode ser aberto no Excel, Google Sheets ou LibreOffice Calc.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
