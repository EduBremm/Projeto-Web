// ============================================================
// CotacaoTicker.jsx — Ticker de cotações em tempo real
//
// O que faz:
//   Exibe uma barra horizontal animada (como um ticker de bolsa de valores)
//   com as cotações de moedas e criptomoedas em relação ao Real (BRL).
//   Os dados são atualizados automaticamente a cada 60 segundos.
//
// Moedas exibidas:
//   USD/BRL, EUR/BRL, GBP/BRL, BTC/BRL, ETH/BRL
//
// API utilizada:
//   AwesomeAPI (economia.awesomeapi.com.br) — gratuita, sem chave de API.
//   Retorna: bid (preço de compra), pctChange (variação % do dia), etc.
//
// Comportamento visual:
//   - Ponto verde pulsante "AO VIVO" quando conectado
//   - Ponto vermelho "OFFLINE" quando sem conexão ou erro na API
//   - O ticker para de deslizar ao passar o mouse (hover)
//   - Gradiente de fade na borda direita para visual polido
//
// Animação:
//   A faixa de itens é duplicada ([...items, ...items]) para criar
//   um loop contínuo sem saltos visíveis. A animação CSS "ticker"
//   desloca a faixa em -50% continuamente (definida em index.css).
//
// Dependências:
//   - React (useState, useEffect): estado e ciclo de vida
//   - lucide-react: ícones TrendingUp, TrendingDown, Activity
// ============================================================

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

// URL da API gratuita — retorna as últimas cotações dos pares solicitados
const API_URL = 'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL,ETH-BRL';

// Configuração de cada moeda: código da API, rótulo exibido, ícone e cor
const MOEDAS = [
  { code: 'USDBRL', label: 'USD/BRL', icon: '🇺🇸', cor: '#60a5fa' },  // azul
  { code: 'EURBRL', label: 'EUR/BRL', icon: '🇪🇺', cor: '#a78bfa' },  // roxo
  { code: 'GBPBRL', label: 'GBP/BRL', icon: '🇬🇧', cor: '#34d399' },  // verde
  { code: 'BTCBRL', label: 'BTC/BRL', icon: '₿',   cor: '#fbbf24' },  // amarelo
  { code: 'ETHBRL', label: 'ETH/BRL', icon: 'Ξ',   cor: '#f472b6' },  // rosa
];

// ============================================================
// Componente auxiliar: CotacaoItem
//
// Renderiza um único item de cotação no ticker.
// Recebe o objeto de configuração da moeda (moeda) e os dados
// retornados pela API (dados).
// Exibe: ícone · label · preço · variação % com seta de tendência
// ============================================================
function CotacaoItem({ moeda, dados }) {
  // Não renderiza nada enquanto os dados ainda não chegaram da API
  if (!dados) return null;

  const variacao = parseFloat(dados.pctChange || 0); // variação % do dia
  const preco    = parseFloat(dados.bid || 0);        // preço de compra (bid)
  const positivo = variacao >= 0;                     // true = subiu, false = caiu

  // Criptomoedas têm preços muito altos → sem casas decimais
  // Moedas fiat têm preços menores → 4 casas decimais para precisão
  const isCrypto = moeda.code.startsWith('BTC') || moeda.code.startsWith('ETH');
  const formatPreco = isCrypto
    ? preco.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
    : preco.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  return (
    <span className="inline-flex items-center gap-2 px-5 whitespace-nowrap select-none">
      <span className="text-slate-400 text-xs">{moeda.icon}</span>
      <span className="text-white font-semibold text-xs tracking-wide">{moeda.label}</span>
      {/* Preço colorido com a cor definida por moeda */}
      <span className="font-bold text-sm" style={{ color: moeda.cor }}>
        R$ {formatPreco}
      </span>
      {/* Variação percentual: verde com seta para cima, vermelho com seta para baixo */}
      <span className={`flex items-center gap-0.5 text-xs font-medium ${positivo ? 'text-emerald-400' : 'text-red-400'}`}>
        {positivo ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {positivo ? '+' : ''}{variacao.toFixed(2)}%
      </span>
      {/* Separador visual entre itens */}
      <span className="text-slate-700 mx-1 text-lg font-thin">·</span>
    </span>
  );
}

// ============================================================
// Componente principal: CotacaoTicker
//
// Gerencia o ciclo de vida: busca os dados, agenda atualizações,
// e renderiza a barra com o ticker animado.
// ============================================================
export default function CotacaoTicker() {
  // cotacoes: objeto com os dados retornados pela API, indexado pelo código da moeda
  // ex: { USDBRL: { bid: "5.4321", pctChange: "0.15", ... }, ... }
  const [cotacoes, setCotacoes] = useState({});
  const [online,   setOnline]   = useState(false); // conectado à API?
  const [ultima,   setUltima]   = useState('');     // hora da última atualização

  // Função que busca as cotações atuais da API
  const buscar = async () => {
    try {
      const res  = await fetch(API_URL);
      const data = await res.json();
      setCotacoes(data);
      setOnline(true);
      // Registar a hora da última atualização bem-sucedida
      setUltima(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      // Se a API falhar (sem internet, rate limit, etc.), marca como offline
      setOnline(false);
    }
  };

  // Executa ao montar o componente: busca imediatamente e agenda a cada 60 segundos
  // O return () => clearInterval(id) limpa o intervalo ao desmontar (sem vazamento de memória)
  useEffect(() => {
    buscar();
    const id = setInterval(buscar, 60_000); // 60.000ms = 1 minuto
    return () => clearInterval(id);
  }, []); // [] = executar apenas uma vez (na montagem)

  // Mapeia as moedas configuradas com os dados reais da API
  const items = MOEDAS.map(m => ({ moeda: m, dados: cotacoes[m.code] }));

  return (
    <div className="bg-slate-900 border-b border-slate-800 overflow-hidden h-8 flex items-center relative">

      {/* Indicador de estado: "AO VIVO" (verde pulsante) ou "OFFLINE" (vermelho) */}
      {/* z-10 garante que fica acima do ticker animado que passa por baixo */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 border-r border-slate-700 h-full bg-slate-900 z-10">
        <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 live-dot' : 'bg-red-500'}`} />
        <span className="text-slate-400 text-xs font-medium uppercase tracking-widest">
          {online ? 'AO VIVO' : 'OFFLINE'}
        </span>
        {/* Hora da última atualização (apenas quando online) */}
        {ultima && <span className="text-slate-600 text-xs">{ultima}</span>}
      </div>

      {/* Área do ticker animado */}
      <div className="overflow-hidden flex-1">
        {online ? (
          // ticker-track: classe CSS com animação de deslocamento horizontal contínuo
          // Os itens são duplicados para criar loop sem salto visual
          <div className="ticker-track flex">
            {[...items, ...items].map((it, i) => (
              <CotacaoItem key={i} moeda={it.moeda} dados={it.dados} />
            ))}
          </div>
        ) : (
          // Estado offline: mensagem simples no lugar do ticker
          <div className="flex items-center gap-2 px-4">
            <Activity size={12} className="text-slate-500" />
            <span className="text-slate-500 text-xs">Cotações indisponíveis — verifique a conexão</span>
          </div>
        )}
      </div>

      {/* Gradiente de fade na borda direita para dissimular o corte do ticker */}
      <div className="absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
    </div>
  );
}
