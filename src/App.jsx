import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Package, ShoppingBag, ChefHat, History, LogOut } from 'lucide-react'
import AbaEstoque from './components/AbaEstoque'
import AbaEncomendas from './components/AbaEncomendas'
import AbaProducao from './components/AbaProducao'
import AbaSabores from './components/AbaSabores'
import TelaLogin from './components/TelaLogin'

export default function App() {
  const [sessao, setSessao] = useState(null)
  const [verificandoSessao, setVerificandoSessao] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState('estoque')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session)
      setVerificandoSessao(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (verificandoSessao) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        Carregando...
      </div>
    )
  }

  if (!sessao) {
    return <TelaLogin />
  }

  const abas = [
    { id: 'estoque', label: 'Estoque', icon: Package },
    { id: 'encomendas', label: 'Encomendas', icon: ShoppingBag },
    { id: 'producao', label: 'Produção', icon: ChefHat },
    { id: 'auditoria', label: 'Sabores', icon: History },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="bg-amber-600 text-white px-4 py-3.5 shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">Salgadin</h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-amber-100 hover:text-white p-1.5 rounded-lg flex items-center gap-1 text-xs font-medium"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {abaAtiva === 'estoque' && <AbaEstoque />}
        {abaAtiva === 'encomendas' && <AbaEncomendas />}
        {abaAtiva === 'producao' && <AbaProducao />}
        {abaAtiva === 'auditoria' && <AbaSabores />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-20">
        <div className="max-w-lg mx-auto grid grid-cols-4">
          {abas.map((aba) => {
            const Icon = aba.icon
            const ativo = abaAtiva === aba.id
            return (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`flex flex-col items-center justify-center py-2.5 text-xs font-medium transition-colors ${
                  ativo ? 'text-amber-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${ativo ? 'stroke-[2.5]' : ''}`} />
                {aba.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}