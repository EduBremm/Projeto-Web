// ============================================================
// ChatBot.jsx — Assistente de IA do FinanN
//
// O que faz:
//   Exibe um botão flutuante no canto inferior direito da tela.
//   Ao clicar, abre um painel de chat onde o utilizador pode
//   conversar com uma IA para:
//     - Registar transações por texto ("despesa roupa 150")
//     - Consultar saldo e resumo financeiro
//     - Receber dicas personalizadas de finanças
//
// Como funciona:
//   1. O utilizador digita uma mensagem e clica em Enviar
//   2. A mensagem vai para o backend em POST /chat
//   3. O backend consulta os dados do utilizador e envia tudo
//      para a API da Groq (IA gratuita baseada em Llama 3.3 70B)
//   4. A IA responde com JSON: { message, action }
//   5. Se vier uma action (ex: criar transação), ela é executada
//      automaticamente no backend — o utilizador só vê a confirmação
//
// Dependências:
//   - React (useState, useEffect, useRef): estado, ciclo de vida e scroll automático
//   - axios: chamadas HTTP ao backend
//   - lucide-react: ícones (MessageCircle, X, Send, Bot, User, Loader2, Sparkles)
// ============================================================

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, RefreshCw } from 'lucide-react';

// Endereço base da API backend (mesmo usado nas outras páginas)
const API = 'http://127.0.0.1:5000';

// Mensagem inicial que a IA exibe ao abrir o chat pela primeira vez
const MENSAGEM_BOAS_VINDAS = {
  role: 'bot',
  text: 'Olá! 👋 Sou o assistente financeiro do FinanN. Posso ajudar você a:\n\n• Registar despesas ou receitas ("despesa roupa 150")\n• Consultar seu saldo ("qual meu saldo?")\n• Dar dicas financeiras ("dica de economia")\n\nO que posso fazer por você?',
};

export default function ChatBot() {
  // ---- Estado do componente ----

  // controla se o painel de chat está aberto ou fechado
  const [aberto, setAberto] = useState(false);

  // lista de mensagens exibidas no chat: [{ role: 'user'|'bot', text: string }]
  const [mensagens, setMensagens] = useState([MENSAGEM_BOAS_VINDAS]);

  // texto atual que o utilizador está digitando no campo de input
  const [input, setInput] = useState('');

  // indica se estamos aguardando resposta da IA (mostra o indicador de digitação)
  const [carregando, setCarregando] = useState(false);

  // referência ao final da lista de mensagens — usada para scroll automático
  const fimRef = useRef(null);

  // Lê os dados do utilizador logado do localStorage (salvo no login)
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  // ---- Efeito: scroll automático para a última mensagem ----
  // Sempre que a lista de mensagens muda, rola a tela para o final
  // para que o utilizador veja sempre a mensagem mais recente.
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, carregando]);

  // ---- Função principal: enviar mensagem para a IA ----
  const enviar = async () => {
    const texto = input.trim();
    // Não envia se o campo estiver vazio ou se já estiver aguardando resposta
    if (!texto || carregando) return;

    // Adiciona a mensagem do utilizador na lista imediatamente (UX responsiva)
    setMensagens(prev => [...prev, { role: 'user', text: texto }]);
    setInput('');       // limpa o campo de input
    setCarregando(true); // ativa indicador de "digitando..."

    try {
      // Chamada POST ao backend. Envia a mensagem e o ID do utilizador.
      // O backend busca o contexto financeiro e consulta a IA.
      const res = await axios.post(`${API}/chat`, {
        user_id: usuario.user_id,
        message: texto,
      });

      // res.data é o JSON retornado pela IA: { message: string, action: object|null }
      const { message, action } = res.data;

      // Adiciona a resposta da IA na lista de mensagens
      setMensagens(prev => [...prev, { role: 'bot', text: message }]);

      // Se a ação foi criar uma transação, exibe confirmação e dispara evento
      // para que o dashboard e outras páginas abertas atualizem os dados
      if (action?.type === 'create_transaction') {
        setMensagens(prev => [
          ...prev,
          {
            role: 'sistema',
            text: `✅ Transação registada! Atualizando dados...`,
          },
        ]);
        // Dispara evento customizado — qualquer página que esteja escutando
        // vai re-buscar os dados automaticamente sem precisar recarregar tudo
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('finann:transacao-criada'));
        }, 800);
      }

    } catch (err) {
      // Em caso de erro de rede ou erro no backend, exibe mensagem amigável
      const msgErro = err.response?.data?.error || 'Erro ao contactar o assistente. Tente novamente.';
      setMensagens(prev => [...prev, { role: 'bot', text: `❌ ${msgErro}` }]);
    } finally {
      setCarregando(false); // sempre desativa o indicador de carregamento
    }
  };

  // Permite enviar a mensagem pressionando Enter (sem Shift)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // evita quebra de linha no textarea
      enviar();
    }
  };

  // Reinicia a conversa (limpa mensagens e volta para a boas-vindas)
  const limparChat = () => setMensagens([MENSAGEM_BOAS_VINDAS]);

  // ---- Renderização do componente ----
  return (
    <>
      {/* ---- Botão flutuante (sempre visível no canto inferior direito) ---- */}
      {/* O botão pulsa levemente para chamar atenção quando o chat está fechado */}
      <button
        onClick={() => setAberto(!aberto)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          aberto
            ? 'bg-slate-700 hover:bg-slate-600 rotate-0'     // fechado: ícone X
            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/40' // aberto: ícone chat
        }`}
        title="Assistente FinanN"
      >
        {/* Alterna entre ícone de chat (fechado) e X (aberto) */}
        {aberto
          ? <X size={22} className="text-white" />
          : <MessageCircle size={22} className="text-white" />
        }
        {/* Ponto pulsante verde para indicar que a IA está disponível */}
        {!aberto && (
          <span className="absolute top-1 right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      {/* ---- Painel do chat (aparece/desaparece com animação) ---- */}
      {/* A animação de entrada usa translate + opacity via Tailwind */}
      <div className={`fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-700 transition-all duration-300 ${
        aberto
          ? 'opacity-100 translate-y-0 pointer-events-auto'   // visível
          : 'opacity-0 translate-y-4 pointer-events-none'      // escondido (não clicável)
      }`} style={{ height: '480px' }}>

        {/* ---- Cabeçalho do painel ---- */}
        {/* Gradiente azul com nome da IA, status "online" e botão de limpar conversa */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
             style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)' }}>
          <div className="flex items-center gap-2.5">
            {/* Ícone de IA com fundo semitransparente */}
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold text-sm">FinanN IA</span>
                <Sparkles size={11} className="text-blue-200" />
              </div>
              {/* Indicador de status: "Online" ou "A pensar..." */}
              <p className="text-blue-200 text-[10px]">
                {carregando ? 'A pensar...' : 'Online · Llama 3.3 70B'}
              </p>
            </div>
          </div>
          {/* Botão para limpar a conversa (reinicia as mensagens) */}
          <button
            onClick={limparChat}
            className="text-blue-200 hover:text-white transition-colors p-1"
            title="Limpar conversa"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* ---- Área de mensagens (scrollável) ---- */}
        {/* overflow-y-auto permite rolar quando há muitas mensagens */}
        <div className="flex-1 overflow-y-auto bg-slate-950 px-3 py-3 space-y-3">
          {mensagens.map((msg, i) => (
            <MensagemBolha key={i} msg={msg} />
          ))}

          {/* Indicador de "digitando" — aparece enquanto aguarda resposta da IA */}
          {carregando && <IndicadorDigitando />}

          {/* Elemento invisível no final da lista — alvo do scroll automático */}
          <div ref={fimRef} />
        </div>

        {/* ---- Campo de input e botão enviar ---- */}
        <div className="flex-shrink-0 bg-slate-900 border-t border-slate-700 p-3">
          {/* Exemplos rápidos de comandos */}
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {['💸 despesa mercado 200', '💰 receita salário 3000', '📊 meu saldo'].map(ex => (
              <button
                key={ex}
                onClick={() => setInput(ex.replace(/^[^\s]+\s/, ''))} // remove o emoji do início
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-2 py-0.5 rounded-full transition-colors border border-slate-700"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Input de texto + botão de enviar */}
          <div className="flex gap-2 items-end">
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem..."
              className="flex-1 bg-slate-800 text-white text-sm rounded-xl px-3 py-2.5 resize-none outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500 border border-slate-700"
              style={{ maxHeight: '80px' }}
            />
            {/* Botão enviar — desativado enquanto aguarda resposta ou campo vazio */}
            <button
              onClick={enviar}
              disabled={carregando || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl p-2.5 flex-shrink-0 transition-all active:scale-95"
            >
              {carregando
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={16} />
              }
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Componente auxiliar: MensagemBolha
//
// Renderiza uma única mensagem no chat.
// O estilo muda conforme o papel (role):
//   'user'    → balão azul, alinhado à direita (ícone de pessoa)
//   'bot'     → balão escuro, alinhado à esquerda (ícone de robô)
//   'sistema' → banner centralizado (confirmação de ação)
// ============================================================
function MensagemBolha({ msg }) {
  // Mensagem de sistema (ex: confirmação de transação criada)
  if (msg.role === 'sistema') {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
          {msg.text}
        </span>
      </div>
    );
  }

  const ehUtilizador = msg.role === 'user';

  return (
    // Alinha à direita para o utilizador, à esquerda para a IA
    <div className={`flex gap-2 ${ehUtilizador ? 'flex-row-reverse' : 'flex-row'}`}>

      {/* Ícone do remetente (pessoa ou robô) */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
        ehUtilizador
          ? 'bg-blue-600'        // azul para o utilizador
          : 'bg-slate-700'       // cinzento para a IA
      }`}>
        {ehUtilizador
          ? <User size={13} className="text-white" />
          : <Bot  size={13} className="text-blue-300" />
        }
      </div>

      {/* Balão de texto */}
      {/* whitespace-pre-wrap preserva quebras de linha na mensagem */}
      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        ehUtilizador
          ? 'bg-blue-600 text-white rounded-tr-sm'            // azul, canto cortado à direita
          : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700' // escuro, canto cortado à esquerda
      }`}>
        {msg.text}
      </div>
    </div>
  );
}

// ============================================================
// Componente auxiliar: IndicadorDigitando
//
// Exibe três bolinhas animadas (bounce) enquanto a IA está
// processando a resposta — padrão visual de "a digitar..."
// ============================================================
function IndicadorDigitando() {
  return (
    <div className="flex gap-2">
      {/* Ícone do robô igual ao das mensagens da IA */}
      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
        <Bot size={13} className="text-blue-300" />
      </div>
      {/* Três bolinhas com animação bounce escalonada (delays diferentes) */}
      <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
        {[0, 150, 300].map(delay => (
          <span
            key={delay}
            className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
