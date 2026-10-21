# Blueprint e marketing de serviços

A vista operacional representa a entrega do serviço em seis camadas. A edição direta continua no canvas; informações operacionais e estratégicas ficam disponíveis quando necessárias.

## Mapa visual como experiência principal (21/10/2026)

A tela principal segue a referência HTML recebida: cabeçalho editável, cenário da Persona, etapas em colunas, resumo por etapa, evidência física, ações do cliente, curva de emoções em cinco níveis, linha de frente, bastidores, processos, sistemas e apoio, faixas personalizadas e dores/ideias. O painel lateral mantém checklist, prioridade de melhoria, leitura automática e cobertura de qualidade. Notas são editáveis, duplicáveis, conectáveis e arrastáveis entre etapas da mesma faixa; o mapa pode mostrar só a visão do cliente.

Ao criar um Blueprint sem etapas, surge o assistente **Vamos montar um blueprint**, com objetivo, contexto, etapas sugeridas e possibilidade de personalizar. Dados exemplificativos não são inseridos sem ação explícita. A página de projetos/Blueprints continua sendo a biblioteca canônica do aplicativo.

A integração reutiliza registros reais do Service Graph: os cartões de operação são entidades do serviço; as Dores são registros de `pain` com etapa e metadados de gravidade/dimensão; as Ideias são `opportunity` associadas à etapa. Emoções escrevem nas etapas da Journey e na representação de emoção existente. Cobertura da qualidade conta dores/ideias por dimensão, **não mede SERVQUAL**. A pontuação de prioridade é uma heurística de triagem, não uma predição de satisfação. Nada é importado de um conjunto de dados fictícios.

**Editor avançado** oferece o editor antigo com seis camadas operacionais, governança, revisão da entrega, marketing de serviços e 7 Ps, vínculos, inspeção, bibliotecas, exportação, histórico e o restante das ferramentas existentes. **Mapa visual** retorna à nova tela. Os registros persistidos continuam compartilhados.

Teste novo: `python3 scripts/blueprint-reference-browser.py` após `npm run build`.

## Estrutura do mapa

| Camada | Conteúdo |
| --- | --- |
| Evidências do serviço | Telas, mensagens, documentos, ambientes e outros sinais percebidos pelo cliente |
| Cliente | A ação da pessoa em cada etapa |
| Frontstage | Interações visíveis entre o cliente e a organização |
| Backstage | Atividades executadas sem a presença visível do cliente |
| Processos de suporte | Rotinas e processos que sustentam os bastidores |
| Sistemas e recursos | Tecnologia, infraestrutura e recursos necessários à execução |

As três fronteiras são a **linha de interação**, entre cliente e frontstage; a **linha de visibilidade**, entre frontstage e backstage; e a **linha de interação interna**, entre backstage e suporte. Sistemas e recursos formam uma camada adicional de detalhamento da operação.

Evidência do serviço e evidência de pesquisa têm usos distintos. Um comprovante digital pode tornar a entrega perceptível; uma entrevista pode sustentar uma descoberta. A revisão só conta artefatos explicitamente classificados como percebidos pelo cliente e com formato físico, digital, documental ou humano. Registros antigos sem classificação continuam disponíveis e geram uma solicitação de revisão; a aplicação não os converte silenciosamente em artefatos do serviço.

## Detalhes das atividades

Selecione uma atividade de frontstage, backstage ou suporte e escolha **Editar**. O formulário reúne:

- Papéis responsáveis, canais, dependências, políticas e evidências, ligados aos registros do serviço.
- Estimativas de execução, espera, prazo combinado, capacidade e demanda por hora.
- Falha possível e ação de recuperação.
- Contribuição para a promessa e mensagem comunicada ao cliente.
- Atividades que precisam acontecer antes da atividade atual.

Campos numéricos vazios representam informação desconhecida. Zero é uma estimativa explícita para execução, espera, capacidade ou demanda; o prazo precisa ser maior que zero. Criar um papel ou canal pelo formulário não adiciona cartões desnecessários ao mapa. **Cancelar** descarta o rascunho; **Salvar** registra as alterações em uma transação que pode ser desfeita.

As estimativas de capacidade e demanda usam a mesma unidade de atendimentos por hora. A comparação aponta uma diferença declarada entre elas; não calcula automaticamente filas, turnos, sazonalidade ou capacidade compartilhada entre atividades.

## Promessa, 7 Ps e qualidade percebida

Em **Opções → Estratégia do serviço**, use a promessa da proposta do serviço ou defina uma promessa específica para o Blueprint. A opção herdada acompanha a proposta atual. Uma promessa específica permanece no documento e não altera a proposta compartilhada do serviço.

As seções opcionais permitem descrever os **7 Ps**: serviço/proposta de valor, preço, canais e acesso, comunicação, pessoas, processos e evidências físicas e digitais. Também permitem registrar critérios observáveis de **confiabilidade, responsividade, segurança e confiança, empatia e tangibilidade**, associando uma métrica existente quando houver.

Essas descrições apoiam a análise de marketing e qualidade. Elas não executam pesquisa de expectativas e percepções nem constituem uma avaliação SERVQUAL. Não são obrigatórias para desenhar um Blueprint.

## Leitura guiada opcional (21/10/2026)

O botão **Leitura guiada** no editor real do Blueprint abre um painel opcional com **Passo a passo**, **Visão do cliente** e **Qualidade**. A vista operacional, a matriz detalhada, as seis camadas, as três linhas, os controles profissionais, o histórico, os vínculos e as entidades permanecem intactos. Fechar o painel devolve toda a área ao canvas.

O checklist e as prioridades utilizam a cobertura real das camadas e as pendências da revisão da entrega. **Visão do cliente** apresenta uma leitura derivada das ações, interações visíveis e evidências de serviço classificadas, sem ocultar nem alterar os bastidores. A curva emocional lê as etapas existentes da Journey e grava alterações no `emotionScore` canônico (−2 a +2) e na emoção legada, numa transação reversível. No celular, a curva é somente leitura.

A aba **Qualidade** mostra a documentação dos cinco critérios perceptivos já associados ao Blueprint, não resultados de SERVQUAL ou pesquisa com clientes. O painel não cria automaticamente dores, oportunidades, métricas, atividades ou perfis fictícios. A experiência demonstrativa do arquivo HTML enviado foi incorporada como padrão de interação, **não como nova fonte de dados**.

Verifique com `node scripts/blueprint-guided-reading-test.mjs` e `python3 scripts/blueprint-guided-reading-browser.py` (depois de `npm run build`).

## Revisão da entrega

**Opções → Revisar entrega** analisa conteúdo e relações. Os detalhes de uma etapa também abrem a revisão daquela etapa. A revisão verifica:

- Conteúdo significativo nas camadas, ação do cliente e registros ausentes.
- Papéis e canais válidos, vínculos de outro serviço e referências indisponíveis.
- Atividades sem etapa, predecessores ausentes e dependências circulares.
- Valores inválidos; execução mais espera superior ao prazo combinado; demanda maior que capacidade.
- Informações de falha, recuperação, promessa e comunicação ainda não descritas.
- Métricas removidas ou associadas a critérios de qualidade vazios.

A contagem de camadas preenchidas é apresentada separadamente. Um desenho sem pendências recebe **Pronto para revisão humana**, sem selo automático de serviço validado. Confirme a operação e a percepção de qualidade com a equipe e com pessoas que usam o serviço.

## Compatibilidade e verificação

As entidades, seus identificadores, os vínculos, textos e metadados existentes são preservados. Na primeira abertura da vista operacional, a geometria do mapa é realinhada para acomodar a camada de evidências. O layout `service`, os detalhes operacionais e a estratégia são aceitos no ciclo de exportação/importação do schema.

Desktop e tablet permitem editar os detalhes. No celular, o modo de leitura permite consultar a revisão; ações de alteração ficam indisponíveis.

```sh
npm run blueprint:methodology:test
npm run build
npm run blueprint:methodology:browser
```

O teste de domínio cobre coerência, cálculos, vínculos, classificação, dados legados e o ciclo real de backup pelo schema. O teste de navegador cobre criação, formulários, cancelamento, histórico, classificação de evidência, revisão, recarga e telas menores. Ele requer Python com Playwright e Chromium. `AXE_PATH` permite indicar o arquivo `axe.min.js` para auditar os diálogos com critérios automáticos WCAG A/AA. Os resultados ficam em `artifacts/blueprint-methodology`.

Na entrega de 20/10/2026, `release:verify` passou com 148 suítes de QA, TypeScript e build completo. Passaram também 40 verificações de domínio do Blueprint, 42 de navegador para os novos fluxos, 59 dos editores compartilhados e 94 da Jornada. O teste visual produziu 10 capturas. Os cinco diálogos auditados com axe-core não apresentaram violações automáticas WCAG A/AA; essa auditoria não substitui a verificação manual de acessibilidade.
