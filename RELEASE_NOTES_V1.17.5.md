# BLUE OCEAN Service Studio V1.17.5 — Responsive & Accessibility Foundation

## Adicionado
- Breakpoints explícitos para desktop (>=1280), compacto (1024–1279), tablet (768–1023) e mobile (<600).
- Navegação mobile por drawer + barra inferior com Home, Jornadas, Blueprints e Ações.
- Skip link “Pular para o conteúdo”.
- Foco visível global para teclado.
- Suporte a `prefers-reduced-motion` e `prefers-contrast`.
- Runtime `responsiveAccessibility` para landmarks, ARIA e modo mobile do Whiteboard.
- Gate `responsive:a11y:smoke`.

## Melhorado
- Tablet usa alvos de toque >=40 px; mobile usa 44 px.
- Home vira coluna única no mobile e mantém CTAs acessíveis.
- Texto auxiliar/faint sobe para `#667085`, atingindo contraste AA em superfícies claras.
- Toast passa a usar `role=status`, `aria-live=polite` e `aria-atomic=true`.
- Sidebar mobile deixa de vazar sobre o conteúdo e vira drawer deliberado.

## Corrigido
- Fragmento de sidebar sobre conteúdo em telas pequenas.
- Header mobile sobrecarregado: ações secundárias deixam de competir por espaço.
- Whiteboard deixa de tentar reproduzir edição desktop em telefone.
- Inspector mobile deixa controles de edição desabilitados e prioriza leitura.
- Tool rail do Whiteboard mobile remove ações de criação/conexão.

## Removido
- Edição por drag, resize, conexão, paste e menu contextual do Whiteboard em telas <600 px.
- Dependência de motion para comunicar estados da interface.

## Preservado
Service Graph Schema V3, IDs `rt*`, storage legado, backups, migrations, persistência, Home 2.0, Library, Wizard 2.0, workspaces unificados e Whiteboard desktop/tablet.

## Pendente
- Auditoria Lighthouse/axe em browser real precisa rodar após `npm ci`/build em ambiente com registry disponível.
- Dark mode continua fora do escopo desta etapa.
- A próxima e última etapa do ciclo é Marca + Acabamento Final.
