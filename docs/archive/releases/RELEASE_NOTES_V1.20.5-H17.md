# Blue Ocean Service Studio V1.20.5-H17

## Single Experience Baseline

H17 encerra a divisão visível por níveis de experiência. O produto volta a ter uma única experiência canônica, baseada na projeção anteriormente chamada **Avançado**.

### O que muda
- O seletor de modo é removido do cabeçalho.
- Não existem escolhas Fundamentos / Aplicado / Avançado na UI.
- O runtime sempre usa a projeção completa, com todas as capacidades disponíveis.
- A indicação "Modo · Avançado" é removida das ferramentas.
- Preferências antigas em `bo-experience-profile` não controlam mais a interface.

### Compatibilidade
As estruturas H16 permanecem em fonte somente para preservar regressões e permitir migração segura. Elas não são alcançáveis pela experiência atual e não alteram dados do ServiceGraph.
