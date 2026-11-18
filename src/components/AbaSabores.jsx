import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus } from 'lucide-react'

const TIPOS_PADRAO = ['Coxinha', 'Risole', 'Bolinha', 'Kibe', 'Empada', 'Pastel', 'Canudinho', 'Outro']

export default function AbaSabores() {
  const [sabores, setSabores] = useState([])
  const [extrato, setExtrato] = useState([])
  const [tipo, setTipo] = useState('Coxinha')
  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')
  const [controlaEstoque, setControlaEstoque] = useState(true)

  const carregar = async () => {
    const { data: listaSabores } = await supabase
      .from('sabores')
      .select('*')
      .order('tipo')
      .order('nome')
    setSabores(listaSabores || [])

    const { data: movs } = await supabase
      .from('movimentacoes_estoque')
      .select('*, sabores(tipo, nome)')
      .order('created_at', { ascending: false })
      .limit(30)
    setExtrato(movs || [])
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleTipoChange = (novoTipo) => {
    setTipo(novoTipo)
    if (['Empada', 'Pastel', 'Canudinho'].includes(novoTipo)) {
      setControlaEstoque(false)
    } else {
      setControlaEstoque(true)
    }
  }

  const adicionarSabor = async (e) => {
    e.preventDefault()
    if (!nome.trim()) return

    const { error } = await supabase.from('sabores').insert({
      tipo,
      nome: nome.trim(),
      preco_unitario: Number(preco) || 0,
      controla_estoque: controlaEstoque,
    })

    if (error) alert(error.message)
    else {
      setNome('')
      setPreco('')
      carregar()
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={adicionarSabor} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <h2 className="font-semibold text-sm">Cadastrar Salgado / Sabor</h2>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => handleTipoChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {TIPOS_PADRAO.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Preço Unit. (R$)</label>
            <input
              required
              type="number"
              step="0.01"
              placeholder="0.50"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <input
            required
            placeholder="Sabor (ex: Frango, Carne, Queijo, Mista)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-amber-600 text-white px-4 rounded-lg flex items-center justify-center font-semibold text-sm gap-1"
          >
            <Plus className="w-5 h-5" /> Salvar
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-700 pt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={controlaEstoque}
            onChange={(e) => setControlaEstoque(e.target.checked)}
            className="rounded text-amber-600"
          />
          <span>Controlar em estoque pronto (desmarque se for feito apenas sob encomenda)</span>
        </label>
      </form>

      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
        <h3 className="font-semibold text-sm mb-2">Cardápio Cadastrado</h3>
        {sabores.map((s) => (
          <div key={s.id} className="flex justify-between items-center text-sm py-2 border-b last:border-0 border-slate-100">
            <div>
              <span className="font-semibold">{s.tipo}</span> — <span>{s.nome}</span>
              <span
                className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  s.controla_estoque ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'
                }`}
              >
                {s.controla_estoque ? 'Estoque' : 'Sob Encomenda'}
              </span>
            </div>
            <span className="font-semibold text-slate-700">R$ {Number(s.preco_unitario).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-slate-700">Últimas Movimentações de Estoque</h3>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {extrato.map((m) => (
            <div key={m.id} className="p-3 flex justify-between items-center text-xs">
              <div>
                <p className="font-semibold text-slate-800">
                  {m.sabores?.tipo} - {m.sabores?.nome}
                </p>
                <p className="text-slate-500">
                  {m.tipo.replace('_', ' ')} {m.observacao ? `• ${m.observacao}` : ''}
                </p>
              </div>
              <span className={`font-bold text-sm ${m.quantidade > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}