# V1.20.5-H7.40-H7 — Guided Service Workspace

## Objetivo
Transformar o Service Workspace de uma coleção de ferramentas em um fluxo guiado que indique ao usuário o que fazer agora, sem usar IA para decidir a sequência.

## O que mudou
- **Estruturação do serviço** substitui a leitura ambígua de maturidade/saúde na Visão Geral.
- Novo **Próximo passo recomendado**, calculado por regras determinísticas sobre Journey, Canais, Blueprint, pesquisa, protótipos, aprendizados, melhorias, outcomes e operação.
- Indicadores secundários ficam recolhidos em **Ver indicadores**.
- **Continue de onde parou** usa artefatos recentes de forma compacta.
- O fluxo metodológico virou um stepper: **Entender → Projetar → Validar → Melhorar → Operar**.
- Cada fase mostra suas capacidades em **linhas escaneáveis**, com estado, métrica e ação, em vez de cards densos.
- Estados visíveis: **Estruturado**, **Em construção**, **Não iniciado**, **Requer atenção** e **Leitura derivada**.
- **Cockpit** e **Prontidão** permanecem leituras derivadas e não entram no denominador das 16 capacidades estruturais.
- Ferramentas internas recebem **cabeçalho compacto**, reduzindo a repetição do hero/KPIs ao trabalhar em Pesquisa, Journey, Blueprint, Protótipos etc.
- CTAs da recomendação navegam para o alvo real; quando o alvo ainda não existe, usam a criação apropriada.

## Guidance Engine
A recomendação não usa aleatoriedade nem modelo generativo. Exemplos de regra:
- Journey > 0 + Canais > 0 + Blueprint = 0 → **Criar Blueprint**.
- Serviço sem pesquisa suficiente → **Começar pesquisa**.
- Serviço desenhado sem teste → **Criar experimento**.
- Iniciativa sem outcome → **Configurar Resultados**.

## Compatibilidade
Todos os domínios H7.22–H7.40 permanecem preservados. Marcadores de contratos históricos existem apenas no source para regressão e não restauram a UI anterior.

## QA
- Suíte acumulada: **4672 OK / 0 FAIL**.
- H7.40-H7: **36/36 PASS**.
- Chromium real: **10/10 PASS**.
- Foundations, syntax, lock, source authority e preflight: **PASS**.

## Limitação de ambiente
`npm ci --include=dev` não concluiu neste ambiente e precisou ser encerrado. Portanto React typecheck completo e build Vite não são declarados como PASS nesta execução. O pacote final permanece limpo, sem `node_modules` parcial.
