import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Lock, User, LogIn } from 'lucide-react'

export default function TelaLogin() {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const emailFormatado = usuario.includes('@')
      ? usuario.trim().toLowerCase()
      : `${usuario.trim().toLowerCase()}@salgados.local`

    const { error } = await supabase.auth.signInWithPassword({
      email: emailFormatado,
      password: senha,
    })

    if (error) {
      setErro('Usuário ou senha inválidos.')
    }
    setCarregando(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form
        onSubmit={handleLogin}
        className="bg-white w-full max-w-sm p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
      >
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Salgadin</h1>
          <p className="text-xs text-slate-500">Controle de produção, estoque e encomendas</p>
          <p className="text-xs text-slate-500">Acesso restrito ao painel de controle</p>
        </div>

        {erro && (
          <div className="bg-red-50 text-red-600 text-xs font-medium p-2.5 rounded-lg border border-red-200 text-center">
            {erro}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Usuário</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                required
                type="text"
                autoCapitalize="none"
                placeholder="Digite seu usuário"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                required
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          <LogIn className="w-4 h-4" />
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}