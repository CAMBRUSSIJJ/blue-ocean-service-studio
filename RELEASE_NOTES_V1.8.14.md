# V1.8.14 — Journey Mapping Experience

## Objetivo

Trazer para o RealTalent Service Studio uma experiência de Journey Mapping mais próxima das melhores ferramentas especializadas do mercado, mantendo o Service Graph como fonte única de verdade.

## Entregas

- painel unificado **Mapa da jornada**;
- presets Essencial, Pesquisa, Medição e Completa;
- lanes configuráveis sem duplicação de dados;
- Persona reutilizável e persona ativa;
- Emotion Curve integrada à matriz;
- Current / Future / Current × Future;
- ação futura por etapa;
- estado Atual/Futuro por card;
- confiança de evidência: Hipótese / Parcial / Evidenciado;
- fonte e amostra da evidência no Inspector;
- resumo de evidências no painel;
- hierarquia Jornada → Sub-jornada por etapa;
- templates de mercado com exemplos preenchidos;
- visualizações salvas preservadas;
- redimensionamento de cards preservado;
- Smart Flow, Stage Flow e continuidade preservados.

## Arquitetura

Journey, Blueprint e Whiteboard continuam sendo visualizações dos mesmos objetos no Service Graph. A V1.8.14 não transforma a Jornada em um documento isolado.

## Compatibilidade

As chaves principais de persistência e Service Graph foram mantidas para preservar os dados existentes das versões anteriores.
