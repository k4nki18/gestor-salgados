import { useEffect, useState } from 'react'
import { supabase, getResumoEstoque } from '../lib/supabase'
import { AlertTriangle, SlidersHorizontal, RefreshCw, BellRing } from 'lucide-react'

export default function AbaEstoque() {
  const [itens, setItens] = useState([])
  const [aFazer, setAFazer] = useState([])
  const [diasAlerta, setDiasAlerta] = useState(3)
  const [resumoDia, setResumoDia] = useState({ pedidos: 0, salgados: 0, aReceber: 0 })
  const [carregando, setCarregando] = useState(true)

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const dadosEstoque = await getResumoEstoque()
      setItens(dadosEstoque || [])

      const { data: listaAFazer } = await supabase.from('vw_producao_a_fazer').select('*')
      setAFazer(listaAFazer || [])

      const hojeInicio = new Date()
      hojeInicio.setHours(0, 0, 0, 0)
      const hojeFim = new Date()
      hojeFim.setHours(23, 59, 59, 999)

      const { data: encomendasHoje } = await supabase
        .from('encomendas')
        .select('valor_total, status_pagamento, encomenda_itens(quantidade)')
        .eq('status', 'confirmada')
        .gte('data_entrega', hojeInicio.toISOString())
        .lte('data_entrega', hojeFim.toISOString())

      if (encomendasHoje) {
        const pedidos = encomendasHoje.length
        const salgados = encomendasHoje.reduce(
          (acc, enc) => acc + enc.encomenda_itens.reduce((s, i) => s + i.quantidade, 0),
          0
        )
        const aReceber = encomendasHoje
          .filter((e) => e.status_pagamento !== 'pago')
          .reduce((acc, e) => acc + Number(e.valor_total), 0)

        setResumoDia({ pedidos, salgados, aReceber })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const ajustarManual = async (sabor) => {
    const entrada = prompt(
      `Ajuste manual para ${sabor.tipo} - ${sabor.nome} (Atual: ${sabor.estoque_atual}).\nNegativo para baixa (-5) ou positivo para entrada (10):`
    )
    if (!entrada) return
    const delta = parseInt(entrada, 10)
    if (isNaN(delta) || delta === 0) return

    const novoSaldo = sabor.estoque_atual + delta
    if (novoSaldo < 0) {
      alert('O estoque não pode ficar negativo.')
      return
    }

    const motivo = prompt('Motivo do ajuste:') || 'Ajuste manual'

    const { error } = await supabase
      .from('sabores')
      .update({ estoque_atual: novoSaldo })
      .eq('id', sabor.id)

    if (!error) {
      await supabase.from('movimentacoes_estoque').insert({
        sabor_id: sabor.id,
        tipo: 'ajuste_manual',
        quantidade: delta,
        observacao: motivo,
      })
      carregarDados()
    }
  }

  const totalDisponivel = itens.reduce((acc, i) => acc + i.estoque_atual, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <p className="text-[11px] text-slate-500 font-medium">Pronta-Entrega</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{totalDisponivel}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <p className="text-[11px] text-slate-500 font-medium">Entregas Hoje</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">
            {resumoDia.pedidos} <span className="text-xs font-normal text-slate-500">({resumoDia.salgados})</span>
          </p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <p className="text-[11px] text-slate-500 font-medium">A Receber Hoje</p>
          <p className="text-lg font-bold text-emerald-600 mt-0.5">
            R$ {resumoDia.aReceber.toFixed(0)}
          </p>
        </div>
      </div>

      {aFazer.length > 0 && (
        <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-purple-900 font-bold text-sm">
              <BellRing className="w-4 h-4 text-purple-600" />
              <span>A Fazer (Sob Encomenda)</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-purple-800">
              <span>Alertar até</span>
              <select
                value={diasAlerta}
                onChange={(e) => setDiasAlerta(Number(e.target.value))}
                className="bg-white border border-purple-300 rounded px-1.5 py-0.5 font-bold"
              >
                {[1, 2, 3, 5, 7].map((d) => (
                  <option key={d} value={d}>{d}d</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {aFazer.map((item, idx) => {
              const urgente = item.dias_restantes <= diasAlerta
              const dataFmt = new Date(item.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
              })
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border flex justify-between items-center text-xs ${
                    urgente
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-white border-purple-100 text-slate-700'
                  }`}
                >
                  <div>
                    <p className="font-bold">
                      {item.total_a_fazer}x {item.tipo} - {item.sabor_nome}
                    </p>
                    <p className="text-[11px] opacity-80">Pedidos: {item.clientes}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        item.dias_restantes <= 0
                          ? 'bg-red-600 text-white'
                          : urgente
                          ? 'bg-amber-500 text-white'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {item.dias_restantes === 0
                        ? 'HOJE'
                        : item.dias_restantes === 1
                        ? 'Amanhã'
                        : item.dias_restantes < 0
                        ? 'Atrasado'
                        : `Em ${item.dias_restantes}d (${dataFmt})`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-slate-700">Estoque Pronta-Entrega</h2>
        <button onClick={carregarDados} className="text-xs text-amber-700 flex items-center gap-1">
          <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="space-y-2.5">
        {itens.map((item) => {
          const baixo = item.estoque_atual < 20
          return (
            <div
              key={item.id}
              className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {item.tipo} - {item.nome}
                  </span>
                  {baixo && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                      <AlertTriangle className="w-3 h-3" /> Baixo
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reservado (estoque): <strong>{item.qtd_reservada_encomendas}</strong> • Média dia:{' '}
                  <strong>{item.media_vendas_hoje}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span
                    className={`text-lg font-bold ${
                      item.estoque_atual === 0
                        ? 'text-red-600'
                        : baixo
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {item.estoque_atual}
                  </span>
                  <span className="block text-[10px] text-slate-400">livres</span>
                </div>

                <button
                  onClick={() => ajustarManual(item)}
                  className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}