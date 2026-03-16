import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, Coffee, Car, Home, DollarSign, Activity, PieChart as PieChartIcon, LogOut, ChevronLeft, ChevronRight, Camera, Zap, Droplets, Wifi, Fuel, Gamepad2, CreditCard, X, Settings } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '../lib/supabase';
import { addMonths, format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';

/* Configurações de Categorias e Cores Neon */
const CATEGORIES = {
  Alimentacao: { label: 'Alimentação',     color: '#ff00ff', icon: Coffee    },
  Transporte:  { label: 'Transporte',      color: '#00f3ff', icon: Car       },
  Moradia:     { label: 'Moradia',         color: '#bc13fe', icon: Home      },
  Energia:     { label: 'Conta de Energia',color: '#facc15', icon: Zap       },
  Agua:        { label: 'Conta de Água',   color: '#38bdf8', icon: Droplets  },
  Internet:    { label: 'Internet',        color: '#a78bfa', icon: Wifi      },
  Gasolina:    { label: 'Gasolina',        color: '#fb923c', icon: Fuel      },
  Lazer:       { label: 'Lazer',           color: '#f472b6', icon: Gamepad2  },
  Cartoes:     { label: 'Cartões',         color: '#e2e8f0', icon: CreditCard},
  Entradas:    { label: 'Entradas',        color: '#39ff14', icon: TrendingUp},
  Outros:      { label: 'Outros',          color: '#ff5e00', icon: Activity  },
};

const CARD_FLAGS  = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard'];
const CARD_BANKS  = ['Nubank', 'Itaú', 'Bradesco', 'Santander', 'Caixa', 'Banco do Brasil', 'Inter', 'C6 Bank', 'Outros'];

const inputCls = "w-full bg-dark-900 border border-dark-700 text-white rounded-2xl p-4 text-lg focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_10px_rgba(0,243,255,0.2)] transition-all placeholder:text-dark-500";
const selectCls = `${inputCls} appearance-none cursor-pointer`;

export default function Dashboard({ session }) {
  const dashboardRef = useRef(null);

  /* Estados da Aplicação */
  const [transactions, setTransactions]   = useState([]);
  const [description, setDescription]     = useState('');
  const [amount, setAmount]               = useState('');
  const [type, setType]                   = useState('expense');
  const [category, setCategory]           = useState('Alimentacao');
  const [installments, setInstallments]   = useState(1);
  const [isExporting, setIsExporting]     = useState(false);
  const [loadingData, setLoadingData]     = useState(true);

  /* Estados de Cartões */
  const [cards, setCards]                 = useState([]);
  const [selectedCard, setSelectedCard]   = useState('');
  const [showCardManager, setShowCardManager] = useState(false);
  const [newCardNickname, setNewCardNickname] = useState('');
  const [newCardBank, setNewCardBank]     = useState('Nubank');
  const [newCardFlag, setNewCardFlag]     = useState('Visa');
  const [savingCard, setSavingCard]       = useState(false);

  /* Estado de Mês/Ano */
  const [currentDate, setCurrentDate]     = useState(new Date());

  useEffect(() => { fetchTransactions(); }, [currentDate]);
  useEffect(() => { fetchCards(); }, []);

  const fetchTransactions = async () => {
    setLoadingData(true);
    const start = startOfMonth(currentDate).toISOString();
    const end   = endOfMonth(currentDate).toISOString();
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });
    if (error) console.error('Erro ao buscar do Supabase:', error);
    else setTransactions(data || []);
    setLoadingData(false);
  };

  const fetchCards = async () => {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });
    if (!error) setCards(data || []);
  };

  /* Mapa id→cartão para uso no extrato */
  const cardsMap = useMemo(() => {
    return cards.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
  }, [cards]);

  const getCategorySafeLabel = (cat) => {
    if (cat === 'Receita') return 'Entradas';
    return cat;
  };

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, curr) => {
        if (curr.type === 'income') { acc.income += curr.amount; acc.total += curr.amount; }
        else                        { acc.expense += curr.amount; acc.total -= curr.amount; }
        return acc;
      },
      { income: 0, expense: 0, total: 0 }
    );
  }, [transactions]);

  const chartData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const grouped  = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {});
    return Object.keys(grouped).map(key => {
      const safeKey = getCategorySafeLabel(key);
      return {
        name:  CATEGORIES[safeKey]?.label || safeKey,
        value: grouped[key],
        color: CATEGORIES[safeKey]?.color || '#ffffff'
      };
    });
  }, [transactions]);

  /* Adicionar Nova Transação */
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!description || !amount) return;
    if (category === 'Cartoes' && !selectedCard) {
      alert('Selecione um cartão antes de continuar.');
      return;
    }

    const totalAmount        = parseFloat(amount);
    const numInstallments    = parseInt(installments, 10) || 1;
    const amountPerInstallment = Math.floor((totalAmount / numInstallments) * 100) / 100;
    const remainder          = parseFloat((totalAmount - (amountPerInstallment * numInstallments)).toFixed(2));
    const newTransactions    = [];

    for (let i = 0; i < numInstallments; i++) {
      const dateForInstallment = addMonths(new Date(), i);
      const isLast = i === numInstallments - 1;
      newTransactions.push({
        user_id:     session.user.id,
        description: numInstallments > 1 ? `${description} (${i + 1}/${numInstallments})` : description,
        amount:      isLast ? parseFloat((amountPerInstallment + remainder).toFixed(2)) : amountPerInstallment,
        type,
        category:    type === 'income' ? 'Entradas' : category,
        date:        dateForInstallment.toISOString(),
        card_id:     (type === 'expense' && category === 'Cartoes' && selectedCard) ? selectedCard : null,
      });
    }

    const { error } = await supabase.from('transactions').insert(newTransactions);
    if (error) { alert('Houve um erro ao salvar: ' + error.message); }
    else {
      setDescription('');
      setAmount('');
      setInstallments(1);
      setSelectedCard('');
      fetchTransactions();
    }
  };

  /* Gerenciar Cartões */
  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newCardNickname.trim()) return;
    setSavingCard(true);
    const { error } = await supabase.from('cards').insert({
      user_id:  session.user.id,
      nickname: newCardNickname.trim(),
      bank:     newCardBank,
      flag:     newCardFlag,
      color:    '#e2e8f0',
    });
    if (error) { alert('Erro ao salvar cartão: ' + error.message); }
    else {
      setNewCardNickname('');
      setNewCardBank('Nubank');
      setNewCardFlag('Visa');
      fetchCards();
    }
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

  const handleExportPNG = async () => {
    setIsExporting(true);
    if (dashboardRef.current) {
      try {
        const canvas  = await html2canvas(dashboardRef.current, { backgroundColor: '#050505', scale: 2 });
        const dataURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `neon-finance-${format(currentDate, 'MM-yyyy')}.png`;
        a.click();
      } catch (err) { alert('Falha ao exportar a tela'); }
    }
    setIsExporting(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div ref={dashboardRef} className="min-h-screen bg-dark-900 text-white p-6 md:p-10 font-sans selection:bg-neon-cyan selection:text-dark-900 export-container">

      {/* Modal Gerenciar Cartões */}
      {showCardManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" data-html2canvas-ignore="true">
          <div className="bg-dark-800 border border-dark-600 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-neon-cyan" /> Gerenciar Cartões
              </h3>
              <button onClick={() => setShowCardManager(false)} className="p-2 rounded-xl hover:bg-dark-700 text-dark-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de cartões */}
            <div className="space-y-3 mb-6 max-h-52 overflow-y-auto pr-1">
              {cards.length === 0 ? (
                <p className="text-dark-500 text-sm text-center py-4">Nenhum cartão cadastrado ainda.</p>
              ) : cards.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-dark-900 border border-dark-700 rounded-2xl p-3">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-[#e2e8f0]" />
                    <div>
                      <p className="font-semibold text-white text-sm">{c.nickname}</p>
                      <p className="text-dark-400 text-xs">{c.bank} · {c.flag}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteCard(c.id)} className="p-1.5 text-dark-500 hover:text-neon-pink hover:bg-dark-800 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Form novo cartão */}
            <form onSubmit={handleAddCard} className="space-y-3 border-t border-dark-700 pt-5">
              <p className="text-sm font-bold text-dark-300 mb-1">Novo Cartão</p>
              <input
                type="text"
                placeholder="Apelido (ex: Nubank Roxo)"
                value={newCardNickname}
                onChange={e => setNewCardNickname(e.target.value)}
                required
                className="w-full bg-dark-900 border border-dark-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-neon-cyan transition-all placeholder:text-dark-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newCardBank}
                  onChange={e => setNewCardBank(e.target.value)}
                  className="bg-dark-900 border border-dark-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-neon-cyan transition-all appearance-none cursor-pointer"
                >
                  {CARD_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select
                  value={newCardFlag}
                  onChange={e => setNewCardFlag(e.target.value)}
                  className="bg-dark-900 border border-dark-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-neon-cyan transition-all appearance-none cursor-pointer"
                >
                  {CARD_FLAGS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <button
                type="submit"
                disabled={savingCard}
                className="w-full bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white font-bold rounded-xl p-3 text-sm transition-all flex items-center justify-center gap-2 hover:border-neon-cyan hover:shadow-[0_0_10px_rgba(0,243,255,0.15)] disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Adicionar Cartão
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 border-b border-dark-700 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-dark-800 shadow-neon-cyan shrink-0">
            <Wallet className="w-8 h-8 text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">Neon Finance</h1>
            <p className="text-dark-400 text-sm mt-1">{session.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportPNG} disabled={isExporting} className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-white px-4 py-2 rounded-xl transition-all border border-dark-600 hover:border-neon-cyan hover:shadow-[0_0_10px_rgba(0,243,255,0.2)] disabled:opacity-50">
            {isExporting ? <Activity className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-neon-cyan" />}
            <span className="hidden md:block">Salvar Print</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-white px-4 py-2 rounded-xl transition-all border border-dark-600 hover:border-neon-pink hover:text-neon-pink">
            <LogOut className="w-4 h-4" />
            <span className="hidden md:block">Sair</span>
          </button>
        </div>
      </header>

      {/* Navegador de Mês */}
      <div className="flex items-center justify-center gap-6 mb-8">
        <button onClick={() => setCurrentDate(addMonths(currentDate, -1))} className="p-3 rounded-full bg-dark-800 hover:bg-dark-700 hover:text-neon-cyan transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="w-48 text-center text-xl font-bold font-sans tracking-wide capitalize drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </div>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-3 rounded-full bg-dark-800 hover:bg-dark-700 hover:text-neon-cyan transition-colors">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Coluna Esquerda */}
        <div className="lg:col-span-5 space-y-8">

          {/* Cards de Resumo */}
          <section className="grid grid-cols-1 gap-4">
            <div className="bg-dark-800 rounded-3xl p-6 border border-dark-700 shadow-neon-cyan relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                <DollarSign className="w-16 h-16 text-neon-cyan" />
              </div>
              <p className="text-dark-300 font-medium mb-1 relative z-10">Saldo Total (Mês Atual)</p>
              <h2 className="text-4xl font-bold text-white relative z-10 group-hover:text-neon-cyan transition-colors">
                {loadingData ? '...' : formatCurrency(summary.total)}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-800 rounded-3xl p-6 border border-dark-700 shadow-[0_0_15px_rgba(57,255,20,0.1)] hover:shadow-[0_0_20px_rgba(57,255,20,0.2)] transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-dark-700 rounded-lg"><TrendingUp className="w-5 h-5 text-neon-green" /></div>
                  <p className="text-dark-300 text-sm font-medium">Entradas</p>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white">{loadingData ? '...' : formatCurrency(summary.income)}</h3>
              </div>
              <div className="bg-dark-800 rounded-3xl p-6 border border-dark-700 shadow-[0_0_15px_rgba(255,0,255,0.1)] hover:shadow-[0_0_20px_rgba(255,0,255,0.2)] transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-dark-700 rounded-lg"><TrendingDown className="w-5 h-5 text-neon-pink" /></div>
                  <p className="text-dark-300 text-sm font-medium">Despesas</p>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white">{loadingData ? '...' : formatCurrency(summary.expense)}</h3>
              </div>
            </div>
          </section>

          {/* Formulário */}
          <section className="bg-dark-800 rounded-3xl p-6 border border-dark-700" data-html2canvas-ignore="true">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-neon-cyan" /> Lançar no Sistema
            </h3>

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

              {/* Descrição */}
              <input type="text" required placeholder="Nome do registro (Ex: Aluguel)" value={description} onChange={e => setDescription(e.target.value)} className={inputCls} />

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
                    <option value="Cartoes">Cartões</option>
                    <option value="Outros">Outros</option>
                  </select>
                )}
              </div>

              {/* Seleção de Cartão (só aparece quando categoria = Cartoes) */}
              {type === 'expense' && category === 'Cartoes' && (
                <div className="p-4 bg-dark-900 border border-[#e2e8f030] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-dark-300 font-bold flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#e2e8f0]" /> Selecionar Cartão
                    </label>
                    <button type="button" onClick={() => setShowCardManager(true)} className="flex items-center gap-1.5 text-xs text-neon-cyan hover:text-white transition-colors">
                      <Settings className="w-3.5 h-3.5" /> Gerenciar
                    </button>
                  </div>

                  {cards.length === 0 ? (
                    <div className="text-center py-3">
                      <p className="text-dark-500 text-sm mb-2">Nenhum cartão cadastrado.</p>
                      <button type="button" onClick={() => setShowCardManager(true)} className="text-neon-cyan text-sm hover:underline">
                        + Cadastrar meu primeiro cartão
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {cards.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCard(c.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedCard === c.id ? 'border-[#e2e8f0] bg-dark-800 shadow-[0_0_8px_rgba(226,232,240,0.2)]' : 'border-dark-700 bg-dark-800 hover:border-dark-500'}`}
                        >
                          <CreditCard className="w-4 h-4 shrink-0" style={{ color: selectedCard === c.id ? '#e2e8f0' : '#4a5568' }} />
                          <div>
                            <p className="text-white text-sm font-semibold">{c.nickname}</p>
                            <p className="text-dark-400 text-xs">{c.bank} · {c.flag}</p>
                          </div>
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
                  <input
                    type="number" min="1" max="60" value={installments}
                    onChange={e => setInstallments(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-700 text-white rounded-xl p-3 text-md focus:outline-none focus:border-neon-purple focus:shadow-[0_0_10px_rgba(188,19,254,0.2)] transition-all"
                  />
                  {installments > 1 && (
                    <p className="text-xs text-neon-purple mt-2 font-medium">
                      Esse valor será dividido por {installments} e lançado ao longo dos próximos meses.
                    </p>
                  )}
                </div>
              )}

              <button type="submit" className="w-full bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white font-bold rounded-2xl p-5 text-lg transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-[0.98]">
                <Plus className="w-6 h-6" /> ADICIONAR REGISTRO
              </button>
            </form>
          </section>
        </div>

        {/* Coluna Direita: Gráficos e Histórico */}
        <div className="lg:col-span-7 space-y-8">

          <section className="bg-dark-800 rounded-3xl p-6 border border-dark-700 h-80 flex flex-col">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-neon-purple" /> Análise do Mês
            </h3>
            <div className="flex-1 w-full relative">
              {chartData.length > 0 && !loadingData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0 0 5px ${entry.color})` }} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111111', borderColor: '#2a2a2a', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-dark-500">
                  <p>{loadingData ? 'Buscando do banco...' : 'Sem dados suficientes neste mês.'}</p>
                </div>
              )}
            </div>
          </section>

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
              ) : (
                transactions.map((t) => {
                  const safeCategory  = getCategorySafeLabel(t.category);
                  const CategoryIcon  = CATEGORIES[safeCategory]?.icon || Activity;
                  const catColor      = CATEGORIES[safeCategory]?.color || '#ffffff';
                  const isIncome      = t.type === 'income';
                  const cardInfo      = t.card_id ? cardsMap[t.card_id] : null;

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
                            {cardInfo && <span className="text-[#e2e8f080] ml-1">— {cardInfo.nickname} ({cardInfo.flag})</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-bold text-lg ${isIncome ? 'text-neon-green' : 'text-neon-pink'}`}>
                          {isIncome ? '+' : '-'} {formatCurrency(t.amount)}
                        </span>
                        <button onClick={() => handleDelete(t.id)} data-html2canvas-ignore="true" className="p-2 text-dark-500 hover:text-neon-pink hover:bg-dark-800 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100" title="Excluir do Banco">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
