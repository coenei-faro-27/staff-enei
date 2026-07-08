# 🚀 ENEI 2027 - Staff Portal
<img src="https://raw.githubusercontent.com/coenei-faro-27/staff-enei/main/public/ENEI-logo.svg" alt="ENEI Logo" width="100" />

> Portal oficial de gestão interna e organização para a equipa do **Encontro Nacional de Estudantes de Informática (ENEI 2027)**.

Esta plataforma foi desenvolvida para unificar e otimizar toda a logística, comunicação, tarefas, eventos e documentos da equipa organizadora, garantindo segurança ao nível de base de dados e facilidade de coordenação entre departamentos.

---

## 🌟 Funcionalidades Principais

### 🔒 Autenticação Inovadora (Fluxo de E-mail Duplo)
- **E-mail da Plataforma:** Cada utilizador tem um e-mail/username único para login (`exemplo@coenei.pt` ou apenas `exemplo`).
- **E-mail de Contacto Real:** As mensagens de convite, ativação e reset de palavra-passe são enviadas para o e-mail real e válido do utilizador (ex: Gmail).
- **Sem Palavra-passe Inicial:** O administrador convida o membro inserindo o username da plataforma e o e-mail real. O utilizador recebe um convite no e-mail real para definir a sua palavra-passe no primeiro acesso.

### 👤 Painel de Administração Avançado
- **Mapeamento em Cascata:** No formulário de convite, a seleção de **Cargo** fica oculta até que o **Departamento** seja selecionado, prevenindo atribuições inválidas.
  - **Mesa:** Cargos específicos (`Presidente`, `Vice-Presidente`, `Administrador`, `Tesoureiro`, `Representante de LEI/Lesti/EEC`, `Secretário(a)`).
  - **Outros Departamentos:** Cargos padrão (`Diretor`, `Co-diretor`, `Membro`).
- **Gestão de Acessos:** Ativação e desativação (soft delete) imediata de utilizadores da organização.
- **Recuperação Manual:** Botão para enviar um link de redefinição de palavra-passe diretamente para o e-mail real do membro.

### 📋 Quadro de Tarefas (Tasks)
- Criação e acompanhamento de afazeres.
- Atribuição de tarefas a membros específicos e associação a departamentos.
- Filtros por departamento, atribuídas a mim, criadas por mim e tarefas gerais.
- Permissões dinâmicas: Apenas a Mesa (acesso global), Diretores do departamento e o criador/atribuído podem atualizar ou apagar a tarefa.

### 📅 Calendário & Linha Temporal (Timeline)
- Visualização mensal e lista cronológica de todas as atividades, reuniões e marcos do ENEI 2027.
- Permissões de escrita restritas a administradores, diretores e membros da Mesa.

### 📂 Gestão de Documentos (Storage)
- Repositório interno com pastas organizadas por departamento.
- **Pasta Privada (Apenas Eu):** Upload de ficheiros pessoais visíveis apenas pelo próprio utilizador, independente do departamento.
- Integração direta com o Supabase Storage.

### 📞 Diretório de Contactos e Parcerias
- Gestão de entidades externas, oradores, patrocinadores e parceiros do evento.
- Classificação por tipo e níveis de contacto.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** [Next.js 16](https://nextjs.org/) (App Router), React 19, TailwindCSS, Lucide Icons.
- **Backend / Base de Dados:** [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Supabase Storage).
- **Segurança:** Políticas estritas de Row Level Security (RLS) baseadas no departamento (`Mesa` vs. Outros) e no estado ativo do utilizador.

---

## 🚀 Como Executar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/coenei-faro-27/staff-enei.git
cd staff-enei
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Cria um ficheiro `.env.local` na raiz do projeto com as seguintes chaves:
```env
NEXT_PUBLIC_SUPABASE_URL=a-tua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=a-tua-chave-anon-do-supabase
SUPABASE_SERVICE_ROLE_KEY=a-tua-chave-service-role-do-supabase
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
> **Nota:** Se as variáveis do Supabase não estiverem configuradas, a plataforma entrará automaticamente em **Modo Local Simulado (LocalStorage)** para que possas testar a interface de forma offline.

### 4. Executar o servidor de desenvolvimento
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) no teu navegador.

---

## 🗄️ Estrutura de Permissões (Supabase RLS)

As permissões do banco de dados seguem a seguinte hierarquia:
- **Administrador / Mesa:** Leitura e escrita global em tarefas, eventos, contactos e documentos públicos.
- **Diretores / Co-Diretores:** Leitura e escrita apenas no âmbito do seu próprio departamento.
- **Membros:** Leitura do departamento e escrita apenas em registos pessoais (ex: tarefas criadas por si ou atribuídas a si).
- **Privado:** Documentos na pasta `Privado` são protegidos por RLS baseada no ID do proprietário (`owner = auth.uid()`).
