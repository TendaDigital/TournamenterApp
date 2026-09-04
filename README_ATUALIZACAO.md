# Manual de Instalação, Execução e Atualizações do TournamenterApp

## 1. Visão Geral das Atualizações de Compatibilidade

O **TournamenterApp** é uma aplicação desktop desenvolvida em Electron para gerenciamento de servidores e torneios da plataforma *Tournamenter*.

O projeto foi atualizado para funcionar perfeitamente com ambientes modernos (**Node.js v18/v20/v22+** e versões recentes do **Electron**).

### Principais Ajustes Realizados:
1. **Suporte ao Node.js Recente (v22+) e Electron**:
   - Ajustada a configuração de `webPreferences` (`nodeIntegration: true`, `contextIsolation: false`) para manter o funcionamento nativo dos módulos Node.js e comunicação IPC na interface renderer.
2. **Correção de Dependências Front-end (Bower / AngularJS)**:
   - Atualizado o repositório da biblioteca `ngFx` no `bower.json` para garantir o download correto dos pacotes durante a pós-instalação (`postinstall`).
   - Mapeado o arquivo `underscore.js` na pasta de componentes (`public/components/underscore/underscore.js`).
3. **Disponibilização Global das Bibliotecas Globais (`_` / Lodash)**:
   - Adicionada a exposição de `window._` no arquivo `public/index.html`, resolvendo pendências de execução dos controllers (`Window.js`, `ServerRunner.js`, etc.).
4. **Usabilidade e Interatividade dos Menus (Header e Painéis Laterais)**:
   - Atualizados os chamadores de menus do Angular Material (`$mdMenu.open($event)` em substituição à sintaxe legada).
   - Ajustada a sintaxe do `dashboard.menu.html` e inclusão de propriedades `aria-label` exigidas pelo Angular Material nos ícones e botões dos painéis retráteis.

---

## 2. Pré-requisitos do Sistema

- **Node.js**: v18.x, v20.x ou v22.x (testado e validado na v22.19.0).
- **npm**: v9.x ou v10.x (testado na v10.9.3).
- **Git** e Terminal Linux / Windows / macOS.

---

## 3. Passo a Passo para Instalação e Execução

### Passo 1: Acessar o Diretório do Projeto
```bash
cd /TournamenterApp
```

### Passo 2: Instalar as Dependências
Execute o comando abaixo:
```bash
npm install
```

> **Nota:** Este comando baixa os pacotes Node e executa automaticamente o script `postinstall` (`bower install && bower-installer`), instalando todos os componentes web necessários na pasta `public/components`.

### Passo 3: Iniciar a Aplicação
Para rodar o programa em ambiente de desenvolvimento:
```bash
npm start
```

*Caso utilize ambiente Linux com restrição de permissão no Sandbox do Chromium:*
```bash
npx electron . --no-sandbox
```

---

## 4. Recursos da Aplicação e Como Utilizar

- **Criar Servidor**: Acesse o menu **Servers -> New Server** no topo da janela ou utilize as ações do painel lateral **Created Servers**.
- **Gerenciar Instâncias**:
  - Clique na instância criada para abrir a janela de configurações.
  - Defina o **Nome do Servidor**, a **Porta**, a **Senha do Admin** e pastas de banco de dados (`DB_FOLDER`).
  - Ative a chave no topo para iniciar/parar a execução da instância do *Tournamenter*.
- **Ferramentas do Desenvolvedor**: Acesse o menu **Developer** para abrir DevTools ou recarregar a janela.

---

## 5. Resolução de Problemas Comuns (Troubleshooting)

- **Erro de Sandbox no Linux (`FATAL:setuid_sandbox_host.cc`)**:
  - Execute o aplicativo via terminal passando a flag `--no-sandbox`: `npx electron . --no-sandbox`.
- **Recompilar Assets Web do Front-end**:
  - Caso os componentes visuais não carreguem, execute: `npx bower install && npx bower-installer`.
