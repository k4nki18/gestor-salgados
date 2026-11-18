import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getResumoEstoque() {
  const { data, error } = await supabase
    .from('vw_resumo_estoque_demanda')
    .select('*')
  if (error) throw error
  return data
}

export async function registrarProducao(dataProducao, observacao, itens) {
  const { data, error } = await supabase.rpc('registrar_producao', {
    p_data: dataProducao,
    p_obs: observacao,
    p_itens: itens,
  })
  if (error) throw error
  return data
}

export async function criarEncomenda({ clienteNome, telefone, dataEntrega, statusPagamento, obs, itens }) {
  const { data, error } = await supabase.rpc('criar_encomenda', {
    p_cliente_nome: clienteNome,
    p_cliente_telefone: telefone,
    p_data_entrega: dataEntrega,
    p_status_pagamento: statusPagamento,
    p_obs: obs,
    p_itens: itens,
  })
  if (error) throw error
  return data
}