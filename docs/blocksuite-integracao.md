# Integração experimental do BlockSuite/AFFiNE

O Blue Ocean inclui um editor visual opcional associado a um Whiteboard já existente.

## Como utilizar

1. Entre no serviço e abra **Whiteboards**.
2. Crie ou selecione um quadro existente.
3. No quadro, escolha **Editor visual (experimental)**.
4. Alterne entre **Canvas** e **Documento**.
5. Use **Exportar cópia** para guardar um snapshot JSON.

A experiência original de Whiteboard continua disponível. O BlockSuite é um documento Yjs separado: abrir, editar ou fechar **não altera o Service Graph** e não converte automaticamente itens, etapas, lanes ou evidências.

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
O editor isolado requer os parâmetros `serviceId` e `boardId` fornecidos pelo Blue Ocean.

## Restrições e dados

- **Piloto local-first:** o documento visual fica no IndexedDB do navegador e domínio atuais.
- **Sem colaboração em tempo real:** ainda não há servidor Yjs, permissões compartilhadas ou presença de outros usuários.
- **Sem sync com entidades:** exportar a cópia JSON não equivale ao backup do grafo do Blue Ocean.
- **Sem importação do snapshot neste piloto:** mantenha as cópias exportadas e preserve o armazenamento local até haver ferramenta de restauração.
- Limpar dados do navegador, trocar de computador, perfil ou domínio pode tornar o documento indisponível.

Para promoção a production, validar build principal e do adaptador, abertura do iframe, criação/edição, alternância Canvas/Documento, persistência após recarga, exportação e funcionamento do Whiteboard original.
