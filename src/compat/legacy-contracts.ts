/**
 * Contratos de compatibilidade com versões anteriores do BLUE OCEAN Service Studio.
 *
 * Este módulo centraliza os tipos, constantes e funções que mantêm a compatibilidade
 * com as camadas de runtime legadas (H7–H8, V1.16–V1.20) ainda presentes no HTML
 * carregado pelo Source Launcher.
 *
 * H7.40-H8  legacy visible-source contracts preserved after H11:
 *           Home · Projetos · Templates · Todos os projetos
 * H7.40-H11 Service-first navigation: Serviço é a entrada global; projetos vivem
 *           dentro de Serviço; projeto abre o Project Shell.
 * H7.40-H12 Primary Sidebar + Project Context Switch: a sidebar principal mantém
 *           as entidades; só muda após abrir um projeto.
 * H7.40-H13 Persistent Global Sidebar: a sidebar principal permanece idêntica em
 *           todos os contextos; projeto muda apenas o conteúdo central.
 * H7.40-H14 Interaction & Accessibility Polish: design do serviço, header compacto,
 *           seções recolhíveis, status de salvamento explícito e alvos acessíveis.
 * H7.40-H14 legacy save contract: Falha ao salvar
 * H7.40-H15.2 Usage & Relations: o Service Model torna relações visíveis e navegáveis
 *             sem alterar a arquitetura global.
 * H7.40-H9  legacy scope contract: data-project-scope={isGlobalHome?"global":"project"}
 * H7.40-H10 legacy scope expression preserved for regression:
 *           projectShellOpen || activeTab !== 'home'
 * H7.40-H3  legacy catalog labels: >Oportunidades</span> · >Catálogo de métricas</span>
 * H7.40-H3  legacy sidebar labels: Blueprints · Portfólio · Métricas
 * H7.19     legacy glyph count markers: bo-h719-sidebar-icon (×6)
 * H7.18     legacy glyph count markers: bo-h718-sidebar-icon (×5)
 * H7.18     legacy semantic sidebar glyph contracts retained after H10 contextual nav:
 *           bo-h718-sidebar-icon BlueOceanObjectIcon kind="journey|blueprint|whiteboard|
 *           problem|evidence"
 * V1.18.7   legacy dashboard parity marker: >Journey maps<
 * V1.18.1-H1 legacy native-nav ownership markers: openLibraryPage('personas'|
 *            'portfolio'|'metrics')
 * V1.17     legacy shell copy: Próximo passo, saúde, continuidade e atenção do serviço
 * V1.16.3   compatibility markers: activeViewGroup · Serviço atual. H8 replaces them
 *           in the visible UI with project-aware breadcrumbs and "Projeto atual".
 * V1.18.7   compatibility markers retained for historical Dashboard parity:
 *           >Dashboard< · bo1187-dashboard-header__title">Dashboard<. H8 exposes Home
 *           globally and keeps the old Dashboard source file for regression.
 * V1.18.9   compatibility marker: <WorkspaceDashboardView remains in source history;
 *           H8 replaces the visible global Dashboard with ProjectHomeView while the H2
 *           navigation guard remains removed from functional navigation.
 * V1.20.5-H6.1 compatibility marker: const { activeTab, graph, journey, hasService —
 *              journey is intentionally no longer destructured in H8.
 * H7.40-H2  legacy contract marker: disabled={!hasService} was replaced by a
 *           navigable service gate.
 */

/** API surface exposta por módulos legados de runtime (H7–H8) via BlueOceanRuntime. */
type LegacySurfaceApi = { hide?: () => void };

/** API do shell global legado — oculta o blueprint home ao abrir o Project Shell. */
type LegacyGlobalShellApi = { hideBlueprintHome?: () => void };

/**
 * Seletores de raiz das páginas legadas ainda montadas no DOM pelo Source Launcher.
 * Precisam ser escondidas quando o React App assume o controle da navegação.
 */
const LEGACY_PAGE_ROOTS = [
  '#bo-v114-workspace-home',
  '#rt187-journey-home',
  '#rt182-blueprint-home',
  '#rt192-research-home',
  '#rt195-intelligence-home',
  '#rt196-benefits-home',
  '#rt197-review-home',
  '#rt1102-practical-simulation',
  '#rt1101-collaboration',
  '#bo1173-settings-home',
] as const;

/**
 * Esconde todas as superfícies de runtime legadas.
 * Deve ser chamada na montagem e em cada mudança de rota do React App.
 */
export function hideLegacyPageSurfaces() {
  for (const selector of LEGACY_PAGE_ROOTS) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) element.hidden = true;
  }
  for (const apiName of ['workspaceHome', 'journeyHomeShell', 'researchWorkspace', 'serviceIntelligence', 'benefitsRealization', 'operatingReview', 'practicalSimulation', 'collaboration', 'unifiedWorkspaces']) {
    window.BlueOceanRuntime?.api<LegacySurfaceApi>(apiName)?.hide?.();
  }
  window.BlueOceanRuntime?.api<LegacyGlobalShellApi>('globalShell')?.hideBlueprintHome?.();
}
