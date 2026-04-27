// ============================================================
// perfil.jsx — Página de perfil e configurações do utilizador
//
// O que faz:
//   Permite ao utilizador ver e editar os seus dados pessoais,
//   preferências e configurações de notificações.
//
// Secções:
//   1. Cabeçalho: foto de perfil + nome + email + stats rápidos
//   2. Dados Pessoais: nome completo + email (só leitura)
//   3. Foto de Perfil: upload com preview instantâneo
//   4. Preferências: moeda padrão + fuso horário
//   5. Notificações: toggles para alertas de orçamento, faturas e metas
//   6. Alterar Senha: campos atual + nova + confirmação
//
// Fluxo de actualização:
//   - Dados pessoais + foto + preferências → PUT /utilizadores/:userId
//     com multipart/form-data (para suportar o ficheiro de foto)
//   - Senha → endpoint separado PUT /utilizadores/:userId/senha
//   - Após guardar, o localStorage é atualizado com os novos dados
//
// Dependências:
//   - React (useState, useEffect, useRef): estado, ciclo e ref para input de foto
//   - axios: chamadas HTTP ao backend
//   - react-router-dom: useNavigate (redirecionar se não logado)
//   - lucide-react: ícones
//   - Layout: estrutura lateral com sidebar e ticker
// ============================================================

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  User, Mail, Camera, Save, Lock, Eye, EyeOff,
  Bell, Globe, DollarSign, Shield, CheckCircle,
  AlertCircle, Pencil, Wallet, TrendingUp, PiggyBank,
} from 'lucide-react';

const API = 'http://127.0.0.1:5000';

// Moedas e fusos disponíveis nas preferências
const MOEDAS = [
  { value: 'BRL', label: '🇧🇷 Real Brasileiro (BRL)' },
  { value: 'USD', label: '🇺🇸 Dólar Americano (USD)' },
  { value: 'EUR', label: '🇪🇺 Euro (EUR)' },
  { value: 'GBP', label: '🇬🇧 Libra Esterlina (GBP)' },
  { value: 'JPY', label: '🇯🇵 Iene Japonês (JPY)' },
];

const FUSOS = [
  { value: 'America/Sao_Paulo',  label: 'Brasília (UTC-3)' },
  { value: 'America/Manaus',     label: 'Manaus (UTC-4)' },
  { value: 'America/Belem',      label: 'Belém (UTC-3)' },
  { value: 'America/Fortaleza',  label: 'Fortaleza (UTC-3)' },
  { value: 'America/Recife',     label: 'Recife (UTC-3)' },
  { value: 'America/Porto_Velho',label: 'Porto Velho (UTC-4)' },
  { value: 'America/Boa_Vista',  label: 'Boa Vista (UTC-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (UTC-5)' },
  { value: 'America/Noronha',    label: 'Fernando de Noronha (UTC-2)' },
  { value: 'Europe/Lisbon',      label: 'Lisboa (UTC+0/+1)' },
  { value: 'Europe/London',      label: 'Londres (UTC+0/+1)' },
  { value: 'America/New_York',   label: 'Nova York (UTC-5/-4)' },
];

export default function Perfil() {
  const navigate  = useNavigate();
  const fotoRef   = useRef(null); // referência ao input[type=file] oculto

  // Lê dados do localStorage (guardados no login)
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  // ---- Estado dos formulários ----
  const [nome,       setNome]       = useState(usuario.full_name || '');
  const [moeda,      setMoeda]      = useState(usuario.currency_preference || 'BRL');
  const [fuso,       setFuso]       = useState(usuario.timezone || 'America/Sao_Paulo');
  const [notifOrc,   setNotifOrc]   = useState(usuario.notif_budget  ?? true);
  const [notifFat,   setNotifFat]   = useState(usuario.notif_bill    ?? true);
  const [notifMeta,  setNotifMeta]  = useState(usuario.notif_goal    ?? true);

  // Foto: previewFoto é a URL local para mostrar antes do upload
  const [fotoFile,    setFotoFile]    = useState(null);
  const [previewFoto, setPreviewFoto] = useState(
    usuario.profile_photo ? `${API}/uploads/${usuario.profile_photo}` : null
  );

  // Campos de senha
  const [senhaAtual,    setSenhaAtual]    = useState('');
  const [senhaNova,     setSenhaNova]     = useState('');
  const [senhaConfirm,  setSenhaConfirm]  = useState('');
  const [mostrarSenha,  setMostrarSenha]  = useState(false);

  // Stats do utilizador (carregados do backend)
  const [stats, setStats] = useState({ saldo: 0, receitas: 0, despesas: 0, metas: 0 });

  // Feedback de sucesso/erro para cada secção
  const [feedbackPerfil, setFeedbackPerfil] = useState(null); // { tipo: 'ok'|'erro', msg }
  const [feedbackSenha,  setFeedbackSenha]  = useState(null);
  const [salvando,       setSalvando]       = useState(false);
  const [salvandoSenha,  setSalvandoSenha]  = useState(false);

  // Redireciona para login se não houver sessão activa
  useEffect(() => {
    if (!usuario.user_id) { navigate('/'); return; }
    carregarStats();
  }, []);

  // Busca dados resumidos para exibir no cabeçalho do perfil
  const carregarStats = async () => {
    try {
      const [dash, metas] = await Promise.all([
        axios.get(`${API}/dashboard/${usuario.user_id}`),
        axios.get(`${API}/metas/${usuario.user_id}`),
      ]);
      setStats({
        saldo:    dash.data.saldo_total,
        receitas: dash.data.receitas_mes,
        despesas: dash.data.despesas_mes,
        metas:    metas.data.length,
      });
    } catch { /* silencioso */ }
  };

  // Quando o utilizador escolhe uma foto nova, cria um URL local para preview
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    setPreviewFoto(URL.createObjectURL(file)); // URL temporária no browser
  };

  // Guarda dados pessoais + preferências + foto
  const salvarPerfil = async () => {
    if (nome.trim().length < 4) {
      setFeedbackPerfil({ tipo: 'erro', msg: 'Nome deve ter no mínimo 4 caracteres.' });
      return;
    }
    setSalvando(true);
    setFeedbackPerfil(null);

    try {
      // multipart/form-data necessário para enviar o ficheiro de foto
      const form = new FormData();
      form.append('full_name',      nome.trim());
      form.append('currency',       moeda);
      form.append('timezone',       fuso);
      form.append('notif_budget',   notifOrc);
      form.append('notif_bill',     notifFat);
      form.append('notif_goal',     notifMeta);
      if (fotoFile) form.append('profile_photo', fotoFile);

      const res = await axios.put(
        `${API}/utilizadores/${usuario.user_id}`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      // Actualiza o localStorage com os novos dados (sem password_hash)
      const atualizado = { ...usuario, ...res.data };
      localStorage.setItem('usuario', JSON.stringify(atualizado));
      setFotoFile(null); // limpa o ficheiro pendente
      setFeedbackPerfil({ tipo: 'ok', msg: 'Perfil actualizado com sucesso!' });
    } catch (err) {
      setFeedbackPerfil({ tipo: 'erro', msg: err.response?.data?.error || 'Erro ao guardar perfil.' });
    } finally {
      setSalvando(false);
    }
  };

  // Altera a senha do utilizador
  const salvarSenha = async () => {
    if (!senhaAtual || !senhaNova || !senhaConfirm) {
      setFeedbackSenha({ tipo: 'erro', msg: 'Preencha todos os campos de senha.' });
      return;
    }
    if (senhaNova !== senhaConfirm) {
      setFeedbackSenha({ tipo: 'erro', msg: 'Nova senha e confirmação não coincidem.' });
      return;
    }
    if (senhaNova.length < 8) {
      setFeedbackSenha({ tipo: 'erro', msg: 'Nova senha deve ter no mínimo 8 caracteres.' });
      return;
    }
    setSalvandoSenha(true);
    setFeedbackSenha(null);
    try {
      await axios.put(`${API}/utilizadores/${usuario.user_id}/senha`, {
        senha_atual: senhaAtual,
        senha_nova:  senhaNova,
      });
      setSenhaAtual(''); setSenhaNova(''); setSenhaConfirm('');
      setFeedbackSenha({ tipo: 'ok', msg: 'Senha alterada com sucesso!' });
    } catch (err) {
      setFeedbackSenha({ tipo: 'erro', msg: err.response?.data?.error || 'Erro ao alterar senha.' });
    } finally {
      setSalvandoSenha(false);
    }
  };

  // Gera as iniciais para o avatar quando não há foto
  const iniciais = (usuario.full_name || 'U')
    .split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  // ---- Componentes auxiliares ----

  // Cartão de stat rápido no cabeçalho
  const StatCard = ({ icon: Icon, label, value, cor }) => (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4 flex items-center gap-3 border border-white/10">
      <div className="bg-white/15 p-2.5 rounded-xl">
        <Icon size={18} className={cor} />
      </div>
      <div>
        <p className="text-white/60 text-xs font-medium">{label}</p>
        <p className="text-white font-bold text-base leading-tight">{value}</p>
      </div>
    </div>
  );

  // Toggle de notificação estilizado
  const Toggle = ({ label, desc, icon: Icon, value, onChange }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="bg-blue-50 p-2 rounded-lg">
          <Icon size={16} className="text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
          value ? 'bg-blue-600' : 'bg-slate-200'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );

  // Alerta de feedback (verde OK / vermelho erro)
  const Feedback = ({ fb }) => {
    if (!fb) return null;
    const ok = fb.tipo === 'ok';
    return (
      <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl mt-4 ${
        ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
           : 'bg-red-50 text-red-700 border border-red-200'
      }`}>
        {ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
        {fb.msg}
      </div>
    );
  };

  const fmt = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ====================================================
            CABEÇALHO — Foto + nome + stats rápidos
            Gradiente igual ao da sidebar para consistência visual
            ==================================================== */}
        <div className="rounded-3xl overflow-hidden shadow-xl"
             style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)' }}>

          {/* Decoração geométrica */}
          <div className="relative px-8 pt-8 pb-6">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-blue-500/10" />
            <div className="absolute top-1/2 -left-16 w-32 h-32 rounded-full bg-indigo-500/10" />

            <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-6">
              {/* Avatar / foto de perfil com botão de câmera */}
              <div className="relative flex-shrink-0">
                <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
                  {previewFoto ? (
                    <img src={previewFoto} alt="Foto de perfil"
                         className="w-full h-full object-cover" />
                  ) : (
                    // Avatar com iniciais quando não há foto
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-3xl font-bold">{iniciais}</span>
                    </div>
                  )}
                </div>
                {/* Botão câmera para acionar o input de ficheiro */}
                <button
                  onClick={() => fotoRef.current?.click()}
                  className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl shadow-lg transition-all active:scale-95 border-2 border-white"
                  title="Alterar foto"
                >
                  <Camera size={14} />
                </button>
                {/* Input de ficheiro oculto — acionado pelo botão câmera */}
                <input
                  ref={fotoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  className="hidden"
                  onChange={handleFotoChange}
                />
              </div>

              {/* Nome e email */}
              <div className="text-center sm:text-left flex-1 pb-1">
                <h1 className="text-white text-2xl font-bold">{usuario.full_name}</h1>
                <p className="text-blue-300 text-sm mt-0.5">{usuario.email}</p>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                  <span className="bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    {moeda}
                  </span>
                  <span className="bg-white/10 border border-white/20 text-white/70 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    {fuso.split('/')[1]?.replace('_', ' ') || fuso}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats financeiros rápidos */}
            <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <StatCard icon={Wallet}     label="Saldo Total"   value={`R$ ${fmt(stats.saldo)}`}    cor="text-blue-300" />
              <StatCard icon={TrendingUp} label="Receitas/Mês"  value={`R$ ${fmt(stats.receitas)}`} cor="text-emerald-300" />
              <StatCard icon={TrendingUp} label="Despesas/Mês"  value={`R$ ${fmt(stats.despesas)}`} cor="text-red-300" />
              <StatCard icon={PiggyBank}  label="Metas Ativas" value={`${stats.metas} metas`}      cor="text-purple-300" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ====================================================
              COLUNA ESQUERDA (3/5) — Dados pessoais + preferências
              ==================================================== */}
          <div className="lg:col-span-3 space-y-5">

            {/* Dados pessoais */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <User size={16} className="text-blue-600" />
                </div>
                <h2 className="font-bold text-slate-800">Dados Pessoais</h2>
              </div>
              <div className="px-6 py-5 space-y-4">

                {/* Nome completo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                      placeholder="Seu nome completo"
                    />
                    <Pencil size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Email (somente leitura) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={usuario.email}
                      readOnly
                      className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 pr-10 text-sm text-slate-500 cursor-not-allowed"
                    />
                    <Mail size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">O email não pode ser alterado.</p>
                </div>

                {/* Foto actual */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Foto de Perfil
                  </label>
                  <div className="flex items-center gap-4 p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                    {/* Preview da foto */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                      {previewFoto ? (
                        <img src={previewFoto} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{iniciais}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        {fotoFile ? fotoFile.name : 'Nenhuma foto selecionada'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">JPG, PNG ou GIF · máx. 5MB</p>
                      <button
                        onClick={() => fotoRef.current?.click()}
                        className="mt-2 text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Camera size={12} /> Escolher foto
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferências */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="bg-purple-50 p-2 rounded-lg">
                  <Globe size={16} className="text-purple-600" />
                </div>
                <h2 className="font-bold text-slate-800">Preferências</h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Moeda Padrão
                  </label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={moeda}
                      onChange={e => setMoeda(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white appearance-none transition-all"
                    >
                      {MOEDAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Fuso Horário
                  </label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={fuso}
                      onChange={e => setFuso(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white appearance-none transition-all"
                    >
                      {FUSOS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão guardar perfil + feedback */}
            <button
              onClick={salvarPerfil}
              disabled={salvando}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-blue-200 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {salvando ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> A guardar...</>
              ) : (
                <><Save size={16} /> Guardar Alterações</>
              )}
            </button>
            <Feedback fb={feedbackPerfil} />
          </div>

          {/* ====================================================
              COLUNA DIREITA (2/5) — Notificações + Segurança
              ==================================================== */}
          <div className="lg:col-span-2 space-y-5">

            {/* Notificações */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="bg-amber-50 p-2 rounded-lg">
                  <Bell size={16} className="text-amber-600" />
                </div>
                <h2 className="font-bold text-slate-800">Notificações</h2>
              </div>
              <div className="px-6 py-2">
                <Toggle
                  label="Orçamentos"
                  desc="Alerta ao exceder o limite"
                  icon={Wallet}
                  value={notifOrc}
                  onChange={setNotifOrc}
                />
                <Toggle
                  label="Faturas"
                  desc="Lembrete de vencimento"
                  icon={Bell}
                  value={notifFat}
                  onChange={setNotifFat}
                />
                <Toggle
                  label="Metas"
                  desc="Progresso das poupanças"
                  icon={PiggyBank}
                  value={notifMeta}
                  onChange={setNotifMeta}
                />
              </div>
            </div>

            {/* Segurança — alterar senha */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="bg-red-50 p-2 rounded-lg">
                  <Shield size={16} className="text-red-500" />
                </div>
                <h2 className="font-bold text-slate-800">Segurança</h2>
              </div>
              <div className="px-6 py-5 space-y-3">

                {/* Senha atual */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Senha Atual
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senhaAtual}
                      onChange={e => setSenhaAtual(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-slate-200 rounded-xl pl-9 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    />
                    <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {mostrarSenha ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                </div>

                {/* Nova senha */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senhaNova}
                      onChange={e => setSenhaNova(e.target.value)}
                      placeholder="Mín. 8 caracteres"
                      className="w-full border border-slate-200 rounded-xl pl-9 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    />
                  </div>
                  {/* Barra de força da senha */}
                  {senhaNova && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[8, 12, 16].map((min, i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                            senhaNova.length >= min ? ['bg-red-400','bg-amber-400','bg-emerald-500'][i] : 'bg-slate-200'
                          }`} />
                        ))}
                      </div>
                      <p className="text-xs text-slate-400">
                        {senhaNova.length < 8 ? 'Fraca' : senhaNova.length < 12 ? 'Média' : 'Forte'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirmar nova senha */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senhaConfirm}
                      onChange={e => setSenhaConfirm(e.target.value)}
                      placeholder="Repita a nova senha"
                      className={`w-full border rounded-xl pl-9 py-3 text-sm outline-none focus:ring-2 transition-all ${
                        senhaConfirm && senhaNova !== senhaConfirm
                          ? 'border-red-300 focus:ring-red-500/30 focus:border-red-400'
                          : 'border-slate-200 focus:ring-blue-500/30 focus:border-blue-400'
                      }`}
                    />
                    {/* Ícone de validação ao vivo */}
                    {senhaConfirm && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {senhaNova === senhaConfirm
                          ? <CheckCircle size={14} className="text-emerald-500" />
                          : <AlertCircle size={14} className="text-red-400" />
                        }
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={salvarSenha}
                  disabled={salvandoSenha}
                  className="w-full mt-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {salvandoSenha ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> A alterar...</>
                  ) : (
                    <><Lock size={14} /> Alterar Senha</>
                  )}
                </button>
                <Feedback fb={feedbackSenha} />
              </div>
            </div>

            {/* Badge de versão / info */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-center">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-1">FinanN</p>
              <p className="text-white font-bold">Versão 1.0</p>
              <p className="text-slate-500 text-xs mt-2">Plataforma de Gestão Financeira Pessoal</p>
              <p className="text-slate-600 text-xs mt-1">Feito com ❤️ para a faculdade</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
