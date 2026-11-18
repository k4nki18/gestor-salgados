# 🥟 Salgadin — Gestão de Produção, Estoque e Encomendas

Aplicação web **PWA (Progressive Web App)** desenvolvida para controle operacional de produção artesanal, estoque pronta-entrega e gestão de encomendas de salgados.

---

## Problema Resolvido

Na operação diária de produção e venda de salgados, existem dois fluxos distintos que costumam gerar conflitos em planilhas comuns:
1. **Pronta-Entrega (Estoque):** Itens mantidos congelados/prontos (ex: coxinhas, risoles, bolinhas) cujo saldo precisa ser abatido imediatamente ao confirmar uma venda ou encomenda do estoque atual.
2. **Produção Sob Encomenda ("A Fazer"):** Itens feitos apenas por pedido (ex: empadas, pastéis, canudinhos) ou lotes grandes agendados para datas futuras que **não devem consumir** o estoque de pronta-entrega do dia, gerando alertas antecipados de produção.

O **Salgadin** separa esses dois fluxos em uma interface rápida otimizada para uso no celular, tablet ou computador.

---

## Funcionalidades Principais

* **Painel de Estoque & Alertas ("A Fazer"):**
  * Resumo em tempo real de saldo disponível, entregas do dia e valores a receber hoje.
  * Bloco de produção futura agrupado por data de entrega com alerta configurável de antecedência.
  * Cálculo de média histórica de vendas por dia da semana e ajuste manual auditado.
* **Gestão de Encomendas:**
  * Carrinho dinâmico por **Tipo - Sabor**, permitindo escolher item a item se sai **Do Estoque** ou entra como **A Fazer**.
  * Controle de pagamentos parciais (sinal, parcelas intermediárias e quitação na entrega) com cálculo automático de saldo restante.
  * Geração de resumo formatado para envio rápido via **WhatsApp**.
  * Cancelamento com estorno automático de estoque apenas para os itens que haviam sido debitados.
* **Lançamento de Produção:**
  * Atalhos rápidos (`+10`, `+50`, `+100`) para registro ágil de lotes produzidos e histórico cronológico de fornadas.
* **Segurança & PWA:**
  * Instalável na tela inicial do Android/iOS em modo *standalone* (tela cheia).
  * Autenticação restrita e proteção de dados via **Row Level Security (RLS)** no Supabase.

---

## Stack Tecnológica

* **Frontend:** React, Vite, Tailwind CSS, Lucide Icons, `vite-plugin-pwa`
* **Backend & Banco de Dados:** Supabase (PostgreSQL, Auth, RLS)
* **Hospedagem:** ???

---

## Arquitetura do Banco de Dados

Para garantir integridade financeira e evitar condições de corrida (*race conditions*) na baixa de estoque, a lógica crítica foi implementada diretamente no PostgreSQL:

* **Tabelas:** `sabores`, `producoes`, `producao_itens`, `encomendas`, `encomenda_itens` e `movimentacoes_estoque` (auditoria completa de entradas, saídas, ajustes e estornos).
* **RPCs Atômicas (`PL/pgSQL`):** Funções `registrar_producao` e `criar_encomenda` utilizando travas de linha (`FOR UPDATE`) para validar saldo e movimentar estoque em transação única.
* **Triggers:** `fn_estornar_encomenda_cancelada` para devolução automática de saldo ao cancelar pedidos ativos.
* **Views:** `vw_resumo_estoque_demanda` e `vw_producao_a_fazer` para consultas consolidadas de demanda e alertas.

---