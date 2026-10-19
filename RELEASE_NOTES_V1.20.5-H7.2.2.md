# V1.20.5-H7.2.2 — Persona Simple / Advanced Configurator

## Adicionado
- Escolha explícita entre Persona **Simples** e **Avançada** antes da criação.
- Configurador visual inspirado no padrão de referência enviado pelo usuário, adaptado à identidade Blue Ocean.
- Três layouts persistentes: Perfil à esquerda, Equilibrado e Narrativa primeiro.
- Seleção de blocos da Persona antes da criação.
- Persistência canônica de `personaMode`, `personaLayout` e `personaSections` no Service Graph.
- O layout escolhido altera de fato a composição do editor da Persona.
- A completude passa a considerar somente os blocos selecionados.

## Melhorado
- Terminologia visual: `Avançada` substitui `Profissional` na nova experiência de Personas.
- Modo Simples remove a aba Comportamento e reduz a carga de preenchimento.
- Modo Avançado expõe comportamento, expectativas, restrições, gatilhos e alternativas.
- Canais permanecem disponíveis no modo Simples.

## Preservado
- Personas 2.0, Necessidades 2.0 e relações canônicas do Service Graph.
- Evidências, Uso, relações bidirecionais e remoção segura.
- Routing Recovery, Sidebar/Wave e preflight de branding.

## Limitações
- Imagem/avatar personalizado não foi adicionado nesta hotfix; o configurador trabalha com os campos canônicos atuais.
- Browser truth visual não foi executado neste ambiente porque o pacote de trabalho não possui `node_modules`.
- Full `npm run typecheck` deve ser executado após `npm ci`; sem dependências, TypeScript acusa ausência de React/JSX.
