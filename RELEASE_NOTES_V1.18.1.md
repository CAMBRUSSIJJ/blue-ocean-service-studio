# BLUE OCEAN Service Studio — V1.18.1

## Compositor Ocean Performance

### Motivo
A gravação da V1.18.0 mostrou engasgos perceptíveis na onda no Firefox/Linux. A implementação anterior ainda animava grupos `<g>` dentro de um SVG grande, com strokes largos e gradientes. Mesmo usando `transform`, esse padrão pode exigir rerasterização do conteúdo vetorial. O uso de `alternate` e easing também desacelerava o movimento antes de inverter a direção, dando sensação de pausa.

### Adicionado
- Textura própria `bo-ocean-wave-1181.webp`, transparente, seamless e pré-renderizada (~63 KB).
- Preload da textura no `index.html`.
- Gate `ocean:performance:smoke` com 20 contratos.
- Classe de versão `bo-v1181`.

### Melhorado
- A onda agora é um único track de compositor com duas tiles idênticas.
- Movimento contínuo `linear infinite`, sem desaceleração e sem reversão.
- Apenas `transform: translate3d()` muda por frame.
- Mantidos fundo full-screen, Geist Sans e identidade da V1.18.0.

### Corrigido
- Removidos os grupos SVG animados, paths e gradientes que podiam provocar repaint/rasterização no Firefox/Linux.
- Removido comportamento `alternate` da onda.
- Atualizados os gates históricos V1.17.9/V1.18.0 para reconhecer a implementação otimizada sem enfraquecer os contratos funcionais.

### Removido
- SVG inline animado do `WaveBackdrop`.
- Três animações independentes de ondas.
- Easing/reversão da onda.

### Pendente
- Google/Microsoft ainda dependem de OAuth/backend real.
- Performance final deve ser observada no hardware real do usuário; esta versão reduz o custo da animação ao mínimo arquitetural sem remover o movimento.
