import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Wallet, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMSG, setErrorMSG] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMSG('');

    try {
      if (isLogin) {
        // Lógica de Entrar
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        // Lógica de Criar Conta
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // Mensagem customizada se a criação for bem-sucedida, mas exigir confirmação de e-mail 
        // (embora por padrão o Supabase possa auto-confirmar ou não dependendo do projeto)
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

  return (
    <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center p-6 font-sans selection:bg-neon-cyan selection:text-dark-900">
      <div className="w-full max-w-md bg-dark-800 rounded-3xl p-8 md:p-10 border border-dark-700 shadow-[0_0_20px_rgba(0,243,255,0.1)] relative overflow-hidden">
        
        {/* Brilho no topo do card */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-pink via-neon-cyan to-neon-purple shadow-[0_0_15px_rgba(0,243,255,0.6)]"></div>

        {/* Cabeçalho de Login */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-2xl bg-dark-900 border border-dark-700 shadow-[0_0_15px_rgba(0,243,255,0.3)] mb-4 shrink-0 transition-all hover:scale-105 hover:shadow-neon-cyan cursor-default">
            <Wallet className="w-10 h-10 text-neon-cyan" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Neon Finance
          </h1>
          <p className="text-dark-400 text-center">
            {isLogin 
              ? 'Bem-vindo de volta! Acesse sua carteira.' 
              : 'Comece a dominar suas finanças hoje.'}
          </p>
        </div>

        {/* Error/Success Alert Box */}
        {errorMSG && (
          <div className={`p-4 mb-6 rounded-xl border ${errorMSG.includes('sucesso') ? 'bg-dark-900/50 border-neon-green/50 text-neon-green shadow-[0_0_10px_rgba(57,255,20,0.1)]' : 'bg-dark-900/50 border-neon-pink/50 text-neon-pink shadow-[0_0_10px_rgba(255,0,255,0.1)]'}`}>
            <p className="text-sm font-medium text-center">{errorMSG}</p>
          </div>
        )}

        {/* Formulário de Autenticação */}
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
            disabled={loading}
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

        {/* Toggle Login/Sign Up Mode */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMSG('');
            }}
            className="text-dark-400 font-medium hover:text-white transition-colors"
          >
            {isLogin 
              ? 'Não tem uma conta? Cadastre-se' 
              : 'Já tem uma conta? Faça Login'}
          </button>
        </div>

      </div>
    </div>
  );
}
