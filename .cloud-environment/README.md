# Ambiente de desenvolvimento na nuvem

Esta pasta versiona a configuração preparada para o checkout em
`/workspace/blue-ocean-service-studio`, em Linux x86_64.

- `install.sh`: instala Node 22.23.4 e npm 10.9.2, restaura as dependências com
  `npm ci`, gera os assets locais e verifica os pré-requisitos.
- `activate.sh`: ativa o Node/npm instalados e define o caminho do Chromium.
- `start.md`: descreve a inicialização, as verificações de prontidão e os testes.

O ambiente base usado na validação já fornece Python, Playwright 1.62.0,
Pillow 12.3.0 e `/usr/bin/chromium`. O script verifica esses pré-requisitos;
não instala os componentes do ambiente base.

```bash
cd /workspace/blue-ocean-service-studio
bash .cloud-environment/install.sh
source .cloud-environment/activate.sh
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Conclua instalação, build e QA antes de iniciar o Vite. Caso execute comandos
que regenerem os assets com o servidor ativo, reinicie o Vite para atualizar
seu cache de arquivos públicos.

## Validação realizada em 21/10/2026

Base validada: `b0162b6422b32e77d0385a523572e7fc1e7337ce`.

- Instalação repetida com `npm ci`: passou, mantendo o lockfile.
- `npm run release:verify`: passou, incluindo TypeScript, 149 suítes de QA,
  build de produção e verificação de integridade do `dist`.
- Seleção do editor e testes comportamentais da Jornada: passaram
  (`editor:selection:test`, `journey:a2:test`, `journey:h1709:move:test`,
  `journey:h1709:test`, `journey:h1709:p3:test`, `journey:layout:test`).
- `entry:browser`: 35/35 verificações passaram na distribuição e no servidor
  de desenvolvimento após reiniciá-lo, incluindo celular.
- `blueprint:methodology:browser`: 37/37 verificações passaram.
- `h1710-journey-template-whiteboard-browser.py`: 20 verificações passaram.
- Respostas HTTP da versão e dos assets de runtime: verificadas.

A primeira execução de entrada/Jornada no servidor de desenvolvimento falhou
no celular porque a regeneração concorrente de assets invalidou o cache do
Vite. O reinício do servidor corrigiu o carregamento dos arquivos; a mesma
suíte passou integralmente. Não foi necessária alteração no código da aplicação.

O build informou um aviso de tamanho de bundle. O doctor informou um aviso de
DNS do registro npm; a instalação funcionou pelo proxy configurado. Nenhum
dos dois avisos impediu os checks acima.

Auditorias adicionais com `AXE_PATH` e as demais suítes visuais opcionais não
foram executadas neste onboarding. Os dados da aplicação permanecem no
armazenamento local do navegador; o fluxo local não exige credenciais externas.

Os campos `install_script` e `start_skill` também foram salvos no rascunho das
configurações do ambiente. Versionar estes arquivos no GitHub não publica o
snapshot da máquina: essa publicação continua sendo feita pela interface de
configurações do ambiente. A restauração em uma nova tarefa ainda não foi
validada.
