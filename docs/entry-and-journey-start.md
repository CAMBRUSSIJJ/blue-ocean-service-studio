# Entrada e início da Jornada

A visão geral do projeto mostra o serviço, os elementos e o resumo do trabalho. A seção duplicada “Ferramentas e configurações” foi removida. Biblioteca, arquivos, equipe, configurações e templates continuam acessíveis pela navegação correspondente.

## Entrada

O login ocupa a largura inteira da janela. Seu layout fica isolado das regras de margem, fundo e campos do workspace, que antes criavam faixas brancas e contornos duplicados.

As ondas usam a textura WebP existente em um movimento contínuo de `transform`. As camadas antigas de fundo são desativadas nessa tela. A preferência de movimento reduzido congela as ondas. Em telas menores, o formulário aparece abaixo da apresentação, com rolagem normal e todos os comandos acessíveis.

## Começo do mapa

A Jornada mantém o editor exclusivo em tela inteira e uma barra compacta. O mapa ganha uma superfície própria, cabeçalhos de etapas com direção visual, ícones nas faixas e áreas de escrita visíveis nas células vazias.

Um mapa sem conteúdo mostra uma introdução e um exemplo ilustrativo. A ilustração não cria dados. A pessoa pode continuar em branco ou escolher uma estrutura inicial:

- Sem etapas: adiciona **Antes, Durante e Depois**.
- Com etapas existentes: mantém essas etapas.
- Acrescenta as faixas **Ações do cliente, Pensamentos e Emoções**, sem duplicar as que já existem.
- Preserva faixas personalizadas, cartões e configurações.

A estrutura não inventa ações, pensamentos, pesquisas ou observações. Todas as alterações entram em uma transação de histórico e podem ser desfeitas/refeitas. A escolha de continuar em branco também é guardada por documento.

## Verificação

```sh
npm run journey:starter:test
npm run build
npm run entry:browser
npm run journey:browser
```

Os testes de navegador usam Python com Playwright e Chromium. `AXE_PATH` pode apontar para `axe.min.js` para auditar os fluxos com critérios automáticos WCAG A/AA. As capturas e os resultados desta experiência ficam em `artifacts/entry-journey`.

Na entrega de 20/10/2026, passaram 149 suítes de QA, 8 testes da estrutura inicial, 40 verificações da nova experiência no navegador, 94 da Jornada e 59 dos editores compartilhados. O teste visual produziu 10 capturas. Os cinco estados auditados desta experiência não apresentaram violações automáticas WCAG A/AA; a auditoria automática não substitui uma verificação manual completa.
