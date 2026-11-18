import { useEffect, useState } from 'react'
import { supabase, registrarProducao } from '../lib/supabase'
import { RotateCcw, CheckCircle2, Calendar, ChefHat } from 'lucide-react'

export default function AbaProducao({ onSucesso }) {
  const [sabores, setSabores] = useState([])
  const [historico, setHistorico] = useState([])
  const [quantidades, setQuantidades] = useState({})
  const [dataProducao, setDataProducao] = useState(() => new Date().toISOString().split('T')[0])
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregarDados = async () => {
    const { data: listaSabores } = await supabase
      .from('sabores')
      .select('id, tipo, nome, estoque_atual')
      .eq('ativo', true)
      .eq('controla_estoque', true)
      .order('tipo')
      .order('nome')

    setSabores(listaSabores || [])

    const { data: lotes } = await supabase
      .from('producoes')
      .select('id, data_producao, observacao, created_at, producao_itens(quantidade, sabores(tipo, nome))')
      .order('data_producao', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)

    setHistorico(lotes || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const adicionarQtd = (id, valor) => {
    setQuantidades((prev) => ({
      ...prev,
      [id]: Math.max(0, (Number(prev[id]) || 0) + valor),
    }))
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    const itens = Object.entries(quantidades)
      .filter(([, qtd]) => Number(qtd) > 0)
      .map(([sabor_id, quantidade]) => ({ sabor_id, quantidade: Number(quantidade) }))

    if (itens.length === 0) {
      alert('Informe a quantidade de pelo menos um sabor.')
      return
    }

    try {
      setSalvando(true)
      await registrarProducao(dataProducao, observacao, itens)
      setQuantidades({})
      setObservacao('')
      await carregarDados()
      alert('Produção registrada e estoque atualizado!')
      onSucesso?.()
    } catch (err) {
      alert('Erro ao registrar produção: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  const totalLoteAtual = Object.values(quantidades).reduce((acc, q) => acc + (Number(q) || 0), 0)

  return (
    <div className="space-y-6">
      <form onSubmit={handleSalvar} className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-base">Lançar Produção do Dia</h2>
            {totalLoteAtual > 0 && (
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                +{totalLoteAtual} un.
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Data</label>
              <input
                type="date"
                value={dataProducao}
                onChange={(e) => setDataProducao(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Turno / Obs.</label>
              <input
                type="text"
                placeholder="Ex: Lote manhã"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {sabores.map((sabor) => {
            const qtd = quantidades[sabor.id] || 0
            return (
              <div
                key={sabor.id}
                className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
              >
                <div>
                  <p className="font-medium text-sm">
                    {sabor.tipo} - {sabor.nome}
                  </p>
                  <p className="text-xs text-slate-500">Atual: {sabor.estoque_atual} un.</p>
                </div>

                <div className="flex items-center gap-1.5">
                  {[10, 50, 100].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => adicionarQtd(sabor.id, inc)}
                      className="px-2 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg active:scale-95"
                    >
                      +{inc}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="0"
                    value={qtd || ''}
                    placeholder="0"
                    onChange={(e) =>
                      setQuantidades((prev) => ({ ...prev, [sabor.id]: Number(e.target.value) }))
                    }
                    className="w-16 text-center font-bold border border-slate-300 rounded-lg py-1.5 text-sm"
                  />
                  {qtd > 0 && (
                    <button
                      type="button"
                      onClick={() => adicionarQtd(sabor.id, -qtd)}
                      className="p-1.5 text-slate-400 hover:text-red-500"
                      title="Zerar"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <CheckCircle2 className="w-5 h-5" />
          {salvando ? 'Salvando...' : 'Confirmar Produção e Somar Estoque'}
        </button>
      </form>

      <div className="space-y-2.5 pt-2 border-t border-slate-200">
        <div className="flex items-center gap-1.5 text-slate-700">
          <ChefHat className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-sm">Histórico de Lotes Produzidos</h3>
        </div>

        {historico.length === 0 ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
            Nenhuma produção registrada ainda.
          </div>
        ) : (
          <div className="space-y-2.5">
            {historico.map((lote) => {
              const totalLote = lote.producao_itens.reduce((acc, i) => acc + i.quantidade, 0)
              const dataFmt = new Date(lote.data_producao + 'T12:00:00').toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })

              return (
                <div
                  key={lote.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{dataFmt}</span>
                      {lote.observacao && (
                        <span className="font-normal text-slate-500">• {lote.observacao}</span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      +{totalLote} un.
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {lote.producao_itens.map((item, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-slate-100 text-slate-700 px-2 py-1 rounded-md"
                      >
                        <strong>{item.quantidade}x</strong> {item.sabores?.tipo} - {item.sabores?.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}