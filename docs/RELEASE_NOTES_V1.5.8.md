# V1.5.8 — Import / Export Engine

## Objetivo
Dar ao Whiteboard uma camada confiável de portabilidade, backup e publicação visual antes do ciclo de performance e polimento final.

## Formatos
- Projeto completo: JSON de backup RealTalent
- Quadro/seleção/container: JSON de fragmento
- Visual: SVG, PNG @2x, PDF
- Dados: CSV de entidades

## Segurança de importação
Backups completos são validados e criam checkpoint local antes da substituição. Fragmentos nunca apagam o quadro atual; são inseridos com novos IDs de instância.
