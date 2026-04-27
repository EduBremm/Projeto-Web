import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

// endereço base da API do backend
const API = 'http://127.0.0.1:5000';

// Validações conforme requisitos
// essas funções usam regex pra validar nome, email e senha
const validarNome = (v) => /^[a-zA-ZÀ-ÿ\s\-']{4,}$/.test(v.trim());
const validarEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validarSenha = (v) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\#\^])[A-Za-z\d@$!%*?&\#\^]{8,}$/.test(v);

// lista de moedas e fusos disponíveis para o utilizador escolher no cadastro
const MOEDAS = ['BRL', 'USD', 'EUR', 'GBP', 'JPY'];
const FUSOS = ['America/Sao_Paulo', 'America/Manaus', 'America/Belem', 'America/Fortaleza', 'America/Recife', 'America/Maceio', 'America/Noronha', 'America/Boa_Vista', 'America/Porto_Velho', 'America/Eirunepe', 'America/Rio_Branco', 'UTC', 'Europe/Lisbon', 'Europe/London'];

// componente reutilizável para campo de senha com botão de mostrar/esconder
function CampoSenha({ value, onChange, placeholder }) {
  // controla se a senha está visível ou não
  const [mostrar, setMostrar] = useState(false);
  return (
    <div className="relative">
      <input
        type={mostrar ? 'text' : 'password'}
        required
        className="w-full border p-3 pr-10 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      {/* botão que alterna entre mostrar e ocultar a senha */}
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        onClick={() => setMostrar(!mostrar)}
      >
        {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

// componente que mostra em tempo real quais requisitos de senha já foram cumpridos
function RequisitosSenha({ senha }) {
  // cada item verifica uma regra diferente e muda de cor quando satisfeita
  const reqs = [
    { ok: senha.length >= 8,             label: 'Mínimo 8 caracteres' },
    { ok: /[A-Z]/.test(senha),           label: 'Uma letra maiúscula' },
    { ok: /[a-z]/.test(senha),           label: 'Uma letra minúscula' },
    { ok: /\d/.test(senha),              label: 'Um número' },
    { ok: /[@$!%*?&\#\^]/.test(senha),  label: 'Um caractere especial (@$!%*?&#^)' },
  ];
  return (
    <ul className="mt-1 space-y-0.5">
      {reqs.map(({ ok, label }) => (
        <li key={label} className={`text-xs flex items-center gap-1 ${ok ? 'text-green-600' : 'text-gray-400'}`}>
          <span>{ok ? '✓' : '○'}</span> {label}
        </li>
      ))}
    </ul>
  );
}

export default function Cadastro() {
  // hook para redirecionar o utilizador após o cadastro
  const navigate = useNavigate();

  // estado principal do formulário com todos os campos do utilizador
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirmar: '',
    currency: 'BRL', timezone: 'America/Sao_Paulo',
    notif_budget: true, notif_bill: true, notif_goal: true,
    profile_photo: null,
  });

  // guarda os erros de validação de cada campo
  const [erros, setErros] = useState({});

  // controla o estado de carregamento enquanto a requisição está a ser feita
  const [loading, setLoading] = useState(false);

  // função auxiliar para atualizar um campo específico do formulário sem perder os outros
  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));

  // essa função valida todos os campos antes de enviar o formulário
  const validar = () => {
    const e = {};
    if (!validarNome(form.full_name))
      e.full_name = 'Use apenas letras, espaços, hífens ou apóstrofos (mín. 4 caracteres).';
    if (!validarEmail(form.email))
      e.email = 'Insira um email válido com @ e domínio.';
    if (!validarSenha(form.password))
      e.password = 'A senha não cumpre os requisitos de segurança.';
    // verifica se as duas senhas digitadas são iguais
    if (form.password !== form.confirmar)
      e.confirmar = 'As senhas não coincidem.';
    // valida o formato e tamanho da foto de perfil se foi enviada
    if (form.profile_photo) {
      const ext = form.profile_photo.name.split('.').pop().toLowerCase();
      if (!['jpg','jpeg','png','gif'].includes(ext)) e.profile_photo = 'Formato inválido. Use JPG, PNG ou GIF.';
      if (form.profile_photo.size > 2 * 1024 * 1024) e.profile_photo = 'Tamanho máximo: 2MB.';
    }
    return e;
  };

  // essa função é chamada quando o utilizador envia o formulário de cadastro
  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validar();
    setErros(e2);
    // se tiver erros de validação, para aqui e não envia nada
    if (Object.keys(e2).length > 0) return;

    setLoading(true);
    try {
      // uso FormData porque tenho um ficheiro (foto de perfil) para enviar
      const data = new FormData();
      data.append('full_name', form.full_name.trim());
      data.append('email', form.email.toLowerCase());
      data.append('password', form.password);
      data.append('currency', form.currency);
      data.append('timezone', form.timezone);
      data.append('notif_budget', form.notif_budget);
      data.append('notif_bill', form.notif_bill);
      data.append('notif_goal', form.notif_goal);
      // só adiciona a foto se o utilizador escolheu uma
      if (form.profile_photo) data.append('profile_photo', form.profile_photo);

      await axios.post(`${API}/auth/register`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Conta criada com sucesso! Faça login.');
      // redireciona para a página de login após cadastro bem-sucedido
      navigate('/');
    } catch (err) {
      setErros({ geral: err.response?.data?.error || 'Erro ao criar conta.' });
    } finally {
      setLoading(false);
    }
  };

  // função auxiliar que cria um bloco de campo com label e mensagem de erro
  const campo = (label, children, erro) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {erro && <p className="text-red-500 text-xs mt-1">{erro}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border-t-8 border-green-500">
        {/* link para voltar à página de login */}
        <Link to="/" className="text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-6 text-sm">
          <ArrowLeft size={16} /> Voltar para o Login
        </Link>

        <h2 className="text-2xl font-bold text-gray-800 mb-1">Criar Nova Conta</h2>
        <p className="text-gray-500 mb-6 text-sm">Comece a organizar as suas finanças hoje.</p>

        {/* se tiver um erro geral (ex: email já em uso), mostro ele aqui */}
        {erros.geral && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
            {erros.geral}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* campo do nome completo */}
          {campo('Nome Completo *',
            <input type="text" required
              className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none ${erros.full_name ? 'border-red-400' : ''}`}
              placeholder="Maria Silva"
              value={form.full_name} onChange={e => set('full_name', e.target.value)}
            />, erros.full_name
          )}

          {/* campo do email */}
          {campo('Email *',
            <input type="email" required
              className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none ${erros.email ? 'border-red-400' : ''}`}
              placeholder="exemplo@email.com"
              value={form.email} onChange={e => set('email', e.target.value)}
            />, erros.email
          )}

          {/* campo da senha com indicador de requisitos em tempo real */}
          {campo('Senha *',
            <>
              <CampoSenha value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 8 caracteres" />
              {form.password && <RequisitosSenha senha={form.password} />}
            </>, erros.password
          )}

          {/* confirmar senha */}
          {campo('Confirmar Senha *',
            <CampoSenha value={form.confirmar} onChange={e => set('confirmar', e.target.value)} placeholder="Repita a senha" />,
            erros.confirmar
          )}

          {/* Foto de Perfil */}
          {campo('Foto de Perfil (opcional)',
            <input type="file" accept=".jpg,.jpeg,.png,.gif"
              className="w-full border p-2 rounded-lg text-sm"
              onChange={e => set('profile_photo', e.target.files[0] || null)}
            />, erros.profile_photo
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* seleção de moeda padrão */}
            {campo('Moeda Padrão *',
              <select className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                value={form.currency} onChange={e => set('currency', e.target.value)}>
                {MOEDAS.map(m => <option key={m}>{m}</option>)}
              </select>
            )}

            {/* seleção de fuso horário */}
            {campo('Fuso Horário *',
              <select className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                {FUSOS.map(f => <option key={f}>{f}</option>)}
              </select>
            )}
          </div>

          {/* checkboxes para configurar quais notificações o utilizador quer receber */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notificações</label>
            <div className="space-y-2">
              {[
                { key: 'notif_budget', label: 'Orçamento excedido' },
                { key: 'notif_bill',   label: 'Contas a vencer' },
                { key: 'notif_goal',   label: 'Meta de poupança atingida' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)}
                    className="w-4 h-4 accent-green-600" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* botão de submissão desabilitado enquanto está a carregar */}
          <button
            type="submit" disabled={loading}
            className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <UserPlus size={20} /> {loading ? 'A criar conta...' : 'Criar Conta'}
          </button>
        </form>
      </div>
    </div>
  );
}
