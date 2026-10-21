# BLUE OCEAN Service Studio — V1.20.5-H7.19-H1
## Visual Recovery & Motion Stabilization

Hotfix sobre H7.19 para corrigir regressões visuais observadas no Login e na sidebar sem desfazer o Journey Cover System nem a estrutura da Home.

## Bugs comprovados e causas

### 1. Faixas/fantasmas no fundo do Login
A H7.19 reutilizava `blue-ocean-surface-dark-h717.svg` simultaneamente na onda base, na camada `current` e na camada `foam`. As duas cópias adicionais eram recortadas em alturas diferentes e a corrente usava `mix-blend-mode: screen`, gerando bandas sobrepostas e aparência de retângulos/ondas duplicadas.

**Correção:** apenas a camada base mantém a arte de onda. `current` e `foam` agora são campos atmosféricos com radial gradients de bordas totalmente feathered. O `screen blend` foi removido.

### 2. Sidebar com bolhas grandes e desalinhamento
A H7.19 elevou o holder de ícone para `28x28` dentro de linhas de navegação de `32px`. Além disso, a superfície semântica da H7.18 continuava na cascata. Resultado: pouco respiro vertical, círculos coloridos dominando o texto e aparência de ícones desalinhados.

**Correção:** glyph holder reduzido para `20x20`, fundo transparente em repouso, traço de 17px e cor base unificada. Cor semântica aparece apenas em hover; ativo usa Current Blue compacto.

### 3. Conflito entre estado ativo e ripple de clique
A H7.19 reutilizava `button::after` para o indicador ativo. A H7.0.4 já usa o mesmo `::after` para o ripple de clique. O CSS mais específico da H7.19 podia sobrescrever o ripple e criar formas anômalas no item ativo.

**Correção:** indicador ativo volta a usar `::before`. `::after` fica livre e o ripple é restaurado explicitamente quando `is-wave-source` está presente.

### 4. Excesso de cores na navegação
Todos os módulos exibiam superfícies coloridas mesmo em repouso, produzindo uma sidebar visualmente fragmentada.

**Correção:** resting state neutro Blue Ocean; semântica aparece no hover. O item ativo permanece azul da marca.

### 5. Marcadores de seção pareciam artefatos
As mini-ondas antes de `DESENHO DO SERVIÇO`, `CONTEXTO` e `GESTÃO` pareciam traços soltos e competiam com os ícones.

**Correção:** substituição por filete vertical aqua/blue discreto e labels neutralizadas.

### 6. Onda duplicada no rodapé do Dashboard
A H7.18 desenhava outra cópia do SVG claro sobre o background H7.17, criando linhas próximas e excesso de camadas.

**Correção:** o Dashboard mantém apenas a superfície ilustrada H7.17; a camada animada agora é um glow radial sem duplicar a onda.

## Preservado
- layout H7.15;
- Ocean Surface H7.17;
- Journey Cover H7.18-H1;
- upload/restauração de capa da Journey;
- glyphs Blue Ocean canônicos;
- animação com `prefers-reduced-motion`;
- ripple de navegação;
- funcionalidades e rotas existentes.

## Gates executados
- H7.19-H1: 28/28
- H7.19: 40/40
- H7.18-H1: 35/35
- H7.18: 38/38
- H7.17: 30/30
- `npm run qa`: 2069 OK / 0 FAIL
- `npm run syntax:check`: PASS
- `npm run lock:verify`: PASS
- `npm run source:authority`: PASS
- `npm run foundation:smoke`: 12/12
- `preflight-linux.sh`: PASS

## Limitação de validação
`npm ci` não concluiu dentro do limite do ambiente. O `npm run typecheck` sem dependências instaladas não é válido como gate completo porque React, `react/jsx-runtime` e `lucide-react` não estão disponíveis. `syntax:check` passou.
