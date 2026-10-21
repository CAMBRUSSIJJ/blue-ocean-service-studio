# Como contribuir

O Blue Ocean Service Studio usa React, TypeScript e Vite. A
[documentação](docs/README.md) apresenta os fluxos atuais; o
[arquivo histórico](docs/archive/README.md) registra decisões e entregas antigas.

## Preparar o ambiente

1. Use Node.js 22 e npm 10 ou superior.
2. Execute `npm ci` na raiz do checkout.
3. Inicie `npm run dev` e valide o fluxo local sem conta.

Use o [guia de desenvolvimento](docs/desenvolvimento.md) para detalhes.
Nunca inclua credenciais, dados reais de clientes ou backups privados no Git.

## Propor uma mudança

- Para defeitos, abra uma issue com passos de reprodução, resultado esperado,
  resultado observado e ambiente utilizado.
- Para melhorias, explique o problema de quem usa o produto e o resultado
  pretendido. Vincule a proposta à issue quando houver uma discussão anterior.
- Para vulnerabilidades, siga [SECURITY.md](SECURITY.md), evitando detalhes
  sensíveis em issues públicas.

Trabalhe em uma branch com nome descritivo, por exemplo
`fix/journey-card-focus` ou `docs/guia-de-instalacao`. Prefira commits pequenos,
com mensagens que expliquem a mudança. Uma descrição de pull request deve
permitir que outra pessoa entenda o problema, o comportamento final e como foi validado.

## Preservar os dados e a arquitetura

- Altere o código em `src/`; não corrija bundles ou assets gerados manualmente.
- Preserve IDs, referências canônicas e metadados desconhecidos em importações
  e migrações. Jornada, Blueprint e Whiteboard compartilham o mesmo grafo.
- Mudanças de edição devem manter cancelamento, desfazer/refazer e persistência.
- Não remova testes para contornar falhas. Ao mover documentação usada por um
  contrato, atualize o caminho e preserve a verificação.
- Use `npm ci` para reproduzir o lockfile. Atualize dependências e lockfile
  juntos apenas quando essa atualização fizer parte do objetivo da mudança.

## Verificar a entrega

| Mudança | Verificação mínima |
| --- | --- |
| Documentação | `npm run docs:check` e revisão das instruções e links. |
| Código da aplicação ou contratos | `npm run release:verify` e testes comportamentais pertinentes. |
| Interface ou navegação | Verificações anteriores e teste real no navegador do fluxo afetado. |
| Persistência ou domínio | Testes de dados, referências, imutabilidade e roundtrip de JSON aplicáveis. |

Os comandos e limites de cada suíte estão no [guia de testes](docs/testes.md).
Informe testes que passaram, falharam ou não foram executados, com o motivo.
Para mudanças de interface, anexe capturas com dados fictícios e descreva os
cenários e tamanhos de tela verificados.

Antes do pull request, revise `git diff --check` e `git status --short`.
Mantenha `node_modules/`, `dist/`, resultados em `artifacts/` e arquivos de
ambiente fora do commit. Coloque novas notas históricas na categoria apropriada
em `docs/archive/`, sem voltar a acumular relatórios na raiz.

## Licenciamento e convivência

O repositório ainda não declara licença de uso ou redistribuição. Não acrescente
uma licença em nome de terceiros nem altere atribuições sem autorização do responsável.
Ao participar, siga o [código de conduta](CODE_OF_CONDUCT.md).
