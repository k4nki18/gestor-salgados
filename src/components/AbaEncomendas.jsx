import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Check, X, Copy, DollarSign, Truck, Trash2 } from 'lucide-react'

export default function AbaEncomendas() {
  const [encomendas, setEncomendas] = useState([])
  const [sabores, setSabores] = useState([])
  const [filtro, setFiltro] = useState('confirmada')
  const [modalAberto, setModalAberto] = useState(false)

  // Dados do cliente/pedido
  const [clienteNome, setClienteNome] = useState('')
  const [clienteTelefone, setClienteTelefone] = useState('')
  const [dataDia, setDataDia] = useState('')
  const [horaEntrega, setHoraEntrega] = useState('18:00')
  const [valorPagoInicial, setValorPagoInicial] = useState('')
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Estados do seletor de item atual
  const [tipoSelecionado, setTipoSelecionado] = useState('')
  const [saborIdSelecionado, setSaborIdSelecionado] = useState('')
  const [qtdSelecionada, setQtdSelecionada] = useState('')
  const [usarEstoqueSelecionado, setUsarEstoqueSelecionado] = useState(true)

  // Carrinho de itens adicionados ao pedido
  const [itensCarrinho, setItensCarrinho] = useState([])

  const carregar = async () => {
    let query = supabase
      .from('encomendas')
      .select('*, encomenda_itens(quantidade, preco_unitario, usar_estoque, sabores(tipo, nome))')
      .order('data_entrega', { ascending: true })

    if (filtro === 'pendentes_pgto') {
      query = query.neq('status', 'cancelada').neq('status_pagamento', 'pago')
    } else {
      query = query.eq('status', filtro)
    }

    const { data } = await query
    setEncomendas(data || [])
  }

  const carregarSabores = async () => {
    const { data } = await supabase
      .from('sabores')
      .select('id, tipo, nome, preco_unitario, estoque_atual, controla_estoque')
      .eq('ativo', true)
      .order('tipo')
      .order('nome')

    const lista = data || []
    setSabores(lista)

    if (lista.length > 0) {
      const primeiroTipo = lista[0].tipo
      const primeiroSabor = lista.find((s) => s.tipo === primeiroTipo)
      setTipoSelecionado(primeiroTipo)
      setSaborIdSelecionado(primeiroSabor.id)
      setUsarEstoqueSelecionado(primeiroSabor.controla_estoque)
    }
  }

  useEffect(() => {
    carregar()
  }, [filtro])

  const tiposDisponiveis = [...new Set(sabores.map((s) => s.tipo))]
  const saboresDoTipo = sabores.filter((s) => s.tipo === tipoSelecionado)
  const saborAtual = sabores.find((s) => s.id === saborIdSelecionado)

  const handleTrocarTipo = (novoTipo) => {
    setTipoSelecionado(novoTipo)
    const primeiro = sabores.find((s) => s.tipo === novoTipo)
    if (primeiro) {
      setSaborIdSelecionado(primeiro.id)
      setUsarEstoqueSelecionado(primeiro.controla_estoque)
    }
  }

  const handleTrocarSabor = (novoId) => {
    setSaborIdSelecionado(novoId)
    const encontrado = sabores.find((s) => s.id === novoId)
    if (encontrado) {
      setUsarEstoqueSelecionado(encontrado.controla_estoque)
    }
  }

  const abrirModal = () => {
    carregarSabores()
    setItensCarrinho([])
    setQtdSelecionada('')
    setClienteNome('')
    setClienteTelefone('')
    setObs('')
    setValorPagoInicial('')
    setDataDia(new Date().toISOString().split('T')[0])
    setHoraEntrega('18:00')
    setModalAberto(true)
  }

  const adicionarAoCarrinho = () => {
    const qtd = Number(qtdSelecionada)
    if (!saborAtual || qtd <= 0) {
      alert('Informe uma quantidade válida.')
      return
    }

    const jaExisteIndex = itensCarrinho.findIndex(
      (i) => i.sabor_id === saborAtual.id && i.usar_estoque === usarEstoqueSelecionado
    )

    const qtdJaNoCarrinho = jaExisteIndex >= 0 ? itensCarrinho[jaExisteIndex].quantidade : 0
    const qtdTotalItem = qtdJaNoCarrinho + qtd

    if (usarEstoqueSelecionado && qtdTotalItem > saborAtual.estoque_atual) {
      alert(
        `Estoque insuficiente para ${saborAtual.tipo} - ${saborAtual.nome}. Disponível: ${saborAtual.estoque_atual}.`
      )
      return
    }

    if (jaExisteIndex >= 0) {
      const copia = [...itensCarrinho]
      copia[jaExisteIndex].quantidade = qtdTotalItem
      setItensCarrinho(copia)
    } else {
      setItensCarrinho((prev) => [
        ...prev,
        {
          sabor_id: saborAtual.id,
          tipo: saborAtual.tipo,
          nome: saborAtual.nome,
          preco_unitario: Number(saborAtual.preco_unitario),
          quantidade: qtd,
          usar_estoque: usarEstoqueSelecionado,
        },
      ])
    }

    setQtdSelecionada('')
  }

  const removerDoCarrinho = (index) => {
    setItensCarrinho((prev) => prev.filter((_, idx) => idx !== index))
  }

  const salvarEncomenda = async (e) => {
    e.preventDefault()
    if (itensCarrinho.length === 0) {
      alert('Adicione pelo menos um item ao pedido.')
      return
    }

    const itensPayload = itensCarrinho.map((i) => ({
      sabor_id: i.sabor_id,
      quantidade: i.quantidade,
      usar_estoque: i.usar_estoque,
    }))

    const dataHoraCombinada = new Date(`${dataDia}T${horaEntrega}:00`).toISOString()

    try {
      setSalvando(true)
      const { error } = await supabase.rpc('criar_encomenda', {
        p_cliente_nome: clienteNome,
        p_cliente_telefone: clienteTelefone,
        p_data_entrega: dataHoraCombinada,
        p_status_pagamento: 'pendente',
        p_obs: obs,
        p_itens: itensPayload,
        p_valor_pago: Number(valorPagoInicial) || 0,
      })

      if (error) throw error

      setModalAberto(false)
      carregar()
    } catch (err) {
      alert(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const registrarPagamento = async (enc) => {
    const total = Number(enc.valor_total)
    const jaPago = Number(enc.valor_pago || 0)
    const restante = Math.max(0, total - jaPago)

    const entrada = prompt(
      `Total do pedido: R$ ${total.toFixed(2)}\nJá pago: R$ ${jaPago.toFixed(2)}\nFalta receber: R$ ${restante.toFixed(2)}\n\nDigite o valor pago agora:`,
      restante.toFixed(2)
    )
    if (!entrada) return

    const valorAdicional = parseFloat(entrada.replace(',', '.'))
    if (isNaN(valorAdicional) || valorAdicional <= 0) {
      alert('Valor inválido.')
      return
    }

    const novoPago = Math.min(total, jaPago + valorAdicional)
    const novoStatus = novoPago >= total ? 'pago' : 'sinal_pago'

    const { error } = await supabase
      .from('encomendas')
      .update({ valor_pago: novoPago, status_pagamento: novoStatus })
      .eq('id', enc.id)

    if (error) alert(error.message)
    else carregar()
  }

  const confirmarEntrega = async (enc) => {
    const total = Number(enc.valor_total)
    const pago = Number(enc.valor_pago || 0)
    const falta = Math.max(0, total - pago)

    if (falta > 0) {
      const quitarAgora = window.confirm(
        `⚠️ Atenção: Ainda falta receber R$ ${falta.toFixed(2)} de ${enc.cliente_nome}.\n\n` +
        `• Clique em OK para QUITAR os R$ ${falta.toFixed(2)} e marcar como ENTREGUE.\n` +
        `• Clique em CANCELAR se não quiser concluir a entrega agora.`
      )
      if (!quitarAgora) return

      const { error } = await supabase
        .from('encomendas')
        .update({
          status: 'entregue',
          valor_pago: total,
          status_pagamento: 'pago',
        })
        .eq('id', enc.id)

      if (error) alert(error.message)
      else carregar()
      return
    }

    if (!window.confirm(`Confirmar entrega do pedido de ${enc.cliente_nome}?`)) return

    const { error } = await supabase
      .from('encomendas')
      .update({ status: 'entregue' })
      .eq('id', enc.id)

    if (error) alert(error.message)
    else carregar()
  }

  const atualizarStatus = async (id, campo, valor, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    const { error } = await supabase.from('encomendas').update({ [campo]: valor }).eq('id', id)
    if (error) alert(error.message)
    else carregar()
  }

  const copiarWhatsApp = (enc) => {
    const total = Number(enc.valor_total)
    const pago = Number(enc.valor_pago || 0)
    const falta = Math.max(0, total - pago)

    const lista = enc.encomenda_itens
      .map(
        (i) =>
          `• ${i.quantidade}x ${i.sabores?.tipo} (${i.sabores?.nome}) - R$ ${(
            i.quantidade * i.preco_unitario
          ).toFixed(2)}`
      )
      .join('\n')

    const dataFmt = new Date(enc.data_entrega).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

    const resumoPgto =
      falta === 0
        ? `✅ *QUITADO (R$ ${total.toFixed(2)})*`
        : `💰 *Total: R$ ${total.toFixed(2)}*\n✔️ Pago: R$ ${pago.toFixed(2)}\n⏳ *Falta na entrega: R$ ${falta.toFixed(2)}*`

    const texto = `*Resumo do Pedido - ${enc.cliente_nome}*\nEntrega: ${dataFmt}\n\n${lista}\n\n${resumoPgto}`

    navigator.clipboard.writeText(texto)
    alert('Resumo copiado para colar no WhatsApp!')
  }

  const totalCarrinho = itensCarrinho.reduce((acc, i) => acc + i.quantidade * i.preco_unitario, 0)
  const totalSalgadosCarrinho = itensCarrinho.reduce((acc, i) => acc + i.quantidade, 0)
  const faltaNoModal = Math.max(0, totalCarrinho - (Number(valorPagoInicial) || 0))

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'confirmada', label: 'Ativas' },
          { id: 'pendentes_pgto', label: 'A Receber' },
          { id: 'entregue', label: 'Entregues' },
          { id: 'cancelada', label: 'Canceladas' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFiltro(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
              filtro === tab.id
                ? 'bg-amber-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lista de Encomendas */}
      <div className="space-y-3">
        {encomendas.map((enc) => {
          const total = Number(enc.valor_total)
          const pago = Number(enc.valor_pago || 0)
          const falta = Math.max(0, total - pago)

          return (
            <div key={enc.id} className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm">{enc.cliente_nome}</h3>
                  <p className="text-xs text-slate-500">
                    Entrega:{' '}
                    {new Date(enc.data_entrega).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-slate-900">
                    Total: R$ {total.toFixed(2)}
                  </span>
                  {falta === 0 ? (
                    <span className="block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mt-0.5 bg-emerald-50 text-emerald-700">
                      Pago Integral
                    </span>
                  ) : (
                    <div className="text-[11px] mt-0.5 space-x-1.5">
                      <span className="text-emerald-700 font-medium">Pago: R$ {pago.toFixed(2)}</span>
                      <span className="text-red-600 font-bold">Falta: R$ {falta.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg space-y-1.5">
                {enc.encomenda_itens.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span>
                        <strong>{item.quantidade}x</strong> {item.sabores?.tipo} - {item.sabores?.nome}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          item.usar_estoque
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {item.usar_estoque ? 'Estoque' : 'A Fazer'}
                      </span>
                    </div>
                    <span className="text-slate-500">
                      R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                    </span>
                  </div>
                ))}
                {enc.observacao && <p className="text-slate-500 italic pt-1">Obs: {enc.observacao}</p>}
              </div>

              {enc.status === 'confirmada' && (
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {falta > 0 && (
                    <button
                      onClick={() => registrarPagamento(enc)}
                      className="flex items-center justify-center gap-1 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> + Pgto
                    </button>
                  )}
                  <button
                    onClick={() => confirmarEntrega(enc)}
                    className="flex items-center justify-center gap-1 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg border border-blue-200"
                  >
                    <Truck className="w-3.5 h-3.5" /> Entregue
                  </button>
                  <button
                    onClick={() => copiarWhatsApp(enc)}
                    className="flex items-center justify-center gap-1 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg"
                  >
                    <Copy className="w-3.5 h-3.5" /> Zap
                  </button>
                  <button
                    onClick={() =>
                      atualizarStatus(
                        enc.id,
                        'status',
                        'cancelada',
                        'Cancelar encomenda? Itens retirados do estoque voltarão automaticamente.'
                      )
                    }
                    className="flex items-center justify-center gap-1 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Botão Flutuante */}
      <button
        onClick={abrirModal}
        className="fixed bottom-20 right-4 bg-amber-600 text-white p-4 rounded-full shadow-lg flex items-center gap-2 font-semibold text-sm"
      >
        <Plus className="w-5 h-5" /> Nova Encomenda
      </button>

      {/* Modal Nova Encomenda */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 z-30 flex items-end sm:items-center justify-center">
          <form
            onSubmit={salvarEncomenda}
            className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-4 max-h-[92vh] overflow-y-auto space-y-3"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-base">Nova Encomenda</h3>
              <button type="button" onClick={() => setModalAberto(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* 1. Cliente e Entrega */}
            <input
              required
              placeholder="Nome do Cliente"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Data de Entrega</label>
                <input
                  required
                  type="date"
                  value={dataDia}
                  onChange={(e) => setDataDia(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white"
                />
                <div className="flex gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => setDataDia(new Date().toISOString().split('T')[0])}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const amanha = new Date()
                      amanha.setDate(amanha.getDate() + 1)
                      setDataDia(amanha.toISOString().split('T')[0])
                    }}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Amanhã
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Horário</label>
                <input
                  required
                  type="time"
                  value={horaEntrega}
                  onChange={(e) => setHoraEntrega(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white"
                />
                <div className="flex gap-1 mt-1">
                  {['12:00', '16:00', '18:00', '20:00'].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHoraEntrega(h)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        horaEntrega === h
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <input
              placeholder="Observação (opcional)"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />

            {/* 2. Seletor Compacto de Item */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
              <p className="text-xs font-bold text-slate-700">Adicionar Item ao Pedido</p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Tipo</label>
                  <select
                    value={tipoSelecionado}
                    onChange={(e) => handleTrocarTipo(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white"
                  >
                    {tiposDisponiveis.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Sabor</label>
                  <select
                    value={saborIdSelecionado}
                    onChange={(e) => handleTrocarSabor(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white"
                  >
                    {saboresDoTipo.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} (R$ {Number(s.preco_unitario).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] text-slate-500 mb-0.5">Origem</label>
                  {saborAtual?.controla_estoque ? (
                    <select
                      value={usarEstoqueSelecionado ? 'estoque' : 'afazer'}
                      onChange={(e) => setUsarEstoqueSelecionado(e.target.value === 'estoque')}
                      className={`w-full border rounded-lg px-2.5 py-2 text-xs font-semibold ${
                        usarEstoqueSelecionado
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-purple-50 text-purple-800 border-purple-300'
                      }`}
                    >
                      <option value="estoque">Do Estoque (Disp: {saborAtual.estoque_atual})</option>
                      <option value="afazer">A Fazer (Não mexe estoque)</option>
                    </select>
                  ) : (
                    <div className="w-full border border-purple-200 bg-purple-50 text-purple-800 rounded-lg px-2.5 py-2 text-xs font-semibold">
                      Sob Encomenda (A Fazer)
                    </div>
                  )}
                </div>

                <div className="w-20">
                  <label className="block text-[11px] text-slate-500 mb-0.5">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={qtdSelecionada}
                    onChange={(e) => setQtdSelecionada(e.target.value)}
                    className="w-full text-center font-bold border border-slate-300 rounded-lg py-1.5 text-sm bg-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={adicionarAoCarrinho}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 h-[38px]"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>

            {/* 3. Lista de Itens Adicionados */}
            {itensCarrinho.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                  <span>
                    Itens do Pedido ({totalSalgadosCarrinho} salgados)
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                  {itensCarrinho.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {item.quantidade}x {item.tipo} - {item.nome}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              item.usar_estoque
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {item.usar_estoque ? 'Do Estoque' : 'A Fazer'}
                          </span>
                          <span className="text-slate-500">
                            Subtotal: R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removerDoCarrinho(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Resumo Final + Sinal / Pagamento no Final */}
            {itensCarrinho.length > 0 && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-2.5">
                <div className="flex justify-between items-center border-b border-amber-200/70 pb-2">
                  <span className="text-xs font-bold text-amber-950 uppercase">Valor Total do Pedido</span>
                  <span className="text-lg font-extrabold text-amber-900">
                    R$ {totalCarrinho.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Sinal / Valor Pago Agora (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalCarrinho}
                      placeholder="0.00"
                      value={valorPagoInicial}
                      onChange={(e) => setValorPagoInicial(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1 pt-4">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setValorPagoInicial((totalCarrinho / 2).toFixed(2))}
                        className="text-[10px] font-bold px-2 py-1.5 rounded bg-white border border-amber-300 text-amber-800 hover:bg-amber-100"
                      >
                        50% (R$ {(totalCarrinho / 2).toFixed(0)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setValorPagoInicial(totalCarrinho.toFixed(2))}
                        className="text-[10px] font-bold px-2 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Quitar Total
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-0.5">
                  <span className="text-slate-600">Restante a pagar na entrega:</span>
                  <span
                    className={`font-bold ${
                      faltaNoModal === 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {faltaNoModal === 0 ? 'Quitado (R$ 0,00)' : `R$ ${faltaNoModal.toFixed(2)}`}
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={salvando || itensCarrinho.length === 0}
              className="w-full bg-amber-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
              {salvando ? 'Salvando...' : `Confirmar Encomenda (R$ ${totalCarrinho.toFixed(2)})`}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}