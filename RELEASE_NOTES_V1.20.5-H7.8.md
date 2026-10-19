# V1.20.5-H7.8 — Context-to-Service Handoff

## Adicionado
- `design-handoff.ts` como ponte canônica entre Service Definition e as ferramentas de desenho.
- `DesignContextRef` versionado no domínio para preservar referências de Persona, Necessidade, Job, Dor, Problema e Evidência.
- preparação contextual de Journey, Service Blueprint e Whiteboard diretamente da Service Definition.
- painel Context-to-Service na fase Desenhar do Dashboard.
- contexto visível dentro de Journey Maps, biblioteca de Blueprints e biblioteca de Whiteboards.
- `startFromDefinition` no Service Builder Assistant para iniciar a composição com Persona, Problema e Evidência já selecionados.
- `design-handoff-h78.css` para o novo handoff e seus estados responsivos.

## Melhorado
- `Montar com o contexto já criado` deixa de abrir uma composição desconectada da Service Definition.
- Journey preparada recebe referências canônicas, mas nasce sem etapas inventadas.
- Blueprint preparado fica ligado a uma Journey e ao contexto, mas não cria lanes/conteúdo fictício.
- Whiteboard preparado usa Smart Objects referenciando entidades canônicas em vez de duplicar Personas, Problemas ou Evidências.
- contexto secundário relacionado (Necessidades, Jobs e Dores) é recuperado automaticamente a partir das relações existentes.
- fase Desenhar passa a mostrar promessa, resultado, fronteiras e entradas de contexto antes de abrir as ferramentas.
- compatibilidade preservada com o nome do Whiteboard guiado e com a nomenclatura `Service Frame` exigida pelos contratos anteriores.

## Regra de produto
Contexto validado não é copiado para Journey, Blueprint ou Whiteboard. A Service Definition continua sendo a origem e as ferramentas de desenho recebem referências canônicas. Preparar uma ferramenta cria somente a estrutura mínima necessária para começar; etapas, lanes e conteúdo de serviço não são inventados pelo sistema.

## Fluxo
`Persona + Problema + Evidência → Service Definition → Context-to-Service Handoff → Journey / Blueprint / Whiteboard`

## QA
- H7.8: 37/37 PASS
- regressão acumulada: 1630 OK / 0 FAIL
- Service Builder Assistant: 51/51 PASS
- Workspace IA H3: 68/68 PASS
- preflight Linux: PASS
- lock verify: PASS
- source authority: PASS
- foundation smoke: 12/12 PASS
- syntax check: PASS
- full typecheck/build: não marcados como PASS porque o source final não contém `node_modules`; a tentativa de typecheck sem dependências falha já na resolução de módulos base como React.
