# ⚡ Neon Finance - Gerenciador de Gastos Pessoais

O **Neon Finance** é uma aplicação Fullstack moderna, projetada para quem deseja controle total sobre suas finanças com uma interface vibrante e futurista no estilo **Neon Dark**. 

Diferente de planilhas convencionais, ele oferece persistência na nuvem, sistema de contas multi-usuário e inteligência para lidar com parcelamentos.

## 🚀 Tecnologias Utilizadas

A aplicação utiliza o que há de mais moderno no ecossistema Web:

- **Frontend**: [React.js](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) (Mobile-first e Design System customizado)
- **Banco de Dados & Auth**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Hospedagem**: [Vercel](https://vercel.com/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Gráficos**: [Recharts](https://recharts.org/)
- **Manipulação de Datas**: [Date-fns](https://date-fns.org/)

## ✨ Funcionalidades Principais

### 1. Sistema de Autenticação Real
- Cada usuário tem sua própria conta segura.
- Gerenciamento de sessão (Login/Cadastro) via Supabase Auth.
- Segurança de dados: Um usuário nunca consegue ver os gastos de outro através de políticas RLS (Row Level Security).

### 2. Painel de Controle Neon
- Resumo mensal automático de Saldo, Entradas e Despesas.
- Gráficos de pizza interativos para análise de categorias de gastos.
- Histórico de transações detalhado e filtrável.

### 3. Motor de Parcelamentos Inteligente
- Ao cadastrar uma despesa, você pode definir o número de parcelas.
- A aplicação gera automaticamente lançamentos para os meses futuros no banco de dados.

### 4. Navegação por Meses
- Use as setas no topo do painel para navegar pelo calendário.
- Veja como as parcelas cadastradas hoje impactarão seu saldo daqui a 3, 6 ou 12 meses.

### 5. Exportação de Resultados
- Botão "Salvar Print" integrado para baixar uma imagem PNG do seu dashboard.
- Perfeito para salvar fechamentos mensais ou compartilhar com amigos.

---

## 🛠️ Configuração Técnica (SQL para o Banco)

Para rodar sua própria instância, a tabela no Supabase deve seguir este esquema:

```sql
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  amount numeric not null,
  type text not null,
  category text not null,
  date timestamp with time zone not null,
  created_at timestamp with time zone default now()
);
```

---

*Desenvolvido com foco em estética e praticidade.* 💎⚡
