import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { PlusCircle, Pencil, Trash2, Tag, X, Check, Lock } from 'lucide-react';

// endereço da API
const API = 'http://127.0.0.1:5000';

// estado vazio do formulário para quando vou criar uma nova categoria
const formVazio = { category_name: '', category_type: 'Despesa', subcategories: '', icon: '', color: '#3b82f6' };

export default function Categorias() {
  // lê o utilizador do localStorage para saber o user_id
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  // lista de todas as categorias (sistema + do utilizador)
  const [categorias, setCategorias] = useState([]);

  // dados do formulário de criação/edição
  const [form, setForm] = useState(formVazio);

  // guarda o id da categoria a editar (null = modo criação)
  const [editId, setEditId] = useState(null);

  // controla visibilidade do formulário
  const [mostrarForm, setMostrarForm] = useState(false);

  // filtro de tipo selecionado (Todas, Despesa ou Receita)
  const [filtro, setFiltro] = useState('Todas');

  // guarda mensagem de erro para exibir ao utilizador
  const [erro, setErro] = useState('');

  // ao montar o componente, carrego as categorias
  useEffect(() => { buscar(); }, []);

  // busca todas as categorias do utilizador (inclui as do sistema)
  const buscar = async () => {
    try {
      const res = await axios.get(`${API}/categorias/${usuario.user_id}`);
      setCategorias(res.data);
    } catch { setErro('Erro ao carregar categorias.'); }
  };

  // categorias do sistema têm user_id null, não podem ser editadas nem removidas
  const ehSistema = (c) => c.user_id === null;

  // prepara o formulário para criar nova categoria
  const abrirNovo = () => { setForm(formVazio); setEditId(null); setMostrarForm(true); setErro(''); };

  // prepara o formulário para editar, converte subcategorias de JSON para string
  const abrirEditar = (c) => {
    setForm({
      category_name: c.category_name, category_type: c.category_type,
      // converte o array JSON de subcategorias para string separada por vírgula
      subcategories: c.subcategories ? JSON.parse(c.subcategories).join(', ') : '',
      icon: c.icon || '', color: c.color || '#3b82f6',
    });
    setEditId(c.category_id);
    setMostrarForm(true);
    setErro('');
  };

  // salva a categoria: converte subcategorias de string para array antes de enviar
  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    const payload = {
      ...form,
      user_id: usuario.user_id,
      // divide a string por vírgula e limpa espaços extras de cada subcategoria
      subcategories: form.subcategories ? form.subcategories.split(',').map(s => s.trim()).filter(Boolean) : [],
    };
    try {
      if (editId) {
        await axios.put(`${API}/categorias/${editId}`, payload);
      } else {
        await axios.post(`${API}/categorias`, payload);
      }
      setMostrarForm(false);
      buscar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar categoria.');
    }
  };

  // remove categoria após confirmação
  const remover = async (id) => {
    if (!confirm('Remover esta categoria?')) return;
    try {
      await axios.delete(`${API}/categorias/${id}`);
      buscar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao remover categoria.');
    }
  };

  // aplica o filtro de tipo à lista de categorias
  const listagem = categorias.filter(c => filtro === 'Todas' || c.category_type === filtro);

  // contadores usados no subtítulo da página
  const receitas = categorias.filter(c => c.category_type === 'Receita');
  const despesas = categorias.filter(c => c.category_type === 'Despesa');

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Tag className="text-blue-600" /> Categorias
            </h1>
            {/* mostra contagem de despesas e receitas no subtítulo */}
            <p className="text-gray-500 text-sm mt-1">
              {despesas.length} despesas · {receitas.length} receitas
            </p>
          </div>
          <button onClick={abrirNovo}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
            <PlusCircle size={16} /> Nova Categoria
          </button>
        </div>

        {/* alerta de erro se tiver */}
        {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">{erro}</div>}

        {/* Formulário de criação/edição de categoria */}
        {mostrarForm && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">{editId ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Nome *</label>
                <input required minLength={2} maxLength={50} className="input" placeholder="Ex: Alimentação"
                  value={form.category_name} onChange={e => setForm(f => ({ ...f, category_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Tipo *</label>
                {/* define se a categoria é de despesa ou receita */}
                <select required className="input"
                  value={form.category_type} onChange={e => setForm(f => ({ ...f, category_type: e.target.value }))}>
                  <option>Despesa</option>
                  <option>Receita</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Subcategorias (separadas por vírgula, opcional)</label>
                <input className="input" placeholder="Ex: Restaurantes, Supermercado, Delivery"
                  value={form.subcategories} onChange={e => setForm(f => ({ ...f, subcategories: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Ícone (opcional)</label>
                <input className="input" placeholder="Ex: shopping-cart"
                  value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Cor</label>
                {/* color picker para o utilizador escolher a cor da categoria */}
                <div className="flex items-center gap-2">
                  <input type="color" className="h-10 w-16 border rounded cursor-pointer"
                    value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  />
                  <span className="text-sm text-gray-500">{form.color}</span>
                </div>
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setMostrarForm(false)}
                  className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50 text-sm">Cancelar</button>
                <button type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-1">
                  <Check size={15} /> {editId ? 'Guardar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* botões de filtro para mostrar todas, só despesas ou só receitas */}
        <div className="flex gap-2 mb-4">
          {['Todas', 'Despesa', 'Receita'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                filtro === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}>{f}</button>
          ))}
        </div>

        {/* Lista de categorias filtradas */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {listagem.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Nenhuma categoria encontrada.</p>
          ) : (
            <div className="divide-y">
              {listagem.map(c => (
                <div key={c.category_id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {/* bolinha colorida com a cor da categoria */}
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color || '#6b7280' }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{c.category_name}</span>
                        {/* ícone de cadeado para categorias do sistema (não editáveis) */}
                        {ehSistema(c) && (
                          <span className="flex items-center gap-0.5 text-xs text-gray-400">
                            <Lock size={10} /> Sistema
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {/* badge vermelho para despesa, verde para receita */}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.category_type === 'Despesa' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>{c.category_type}</span>
                        {/* mostra as subcategorias separadas por ponto se existirem */}
                        {c.subcategories && (
                          <span className="text-xs text-gray-400">
                            {JSON.parse(c.subcategories).join(' · ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* os botões de editar/remover só aparecem em categorias do utilizador */}
                  {!ehSistema(c) && (
                    <div className="flex gap-2">
                      <button onClick={() => abrirEditar(c)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                      <button onClick={() => remover(c.category_id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* estilos inline para input e label reutilizados no formulário */}
      <style>{`.input { width: 100%; border: 1px solid #d1d5db; padding: 0.625rem 0.75rem; border-radius: 0.5rem; outline: none; font-size: 0.875rem; } .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }`}</style>
    </Layout>
  );
}
