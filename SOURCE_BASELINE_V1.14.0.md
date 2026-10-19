# Source Baseline — V1.14.0

Base: V1.13.0 Blue Ocean Design System.

## Contratos preservados
- Service Graph schema 3;
- chaves `realtalent-*`;
- `RealTalentRuntime`;
- `dataBridge`;
- runtimes Journey/Blueprint/Research/Intelligence/Benefits/Review/Collaboration;
- import/export e recovery da V1.12.0;
- Design Tokens V2 da V1.13.0.

## Novos contratos
- `ActiveTab.home`;
- `RealTalentRuntime.api('workspaceHome')`;
- `whiteboardCore.createBlank(name)`;
- assets `v1140-workspace-home.js` e `v1140-workspace-home.css`.

## Regra
A Home é uma visualização agregada sobre dados existentes. Ela não mantém cópias próprias de Jornada, Blueprint, Pesquisa, Ações, Oportunidades, Benefícios ou Revisões.
