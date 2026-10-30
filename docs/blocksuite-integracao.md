# Integração experimental do BlockSuite/AFFiNE

O Blue Ocean usa o editor visual BlockSuite como experiência padrão dos Whiteboards. A versão clássica permanece acessível para compatibilidade e migração sem perda de dados.

## Como utilizar

1. Entre no serviço e abra **Whiteboards**.
2. Crie ou selecione um quadro existente.
3. Clique em **Abrir canvas** para iniciar o novo editor visual (ou crie um Whiteboard, que abre diretamente nele).
4. Alterne entre **Canvas** e **Documento**.
5. Use **Exportar cópia** para guardar um snapshot JSON.

O **Quadro clássico** fica no topo do editor novo e no menu do quadro. O conteúdo desenhado no BlockSuite é um documento Yjs separado. Use o painel **Objetos do serviço** para criar Personas, Necessidades, Dores, Jobs, Hipóteses e Evidências canônicas, vinculando-as ao Service Graph. O conteúdo visual livre não é automaticamente convertido e não há sincronização reversa.

## Instalação e publicação

A instalação de dependências da raiz do projeto permanece com `npm ci`.

Em seguida, `npm run build` executa automaticamente:
```sh
npm --prefix integrations/blocksuite install --no-audit --no-fund --package-lock=false
npm --prefix integrations/blocksuite run build
```
O Vite do adaptador escreve os artefatos em `public/blocksuite`. A compilação da raiz publica essa pasta em `dist/blocksuite`, incluindo `blue-ocean-blocksuite.json`, usada pelo app para detectar disponibilidade.

Para desenvolvimento isolado:
```sh
cd integrations/blocksuite
npm install
npm run dev
```
A opção **Copiar cartões para o canvas** no painel de contexto importa representações dos cartões antigos, com deduplicação por ID no Yjs; os cartões originais e o Service Graph são preservados.\n\nO editor isolado requer os parâmetros `serviceId` e `boardId` fornecidos pelo Blue Ocean.

## Restrições e dados

- **Piloto local-first:** o documento visual fica no IndexedDB do navegador e domínio atuais.
- **Sem colaboração em tempo real:** ainda não há servidor Yjs, permissões compartilhadas ou presença de outros usuários.
- **Sem sync com entidades:** exportar a cópia JSON não equivale ao backup do grafo do Blue Ocean.
- **Sem importação do snapshot neste piloto:** mantenha as cópias exportadas e preserve o armazenamento local até haver ferramenta de restauração.
- Limpar dados do navegador, trocar de computador, perfil ou domínio pode tornar o documento indisponível.

Para promoção a production, validar build principal e do adaptador, abertura do iframe, criação/edição, alternância Canvas/Documento, persistência após recarga, exportação e funcionamento do Whiteboard original.
