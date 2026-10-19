# V1.20.5-H7.9 — Journey Maps 2.0

## Adicionado
- `journey-map-studio.ts` como camada funcional própria para Journey Maps.
- Pensamentos/expectativas por etapa.
- Necessidades canônicas por etapa (`needIds`).
- Problemas validados por etapa (`validatedProblemIds`), separados das fricções locais legadas.
- Evidências canônicas por etapa (`evidenceIds`).
- classificação de Momentos da Verdade: não classificado, positivo, negativo e crítico.
- nota explicativa para o Momento da Verdade.
- score determinístico de qualidade por etapa e média geral da Journey.
- métricas de cobertura de Necessidades, Evidências e Problemas.
- transição explícita Journey → Service Blueprint.
- `journey-maps-h79.css` para mapa, health strip, linhas semânticas e Inspector 2.0.

## Journey Map 2.0
A Journey passa a trabalhar com dez dimensões:
1. Ações do cliente
2. Pensamentos
3. Emoções
4. Necessidades
5. Touchpoints
6. Momentos da Verdade
7. Problemas validados
8. Evidências
9. Fricções da etapa
10. Oportunidades

Todas as linhas continuam recolhíveis. O mapa mostra sinais suficientes para leitura horizontal; edição profunda e vínculos ficam no Inspector lateral.

## Rastreabilidade
- Necessidades, Problemas validados e Evidências são distribuídos pelas etapas usando IDs do `DesignContextRef` da Journey.
- nenhuma entidade de Discovery é copiada ao ser vinculada à Journey.
- links fora do contexto canônico da Journey são rejeitados.
- fricção local de uma etapa continua sendo uma observação da Journey e não vira automaticamente um Problema validado.

## Qualidade
Cada etapa recebe score baseado em:
- nome da etapa;
- ação do cliente;
- pensamento/expectativa;
- emoção;
- necessidade conectada;
- touchpoint;
- evidência conectada.

O score geral é a média das etapas. Momentos da Verdade e Problemas são sinalizados separadamente porque não precisam existir em todas as etapas.

## Journey → Blueprint
O CTA `Preparar Blueprint` exige uma estrutura mínima real:
- ao menos 2 etapas;
- nome e ação do cliente em todas as etapas;
- ao menos 1 touchpoint na Journey;
- contexto canônico preservado com Persona, Problema e Evidência.

O Blueprint criado:
- aponta para a Journey de origem;
- herda o `DesignContextRef`;
- nasce sem objetos/lane content inventados;
- não cria Frontstage ou Backstage automaticamente.

## Melhorado
- o Inspector agora separa experiência do cliente, Momento da Verdade, contexto do Discovery, Touchpoints, fricções locais e oportunidades.
- criação de novas etapas inicializa os campos H7.9 de forma compatível com dados antigos.
- copiar/duplicar etapas preserva arrays contextuais sem compartilhar referências mutáveis.
- preflight Linux passa a verificar os arquivos críticos da H7.9.

## QA
- H7.9 Journey Maps 2.0: 41/41 PASS
- H7.8 Context-to-Service: 37/37 PASS
- regressão acumulada: 1671 OK / 0 FAIL
- preflight Linux: PASS
- lock verify: PASS
- source authority: PASS
- foundation smoke: 12/12 PASS
- syntax check: PASS

## Limitação de validação
`npm ci` voltou a exceder o tempo disponível do ambiente antes de terminar. A instalação parcial foi removida. Por isso `npm run typecheck` completo e `npm run build` completo não são classificados como PASS nesta geração.
