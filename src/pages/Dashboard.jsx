import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, Coffee, Car, Home, DollarSign, Activity, PieChart as PieChartIcon, LogOut, ChevronLeft, ChevronRight, Camera, Zap, Droplets, Wifi, Fuel, Gamepad2, CreditCard, X, Settings, Mic, MicOff, Bot, BarChart2, GraduationCap, Repeat } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { supabase } from '../lib/supabase';
import { addMonths, format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';

/* ─── Categorias ─── */
const CATEGORIES = {
  Alimentacao: { label: 'Alimentação',      color: '#ff00ff', icon: Coffee    },
  Transporte:  { label: 'Transporte',       color: '#00f3ff', icon: Car       },
  Moradia:     { label: 'Moradia',          color: '#bc13fe', icon: Home      },
  Energia:     { label: 'Conta de Energia', color: '#facc15', icon: Zap       },
  Agua:        { label: 'Conta de Água',    color: '#38bdf8', icon: Droplets  },
  Internet:    { label: 'Internet',         color: '#a78bfa', icon: Wifi      },
  Gasolina:    { label: 'Gasolina',         color: '#fb923c', icon: Fuel      },
  Lazer:       { label: 'Lazer',            color: '#f472b6', icon: Gamepad2     },
  Educacao:    { label: 'Educação',         color: '#34d399', icon: GraduationCap},
  Cartoes:     { label: 'Cartões',          color: '#e2e8f0', icon: CreditCard   },
  Entradas:    { label: 'Entradas',         color: '#39ff14', icon: TrendingUp},
  Outros:      { label: 'Outros',           color: '#ff5e00', icon: Activity  },
};

const CARD_FLAGS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard'];
const CARD_BANKS = ['Nubank', 'Itaú', 'Bradesco', 'Santander', 'Caixa', 'Banco do Brasil', 'Inter', 'C6 Bank', 'Outros'];

const inputCls  = "w-full bg-dark-900 border border-dark-700 text-white rounded-2xl p-4 text-lg focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_10px_rgba(0,243,255,0.2)] transition-all placeholder:text-dark-500";
const selectCls = `${inputCls} appearance-none cursor-pointer`;

/* ─── Gemini helper (via serverless /api/gemini) ─── */
async function askGemini(prompt) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error('Erro na API Gemini: ' + res.status);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text || '';
}

export default function Dashboard({ session }) {
  const dashboardRef = useRef(null);

  /* ─── Estados gerais ─── */
  const [transactions, setTransactions] = useState([]);
  const [description, setDescription]   = useState('');
  const [amount, setAmount]             = useState('');
  const [type, setType]                 = useState('expense');
  const [category, setCategory]         = useState('Alimentacao');
  const [installments, setInstallments] = useState(1);
  const [isRecurring, setIsRecurring]   = useState(false);
  const [isExporting, setIsExporting]   = useState(false);
  const [loadingData, setLoadingData]   = useState(true);
  const [currentDate, setCurrentDate]   = useState(new Date());

  /* ─── Estados cartões ─── */
  const [cards, setCards]                     = useState([]);
  const [selectedCard, setSelectedCard]       = useState('');
  const [showCardManager, setShowCardManager] = useState(false);
  const [newCardNickname, setNewCardNickname] = useState('');
  const [newCardBank, setNewCardBank]         = useState('Nubank');
  const [newCardFlag, setNewCardFlag]         = useState('Visa');
  const [savingCard, setSavingCard]           = useState(false);

  /* ─── Estados voz + IA ─── */
  const [isListening, setIsListening]   = useState(false);
  const [voiceText, setVoiceText]       = useState('');
  const [aiAnalysis, setAiAnalysis]     = useState('');
  const [loadingAI, setLoadingAI]       = useState(false);
  const [showAIPanel, setShowAIPanel]   = useState(false);
  const recognitionRef                  = useRef(null);

  /* ─── Aba gráfico ─── */
  const [chartTab, setChartTab] = useState('categories'); // 'categories' | 'cards'

  useEffect(() => { fetchTransactions(); }, [currentDate]);
  useEffect(() => { fetchCards(); }, []);

  /* ─── Fetch ─── */
  const fetchTransactions = async () => {
    setLoadingData(true);
    await ensureRecurringTransactions();
    const start = startOfMonth(currentDate).toISOString();
    const end   = endOfMonth(currentDate).toISOString();
    const { data, error } = await supabase
      .from('transactions').select('*')
      .eq('user_id', session.user.id)
      .gte('date', start).lte('date', end)
      .order('date', { ascending: false });
    if (error) console.error('Erro ao buscar do Supabase:', error);
    else setTransactions(data || []);
    setLoadingData(false);
  };

  /* ─── Recorrência: gera cópias do mês atual se não existirem ─── */
  const ensureRecurringTransactions = async () => {
    // Busca todas as transações "origem" de recorrência deste usuário
    const { data: origins } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_recurring', true)
      .is('recurring_origin_id', null);

    if (!origins?.length) return;

    const monthStart = startOfMonth(currentDate).toISOString();
    const monthEnd   = endOfMonth(currentDate).toISOString();

    // Verifica quais origens já têm entrada neste mês (como origem ou como cópia)
    const originIds = origins.map(o => o.id);
    const { data: existingThisMonth } = await supabase
      .from('transactions')
      .select('id, recurring_origin_id')
      .eq('user_id', session.user.id)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .or(`id.in.(${originIds.join(',')}),recurring_origin_id.in.(${originIds.join(',')})`);

    const coveredIds = new Set([
      ...(existingThisMonth?.filter(t => originIds.includes(t.id)).map(t => t.id) || []),
      ...(existingThisMonth?.filter(t => t.recurring_origin_id).map(t => t.recurring_origin_id) || []),
    ]);

    const toCreate = origins.filter(o => !coveredIds.has(o.id));
    if (!toCreate.length) return;

    await supabase.from('transactions').insert(
      toCreate.map(o => ({
        user_id:            o.user_id,
        description:        o.description,
        amount:             o.amount,
        type:               o.type,
        category:           o.category,
        card_id:            o.card_id,
        is_recurring:       true,
        recurring_origin_id: o.id,
        date:               startOfMonth(currentDate).toISOString(),
      }))
    );
  };

  const fetchCards = async () => {
    const { data, error } = await supabase
      .from('cards').select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });
    if (!error) setCards(data || []);
  };

  const cardsMap = useMemo(() =>
    cards.reduce((acc, c) => { acc[c.id] = c; return acc; }, {}),
  [cards]);

  const getCategorySafeLabel = (cat) => cat === 'Receita' ? 'Entradas' : cat;

  /* ─── Cálculos ─── */
  const summary = useMemo(() =>
    transactions.reduce(
      (acc, curr) => {
        if (curr.type === 'income') { acc.income += curr.amount; acc.total += curr.amount; }
        else                        { acc.expense += curr.amount; acc.total -= curr.amount; }
        return acc;
      },
      { income: 0, expense: 0, total: 0 }
    ),
  [transactions]);

  /* Gráfico por categoria */
  const chartData = useMemo(() => {
    const grouped = transactions.filter(t => t.type === 'expense')
      .reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {});
    return Object.keys(grouped).map(key => {
      const safe = getCategorySafeLabel(key);
      return { name: CATEGORIES[safe]?.label || safe, value: grouped[key], color: CATEGORIES[safe]?.color || '#fff' };
    });
  }, [transactions]);

  /* Gráfico por cartão */
  const cardChartData = useMemo(() => {
    const cardExpenses = transactions.filter(t => t.type === 'expense' && t.card_id);
    const grouped = cardExpenses.reduce((acc, curr) => {
      const card = cardsMap[curr.card_id];
      if (!card) return acc;
      const label = card.nickname;
      acc[label] = (acc[label] || 0) + curr.amount;
      return acc;
    }, {});
    return Object.keys(grouped).map((name, i) => ({
      name,
      value: grouped[name],
      color: ['#e2e8f0', '#00f3ff', '#bc13fe', '#f472b6', '#facc15'][i % 5],
    }));
  }, [transactions, cardsMap]);

  /* ─── Transações ─── */
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!description || !amount) return;
    if (category === 'Cartoes' && !selectedCard) {
      alert('Selecione um cartão antes de continuar.');
      return;
    }
    const totalAmount          = parseFloat(amount);
    const numInstallments      = parseInt(installments, 10) || 1;
    const amountPerInstallment = Math.floor((totalAmount / numInstallments) * 100) / 100;
    const remainder            = parseFloat((totalAmount - amountPerInstallment * numInstallments).toFixed(2));
    const newTransactions      = [];
    for (let i = 0; i < numInstallments; i++) {
      const isLast = i === numInstallments - 1;
      newTransactions.push({
        user_id:     session.user.id,
        description: numInstallments > 1 ? `${description} (${i + 1}/${numInstallments})` : description,
        amount:      isLast ? parseFloat((amountPerInstallment + remainder).toFixed(2)) : amountPerInstallment,
        type,
        category:    type === 'income' ? 'Entradas' : category,
        date:        addMonths(startOfMonth(currentDate), i).toISOString(),
        card_id:     (type === 'expense' && category === 'Cartoes' && selectedCard) ? selectedCard : null,
        is_recurring: isRecurring,
      });
    }
    const { data: inserted, error } = await supabase.from('transactions').insert(newTransactions).select();
    if (error) { alert('Houve um erro ao salvar: ' + error.message); }
    else {
      // Se recorrente e parcela única, marca o primeiro insert como origem
      if (isRecurring && inserted?.length === 1) {
        await supabase.from('transactions')
          .update({ recurring_origin_id: null })
          .eq('id', inserted[0].id);
        // já está null, mas garante que fica como "origem" (recurring_origin_id = null)
      }
      setDescription(''); setAmount(''); setInstallments(1); setSelectedCard(''); setIsRecurring(false);
      fetchTransactions();
    }
  };

  /* ─── Cartões ─── */
  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newCardNickname.trim()) return;
    setSavingCard(true);
    const { error } = await supabase.from('cards').insert({
      user_id: session.user.id, nickname: newCardNickname.trim(),
      bank: newCardBank, flag: newCardFlag, color: '#e2e8f0',
    });
    if (error) { alert('Erro ao salvar cartão: ' + error.message); }
    else { setNewCardNickname(''); setNewCardBank('Nubank'); setNewCardFlag('Visa'); fetchCards(); }
    setSavingCard(false);
  };

  const handleDeleteCard = async (id) => {
    const { error } = await supabase.from('cards').delete().eq('id', id);
    if (!error) setCards(cards.filter(c => c.id !== id));
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) setTransactions(transactions.filter(t => t.id !== id));
  };

  /* Encerra recorrência: desativa a origem e todas as cópias futuras */
  const handleStopRecurring = async (t) => {
    const originId = t.recurring_origin_id ?? t.id;
    await supabase.from('transactions')
      .update({ is_recurring: false })
      .or(`id.eq.${originId},recurring_origin_id.eq.${originId}`);
    fetchTransactions();
  };

  /* ─── Voz ─── */
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.'); return; }
    const rec = new SpeechRecognition();
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    rec.onresult = async (e) => {
      const text = e.results[0][0].transcript;
      setVoiceText(text);
      setIsListening(false);
      await processVoiceWithGemini(text);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend   = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
    setVoiceText('');
  }, [transactions, summary]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  /* ─── Gemini: processar voz → preencher form ─── */
  const processVoiceWithGemini = async (text) => {
    setLoadingAI(true);
    const categorias = Object.entries(CATEGORIES)
      .filter(([k]) => k !== 'Entradas')
      .map(([k, v]) => `${k} = ${v.label}`)
      .join(', ');
    const prompt = `Você é um assistente financeiro. O usuário disse: "${text}"
Extraia as informações e retorne APENAS um JSON válido (sem markdown, sem explicações), com este formato exato:
{"description":"...","amount":0.00,"type":"expense|income","category":"chave_da_categoria","installments":1}

Categorias disponíveis para despesas: ${categorias}
Para receitas use type=income e category=Entradas.
Se não conseguir identificar o valor, use 0.
Se não conseguir identificar parcelas, use 1.`;
    try {
      const raw  = await askGemini(prompt);
      const json = JSON.parse(raw.replace(/```json|```/g, '').trim());
      setDescription(json.description || '');
      setAmount(String(json.amount || ''));
      setType(json.type === 'income' ? 'income' : 'expense');
      setCategory(json.category || 'Outros');
      setInstallments(json.installments || 1);
      setSelectedCard('');
    } catch (err) {
      if (err.message === 'RATE_LIMIT')
        alert('Limite de requisições atingido. Aguarde alguns segundos e tente novamente.');
      else
        alert('Não consegui interpretar o que você disse. Tente de novo com mais detalhes.');
    }
    setLoadingAI(false);
  };

  /* ─── Gemini: análise financeira ─── */
  const handleAIAnalysis = async () => {
    setLoadingAI(true);
    setShowAIPanel(true);
    setAiAnalysis('');
    const mes = format(currentDate, 'MMMM yyyy', { locale: ptBR });
    const resumo = chartData.map(d => `${d.name}: R$ ${d.value.toFixed(2)}`).join(', ');
    const prompt = `Você é um consultor financeiro pessoal simpático e direto. Analise as finanças do mês de ${mes}:
- Saldo: R$ ${summary.total.toFixed(2)}
- Entradas: R$ ${summary.income.toFixed(2)}
- Despesas: R$ ${summary.expense.toFixed(2)}
- Gastos por categoria: ${resumo || 'nenhum gasto registrado'}

Escreva uma análise curta em português (máx 5 parágrafos) com:
1. Avaliação geral do mês
2. Pontos de atenção (onde está gastando mais)
3. 2-3 sugestões práticas de economia
Use linguagem amigável, sem markdown, sem asteriscos.`;
    try {
      const analysis = await askGemini(prompt);
      setAiAnalysis(analysis);
    } catch (err) {
      if (err.message === 'RATE_LIMIT')
        setAiAnalysis('Limite de requisições atingido (15/min no plano gratuito). Aguarde alguns segundos e clique em "Analisar novamente".');
      else
        setAiAnalysis('Erro ao conectar com o Gemini. Verifique sua chave de API nas variáveis de ambiente do Vercel.');
    }
    setLoadingAI(false);
  };

  /* ─── Export + logout ─── */
  const handleExportPNG = async () => {
    setIsExporting(true);
    if (dashboardRef.current) {
      try {
        const canvas  = await html2canvas(dashboardRef.current, { backgroundColor: '#050505', scale: 2 });
        const dataURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL; a.download = `neon-finance-${format(currentDate, 'MM-yyyy')}.png`; a.click();
      } catch { alert('Falha ao exportar a tela'); }
    }
    setIsExporting(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };
  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  /* ══════════════════════════════════════════════ RENDER ══════════════════════════════════════════════ */
  return (
    <div ref={dashboardRef} className="min-h-screen bg-dark-900 text-white p-6 md:p-10 font-sans selection:bg-neon-cyan selection:text-dark-900 export-container">

      {/* ── Modal Cartões ── */}
      {showCardManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" data-html2canvas-ignore="true">
          <div className="bg-dark-800 border border-dark-600 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-neon-cyan" /> Gerenciar Cartões</h3>
              <button onClick={() => setShowCardManager(false)} className="p-2 rounded-xl hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 mb-6 max-h-52 overflow-y-auto pr-1">
              {cards.length === 0
                ? <p className="text-dark-500 text-sm text-center py-4">Nenhum cartão cadastrado ainda.</p>
                : cards.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-dark-900 border border-dark-700 rounded-2xl p-3">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-[#e2e8f0]" />
                      <div><p className="font-semibold text-white text-sm">{c.nickname}</p><p className="text-dark-400 text-xs">{c.bank} · {c.flag}</p></div>
                    </div>
                    <button onClick={() => handleDeleteCard(c.id)} className="p-1.5 text-dark-500 hover:text-neon-pink hover:bg-dark-800 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))
              }
            </div>
            <form onSubmit={handleAddCard} className="space-y-3 border-t border-dark-700 pt-5">
              <p className="text-sm font-bold text-dark-300 mb-1">Novo Cartão</p>
              <input type="text" placeholder="Apelido (ex: Nubank Roxo)" value={newCardNickname} onChange={e => setNewCardNickname(e.target.value)} required className="w-full bg-dark-900 border border-dark-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-neon-cyan transition-all placeholder:text-dark-500" />
              <div className="grid grid-cols-2 gap-3">
                <select value={newCardBank} onChange={e => setNewCardBank(e.target.value)} className="bg-dark-900 border border-dark-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-neon-cyan transition-all appearance-none cursor-pointer">
                  {CARD_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select value={newCardFlag} onChange={e => setNewCardFlag(e.target.value)} className="bg-dark-900 border border-dark-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-neon-cyan transition-all appearance-none cursor-pointer">
                  {CARD_FLAGS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <button type="submit" disabled={savingCard} className="w-full bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white font-bold rounded-xl p-3 text-sm transition-all flex items-center justify-center gap-2 hover:border-neon-cyan hover:shadow-[0_0_10px_rgba(0,243,255,0.15)] disabled:opacity-50">
                <Plus className="w-4 h-4" /> Adicionar Cartão
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal IA ── */}
      {showAIPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" data-html2canvas-ignore="true">
          <div className="bg-dark-800 border border-dark-600 rounded-3xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold flex items-center gap-2"><Bot className="w-5 h-5 text-neon-purple" /> Análise Financeira IA</h3>
              <button onClick={() => setShowAIPanel(false)} className="p-2 rounded-xl hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="min-h-40 text-dark-300 text-sm leading-relaxed">
              {loadingAI
                ? <p className="text-neon-purple animate-pulse text-center py-10">Analisando suas finanças...</p>
                : <p className="whitespace-pre-wrap">{aiAnalysis}</p>
              }
            </div>
            {!loadingAI && (
              <button onClick={handleAIAnalysis} className="mt-5 w-full bg-dark-700 hover:bg-dark-600 border border-neon-purple text-neon-purple font-bold rounded-xl p-3 text-sm transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_10px_rgba(188,19,254,0.2)]">
                <Bot className="w-4 h-4" /> Analisar novamente
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Cabeçalho ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 border-b border-dark-700 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-dark-800 shadow-neon-cyan shrink-0"><Wallet className="w-8 h-8 text-neon-cyan" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">Neon Finance</h1>
            <p className="text-dark-400 text-sm mt-1">{session.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleAIAnalysis} className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-white px-4 py-2 rounded-xl transition-all border border-dark-600 hover:border-neon-purple hover:shadow-[0_0_10px_rgba(188,19,254,0.2)]">
            <Bot className="w-4 h-4 text-neon-purple" /><span className="hidden md:block">Analisar IA</span>
          </button>
          <button onClick={handleExportPNG} disabled={isExporting} className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-white px-4 py-2 rounded-xl transition-all border border-dark-600 hover:border-neon-cyan hover:shadow-[0_0_10px_rgba(0,243,255,0.2)] disabled:opacity-50">
            {isExporting ? <Activity className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-neon-cyan" />}
            <span className="hidden md:block">Salvar Print</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-white px-4 py-2 rounded-xl transition-all border border-dark-600 hover:border-neon-pink hover:text-neon-pink">
            <LogOut className="w-4 h-4" /><span className="hidden md:block">Sair</span>
          </button>
        </div>
      </header>

      {/* ── Navegador de Mês ── */}
      <div className="flex items-center justify-center gap-6 mb-8">
        <button onClick={() => setCurrentDate(addMonths(currentDate, -1))} className="p-3 rounded-full bg-dark-800 hover:bg-dark-700 hover:text-neon-cyan transition-colors"><ChevronLeft className="w-6 h-6" /></button>
        <div className="w-48 text-center text-xl font-bold capitalize drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </div>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-3 rounded-full bg-dark-800 hover:bg-dark-700 hover:text-neon-cyan transition-colors"><ChevronRight className="w-6 h-6" /></button>
      </div>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* ══ Coluna Esquerda ══ */}
        <div className="lg:col-span-5 space-y-8">

          {/* Cards resumo */}
          <section className="grid grid-cols-1 gap-4">
            <div className={`bg-dark-800 rounded-3xl p-6 border transition-all relative overflow-hidden group ${summary.total >= 0 ? 'border-dark-700 shadow-neon-cyan' : 'border-neon-pink/50 shadow-[0_0_15px_rgba(255,0,255,0.2)]'}`}>
              <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                <DollarSign className={`w-16 h-16 ${summary.total >= 0 ? 'text-neon-cyan' : 'text-neon-pink'}`} />
              </div>
              <p className="text-dark-300 font-medium mb-1 relative z-10">Saldo Restante (Mês Atual)</p>
              <h2 className={`text-4xl font-bold relative z-10 transition-colors ${summary.total >= 0 ? 'text-white group-hover:text-neon-cyan' : 'text-neon-pink'}`}>
                {loadingData ? '...' : formatCurrency(summary.total)}
              </h2>
              
              {!loadingData && (
                <div className="mt-3 relative z-10">
                  <p className={`text-sm font-medium ${summary.total >= 0 ? 'text-neon-cyan' : 'text-neon-pink'}`}>
                    {summary.total >= 0 
                      ? `✨ Sobrou ${formatCurrency(summary.total)} após todas as despesas` 
                      : `⚠️ Faltam ${formatCurrency(Math.abs(summary.total))} para cobrir as despesas`}
                  </p>
                  
                  {summary.income > 0 && (
                    <div className="w-full bg-dark-700 h-2 rounded-full mt-2 overflow-hidden flex" title={`${((summary.expense / summary.income) * 100).toFixed(0)}% comprometido`}>
                       <div 
                         className="bg-neon-pink h-full transition-all" 
                         style={{ width: `${Math.min((summary.expense / summary.income) * 100, 100)}%` }} 
                       />
                       <div 
                         className="bg-neon-cyan h-full transition-all" 
                         style={{ width: `${Math.max(0, ((summary.income - summary.expense) / summary.income) * 100)}%` }} 
                       />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-800 rounded-3xl p-6 border border-dark-700 shadow-[0_0_15px_rgba(57,255,20,0.1)] hover:shadow-[0_0_20px_rgba(57,255,20,0.2)] transition-shadow">
                <div className="flex items-center gap-2 mb-2"><div className="p-2 bg-dark-700 rounded-lg"><TrendingUp className="w-5 h-5 text-neon-green" /></div><p className="text-dark-300 text-sm font-medium">Entradas</p></div>
                <h3 className="text-xl md:text-2xl font-bold text-white">{loadingData ? '...' : formatCurrency(summary.income)}</h3>
              </div>
              <div className="bg-dark-800 rounded-3xl p-6 border border-dark-700 shadow-[0_0_15px_rgba(255,0,255,0.1)] hover:shadow-[0_0_20px_rgba(255,0,255,0.2)] transition-shadow">
                <div className="flex items-center gap-2 mb-2"><div className="p-2 bg-dark-700 rounded-lg"><TrendingDown className="w-5 h-5 text-neon-pink" /></div><p className="text-dark-300 text-sm font-medium">Despesas</p></div>
                <h3 className="text-xl md:text-2xl font-bold text-white">{loadingData ? '...' : formatCurrency(summary.expense)}</h3>
              </div>
            </div>
          </section>

          {/* Formulário */}
          <section className="bg-dark-800 rounded-3xl p-6 border border-dark-700" data-html2canvas-ignore="true">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Plus className="w-5 h-5 text-neon-cyan" /> Lançar no Sistema</h3>

            <form onSubmit={handleAddTransaction} className="space-y-5">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setType('expense')} className={`p-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all ${type === 'expense' ? 'bg-dark-700 text-neon-pink border border-neon-pink shadow-[0_0_10px_rgba(255,0,255,0.2)]' : 'bg-dark-900 text-dark-400 border border-dark-700 hover:text-white'}`}>
                  <TrendingDown className="w-5 h-5" /> Despesa
                </button>
                <button type="button" onClick={() => setType('income')} className={`p-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all ${type === 'income' ? 'bg-dark-700 text-neon-green border border-neon-green shadow-[0_0_10px_rgba(57,255,20,0.2)]' : 'bg-dark-900 text-dark-400 border border-dark-700 hover:text-white'}`}>
                  <TrendingUp className="w-5 h-5" /> Entradas
                </button>
              </div>

              {/* Descrição + botão voz */}
              <div className="flex gap-2">
                <input type="text" required placeholder="Nome do registro (Ex: Aluguel)" value={description} onChange={e => setDescription(e.target.value)} className={inputCls} />
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={loadingAI}
                  title={isListening ? 'Parar gravação' : 'Falar para lançar'}
                  className={`shrink-0 p-4 rounded-2xl border transition-all ${isListening ? 'bg-neon-pink/10 border-neon-pink text-neon-pink shadow-[0_0_10px_rgba(255,0,255,0.3)] animate-pulse' : 'bg-dark-900 border-dark-700 text-dark-400 hover:text-neon-cyan hover:border-neon-cyan'} disabled:opacity-40`}
                >
                  {loadingAI ? <Activity className="w-5 h-5 animate-spin" /> : isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>

              {/* Feedback voz */}
              {voiceText && (
                <p className="text-xs text-dark-400 italic px-1">🎙 "{voiceText}"</p>
              )}

              {/* Valor + Categoria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="number" step="0.01" required placeholder="Total R$" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
                {type === 'expense' && (
                  <select value={category} onChange={e => { setCategory(e.target.value); setSelectedCard(''); }} className={selectCls}>
                    <option value="Alimentacao">Alimentação</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Moradia">Moradia</option>
                    <option value="Energia">Conta de Energia</option>
                    <option value="Agua">Conta de Água</option>
                    <option value="Internet">Internet</option>
                    <option value="Gasolina">Gasolina</option>
                    <option value="Lazer">Lazer</option>
                    <option value="Educacao">Educação</option>
                    <option value="Cartoes">Cartões</option>
                    <option value="Outros">Outros</option>
                  </select>
                )}
              </div>

              {/* Seleção de cartão */}
              {type === 'expense' && category === 'Cartoes' && (
                <div className="p-4 bg-dark-900 border border-[#e2e8f030] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-dark-300 font-bold flex items-center gap-2"><CreditCard className="w-4 h-4 text-[#e2e8f0]" /> Selecionar Cartão</label>
                    <button type="button" onClick={() => setShowCardManager(true)} className="flex items-center gap-1.5 text-xs text-neon-cyan hover:text-white transition-colors"><Settings className="w-3.5 h-3.5" /> Gerenciar</button>
                  </div>
                  {cards.length === 0 ? (
                    <div className="text-center py-3">
                      <p className="text-dark-500 text-sm mb-2">Nenhum cartão cadastrado.</p>
                      <button type="button" onClick={() => setShowCardManager(true)} className="text-neon-cyan text-sm hover:underline">+ Cadastrar meu primeiro cartão</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {cards.map(c => (
                        <button key={c.id} type="button" onClick={() => setSelectedCard(c.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedCard === c.id ? 'border-[#e2e8f0] bg-dark-800 shadow-[0_0_8px_rgba(226,232,240,0.2)]' : 'border-dark-700 bg-dark-800 hover:border-dark-500'}`}>
                          <CreditCard className="w-4 h-4 shrink-0" style={{ color: selectedCard === c.id ? '#e2e8f0' : '#4a5568' }} />
                          <div><p className="text-white text-sm font-semibold">{c.nickname}</p><p className="text-dark-400 text-xs">{c.bank} · {c.flag}</p></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Parcelamento */}
              {type === 'expense' && (
                <div className="p-4 bg-dark-900 border border-dark-700 rounded-2xl">
                  <label className="block text-sm text-dark-400 font-bold mb-2">Número de Parcelas (Meses)</label>
                  <input type="number" min="1" max="60" value={installments} onChange={e => setInstallments(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-700 text-white rounded-xl p-3 text-md focus:outline-none focus:border-neon-purple focus:shadow-[0_0_10px_rgba(188,19,254,0.2)] transition-all" />
                  {installments > 1 && <p className="text-xs text-neon-purple mt-2 font-medium">Esse valor será dividido por {installments} e lançado ao longo dos próximos meses.</p>}
                </div>
              )}

              {/* Toggle Recorrente */}
              <div className="p-4 bg-dark-900 border border-dark-700 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Repeat className={`w-5 h-5 transition-colors ${isRecurring ? 'text-neon-cyan' : 'text-dark-500'}`} />
                  <div>
                    <p className={`text-sm font-bold transition-colors ${isRecurring ? 'text-white' : 'text-dark-400'}`}>Recorrente</p>
                    <p className="text-xs text-dark-500">Cobrado todo mês até desativar</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${isRecurring ? 'bg-neon-cyan/20 border border-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.3)]' : 'bg-dark-700 border border-dark-600'}`}
                >
                  <span className={`absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300 ${isRecurring ? 'left-7 bg-neon-cyan shadow-[0_0_8px_rgba(0,243,255,0.6)]' : 'left-0.5 bg-dark-500'}`} />
                </button>
              </div>

              <button type="submit" className="w-full bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white font-bold rounded-2xl p-5 text-lg transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-[0.98]">
                <Plus className="w-6 h-6" /> ADICIONAR REGISTRO
              </button>
            </form>
          </section>
        </div>

        {/* ══ Coluna Direita ══ */}
        <div className="lg:col-span-7 space-y-8">

          {/* Gráfico com abas */}
          <section className="bg-dark-800 rounded-3xl p-6 border border-dark-700 flex flex-col" style={{ minHeight: '22rem' }}>
            {/* Abas */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button onClick={() => setChartTab('categories')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${chartTab === 'categories' ? 'bg-dark-700 text-neon-purple border border-neon-purple shadow-[0_0_8px_rgba(188,19,254,0.2)]' : 'text-dark-400 hover:text-white'}`}>
                  <PieChartIcon className="w-4 h-4" /> Categorias
                </button>
                <button onClick={() => setChartTab('cards')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${chartTab === 'cards' ? 'bg-dark-700 text-[#e2e8f0] border border-[#e2e8f0] shadow-[0_0_8px_rgba(226,232,240,0.2)]' : 'text-dark-400 hover:text-white'}`}>
                  <BarChart2 className="w-4 h-4" /> Cartões
                </button>
              </div>
              <span className="text-dark-500 text-xs">Análise do Mês</span>
            </div>

            <div className="w-full" style={{ height: '260px' }}>
              {/* Aba categorias */}
              {chartTab === 'categories' && (
                chartData.length > 0 && !loadingData ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                        {chartData.map((entry, i) => <Cell key={i} fill={entry.color} style={{ filter: `drop-shadow(0 0 5px ${entry.color})` }} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#2a2a2a', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} formatter={formatCurrency} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-dark-500">
                    <p>{loadingData ? 'Buscando do banco...' : 'Sem dados suficientes neste mês.'}</p>
                  </div>
                )
              )}

              {/* Aba cartões */}
              {chartTab === 'cards' && (
                cardChartData.length > 0 && !loadingData ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={cardChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                      <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                      <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#2a2a2a', borderRadius: '12px', color: '#fff' }} formatter={formatCurrency} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {cardChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} style={{ filter: `drop-shadow(0 0 4px ${entry.color})` }} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-dark-500">
                    <p>{loadingData ? 'Buscando do banco...' : 'Nenhum gasto por cartão neste mês.'}</p>
                  </div>
                )
              )}
            </div>
          </section>

          {/* Extrato */}
          <section className="bg-dark-800 rounded-3xl p-6 border border-dark-700">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-neon-orange" />
              Extrato ({format(currentDate, 'MMMM/yy', { locale: ptBR })})
            </h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {loadingData ? (
                <p className="text-center text-neon-cyan animate-pulse py-10">Carregando...</p>
              ) : transactions.length === 0 ? (
                <p className="text-center text-dark-500 py-10">Nenhum registro encontrado para este mês.</p>
              ) : transactions.map((t) => {
                const safeCategory = getCategorySafeLabel(t.category);
                const CategoryIcon = CATEGORIES[safeCategory]?.icon || Activity;
                const catColor     = CATEGORIES[safeCategory]?.color || '#ffffff';
                const isIncome     = t.type === 'income';
                const cardInfo     = t.card_id ? cardsMap[t.card_id] : null;
                return (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-dark-900 border border-dark-700 hover:border-dark-600 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-dark-800" style={{ boxShadow: `0 0 8px ${catColor}30`, border: `1px solid ${catColor}50` }}>
                        <CategoryIcon className="w-5 h-5" style={{ color: catColor }} />
                      </div>
                      <div>
                        <p className="font-semibold text-lg text-white">{t.description}</p>
                        <p className="text-dark-400 text-sm">
                          {format(parseISO(t.date), 'dd/MM/yyyy')} · {CATEGORIES[safeCategory]?.label || safeCategory}
                          {t.is_recurring && <span className="text-neon-cyan/60 ml-1 inline-flex items-center gap-0.5"><Repeat className="w-3 h-3 inline" /> Recorrente</span>}
                          {cardInfo && <span className="text-[#e2e8f080] ml-1">— {cardInfo.nickname} ({cardInfo.flag})</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-bold text-lg ${isIncome ? 'text-neon-green' : 'text-neon-pink'}`}>
                        {isIncome ? '+' : '-'} {formatCurrency(t.amount)}
                      </span>
                      {t.is_recurring && (
                        <button onClick={() => handleStopRecurring(t)} data-html2canvas-ignore="true" className="p-2 text-dark-500 hover:text-neon-cyan hover:bg-dark-800 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100" title="Encerrar recorrência">
                          <Repeat className="w-5 h-5" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(t.id)} data-html2canvas-ignore="true" className="p-2 text-dark-500 hover:text-neon-pink hover:bg-dark-800 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100" title="Excluir">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
