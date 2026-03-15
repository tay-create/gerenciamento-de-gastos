import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, Coffee, Car, Home, DollarSign, Activity, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

/* Configurações de Categorias e Cores Neon */
const CATEGORIES = {
  Alimentacao: { label: 'Alimentação', color: '#ff00ff', icon: Coffee },
  Transporte: { label: 'Transporte', color: '#00f3ff', icon: Car },
  Moradia: { label: 'Moradia', color: '#bc13fe', icon: Home },
  Receita: { label: 'Entradas', color: '#39ff14', icon: TrendingUp },
  Outros: { label: 'Outros', color: '#ff5e00', icon: Activity }
};

/* Componente Principal */
export default function App() {
  
  /* Estados da Aplicação */
  const [transactions, setTransactions] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Alimentacao');

  /* Carregamento Inicial do LocalStorage */
  useEffect(() => {
    const saved = localStorage.getItem('gastos_neon_data');
    if (saved) {
      setTransactions(JSON.parse(saved));
    }
  }, []);

  /* Salvamento no LocalStorage */
  useEffect(() => {
    localStorage.setItem('gastos_neon_data', JSON.stringify(transactions));
  }, [transactions]);

  /* Calculos de Resumo */
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

  /* Dados para o Gráfico de Despesas */
  const chartData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const grouped = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {});

    return Object.keys(grouped).map(key => ({
      name: CATEGORIES[key]?.label || key,
      value: grouped[key],
      color: CATEGORIES[key]?.color || '#ffffff'
    }));
  }, [transactions]);

  /* Função para Adicionar Transação */
  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!description || !amount) return;

    const newTransaction = {
      id: crypto.randomUUID(),
      description,
      amount: parseFloat(amount),
      type,
      category: type === 'income' ? 'Receita' : category,
      date: new Date().toISOString()
    };

    setTransactions([newTransaction, ...transactions]);
    setDescription('');
    setAmount('');
  };

  /* Função para Remover Transação */
  const handleDelete = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  /* Formatação de Moeda BRL */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white p-6 md:p-10 font-sans selection:bg-neon-cyan selection:text-dark-900">
      
      {/* Cabeçalho do App */}
      <header className="flex items-center gap-4 mb-10 border-b border-dark-700 pb-6">
        <div className="p-3 rounded-2xl bg-dark-800 shadow-neon-cyan">
          <Wallet className="w-8 h-8 text-neon-cyan" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
            Neon Finance
          </h1>
          <p className="text-dark-400 text-sm mt-1">Gerenciamento de Gastos Pessoais</p>
        </div>
      </header>

      {/* Layout Principal em Grid Específico para Desktop */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Coluna Esquerda: Resumo e Formulário */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Cards de Resumo */}
          <section className="grid grid-cols-1 gap-4">
            
            {/* Card Saldo Total */}
            <div className="bg-dark-800 rounded-3xl p-6 border border-dark-700 shadow-neon-cyan relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                <DollarSign className="w-16 h-16 text-neon-cyan" />
              </div>
              <p className="text-dark-300 font-medium mb-1 relative z-10">Saldo Total</p>
              <h2 className="text-4xl font-bold text-white relative z-10 group-hover:text-neon-cyan transition-colors">
                {formatCurrency(summary.total)}
              </h2>
            </div>
            
            {/* Cards Receitas e Despesas (Grid Dividido) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-800 rounded-3xl p-6 border border-dark-700 shadow-[0_0_15px_rgba(57,255,20,0.1)] hover:shadow-[0_0_20px_rgba(57,255,20,0.2)] transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-dark-700 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-neon-green" />
                  </div>
                  <p className="text-dark-300 text-sm font-medium">Entradas</p>
                </div>
                <h3 className="text-2xl font-bold text-white">{formatCurrency(summary.income)}</h3>
              </div>
              
              <div className="bg-dark-800 rounded-3xl p-6 border border-dark-700 shadow-[0_0_15px_rgba(255,0,255,0.1)] hover:shadow-[0_0_20px_rgba(255,0,255,0.2)] transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-dark-700 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-neon-pink" />
                  </div>
                  <p className="text-dark-300 text-sm font-medium">Despesas</p>
                </div>
                <h3 className="text-2xl font-bold text-white">{formatCurrency(summary.expense)}</h3>
              </div>
            </div>
          </section>

          {/* Formulário de Nova Transação (Estilos Grandes/Mobile) */}
          <section className="bg-dark-800 rounded-3xl p-6 border border-dark-700">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-neon-cyan" />
              Nova Transação
            </h3>
            
            <form onSubmit={handleAddTransaction} className="space-y-5">
              
              {/* Tipo de Transação */}
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

              {/* Descrição */}
              <div>
                <input
                  type="text"
                  placeholder="Descrição da transação..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 text-white rounded-2xl p-4 text-lg focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_10px_rgba(0,243,255,0.2)] transition-all placeholder:text-dark-500"
                />
              </div>

              {/* Valor e Categoria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  step="0.01"
                  placeholder="R$ 0,00"
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

              {/* Botão Salvar */}
              <button
                type="submit"
                className="w-full bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white font-bold rounded-2xl p-5 text-lg transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-[0.98]"
              >
                <Plus className="w-6 h-6" /> Adicionar Transação
              </button>
            </form>
          </section>

        </div>

        {/* Coluna Direita: Gráficos e Histórico */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Gráfico de Despesas */}
          <section className="bg-dark-800 rounded-3xl p-6 border border-dark-700 h-80 flex flex-col">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-neon-purple" />
              Distribuição de Despesas
            </h3>
            
            <div className="flex-1 w-full relative">
              {chartData.length > 0 ? (
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
                  <p>Adicione despesas para visualizar os gráficos.</p>
                </div>
              )}
            </div>
          </section>

          {/* Histórico Recente */}
          <section className="bg-dark-800 rounded-3xl p-6 border border-dark-700">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-neon-orange" />
              Histórico Recente
            </h3>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {transactions.length === 0 ? (
                <p className="text-center text-dark-500 py-10">Nenhuma transação registrada até o momento.</p>
              ) : (
                transactions.map((t) => {
                  const CategoryIcon = CATEGORIES[t.category]?.icon || Activity;
                  const catColor = CATEGORIES[t.category]?.color || '#ffffff';
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
                            {new Date(t.date).toLocaleDateString('pt-BR')} • {t.category}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className={`font-bold text-lg ${isIncome ? 'text-neon-green' : 'text-neon-pink'}`}>
                          {isIncome ? '+' : '-'} {formatCurrency(t.amount)}
                        </span>
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-2 text-dark-500 hover:text-neon-pink hover:bg-dark-800 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100"
                          title="Excluir"
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
