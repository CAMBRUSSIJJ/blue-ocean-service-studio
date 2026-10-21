# Blueprint Guided / Professional + Learning — V1.8.5

## Objetivo

Reduzir a barreira de entrada de usuários não especialistas sem empobrecer a experiência de profissionais de Service Design.

## Princípio

`Service Graph` e `Blueprint Grid` permanecem invariáveis. O modo de trabalho altera apenas linguagem, densidade de ajuda e apresentação.

## Estado persistido

`meta.blueprintLearning`:

- `mode`: `guided | professional`;
- `showTips`;
- `onboardingCompleted`;
- `onboardingStep`;
- `learned.stages`;
- `learned.lanes`;
- `learned.lines`;
- `learned.cells`.

## Guiado

Apresenta rótulos orientados à ação, termos técnicos secundários, ajuda `?`, explicações de célula e tour progressivo.

## Profissional

Apresenta nomenclatura técnica e reduz explicações persistentes no canvas.

## Tour

O tour usa elementos reais do Blueprint como alvos e pode ser pulado ou reiniciado pela aba **Aprender**.

## Contrato

A mudança Guiado ↔ Profissional não pode:

- criar ou excluir entidades;
- mudar `stageId`;
- mudar `laneKey`;
- alterar relações;
- criar um segundo Blueprint;
- modificar layouts além da apresentação textual.
