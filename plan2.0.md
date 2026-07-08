# UPDATE_PLAN.md - Atualização de Permissões e Admin (ENEI)

## 1. Contexto Atual (Lê com atenção)
*   **O projeto já está criado e funcional.** As páginas de Tarefas, Calendário, Timeline e Documentos já existem.
*   **NÃO reescrevas o design nem a lógica existente** a não ser que seja estritamente necessário para adaptar às novas permissões detalhadas abaixo.
*   Mantém o estilo de UI atual da aplicação (elementos *square-rounded outline*, sem sombras pesadas, suporte a Light/Dark Mode).

## 2. Nova Hierarquia de Permissões (A Implementar)
O sistema deve agora obedecer a estes 4 níveis (`roles` na tabela `profiles`):
1.  **Admin:** Conta global. Acede a tudo, lê tudo e apaga tudo (mesmo registos pessoais dos outros). Só não acede a passwords.
2.  **Mesa:** Vê e interage com os registos (tarefas, eventos) de todos os departamentos. **Exceção:** Não acede a registos marcados como "Privados" (pessoais) por outros utilizadores.
3.  **Diretor / Co-diretor:** Têm controlo total (CRUD) apenas sobre o seu departamento. Podem criar tarefas/eventos para o departamento e atribuir a membros.
4.  **Membro:** Apenas lê os dados do seu departamento. Só cria/apaga os seus próprios registos, escolhendo se são "Privados" ou "Públicos para o departamento".

## 3. Roteiro de Atualização (Executar por ordem)

### Passo 1: Atualização da Base de Dados (Supabase RLS)
*   [ ] Atualizar a tabela `profiles` para suportar os novos `roles` (`admin`, `mesa`, `diretor`, `co-diretor`, `membro`).
*   [ ] Reescrever as políticas de RLS (Row Level Security) de todas as tabelas atuais (`todos`, `events`, `documents`) para refletirem estritamente as regras da Secção 2. O trabalho pesado de filtrar quem vê o quê deve ser feito pelo RLS e não no frontend.

### Passo 2: O Painel de Admin
*   [ ] Criar a nova rota `/admin` (protegida para que só `role === 'admin'` consiga aceder).
*   [ ] Adicionar o botão "Admin" na Sidebar atual, posicionado imediatamente acima do separador de perfil (com um *linebreak* a separar), visível apenas para Admins.
*   [ ] Na página `/admin`, criar a interface para:
    *   Convidar novos utilizadores (criar contas).
    *   Apagar contas existentes.
    *   Editar o `role` (incluindo promover a Admin) e o `department` de qualquer utilizador.

### Passo 3: Adaptação das Funcionalidades Existentes (Frontend)
*   [ ] **Formulários de Criação (Tarefas e Eventos):** 
    *   Se for *Diretor/Co-diretor/Mesa*, adicionar a opção de atribuir a alguém do departamento.
    *   Se for *Membro*, adicionar um toggle obrigatório: "Visível apenas para mim" ou "Visível para todo o departamento".
*   [ ] **Listagens:** Garantir que as *queries* atuais do Supabase lidam bem com o novo RLS e que os botões de "Apagar" ou "Editar" só são renderizados se o utilizador atual tiver permissão para tal segundo a nova hierarquia.