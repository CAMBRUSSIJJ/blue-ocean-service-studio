import { Button, Card, Chip, EmptyState, Field, Input, Select, Skeleton, StatusBadge, Tab, Tabs, Textarea } from '../components/ui';
import { Search, Plus, Settings, CheckCircle2 } from '../design-system/icons';
import { APP_VERSION_LABEL } from '../generated/app-version';

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
      <section><EmptyState title="Estado vazio padronizado"><p>Nenhuma informação ainda. O CTA deve explicar o próximo passo, não apenas repetir o nome do módulo.</p></EmptyState></section>
    </div>
  </main>;
}
