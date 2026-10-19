# Blue Ocean H17.0.5 — Journey Free Canvas

Base: H17.0.4. O mapa da Jornada abre por padrão com uma faixa de etapas simples, semelhante à apresentação visual da referência fornecida pelo usuário (sem copiar marca ou ativos de terceiros).

**Começar:** Serviço → Nova Jornada → Em branco / Modelo → Mapa. Adicione etapas pelo botão Nova etapa ou pela última coluna; clique no cartão de uma etapa para editar seus dados. Filtros exibem pensamentos, emoções e pontos de contato sob demanda. Visualizações → Matriz detalhada volta ao editor anterior, e Voltar ao mapa livre restaura o mapa.

**Dados:** a edição usa os mesmos controladores `StudioController`, `ServiceGraph`, IDs das etapas e vínculo de contexto já existentes. A criação de necessidade ou evidência segue os vínculos canônicos existentes. Não há migração nem exclusão de objetos.

**Limitação da QA neste ambiente:** sem dependências npm baixadas, `tsc --noEmit` e Vite build completos não puderam ser certificados offline. O launcher do usuário executa `npm run release:verify` com dependências instaladas antes de servir a aplicação.
