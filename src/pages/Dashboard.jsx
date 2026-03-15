import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, Coffee, Car, Home, DollarSign, Activity, PieChart as PieChartIcon, LogOut, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '../lib/supabase';
import { addMonths, format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';

/* Configurações de Categorias e Cores Neon */
const CATEGORIES = {
  Alimentacao: { label: 'Alimentação', color: '#ff00ff', icon: Coffee },
  Transporte: { label: 'Transporte', color: '#00f3ff', icon: Car },
  Moradia: { label: 'Moradia', color: '#bc13fe', icon: Home },
  Entradas: { label: 'Entradas', color: '#39ff14', icon: TrendingUp },
  Outros: { label: 'Outros', color: '#ff5e00', icon: Activity }
};

export default function Dashboard({ session }) {
  const dashboardRef = useRef(null);

  /* Estados da Aplicação */
  const [transactions, setTransactions] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Alimentacao');
  const [installments, setInstallments] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  /* Estado de Mês/Ano (Começa no mês atual) */
  const [currentDate, setCurrentDate] = useState(new Date());

  /* Busca as Transações do banco Supabase */
  useEffect(() => {
    fetchTransactions();
  }, [currentDate]);

  const fetchTransactions = async () => {
    setLoadingData(true);
    
    // Define inicio e fim do mes selecionado via date-fns
    const start = startOfMonth(currentDate).toISOString();
    const end = endOfMonth(currentDate).toISOString();

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar do Supabase:', error);
    } else {
      setTransactions(data || []);
    }
    setLoadingData(false);
  };

  /* Substitui e Formata Categorias Vazias caso alguma venha incompleta */
  const getCategorySafeLabel = (cat) => {
    if (cat === 'Receita') return 'Entradas'; // Resgate do legado local
    return cat;
  }

  /* Calculos de Resumo Mensal */
  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, curr) => {
        if (curr.type === 'income') {
          acc.income += curr.amount;
          acc.total += curr.amount;
        } else {
          acc.expense += curr.amount;
          acc.total -= curr.amount;
        }
        return acc;
      },
      { income: 0, expense: 0, total: 0 }
    );
  }, [transactions]);

  /* Dados p/ Gráficos Mensais */
  const chartData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const grouped = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {});

    return Object.keys(grouped).map(key => {
      const safeKey = getCategorySafeLabel(key);
      return {
        name: CATEGORIES[safeKey]?.label || safeKey,
        value: grouped[key],
        color: CATEGORIES[safeKey]?.color || '#ffffff'
      }
    });
  }, [transactions]);

  /* Adicionar Nova Transação / Parcelamento no Supabase */
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!description || !amount) return;

    const totalAmount = parseFloat(amount);
    const parsedInstallments = parseInt(installments, 10) || 1;
    const amountPerInstallment = totalAmount / parsedInstallments;

    const newTransactions = [];
    
    // Se for parcelado, criamos N registros no banco
    for (let i = 0; i < parsedInstallments; i++) {
      const dateForInstallment = addMonths(new Date(), i);
      
      newTransactions.push({
        user_id: session.user.id,
        description: parsedInstallments > 1 ? `${description} (${i + 1}/${parsedInstallments})` : description,
        amount: amountPerInstallment,
        type,
        category: type === 'income' ? 'Entradas' : category,
        date: dateForInstallment.toISOString()
      });
    }

    const { error } = await supabase.from('transactions').insert(newTransactions);

    if (error) {
      alert('Houve um erro ao salvar: ' + error.message);
    } else {
      setDescription('');
      setAmount('');
      setInstallments(1);
      // Recarrega os dados do mês atual recém visualizado 
      fetchTransactions();
    }
  };

  /* Excluir Transação DB */
  const handleDelete = async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  /* Exportar para Imagem PNG */
  const handleExportPNG = async () => {
    setIsExporting(true);
    if (dashboardRef.current) {
      try {
        const canvas = await html2canvas(dashboardRef.current, {
          backgroundColor: '#050505',
          scale: 2, // Melhor qualidade
        });
        const dataURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `neon-finance-${format(currentDate, 'MM-yyyy')}.png`;
        a.click();
      } catch (err) {
        alert('Falha ao exportar a tela');
      }
    }
    setIsExporting(false);
  };

  /* Deslogar */
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  /* Helpers */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div ref={dashboardRef} className="min-h-screen bg-dark-900 text-white p-6 md:p-10 font-sans selection:bg-neon-cyan selection:text-dark-900 export-container">
      
      {/* Cabeçalho Superior + Menu Sessão */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 border-b border-dark-700 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-dark-800 shadow-neon-cyan shrink-0">
            <Wallet className="w-8 h-8 text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
              Neon Finance
            </h1>
            <p className="text-dark-400 text-sm mt-1">{session.user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Botão Exportar Imagem */}
          <button 
            onClick={handleExportPNG}
            disabled={isExporting}
            className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-white px-4 py-2 rounded-xl transition-all border border-dark-600 hover:border-neon-cyan hover:shadow-[0_0_10px_rgba(0,243,255,0.2)] disabled:opacity-50"
          >
            {isExporting ? <Activity className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-neon-cyan" />}
            <span className="hidden md:block">Salvar Print</span>
          </button>
          
          {/* Botão Sair */}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-white px-4 py-2 rounded-xl transition-all border border-dark-600 hover:border-neon-pink hover:text-neon-pink"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:block">Sair</span>
          </button>
        </div>
      </header>

      {/* Navegador de Mês */}
      <div className="flex items-center justify-center gap-6 mb-8">
        <button 
          onClick={() => setCurrentDate(addMonths(currentDate, -1))}
          className="p-3 rounded-full bg-dark-800 hover:bg-dark-700 hover:text-neon-cyan transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="w-48 text-center text-xl font-bold font-sans tracking-wide capitalize drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </div>
        <button 
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="p-3 rounded-full bg-dark-800 hover:bg-dark-700 hover:text-neon-cyan transition-colors"
        >
           <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Coluna Esquerda: Resumo e Formulário */}
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
                  <div className="p-2 bg-dark-700 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-neon-green" />
                  </div>
                  <p className="text-dark-300 text-sm font-medium">Entradas</p>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white">
                  {loadingData ? '...' : formatCurrency(summary.income)}
                </h3>
              </div>
              
              <div className="bg-dark-800 rounded-3xl p-6 border border-dark-700 shadow-[0_0_15px_rgba(255,0,255,0.1)] hover:shadow-[0_0_20px_rgba(255,0,255,0.2)] transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-dark-700 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-neon-pink" />
                  </div>
                  <p className="text-dark-300 text-sm font-medium">Despesas</p>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white">
                  {loadingData ? '...' : formatCurrency(summary.expense)}
                </h3>
              </div>
            </div>
          </section>

          {/* Formulário */}
          <section className="bg-dark-800 rounded-3xl p-6 border border-dark-700" data-html2canvas-ignore="true">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-neon-cyan" />
              Lançar no Sistema
            </h3>
            
            <form onSubmit={handleAddTransaction} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`p-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all ${
                    type === 'expense' 
                      ? 'bg-dark-700 text-neon-pink border border-neon-pink shadow-[0_0_10px_rgba(255,0,255,0.2)]' 
                      : 'bg-dark-900 text-dark-400 border border-dark-700 hover:text-white'
                  }`}
                >
                  <TrendingDown className="w-5 h-5" /> Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`p-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all ${
                    type === 'income' 
                      ? 'bg-dark-700 text-neon-green border border-neon-green shadow-[0_0_10px_rgba(57,255,20,0.2)]' 
                      : 'bg-dark-900 text-dark-400 border border-dark-700 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-5 h-5" /> Entradas
                </button>
              </div>

              <div>
                <input
                  type="text"
                  required
                  placeholder="Nome do registro (Ex: Aluguel)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 text-white rounded-2xl p-4 text-lg focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_10px_rgba(0,243,255,0.2)] transition-all placeholder:text-dark-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Total R$"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 text-white rounded-2xl p-4 text-lg focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_10px_rgba(0,243,255,0.2)] transition-all placeholder:text-dark-500"
                />
                
                {type === 'expense' && (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 text-white rounded-2xl p-4 text-lg focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_10px_rgba(0,243,255,0.2)] transition-all appearance-none cursor-pointer"
                  >
                    <option value="Alimentacao">Alimentação</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Moradia">Moradia</option>
                    <option value="Outros">Outros</option>
                  </select>
                )}
              </div>

              {/* Box de Parcelamento */}
              {type === 'expense' && (
                <div className="p-4 bg-dark-900 border border-dark-700 rounded-2xl">
                  <label className="block text-sm text-dark-400 font-bold mb-2">Número de Parcelas (Meses)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-700 text-white rounded-xl p-3 text-md focus:outline-none focus:border-neon-purple focus:shadow-[0_0_10px_rgba(188,19,254,0.2)] transition-all"
                  />
                  {installments > 1 && (
                    <p className="text-xs text-neon-purple mt-2 font-medium">
                      Esse valor será dividido por {installments} e lançado ao longo dos próximos meses.
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white font-bold rounded-2xl p-5 text-lg transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-[0.98]"
              >
                <Plus className="w-6 h-6" /> ADICIONAR REGISTRO
              </button>
            </form>
          </section>

        </div>

        {/* Coluna Direita: Gráficos e Histórico */}
        <div className="lg:col-span-7 space-y-8">
          
          <section className="bg-dark-800 rounded-3xl p-6 border border-dark-700 h-80 flex flex-col">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-neon-purple" />
              Análise do Mês
            </h3>
            
            <div className="flex-1 w-full relative">
              {chartData.length > 0 && !loadingData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
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
                  const safeCategory = getCategorySafeLabel(t.category);
                  const CategoryIcon = CATEGORIES[safeCategory]?.icon || Activity;
                  const catColor = CATEGORIES[safeCategory]?.color || '#ffffff';
                  const isIncome = t.type === 'income';

                  return (
                    <div 
                      key={t.id} 
                      className="flex items-center justify-between p-4 rounded-2xl bg-dark-900 border border-dark-700 hover:border-dark-600 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="p-3 rounded-xl bg-dark-800"
                          style={{ boxShadow: `0 0 8px ${catColor}30`, border: `1px solid ${catColor}50` }}
                        >
                          <CategoryIcon className="w-5 h-5" style={{ color: catColor }} />
                        </div>
                        <div>
                          <p className="font-semibold text-lg text-white">{t.description}</p>
                          <p className="text-dark-400 text-sm">
                            {format(parseISO(t.date), 'dd/MM/yyyy')} • {safeCategory}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className={`font-bold text-lg ${isIncome ? 'text-neon-green' : 'text-neon-pink'}`}>
                          {isIncome ? '+' : '-'} {formatCurrency(t.amount)}
                        </span>
                        <button 
                          onClick={() => handleDelete(t.id)}
                          data-html2canvas-ignore="true"
                          className="p-2 text-dark-500 hover:text-neon-pink hover:bg-dark-800 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100"
                          title="Excluir do Banco"
                        >
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
