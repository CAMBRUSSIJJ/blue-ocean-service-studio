#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -1)"; VERSION="${VERSION:-dev}"
fail=0
check_file(){ if [[ -f "$1" ]]; then printf '✓ %s\n' "$1"; else printf '✗ ausente: %s\n' "$1"; fail=1; fi; }
echo "BLUE OCEAN Service Studio V${VERSION} — Service Project Foundation · Discovery-first · Persona Studio · Problem & Evidence Studio · Service Definition Studio · Service Context Library · Structured Service Frame · Service Readiness · Frontstage/Backstage Advanced · V1.20.5-H1 Full Typecheck Hotfix · H2 Visual Recovery · H3 Workspace IA & Blueprint Migration · H4 Typecheck Cleanup · H5 CSS Import Order · H6 Routing & Layer Recovery · H7.0 Dashboard Polish · H7.0.1 Sidebar & Wave Polish · H7.0.2 Preflight Branding Hotfix · H7.9 Journey Maps 2.0 · H7.10 Service Blueprints 2.0 · H7.11 Whiteboard 2.0 · H7.12 Brand Experience & Workspace Home 2.0 · H7.13 Blue Ocean Identity System · H7.14 Service Depth & Adaptive Home · H7.15 Ocean Workspace Home · H7.16 Blue Ocean Object Language · H7.17 Ocean Surface & Background System · H7.18 Animated Ocean Branding & Navigation Icons · H7.18-H1 Journey Cover System · H7.19 Motion Identity & Sidebar Icon System · H7.19-H1 Visual Recovery & Motion Stabilization · H7.20 Dashboard Composition & Density · H7.20-H1 Dashboard Balance Recovery · H7.21 Journey Workspace 3.0 · H7.22 Unified Service Blueprint Workspace · H7.23 Journey Editor UX 4.0 · H7.23-H1 Journey Typecheck Cleanup · H7.24 Journey Library & Collapsible Sidebar · H7.25 Service Ecology & Stakeholder Network · H7.26 Research Studio & Insight Pipeline · H7.27 Service Proposition & What-if Scenarios · H7.28 Blueprint Semantic Zoom & Custom Layers · H7.29 Channels + Touchpoints + Continuity · H7.30 Service Prototype Lab · H7.31 Evidence & Learning · H7.32 Decision & Iteration · H7.33 Current × Future Service · H7.34 Problems, Opportunities & Prioritization · H7.40 Professional Product Hardening · Canonical lifecycle"
echo 'Preflight Linux'
check_file package.json; check_file package-lock.json; check_file src/main.tsx; check_file src/App.tsx; check_file src/views/WorkspaceHome.tsx; check_file src/runtime/home3.css; check_file src/runtime/attention-engine.css; check_file src/runtime/workspace-preferences.css; check_file src/services/attention-engine.ts; check_file src/services/continue-engine.ts; check_file src/services/workspace-preferences.ts; check_file src/services/service-architecture-engine.ts; check_file src/runtime/service-architecture.css; check_file src/runtime/dashboard-parity.css; check_file src/runtime/guidance-engine.js; check_file src/runtime/guidance-engine.css; check_file src/runtime/creation-reset.css; check_file src/runtime/service-builder-assistant.css; check_file src/runtime/interaction-structure-ux.css; check_file src/runtime/service-project-home.css; check_file src/views/WhiteboardsView.tsx; check_file scripts/v1188-guided-builder-smoke.mjs; check_file scripts/v1189-creation-architecture-reset-smoke.mjs; check_file scripts/v1190-service-builder-assistant-smoke.mjs; check_file scripts/v1191-whiteboard-core-reliability-smoke.mjs; check_file scripts/v1192-visual-service-builder-smoke.mjs; check_file scripts/v1193-interaction-structure-ux-smoke.mjs; check_file scripts/v1195-ux-truth-runtime-smoke.mjs; check_file scripts/v1195-browser-truth.py; check_file scripts/v1196-service-project-foundation-smoke.mjs; check_file src/services/service-project.ts; check_file src/services/discovery-workspace.ts; check_file src/services/persona-studio.ts; check_file src/services/problem-evidence-studio.ts; check_file src/services/service-definition.ts; check_file scripts/v1197-service-home-smoke.mjs; check_file scripts/v1198-discovery-workspace-smoke.mjs; check_file scripts/v1199-persona-studio-smoke.mjs; check_file scripts/v1199-browser-persona-studio.py; check_file scripts/v1200-problem-evidence-studio-smoke.mjs; check_file scripts/v1200-browser-problem-evidence-studio.py; check_file scripts/v1201-service-definition-smoke.mjs; check_file scripts/v1201-browser-service-definition.py; check_file scripts/v1201h1-workspace-home-typecheck-smoke.mjs; check_file src/services/context-library.ts; check_file src/views/WorkspaceLibraryView.tsx; check_file src/views/WorkspaceDashboardView.tsx; check_file src/views/BlueprintWorkspaceView.tsx; check_file src/runtime/workspace-library-h3.css; check_file scripts/v1202-context-library-smoke.mjs; check_file scripts/v1202-browser-context-library.py; check_file src/services/service-frame.ts; check_file scripts/v1203-service-frame-smoke.mjs; check_file scripts/v1203-browser-service-frame.py; check_file src/services/service-readiness.ts; check_file scripts/v1204-service-readiness-smoke.mjs; check_file scripts/v1204-browser-service-readiness.py; check_file src/services/frontstage-backstage.ts; check_file scripts/v1205-frontstage-backstage-smoke.mjs; check_file scripts/v1205-browser-frontstage-backstage.py; check_file scripts/v1205h1-full-typecheck-hotfix-smoke.mjs; check_file scripts/v1205h2-visual-architecture-recovery-smoke.mjs; check_file scripts/v1205h3-workspace-ia-blueprint-migration-smoke.mjs; check_file scripts/v1205h4-typecheck-cleanup-smoke.mjs; check_file scripts/v1205h5-css-import-order-smoke.mjs; check_file scripts/v1205h6-routing-layer-recovery-smoke.mjs; check_file scripts/v1205h6-browser-routing.py; check_file src/runtime/sidebar-h701.css; check_file scripts/v1205h701-sidebar-wave-polish-smoke.mjs; check_file qa/ux-truth/V1.20.5.json; check_file qa/ux-truth/V1.20.4.json; check_file qa/ux-truth/V1.20.3.json; check_file qa/ux-truth/V1.20.2.json; check_file docs/archive/roadmaps/ROADMAP_SERVICE_PROJECT_V1.19.5_A_V1.21.2.md; check_file qa/ux-truth/V1.20.1.json; check_file qa/ux-truth/V1.20.0.json; check_file qa/ux-truth/V1.19.9.json; check_file qa/ux-truth/V1.19.5.json; check_file qa/whiteboard-sim/phase7.cjs; check_file public/v1188-guidance-engine.js; check_file public/v1188-guidance-engine.css; check_file src/brand/bo-ocean-wave-1181.webp; check_file src/views/JourneyView.tsx; check_file src/services/journey-map-studio.ts; check_file src/runtime/journey-maps-h79.css; check_file scripts/v1205h79-journey-maps-2-smoke.mjs; check_file src/services/service-blueprint-studio.ts; check_file src/runtime/service-blueprint-h710.css; check_file scripts/v1205h710-service-blueprints-2-smoke.mjs; check_file src/services/whiteboard-studio.ts; check_file src/runtime/whiteboard-h711.css; check_file scripts/v1205h711-whiteboard-2-smoke.mjs; check_file src/runtime/brand-experience-h712.css; check_file scripts/v1205h712-brand-experience-smoke.mjs; check_file src/runtime/blue-ocean-identity-h713.css; check_file scripts/v1205h713-blue-ocean-identity-smoke.mjs; check_file src/services/service-depth.ts; check_file src/runtime/service-depth-adaptive-home-h714.css; check_file scripts/v1205h714-service-depth-adaptive-home-smoke.mjs; check_file src/runtime/ocean-workspace-home-h715.css; check_file scripts/v1205h715-ocean-workspace-home-smoke.mjs; check_file src/design-system/blue-ocean-objects.tsx; check_file src/runtime/blue-ocean-object-language-h716.css; check_file scripts/v1205h716-blue-ocean-object-language-smoke.mjs; check_file src/runtime/ocean-surface-h717.css; check_file public/blue-ocean-surface-dark-h717.svg; check_file public/blue-ocean-surface-light-h717.svg; check_file scripts/v1205h717-ocean-surface-smoke.mjs; check_file src/runtime/animated-ocean-branding-h718.css; check_file scripts/v1205h718-animated-ocean-branding-smoke.mjs; check_file src/services/journey-cover.ts; check_file src/runtime/journey-cover-h718h1.css; check_file public/journey-cover-blue-ocean-h718h1.svg; check_file scripts/v1205h718h1-journey-cover-smoke.mjs; check_file src/runtime/motion-identity-h719.css; check_file scripts/v1205h719-motion-identity-sidebar-smoke.mjs; check_file src/runtime/visual-recovery-h719h1.css; check_file scripts/v1205h719h1-visual-recovery-smoke.mjs; check_file src/runtime/dashboard-composition-h720.css; check_file scripts/v1205h720-dashboard-composition-smoke.mjs
if [[ -f dist/index.html ]]; then
  check_file dist/index.html; check_file dist/build-manifest.json
  for f in dist/v1120-stability.js dist/v1130-design-system.css dist/v1140-workspace-home.js dist/v1150-global-navigation.js dist/v1153-precision-studio.js dist/v1163-shell-consistency.js dist/v1163-shell-consistency.css dist/v1175-responsive-a11y.js dist/v1175-responsive-a11y.css dist/v1185-workspace-preferences.css dist/v1186-service-architecture.css dist/v1102-whiteboard.js dist/v1102-whiteboard.css; do check_file "$f"; done
  JS_BUNDLE="$(find dist/assets -maxdepth 1 -type f -name '*.js' 2>/dev/null | head -1 || true)"; CSS_BUNDLE="$(find dist/assets -maxdepth 1 -type f -name '*.css' 2>/dev/null | head -1 || true)"
  [[ -n "$JS_BUNDLE" ]] && echo "✓ bundle React: $JS_BUNDLE" || { echo '✗ bundle React ausente'; fail=1; }
  [[ -n "$CSS_BUNDLE" ]] && echo "✓ bundle CSS: $CSS_BUNDLE" || { echo '✗ bundle CSS ausente'; fail=1; }
  LEGACY_RE='#04342[cC]|#1[dD]9[eE]75|#0[bB]4[cC]40|#e7f5ef|#f1efe8'
  LEGACY_FILES="$(grep -R -I -l -E "$LEGACY_RE" dist --include='*.css' --include='*.js' --include='*.html' 2>/dev/null || true)"
  if [[ -n "$LEGACY_FILES" ]]; then
    echo '✗ branding estrutural legado encontrado:'
    while IFS= read -r legacy_file; do
      [[ -z "$legacy_file" ]] && continue
      legacy_tokens="$(grep -I -E -o "$LEGACY_RE" "$legacy_file" 2>/dev/null | sort -fu | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
      printf '  - %s: %s\n' "$legacy_file" "${legacy_tokens:-cor legada}"
    done <<< "$LEGACY_FILES"
    fail=1
  else
    echo '✓ sem paleta estrutural verde/bege antiga'
  fi
else
  echo '• dist/ ainda não gerado; o source está pronto para `npm ci && npm run release:verify`.'
fi
if grep -R -I -n 'MutationObserver' src --include='*.js' >/dev/null 2>&1; then echo '✗ MutationObserver presente no runtime'; fail=1; else echo '✓ shell sem MutationObserver'; fi
if grep -R -I -n -E 'prompt\(|confirm\(' src/runtime --include='*.js' >/dev/null 2>&1; then echo '✗ diálogo nativo presente no runtime'; fail=1; else echo '✓ diálogos controlados pela aplicação'; fi
if command -v node >/dev/null 2>&1; then echo "✓ Node $(node -v)"; else echo '• Node não encontrado'; fi
if [[ "$fail" -ne 0 ]]; then echo 'Preflight: FALHOU'; exit 1; fi
echo 'Preflight: OK'

# H7.20-H1 dashboard recovery
[ -f src/runtime/dashboard-recovery-h720h1.css ] || { echo "ERRO: dashboard-recovery-h720h1.css ausente"; exit 1; }
[ -f scripts/v1205h720h1-dashboard-recovery-smoke.mjs ] || { echo "ERRO: smoke H7.20-H1 ausente"; exit 1; }

# H7.21 Journey Workspace 3.0
[ -f src/runtime/journey-workspace-h721.css ] || { echo "ERRO: journey-workspace-h721.css ausente"; exit 1; }
[ -f scripts/v1205h721-journey-workspace-3-smoke.mjs ] || { echo "ERRO: smoke H7.21 ausente"; exit 1; }
# H7.22 Unified Service Blueprint Workspace
[ -f src/runtime/unified-service-blueprint-h722.css ] || { echo "ERRO: unified-service-blueprint-h722.css ausente"; exit 1; }
[ -f scripts/v1205h722-unified-service-blueprint-smoke.mjs ] || { echo "ERRO: smoke H7.22 ausente"; exit 1; }

# H7.23 Journey Editor UX 4.0
[ -f src/runtime/journey-editor-h723.css ] || { echo "ERRO: journey-editor-h723.css ausente"; exit 1; }
[ -f scripts/v1205h723-journey-editor-ux-smoke.mjs ] || { echo "ERRO: smoke H7.23 ausente"; exit 1; }
# H7.23-H1 Journey Typecheck Cleanup
[ -f scripts/v1205h723h1-journey-typecheck-cleanup-smoke.mjs ] || { echo "ERRO: smoke H7.23-H1 ausente"; exit 1; }
# H7.24 Journey Library & Collapsible Sidebar
[ -f src/runtime/journey-library-sidebar-h724.css ] || { echo "ERRO: journey-library-sidebar-h724.css ausente"; exit 1; }
[ -f scripts/v1205h724-journey-library-sidebar-smoke.mjs ] || { echo "ERRO: smoke H7.24 ausente"; exit 1; }

# H7.25 Service Ecology + Stakeholder Network
[ -f src/services/service-ecology.ts ] || { echo "ERRO: service-ecology.ts ausente"; exit 1; }
[ -f src/views/ServiceEcologyView.tsx ] || { echo "ERRO: ServiceEcologyView.tsx ausente"; exit 1; }
[ -f src/runtime/service-ecology-h725.css ] || { echo "ERRO: service-ecology-h725.css ausente"; exit 1; }
[ -f scripts/v1205h725-service-ecology-smoke.mjs ] || { echo "ERRO: smoke H7.25 ausente"; exit 1; }

# H7.26 Research Studio + Insight Pipeline
[ -f src/services/research-studio.ts ] || { echo "ERRO: research-studio.ts ausente"; exit 1; }
[ -f src/views/ResearchStudioView.tsx ] || { echo "ERRO: ResearchStudioView.tsx ausente"; exit 1; }
[ -f src/runtime/research-studio-h726.css ] || { echo "ERRO: research-studio-h726.css ausente"; exit 1; }
[ -f scripts/v1205h726-research-studio-smoke.mjs ] || { echo "ERRO: smoke H7.26 ausente"; exit 1; }

# H7.27 Service Proposition + What-if Scenarios
[ -f src/services/service-proposition.ts ] || { echo "ERRO: service-proposition.ts ausente"; exit 1; }
[ -f src/views/ServicePropositionView.tsx ] || { echo "ERRO: ServicePropositionView.tsx ausente"; exit 1; }
[ -f src/runtime/service-proposition-h727.css ] || { echo "ERRO: service-proposition-h727.css ausente"; exit 1; }
[ -f scripts/v1205h727-service-proposition-smoke.mjs ] || { echo "ERRO: smoke H7.27 ausente"; exit 1; }


# H7.28 Blueprint Semantic Zoom + Custom Layers
[ -f src/runtime/blueprint-semantic-h728.css ] || { echo "ERRO: blueprint-semantic-h728.css ausente"; exit 1; }
[ -f scripts/v1205h728-blueprint-semantic-smoke.mjs ] || { echo "ERRO: smoke H7.28 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h728-blueprint-semantic-smoke.mjs

# H7.29 Channels + Touchpoints + Continuity
[ -f src/services/channel-continuity.ts ] || { echo "ERRO: channel-continuity.ts ausente"; exit 1; }
[ -f src/views/ChannelContinuityView.tsx ] || { echo "ERRO: ChannelContinuityView.tsx ausente"; exit 1; }
[ -f src/runtime/channel-continuity-h729.css ] || { echo "ERRO: channel-continuity-h729.css ausente"; exit 1; }
[ -f scripts/v1205h729-channel-continuity-smoke.mjs ] || { echo "ERRO: smoke H7.29 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h729-channel-continuity-smoke.mjs


# H7.30 Service Prototype Lab
[ -f src/services/service-prototype-lab.ts ] || { echo "ERRO: service-prototype-lab.ts ausente"; exit 1; }
[ -f src/views/ServicePrototypeLabView.tsx ] || { echo "ERRO: ServicePrototypeLabView.tsx ausente"; exit 1; }
[ -f src/runtime/service-prototype-lab-h730.css ] || { echo "ERRO: service-prototype-lab-h730.css ausente"; exit 1; }
[ -f scripts/v1205h730-service-prototype-lab-smoke.mjs ] || { echo "ERRO: smoke H7.30 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h730-service-prototype-lab-smoke.mjs

# H7.31 Evidence & Learning System
[ -f src/services/evidence-learning-system.ts ] || { echo "ERRO: evidence-learning-system.ts ausente"; exit 1; }
[ -f src/views/ServiceLearningView.tsx ] || { echo "ERRO: ServiceLearningView.tsx ausente"; exit 1; }
[ -f src/runtime/evidence-learning-h731.css ] || { echo "ERRO: evidence-learning-h731.css ausente"; exit 1; }
[ -f scripts/v1205h731-evidence-learning-smoke.mjs ] || { echo "ERRO: smoke H7.31 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h731-evidence-learning-smoke.mjs

# H7.32 Decision & Iteration Loop
[ -f src/services/decision-iteration-loop.ts ] || { echo "ERRO: decision-iteration-loop.ts ausente"; exit 1; }
[ -f src/views/ServiceDecisionView.tsx ] || { echo "ERRO: ServiceDecisionView.tsx ausente"; exit 1; }
[ -f src/runtime/decision-iteration-h732.css ] || { echo "ERRO: decision-iteration-h732.css ausente"; exit 1; }
[ -f scripts/v1205h732-decision-iteration-smoke.mjs ] || { echo "ERRO: smoke H7.32 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h732-decision-iteration-smoke.mjs
# H7.33 Current × Future Service
[ -f src/services/current-future-service.ts ] || { echo "ERRO: current-future-service.ts ausente"; exit 1; }
[ -f src/views/CurrentFutureServiceView.tsx ] || { echo "ERRO: CurrentFutureServiceView.tsx ausente"; exit 1; }
[ -f src/runtime/current-future-h733.css ] || { echo "ERRO: current-future-h733.css ausente"; exit 1; }
[ -f scripts/v1205h733-current-future-smoke.mjs ] || { echo "ERRO: smoke H7.33 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h733-current-future-smoke.mjs


# H7.34 Problems, Opportunities & Prioritization
[ -f src/services/improvement-backlog.ts ] || { echo "ERRO: improvement-backlog.ts ausente"; exit 1; }
[ -f src/views/ImprovementBacklogView.tsx ] || { echo "ERRO: ImprovementBacklogView.tsx ausente"; exit 1; }
[ -f src/runtime/improvement-backlog-h734.css ] || { echo "ERRO: improvement-backlog-h734.css ausente"; exit 1; }
[ -f scripts/v1205h734-improvement-backlog-smoke.mjs ] || { echo "ERRO: smoke H7.34 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h734-improvement-backlog-smoke.mjs


# H7.35 Improvement Portfolio
[ -f src/services/improvement-portfolio.ts ] || { echo "ERRO: improvement-portfolio.ts ausente"; exit 1; }
[ -f src/views/ImprovementPortfolioView.tsx ] || { echo "ERRO: ImprovementPortfolioView.tsx ausente"; exit 1; }
[ -f src/runtime/improvement-portfolio-h735.css ] || { echo "ERRO: improvement-portfolio-h735.css ausente"; exit 1; }
[ -f scripts/v1205h735-improvement-portfolio-smoke.mjs ] || { echo "ERRO: smoke H7.35 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h735-improvement-portfolio-smoke.mjs
[ -f scripts/v1205h736-service-outcomes-smoke.mjs ] || { echo "ERRO: smoke H7.36 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h736-service-outcomes-smoke.mjs
[ -f scripts/v1205h737-service-governance-smoke.mjs ] || { echo "ERRO: smoke H7.37 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h737-service-governance-smoke.mjs
[ -f scripts/v1205h738-service-operations-bridge-smoke.mjs ] || { echo "ERRO: smoke H7.38 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h738-service-operations-bridge-smoke.mjs
[ -f scripts/v1205h739-executive-service-cockpit-smoke.mjs ] || { echo "ERRO: smoke H7.39 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h739-executive-service-cockpit-smoke.mjs

# H7.40 Professional Product Hardening
[ -f src/services/product-hardening.ts ] || { echo "ERRO: product-hardening.ts ausente"; exit 1; }
[ -f src/views/ProductHardeningView.tsx ] || { echo "ERRO: ProductHardeningView.tsx ausente"; exit 1; }
[ -f src/runtime/product-hardening-h740.css ] || { echo "ERRO: product-hardening-h740.css ausente"; exit 1; }
[ -f scripts/v1205h740-professional-product-hardening-smoke.mjs ] || { echo "ERRO: smoke H7.40 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h740-professional-product-hardening-smoke.mjs

# H7.40-H2 Navigation + First Service UX
[ -f src/runtime/product-ux-h740h2.css ] || { echo "ERRO: product-ux-h740h2.css ausente"; exit 1; }
[ -f scripts/v1205h740h2-navigation-onboarding-smoke.mjs ] || { echo "ERRO: smoke H7.40-H2 ausente"; exit 1; }
node scripts/v1205h740h2-navigation-onboarding-smoke.mjs

# H7.40-H3 Product Coherence & Navigation
node scripts/v1205h740h3-product-coherence-smoke.mjs

# H7.40-H4 UX Polish
[ -f src/runtime/product-polish-h740h4.css ] || { echo "ERRO: product-polish-h740h4.css ausente"; exit 1; }
[ -f scripts/v1205h740h4-ux-polish-smoke.mjs ] || { echo "ERRO: smoke H7.40-H4 ausente"; exit 1; }
node scripts/v1205h740h4-ux-polish-smoke.mjs

# H7.40-H5 Service Workspace Simplification
[ -f src/runtime/service-workspace-simplification-h740h5.css ] || { echo "ERRO: CSS H7.40-H5 ausente"; exit 1; }
[ -f scripts/v1205h740h5-service-workspace-simplification-smoke.mjs ] || { echo "ERRO: smoke H7.40-H5 ausente"; exit 1; }
node scripts/v1205h740h5-service-workspace-simplification-smoke.mjs

# H7.40-H6 Typecheck Final Cleanup
[ -f scripts/v1205h740h6-typecheck-final-cleanup-smoke.mjs ] || { echo "ERRO: smoke H7.40-H6 ausente"; exit 1; }
node scripts/v1205h740h6-typecheck-final-cleanup-smoke.mjs

# H7.40-H7 Guided Service Workspace
[ -f src/services/guided-service-workspace.ts ] || { echo "ERRO: guided-service-workspace.ts ausente"; exit 1; }
[ -f src/runtime/guided-service-workspace-h740h7.css ] || { echo "ERRO: CSS H7.40-H7 ausente"; exit 1; }
[ -f scripts/v1205h740h7-guided-service-workspace-smoke.mjs ] || { echo "ERRO: smoke H7.40-H7 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h740h7-guided-service-workspace-smoke.mjs

# H7.40-H8 Project Home & Workspace Architecture
[ -f src/services/project-library.ts ] || { echo "ERRO: project-library.ts ausente"; exit 1; }
[ -f src/views/ProjectHomeView.tsx ] || { echo "ERRO: ProjectHomeView.tsx ausente"; exit 1; }
[ -f src/runtime/project-home-h740h8.css ] || { echo "ERRO: CSS H7.40-H8 ausente"; exit 1; }
[ -f scripts/v1205h740h8-project-home-smoke.mjs ] || { echo "ERRO: smoke H7.40-H8 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h740h8-project-home-smoke.mjs

# H7.40-H9 Project Architecture Hardening
[ -f src/runtime/project-architecture-hardening-h740h9.css ] || { echo "ERRO: CSS H7.40-H9 ausente"; exit 1; }
[ -f scripts/v1205h740h9-project-architecture-hardening-smoke.mjs ] || { echo "ERRO: smoke H7.40-H9 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h740h9-project-architecture-hardening-smoke.mjs


# H7.40-H10 Project Shell & Contextual Navigation
[ -f src/views/ProjectShellView.tsx ] || { echo "ERRO: ProjectShellView.tsx ausente"; exit 1; }
[ -f src/runtime/project-shell-h740h10.css ] || { echo "ERRO: CSS H7.40-H10 ausente"; exit 1; }
[ -f scripts/v1205h740h10-project-shell-smoke.mjs ] || { echo "ERRO: smoke H7.40-H10 ausente"; exit 1; }
node scripts/v1205h740h10-project-shell-smoke.mjs

# H7.40-H11 Service-first Project Navigation
[ -f src/runtime/service-first-navigation-h740h11.css ] || { echo "ERRO: CSS H7.40-H11 ausente"; exit 1; }
[ -f scripts/v1205h740h11-service-first-navigation-smoke.mjs ] || { echo "ERRO: smoke H7.40-H11 ausente"; exit 1; }
node scripts/v1205h740h11-service-first-navigation-smoke.mjs
# H7.40-H12 Primary Sidebar + Project Context Switch
[ -f scripts/v1205h740h12-primary-sidebar-project-switch-smoke.mjs ] || { echo "ERRO: smoke H7.40-H12 ausente"; exit 1; }
node scripts/v1205h740h12-primary-sidebar-project-switch-smoke.mjs

# H7.40-H13 Persistent Global Sidebar
[ -f src/runtime/persistent-global-sidebar-h740h13.css ] || { echo "ERRO: CSS H7.40-H13 ausente"; exit 1; }
[ -f scripts/v1205h740h13-persistent-global-sidebar-smoke.mjs ] || { echo "ERRO: smoke H7.40-H13 ausente"; exit 1; }
node scripts/v1205h740h13-persistent-global-sidebar-smoke.mjs

# H7.40-H14 Interaction & Accessibility Polish
[ -f src/runtime/interaction-accessibility-polish-h740h14.css ] || { echo "ERRO: CSS H7.40-H14 ausente"; exit 1; }
[ -f scripts/v1205h740h14-interaction-accessibility-polish-smoke.mjs ] || { echo "ERRO: smoke H7.40-H14 ausente"; exit 1; }
node scripts/v1205h740h14-interaction-accessibility-polish-smoke.mjs

# H7.40-H15 Service Model Integration — Service Model Index
[ -f src/services/service-model-index.ts ] || { echo "ERRO: service-model-index.ts ausente"; exit 1; }
[ -f scripts/v1205h740h15-service-model-index-smoke.mjs ] || { echo "ERRO: smoke H7.40-H15 ausente"; exit 1; }
node --experimental-strip-types scripts/v1205h740h15-service-model-index-smoke.mjs


# H7.40-H15.2 Usage & Relations
[ -f src/services/service-object-navigation.ts ] || { echo "ERRO: service-object-navigation.ts ausente"; exit 1; }
[ -f src/components/ServiceUsageRelations.tsx ] || { echo "ERRO: ServiceUsageRelations.tsx ausente"; exit 1; }
[ -f src/runtime/usage-relations-h740h152.css ] || { echo "ERRO: CSS H7.40-H15.2 ausente"; exit 1; }
[ -f scripts/v1205h740h152-usage-relations-smoke.mjs ] || { echo "ERRO: smoke H7.40-H15.2 ausente"; exit 1; }
node scripts/v1205h740h152-usage-relations-smoke.mjs

# H7.40-H15.3 Design do Serviço UX Refinement
[ -f src/runtime/design-service-ux-h740h153.css ] || { echo "ERRO: CSS H7.40-H15.3 ausente"; exit 1; }
[ -f scripts/v1205h740h153-design-service-ux-smoke.mjs ] || { echo "ERRO: smoke H7.40-H15.3 ausente"; exit 1; }
node scripts/v1205h740h153-design-service-ux-smoke.mjs

[ -f scripts/v1205h740h154-design-service-visual-smoke.mjs ] || { echo "ERRO: smoke H7.40-H15.4 ausente"; exit 1; }
node scripts/v1205h740h154-design-service-visual-smoke.mjs

# H7.40-H15.5 Discovery UX & Guided Actions
[ -f src/runtime/discovery-ux-h740h155.css ] || { echo "ERRO: CSS H7.40-H15.5 ausente"; exit 1; }
[ -f scripts/v1205h740h155-discovery-ux-smoke.mjs ] || { echo "ERRO: smoke H7.40-H15.5 ausente"; exit 1; }
node scripts/v1205h740h155-discovery-ux-smoke.mjs
# H7.40-H15.6 Research Studio UX & Guided Actions
[ -f src/runtime/research-ux-h740h156.css ] || { echo "ERRO: CSS H7.40-H15.6 ausente"; exit 1; }
[ -f scripts/v1205h740h156-research-ux-smoke.mjs ] || { echo "ERRO: smoke H7.40-H15.6 ausente"; exit 1; }
node scripts/v1205h740h156-research-ux-smoke.mjs
# H16 Adaptive Experience Foundation
[ -f src/services/experience-profile.ts ] || { echo "ERRO: experience-profile.ts ausente"; exit 1; }
[ -f src/runtime/adaptive-experience-h16.css ] || { echo "ERRO: CSS H16 ausente"; exit 1; }
[ -f scripts/v1205h16-adaptive-experience-smoke.mjs ] || { echo "ERRO: smoke H16 ausente"; exit 1; }
node scripts/v1205h16-adaptive-experience-smoke.mjs


# H16.1 Foundation Experience Deep Adaptation
[ -f src/runtime/foundation-deep-adaptation-h161.css ] || { echo "ERRO: CSS H16.1 ausente"; exit 1; }
[ -f scripts/v1205h161-foundation-deep-adaptation-smoke.mjs ] || { echo "ERRO: smoke H16.1 ausente"; exit 1; }
node scripts/v1205h161-foundation-deep-adaptation-smoke.mjs


# H16.2 Research-Driven Context + View Modes
[ -f src/runtime/research-driven-context-h162.css ] || { echo "ERRO: CSS H16.2 ausente"; exit 1; }
[ -f scripts/v1205h162-research-driven-context-smoke.mjs ] || { echo "ERRO: smoke H16.2 ausente"; exit 1; }
node scripts/v1205h162-research-driven-context-smoke.mjs

# H16.3 Phase Status Consistency
[ -f scripts/v1205h163-phase-status-consistency-smoke.mjs ] || { echo "ERRO: smoke H16.3 ausente"; exit 1; }
node scripts/v1205h163-phase-status-consistency-smoke.mjs

# H16.4 Design do Serviço Proposal Layout
[ -f src/runtime/design-service-proposal-h164.css ] || { echo "ERRO: CSS H16.4 ausente"; exit 1; }
[ -f scripts/v1205h164-design-service-proposal-smoke.mjs ] || { echo "ERRO: smoke H16.4 ausente"; exit 1; }
node scripts/v1205h164-design-service-proposal-smoke.mjs
# H16.5 Research Proposal Layout
[ -f src/runtime/research-proposal-h165.css ] || { echo "ERRO: CSS H16.5 ausente"; exit 1; }
[ -f scripts/v1205h165-research-proposal-smoke.mjs ] || { echo "ERRO: smoke H16.5 ausente"; exit 1; }
node scripts/v1205h165-research-proposal-smoke.mjs


# H16.5.1 Research Proposal Typecheck Hotfix
[ -f scripts/v1205h1651-research-proposal-typecheck-hotfix-smoke.mjs ] || { echo "ERRO: smoke H16.5.1 ausente"; exit 1; }
node scripts/v1205h1651-research-proposal-typecheck-hotfix-smoke.mjs || exit 1
# H16.6 Research Workflow UX
[ -f src/runtime/research-workflow-ux-h166.css ] || { echo "ERRO: CSS H16.6 ausente"; exit 1; }
[ -f scripts/v1205h166-research-workflow-ux-smoke.mjs ] || { echo "ERRO: smoke H16.6 ausente"; exit 1; }
node scripts/v1205h166-research-workflow-ux-smoke.mjs || exit 1


# H16.6.1 CSS Build Hotfix
[ -f scripts/v1205h1661-css-build-hotfix-smoke.mjs ] || { echo "ERRO: smoke H16.6.1 ausente"; exit 1; }
node scripts/v1205h1661-css-build-hotfix-smoke.mjs || exit 1
# H16.7 Research Flow & Flexible Discovery
[ -f src/runtime/research-flow-interaction-h167.css ] || { echo "ERRO: CSS H16.7 ausente"; exit 1; }
[ -f scripts/v1205h167-research-flow-flexible-discovery-smoke.mjs ] || { echo "ERRO: smoke H16.7 ausente"; exit 1; }
node scripts/v1205h167-research-flow-flexible-discovery-smoke.mjs || exit 1

# H16.8 Design Start Choice & In-Flow Discovery
[ -f src/runtime/design-start-choice-h168.css ] || { echo "ERRO: CSS H16.8 ausente"; exit 1; }
[ -f scripts/v1205h168-design-start-choice-smoke.mjs ] || { echo "ERRO: smoke H16.8 ausente"; exit 1; }
node scripts/v1205h168-design-start-choice-smoke.mjs || exit 1

# H17 Single Experience Baseline
[ -f src/runtime/single-experience-h17.css ] || { echo "ERRO: CSS H17 ausente"; exit 1; }
[ -f scripts/v1205h17-single-experience-smoke.mjs ] || { echo "ERRO: smoke H17 ausente"; exit 1; }
node scripts/v1205h17-single-experience-smoke.mjs || exit 1

# H17.0.1 Sidebar Icon Typecheck Hotfix
[ -f scripts/v1205h1701-icon-typecheck-smoke.mjs ] || { echo "ERRO: smoke H17.0.1 ausente"; exit 1; }
node scripts/v1205h1701-icon-typecheck-smoke.mjs || exit 1

# H17.0.2 — Design Overview Focus
[ -f scripts/v1205h1702-overview-focus-smoke.mjs ] || { echo "ERRO: H17.0.2 smoke ausente"; exit 1; }
node scripts/v1205h1702-overview-focus-smoke.mjs || exit 1

# H17.0.3 — Direct Creation & Audience-first UX
[ -f src/runtime/direct-creation-h1703.css ] || { echo "ERRO: CSS H17.0.3 ausente"; exit 1; }
node scripts/v1205h1703-direct-creation-smoke.mjs

# H17.0.3.1 — Typecheck de alvo guiado
[ -f scripts/v1205h17031-guidance-typecheck-smoke.mjs ] || { echo "ERRO: smoke H17.0.3.1 ausente"; exit 1; }
node scripts/v1205h17031-guidance-typecheck-smoke.mjs || exit 1

# H17.0.4: fluxo de criação direta observado na referência
node scripts/v1205h1704-reference-workflow-smoke.mjs

# H17.0.5 · Journey Free Canvas
[ -f src/views/JourneyCanvasFree.tsx ] || { echo "ERRO: Journey Free Canvas ausente"; exit 1; }
[ -f src/runtime/journey-free-canvas-h1705.css ] || { echo "ERRO: CSS H17.0.5 ausente"; exit 1; }
node scripts/v1205h1705-free-canvas-smoke.mjs || exit 1
