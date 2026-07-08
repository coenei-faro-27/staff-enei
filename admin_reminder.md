# Notas sobre a Secção "Admin" e Permissões

Este documento serve para relembrar o estado atual do planeamento e as regras de administração/permissões no projeto.

---

## 1. O que consta no `plan.md` atual
Analisando o teu ficheiro `plan.md` na raiz do projeto, ele está estruturado em 4 fases:
* **Fase 1: Fundação** (Next.js, Tailwind, Supabase)
* **Fase 2: To-Do List Híbrida** (Tarefas individuais e por departamento)
* **Fase 3: Eventos** (Calendário para futuros, Timeline para passados)
* **Fase 4: Gestão de Documentos** (Ficheiros por departamento e privados)

> [!NOTE]
> O `plan.md` original **não tem** uma secção ou fase dedicada especificamente a um "Painel de Administração" (Admin Panel) visual. Toda a lógica de administração e privilégios foi desenhada para assentar nas permissões de base de dados e segurança da informação.

---

## 2. A Lógica de Administração e Permissões Implementada

Embora não exista uma rota `/admin` no roteiro original, o conceito de administrador e as suas permissões foram integrados e documentados em dois locais importantes da plataforma:

### A. Tabela de Perfis (`profiles` no Supabase)
Definido no script [supabase_setup.sql](file:///Users/davidgoncalves/Documents/Projetos/enei-staff/supabase_setup.sql#L90-L100):
* Cada utilizador tem um `role` (Cargo) associado na tabela `public.profiles`.
* O cargo padrão é `'Membro'`.
* Os utilizadores identificados como **Administradores** (ex: `'Coordenador Geral'`) ganham acesso privilegiado.

### B. Gestão de Documentos (`documentos/page.tsx`)
Conforme a descrição de regras e o tooltip de "Segurança e Permissões" criado no cabeçalho da página de Documentos:
* **Membros comuns:** Apenas visualizam documentos públicos do seu departamento ou documentos marcados como **Privados** que eles próprios carregaram.
* **Administradores:** Têm uma cláusula de super-utilizador na lógica de leitura e eliminação. **Os administradores do sistema têm acesso a toda a informação da plataforma**, permitindo-lhes visualizar, descarregar e apagar inclusive os ficheiros definidos como "Privados" por qualquer outro membro do staff.

---

## 3. Sugestão para uma "Fase 5: Painel de Admin" (Caso pretendas expandir)
Se pretendes criar um espaço físico para administração, sugerimos o seguinte planeamento básico:
* **Rota:** Nova página em `/admin`.
* **Segurança:** Bloqueio de rota no Next.js (Middleware ou verificação no Componente) que valida se o `role` do utilizador logado é de Administrador.
* **Funcionalidades:**
  * Gestão de utilizadores (mudar cargos e departamentos de "Membro" para "Coordenador", etc.).
  * Auditoria global de tarefas de todos os utilizadores.
  * Vista centralizada de todos os documentos privados carregados no Supabase Storage.
