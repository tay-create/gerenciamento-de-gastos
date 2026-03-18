import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Wallet, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M47.532 24.552c0-1.636-.143-3.2-.41-4.704H24.48v8.898h12.984c-.56 3.02-2.26 5.58-4.816 7.296v6.064h7.796c4.56-4.2 7.088-10.38 7.088-17.554z" fill="#4285F4"/>
      <path d="M24.48 48c6.52 0 11.988-2.164 15.984-5.864l-7.796-6.064c-2.16 1.448-4.92 2.308-8.188 2.308-6.3 0-11.636-4.252-13.548-9.972H2.86v6.252C6.836 42.892 15.076 48 24.48 48z" fill="#34A853"/>
      <path d="M10.932 28.408A14.46 14.46 0 0 1 9.88 24c0-1.528.264-3.012.732-4.408v-6.252H2.86A23.96 23.96 0 0 0 .48 24c0 3.876.928 7.54 2.38 10.66l8.072-6.252z" fill="#FBBC05"/>
      <path d="M24.48 9.62c3.552 0 6.74 1.22 9.252 3.62l6.936-6.936C36.46 2.38 30.996 0 24.48 0 15.076 0 6.836 5.108 2.86 13.34l8.072 6.252C12.844 13.872 18.18 9.62 24.48 9.62z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errorMSG, setErrorMSG] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMSG('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setErrorMSG('Conta criada com sucesso! Você pode precisar confirmar seu e-mail.');
      }
    } catch (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErrorMSG('E-mail ou senha incorretos.');
      } else if (error.message.includes('Password should be at least')) {
        setErrorMSG('A senha deve ter pelo menos 6 caracteres.');
      } else if (error.message.includes('User already registered')) {
        setErrorMSG('Este e-mail já está cadastrado.');
      } else {
        setErrorMSG(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setErrorMSG('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setErrorMSG('Erro ao conectar com o Google. Tente novamente.');
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center p-6 font-sans selection:bg-neon-cyan selection:text-dark-900">
      <div className="w-full max-w-md bg-dark-800 rounded-3xl p-8 md:p-10 border border-dark-700 shadow-[0_0_20px_rgba(0,243,255,0.1)] relative overflow-hidden">

        {/* Brilho no topo */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-pink via-neon-cyan to-neon-purple shadow-[0_0_15px_rgba(0,243,255,0.6)]"></div>

        {/* Cabeçalho */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-2xl bg-dark-900 border border-dark-700 shadow-[0_0_15px_rgba(0,243,255,0.3)] mb-4 shrink-0 transition-all hover:scale-105 hover:shadow-neon-cyan cursor-default">
            <Wallet className="w-10 h-10 text-neon-cyan" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Neon Finance</h1>
          <p className="text-dark-400 text-center">
            {isLogin ? 'Bem-vindo de volta! Acesse sua carteira.' : 'Comece a dominar suas finanças hoje.'}
          </p>
        </div>

        {/* Alerta de erro/sucesso */}
        {errorMSG && (
          <div className={`p-4 mb-6 rounded-xl border ${errorMSG.includes('sucesso') ? 'bg-dark-900/50 border-neon-green/50 text-neon-green shadow-[0_0_10px_rgba(57,255,20,0.1)]' : 'bg-dark-900/50 border-neon-pink/50 text-neon-pink shadow-[0_0_10px_rgba(255,0,255,0.1)]'}`}>
            <p className="text-sm font-medium text-center">{errorMSG}</p>
          </div>
        )}

        {/* Botão Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loadingGoogle || loading}
          className="w-full flex items-center justify-center gap-3 bg-dark-900 hover:bg-dark-700 border border-dark-600 hover:border-dark-500 text-white font-semibold rounded-2xl p-4 text-base transition-all mb-6 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {loadingGoogle ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
          Entrar com Google
        </button>

        {/* Divisor */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-dark-700" />
          <span className="text-dark-500 text-sm">ou</span>
          <div className="flex-1 h-px bg-dark-700" />
        </div>

        {/* Formulário e-mail/senha */}
        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Mail className="w-5 h-5 text-dark-400" />
              </div>
              <input
                type="email"
                required
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 text-white rounded-2xl pl-12 pr-4 py-4 text-lg focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_10px_rgba(0,243,255,0.2)] transition-all placeholder:text-dark-500"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Lock className="w-5 h-5 text-dark-400" />
              </div>
              <input
                type="password"
                required
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 text-white rounded-2xl pl-12 pr-4 py-4 text-lg focus:outline-none focus:border-neon-pink focus:shadow-[0_0_10px_rgba(255,0,255,0.2)] transition-all placeholder:text-dark-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || loadingGoogle}
            className="w-full bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white font-bold rounded-2xl p-5 text-lg transition-all flex items-center justify-center gap-3 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
            ) : (
              <>
                {isLogin ? 'Entrar na Conta' : 'Criar Conta Agora'}
                <ArrowRight className="w-5 h-5 text-dark-400 group-hover:text-neon-cyan transition-colors" />
              </>
            )}
          </button>
        </form>

        {/* Alternar cadastro/login */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setErrorMSG(''); }}
            className="text-dark-400 font-medium hover:text-white transition-colors"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça seu acesso'}
          </button>
        </div>

      </div>
    </div>
  );
}
