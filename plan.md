# Plataforma de Gestão Interna - ENEI

## 1. Stack Tecnológica
*   **Framework:** Next.js (App Router)
*   **Linguagem:** TypeScript
*   **Estilos:** Tailwind CSS
*   **Base de Dados & Auth:** Supabase (PostgreSQL, Row Level Security)
*   **Ícones:** Lucide React

## 2. Regras de UI/UX (Crucial)
*   A interface deve ser rápida, limpa e funcional.
*   **Estilo de Componentes:** Todos os botões, *inputs* e elementos interativos (como botões de apagar ou submeter) devem usar um estilo **square-rounded outline**. 
*   **Classes Tailwind base para botões:** `border border-gray-300 rounded-md bg-transparent hover:bg-gray-50 text-sm`. Não usar sombras pesadas nem botões excessivamente preenchidos de cor.

## 3. Roteiro de Desenvolvimento

### Fase 1: Fundação
*   [ ] Inicializar Next.js + Tailwind.
*   [ ] Instalar dependências do Supabase (`@supabase/supabase-js`, `@supabase/ssr`).
*   [ ] Configurar `.env.local` e utilitários do Supabase no Next.js.
*   [ ] Criar Layout base com uma Sidebar de navegação.

### Fase 2: To-Do List Híbrida
*   [ ] Criar página `/tarefas`.
*   [ ] Implementar formulário de inserção (com opção de associar ao departamento ou manter individual).
*   [ ] Listar tarefas com checkbox de conclusão e botão de eliminar (manter regras de UI).

### Fase 3: Eventos (Calendário e Timeline)
*   [ ] Criar página de visão geral.
*   [ ] Implementar listagem baseada na tabela `events`.
*   [ ] Separar os dados: eventos futuros vão para vista de "Calendário"; eventos passados para vista de "Timeline".

### Fase 4: Gestão de Documentos
*   [ ] Criar página `/documentos`.
*   [ ] Implementar upload de ficheiros para o Supabase Storage.
*   [ ] Listar ficheiros respeitando os filtros de departamento.