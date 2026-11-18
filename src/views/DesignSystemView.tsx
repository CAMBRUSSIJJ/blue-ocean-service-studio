import { BlobButton, Button, Card, Chip, CollapsibleSidebar, EmptyState, Field, Input, Select, Skeleton, StatusBadge, Tab, Tabs, Textarea } from '../components/ui';
import type { SidebarItem } from '../components/ui';
import { Search, Plus, Settings, CheckCircle2 } from '../design-system/icons';
import { APP_VERSION_LABEL } from '../generated/app-version';

function HomeIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function InboxIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>; }
function FolderIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>; }
function MapIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>; }
function SettingsIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }

const SIDEBAR_DEMO_ITEMS: SidebarItem[] = [
  { id: 'home',     icon: <HomeIcon />,     label: 'Início' },
  { id: 'inbox',    icon: <InboxIcon />,    label: 'Inbox',      badge: 3 },
  { id: 'journeys', icon: <FolderIcon />,   label: 'Jornadas' },
  { id: 'maps',     icon: <MapIcon />,      label: 'Blueprints' },
  { id: 'settings', icon: <SettingsIcon />, label: 'Configurações' },
];

const swatches = [
  ['Canvas','var(--bo-color-canvas)'],['Surface','var(--bo-color-surface)'],['Sidebar','var(--bo-color-sidebar)'],
  ['Border','var(--bo-color-border)'],['Text','var(--bo-color-text)'],['Primary','var(--bo-color-primary-600)'],
  ['Accent','var(--bo-color-accent-500)'],['Success','var(--bo-color-success-600)'],
] as const;

export function DesignSystemView() {
  return <main className="bo-ds-page">
    <div className="bo-ds-page__inner">
      <header className="bo-page-header bo-card"><div><h1 className="bo-page-header__title">BLUE OCEAN Design System v4</h1><p className="bo-page-header__description">Biblioteca interna · {APP_VERSION_LABEL} · tokens semânticos e componentes permanentes.</p></div><StatusBadge tone="info">Internal QA</StatusBadge></header>
      <section className="bo-panel"><h2 className="bo-section-title">Cores semânticas</h2><p className="bo-section-description">O shell e o Whiteboard consomem a mesma camada de tokens.</p><div className="bo-ds-grid" style={{marginTop:16}}>{swatches.map(([name,color])=><div key={name} className="bo-ds-swatch" style={{background:color}}>{name}</div>)}</div></section>
      <section className="bo-panel bo-stack"><div><h2 className="bo-section-title">Ações</h2><p className="bo-section-description">Um único padrão para ação, foco, perigo e ação silenciosa.</p></div><div className="bo-inline"><Button variant="primary"><Plus size={16}/>Criar</Button><Button variant="secondary"><Search size={16}/>Buscar</Button><Button variant="ghost"><Settings size={16}/>Configurar</Button><Button variant="danger">Excluir</Button></div></section>
      <section className="bo-ds-grid"><Card className="bo-panel bo-stack"><h2 className="bo-section-title">Formulários</h2><Field label="Nome" hint="Use um nome curto e reconhecível."><Input placeholder="Jornada de aquisição" /></Field><Field label="Status"><Select defaultValue="active"><option value="active">Ativo</option><option value="draft">Rascunho</option></Select></Field><Field label="Descrição"><Textarea placeholder="Contexto…" /></Field></Card><Card className="bo-panel bo-stack"><h2 className="bo-section-title">Estados</h2><div className="bo-inline"><StatusBadge tone="success"><CheckCircle2 size={14}/>Saudável</StatusBadge><StatusBadge tone="warning">Atenção</StatusBadge><StatusBadge tone="danger">Crítico</StatusBadge><Chip selected>Current</Chip><Chip>Future</Chip></div><Tabs><Tab active>Essencial</Tab><Tab>Relações</Tab><Tab>Aparência</Tab></Tabs><Skeleton style={{height:14,width:'80%'}}/><Skeleton style={{height:14,width:'58%'}}/></Card></section>
      <section className="bo-panel bo-stack"><div><h2 className="bo-section-title">Blob Button</h2><p className="bo-section-description">Botão com efeito de bolhas — para CTAs primários e ações de destaque.</p></div><div className="bo-inline" style={{flexWrap:'wrap',gap:12}}><BlobButton size="sm">Novo projeto</BlobButton><BlobButton size="md">Criar jornada</BlobButton><BlobButton size="lg">Começar agora</BlobButton></div><div className="bo-inline" style={{flexWrap:'wrap',gap:12}}><BlobButton variant="ghost" size="sm">Cancelar</BlobButton><BlobButton variant="ghost" size="md">Saiba mais</BlobButton><BlobButton variant="ghost" size="lg">Ver planos</BlobButton></div></section>
      <section className="bo-panel bo-stack">
        <div><h2 className="bo-section-title">Collapsible Sidebar</h2><p className="bo-section-description">Sidebar flutuante dark com active indicator que desliza com spring — clique nos itens ou em Recolher.</p></div>
        <div style={{display:'flex',justifyContent:'center',padding:'24px 0'}}>
          <CollapsibleSidebar items={SIDEBAR_DEMO_ITEMS} logoName="Blue Ocean" />
        </div>
      </section>
      <section><EmptyState title="Estado vazio padronizado"><p>Nenhuma informação ainda. O CTA deve explicar o próximo passo, não apenas repetir o nome do módulo.</p></EmptyState></section>
    </div>
  </main>;
}
