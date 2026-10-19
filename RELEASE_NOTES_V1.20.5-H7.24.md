# V1.20.5-H7.24 — Journey Library & Collapsible Sidebar

## Objetivo

Padronizar a perspectiva Journey com a biblioteca de Blueprint e tornar a sidebar desktop recolhível, sem quebrar Journey Maps 2.0, Journey Workspace 3.0, Blueprint 2.0 ou Whiteboard 2.0.

## Adicionado

- Biblioteca de Journeys dentro de `Blueprints > Journey`.
- Visualização em Cards e Tabela.
- Busca de Journey por nome.
- Estado vazio dedicado e criação diretamente na aba Journey.
- Modal próprio `Criar Journey` usando o runtime canônico `journeyHome`.
- Editor só é carregado depois da escolha/criação da Journey.
- Barra `Todas as Journeys` para retornar do editor à biblioteca.
- Sidebar desktop recolhível/expansível com preferência persistida em `localStorage`.
- Adaptação do seletor de serviço, seções, footer e ondas ao modo recolhido.

## Corrigido

- A aba Journey não abre mais automaticamente uma Journey arbitrária.
- O CTA superior não exibe mais `Criar Blueprint` quando a perspectiva ativa é Journey.
- A largura do conteúdo reage ao recolhimento da sidebar por flex layout, sem margens fixas.
- O modo recolhido não interfere na navegação móvel.
- O menu do serviço ganha posicionamento próprio quando a sidebar está compacta.

## Preservado

- Journey Cover System.
- Journey Editor UX 4.0.
- Journey Maps 2.0 e suas dez dimensões.
- Journey → Blueprint determinístico.
- Service Blueprint 2.0.
- Whiteboard 2.0.
- Service Graph canônico; nenhum armazenamento paralelo foi criado.

## Validação

- `npm run v1205h724:journey-library-sidebar-smoke`: 40/40 PASS.
- `npm run qa`: PASS, sem regressões.
- `npm run syntax:check`: PASS.
- `npm run lock:verify`: PASS.
- `npm run source:authority`: PASS.
- `npm run project-foundation:smoke`: PASS.
- `./preflight-linux.sh`: PASS.

`npm run typecheck` não foi validado neste ambiente porque `node_modules` não estava disponível e `npm ci` não concluiu dentro da janela de execução.
