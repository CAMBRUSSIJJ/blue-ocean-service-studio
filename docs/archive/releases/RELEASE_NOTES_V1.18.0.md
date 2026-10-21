# BLUE OCEAN Service Studio — V1.18.0

## Fluid Ocean & Geist Typography System

### Adicionado
- Fundo oceânico full-viewport na entrada e no loading.
- Geist Sans como fonte global, carregada com `font-display: swap` via Google Fonts.
- Escala tipográfica ampliada (`11/12/13/14/16/20/28/36/52px`) e controle XL de 44px.
- Gate `visual:1180:smoke`.

### Melhorado
- Login agora é um painel flutuante sobre o mesmo oceano visual, sem divisão rígida entre metade escura e metade branca.
- Onda usa somente transformações compositor-friendly (`translate3d`) em grupos SVG estáticos.
- Tipografia de React, runtimes legados, Whiteboard e Tailwind converge para Geist Sans.
- Tamanhos explícitos abaixo de 11px foram normalizados para 11px.

### Corrigido
- Eliminado Gaussian blur animado da onda, reduzindo custo de pintura e risco de lag.
- Removidas fontes hardcoded em superfícies principais; todas resolvem pelo token `--bo-font-sans`.

### Removido
- Corte vertical branco da entrada.
- Filtro `feGaussianBlur` e animação de glow dependente de filtro.

### Pendente
- Google e Microsoft ainda precisam de backend OAuth real.
- O carregamento da Geist depende de conectividade; sem rede, a pilha usa Inter/system-ui como fallback.
