# Neon Finance 💸✨

O **Neon Finance** é um aplicativo de finanças pessoais local, focado na experiência de desktop (mas construído responsivamente). O objetivo foi criar uma forma de gerenciamento direta sem a necessidade real de um banco de dados em nuvem, rodando diretamente pelo navegador do usuário.

A interface gráfica aposta num estilo **Neon Dark**, contando com interações brilhantes para um visual moderno e satisfatório de acompanhar dia a dia.

## 🚀 Como Usar

Para quem utiliza Windows, a inicialização é mais simples possível. 
Você não precisa abrir o terminal ou rodar comandos!

Basta dar um duplo clique no arquivo **`Iniciar Aplicativo.bat`** presente nesta pasta e seu sistema já abrirá o navegador contendo o seu próprio Neon Finance pronto para uso:

1. **Adicionar Gastos:** Use o painel da esquerda para adicionar despesas e entradas de dinheiro, categorizando tudo como preferir.
2. **Entradas & Saldo:** Cadastrou seu salário? O saldo total reage instantaneamente aos registros do que entra contra o que sai.
3. **Distribuição Visiva:** Acompanhe em tempo real onde você gasta mais com os gráficos laterais interativos criados com a biblioteca Recharts.

## 🛠 Entendendo os Dados (Armazenamento Local)

Seus dados nunca saem da sua máquina!
Garantindo o isolamento total, todas as transações, despesas e entradas que você criar no painel estarão seguras utilizando o `localStorage` do seu navegador. O React lidará com as funções de estado lendo e salvando cada mínima modificação lá dentro em tempo real, assim que você aperta no botão de salvar e apagar.

## 🎨 Principais Tecnologias
- **[React 19](https://react.dev/) + [Vite](https://vitejs.dev/):** Ferramentas que fazem o projeto rodar super-rápido.
- **[Tailwind CSS (V3)](https://tailwindcss.com/):** Todas os efeitos visuais, brilhos `box-shadow` e cores Neon customizadas foram estendidas através desta configuração.
- **[Recharts](https://recharts.org/en-US/):** Biblioteca para desenhar os gráficos de setores (fatias).
- **[Lucide Icons](https://lucide.dev/):** Para manter um layout livre de emojis, nós estilizamos todas as seções e categorias do card usando SVGs limpos oferecidos no pacote.
