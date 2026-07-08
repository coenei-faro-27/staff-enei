# UPDATE_ADMIN_FLOW.md - Fluxo de Criação de Contas e Permissões da Mesa

## 1. Contexto e Objetivo
O formulário de criação/edição de utilizadores no Painel de Admin precisa de uma lógica condicional dependente do departamento. Além disso, o departamento da "Mesa" tem uma lógica de permissões especial (todos os seus membros partilham as mesmas permissões elevadas globais).

## 2. Departamentos e Cargos (Mapeamento Estrito)
Não existe um departamento "Geral". Os utilizadores têm de pertencer obrigatoriamente a um dos 6 departamentos abaixo. Os cargos disponíveis no formulário dependem **exclusivamente** da seleção prévia do departamento.

**Departamento 1: Mesa**
*   *Cargos disponíveis:* Presidente, Vice-Presidente, Administrador, Tesoureiro, Representante de LEI, Representante de Lesti, Representante de EEC, Secretário, Secretária.
*   *Lógica de Permissões:* Independentemente do cargo escolhido acima, o Supabase RLS deve tratar qualquer utilizador que pertença ao departamento "Mesa" com o nível de acesso global da Mesa (pode ver/editar/apagar registos de todos os outros departamentos, exceto os privados).

**Departamentos 2 a 6: Logística, Marketing, Atividades, Tecnologia, Comercial**
*   *Cargos disponíveis:* Diretor, Co-diretor, Membro.
*   *Lógica de Permissões:* As permissões de CRUD sobre o próprio departamento aplicam-se APENAS aos cargos "Diretor" e "Co-diretor". O cargo "Membro" tem apenas permissões de leitura do departamento e escrita pessoal.

## 3. Tarefas de Frontend (React / UI)
*   [ ] **Formulário Cascata:** Na página `/admin`, altera o formulário de convite/criação de utilizadores. O `select` de "Cargo" (`role`) deve estar desabilitado (`disabled`) ou oculto até que um "Departamento" seja selecionado.
*   [ ] **Opções Dinâmicas:** Quando um departamento for selecionado, popula o `select` de Cargos com as opções corretas baseadas no mapeamento da secção 2.
*   [ ] **Estilo Consistente:** Mantém a interface com o estilo *square-rounded outline* (ex: `border border-gray-300 rounded-md focus:ring-slate-900`) e suporte a Dark Mode já definido na plataforma.

## 4. Tarefas de Backend (Supabase RLS & Base de Dados)
*   [ ] **Atualização da Tabela `profiles`:** Garante que o campo `role` suporta os novos cargos da Mesa. Podes usar texto simples (`TEXT`) em vez de `ENUM` para facilitar, se preferires.
*   [ ] **Atualização das Políticas (RLS):** Revê as políticas da base de dados (`todos`, `events`, etc.). A condição de acesso para a Mesa já não deve procurar apenas por `role = 'mesa'`. Deve verificar se o utilizador pertence ao departamento "Mesa" (ex: fazendo um `JOIN` ou subquery à tabela `departments` onde `name = 'Mesa'`).
*   [ ] **Segurança de Submissão:** A Server Action que regista o utilizador deve validar no servidor se a combinação de Departamento/Cargo submetida é válida segundo as regras da secção 2, não confiando apenas no frontend.