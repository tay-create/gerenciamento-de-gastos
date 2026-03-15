import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  if (!supabase) {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center text-white p-6">
        <div className="bg-dark-800 border border-neon-pink p-8 rounded-3xl max-w-lg text-center shadow-neon-pink">
          <h1 className="text-2xl font-bold text-neon-pink mb-4">Erro de Configuração</h1>
          <p className="text-dark-300 mb-6">
            As chaves do Supabase não foram encontradas. Verifique as variáveis de ambiente (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).
          </p>
          <div className="bg-dark-900 p-4 rounded-xl text-xs text-left font-mono text-dark-400">
            Dica: No Vercel, acesse Settings &gt; Environment Variables e adicione as chaves com o prefixo VITE_.
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Busca a sessão inicial caso o usuário já esteja logado no navegador
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuta mudanças de estado (Login, Logout, Expiração)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center text-neon-cyan">
        <p className="animate-pulse">Carregando Neon Finance...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!session ? <Login /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/" 
          element={session ? <Dashboard session={session} /> : <Navigate to="/login" replace />} 
        />
        {/* Captura de rotas perdidas */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
