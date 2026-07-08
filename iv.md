# Identidade Visual (IV) - Plataforma ENEI

## 1. Conceito e Vibe
O design deve transmitir organização, clareza e modernidade. Sendo uma ferramenta de gestão de equipas para um evento tecnológico, a interface não pode ter ruído visual. Foco absoluto na leitura de dados e rapidez de uso, com suporte total para Light e Dark Mode.

## 2. Paleta de Cores (Suporte Light / Dark Mode)
A aplicação usa um sistema de alto contraste baseado no Tailwind CSS.

*   **Fundo Principal:** 
    *   *Light:* Branco Puro (`bg-white`).
    *   *Dark:* Quase preto (`bg-slate-950` ou `#020617`).
*   **Fundo Secundário (Sidebar, Cards ligeiros):** 
    *   *Light:* Cinza super claro (`bg-gray-50`).
    *   *Dark:* Cinza escuro profundo (`bg-slate-900`).
*   **Cor Primária (Ações, Links, Brand):** 
    *   *Light:* Azul Escuro / Marinho (`bg-slate-900` / `text-slate-900`).
    *   *Dark:* Branco Puro (`bg-white` / `text-white`).
*   **Bordas e Linhas Divisórias:** 
    *   *Light:* Cinza claro (`border-gray-200`).
    *   *Dark:* Cinza muito escuro (`border-slate-800`).
*   **Texto Principal:** 
    *   *Light:* Cinza muito escuro (`text-gray-900`).
    *   *Dark:* Cinza super claro/Branco (`text-gray-50`).
*   **Texto Secundário (Datas, labels, descrições):** 
    *   *Light:* Cinza médio (`text-gray-500`).
    *   *Dark:* Cinza claro (`text-gray-400`).

## 3. Tipografia
*   **Fonte:** Inter (padrão do Next.js/Tailwind) ou similar sans-serif limpa.
*   **Hierarquia:** Títulos de páginas grandes e a negrito (`font-bold`, `text-2xl` ou `text-3xl`). Texto de tabelas e listas de tarefas num tamanho confortável e compacto (`text-sm` ou `text-base`).

## 4. Elementos de Interface (Regras Rigorosas)
*   **Estilo Base de UI:** A linguagem visual da aplicação assenta na estética *square-rounded outline*.
*   **Botões e Ações:** Devem ter um raio de borda subtil (`rounded-md` no Tailwind) e focar-se predominantemente em contornos. Evitar blocos de cor maciços, exceto para o botão principal de submissão de formulários.
    *   *Ação Secundária/Edição:* 
        *   *Light:* `border border-slate-900 text-slate-900 bg-transparent hover:bg-slate-50 rounded-md`.
        *   *Dark:* `border border-gray-300 text-gray-100 bg-transparent hover:bg-slate-800 rounded-md`.
    *   *Ação Destrutiva (Botão de Apagar Tarefas):* 
        *   *Light:* `border border-red-500 text-red-500 bg-transparent hover:bg-red-50 rounded-md`.
        *   *Dark:* `border border-red-500 text-red-500 bg-transparent hover:bg-red-950 rounded-md`.
*   **Campos de Input (Formulários):** 
    *   *Light:* `border border-gray-300 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none rounded-md`.
    *   *Dark:* `border border-slate-800 bg-slate-950 text-white focus:border-gray-300 focus:ring-1 focus:ring-gray-300 focus:outline-none rounded-md`.
*   **Cartões (Cards) e Tabelas:** Fundo de acordo com o tema (`bg-white` ou `bg-slate-950`), com bordas limpas (`border border-gray-200 dark:border-slate-800 rounded-lg`). **Não usar sombras** (`shadow`) pesadas; manter a interface achatada (flat) ou no máximo usar `shadow-sm` em elementos flutuantes.

## 5. Assets
*   **Logótipo:** A inserir posteriormente. Por agora, reservar um espaço na Sidebar no canto superior esquerdo usando um *placeholder* (ex: Texto "ENEI" acompanhado de um quadrado de 32x32px com as classes `bg-slate-900 dark:bg-white rounded-md`).
*   **Ícones:** Utilizar a biblioteca Lucide React. Manter a espessura da linha (`strokeWidth`) a 1.5 ou 2.0 para garantir uma leitura nítida e consistente.