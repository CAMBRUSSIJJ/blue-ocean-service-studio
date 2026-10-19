export const blueprintLanes = [
  {key:'evidence',label:'Evidências',tone:'slate',hint:'Provas, ambiente e sinais percebidos'},
  {key:'customer',label:'Ações do cliente',tone:'blue',hint:'O que o cliente faz e tenta alcançar'},
  {key:'frontstage',label:'Ação visível · Frontstage',tone:'emerald',hint:'Ações visíveis para o cliente'},
  {key:'backstage',label:'Ação de bastidor · Backstage',tone:'amber',hint:'Ações internas que sustentam a entrega'},
  {key:'process',label:'Processos',tone:'blue',hint:'Fluxos que sustentam a entrega'},
  {key:'system',label:'Sistemas',tone:'violet',hint:'Tecnologia e ferramentas de suporte'},
];

export const VIEW_DEFS = {
  free:{label:'Livre',icon:'↗',description:'Composição manual e exploração visual.'},
  service:{label:'Service Frame',icon:'▤',description:'Etapas × Cliente × Frontstage × Backstage × Processos × Sistemas e recursos.'},
  flow:{label:'Relações',icon:'→',description:'Relações e dependências entre componentes do serviço.'},
  journey:{label:'Jornada',icon:'⌁',description:'Etapas × experiência do cliente.'},
  blueprint:{label:'Blueprint',icon:'▦',description:'Etapas × operação e entrega do serviço.'},
};

export const journeyLanes = [
  {key:'need',label:'Necessidades e expectativas',tone:'blue',hint:'O que a pessoa precisa, espera ou tenta resolver'},
  {key:'touchpoint',label:'Pontos de contato e canais',tone:'violet',hint:'Onde a interação acontece e por qual canal'},
  {key:'emotion',label:'Emoção',tone:'rose',hint:'Como a experiência varia ao longo da jornada'},
  {key:'evidence',label:'Evidências',tone:'slate',hint:'Sinais, provas e contexto observado'},
  {key:'problem',label:'Problemas',tone:'rose',hint:'Fricções e dificuldades encontradas'},
  {key:'opportunity',label:'Oportunidades',tone:'emerald',hint:'Possibilidades de melhoria'},
  {key:'metric',label:'Métricas',tone:'amber',hint:'Indicadores ligados ao momento onde o fenômeno acontece'},
  {key:'other',label:'Outros objetos',tone:'blue',hint:'Objetos relacionados que não pertencem às lanes anteriores'},
];

export const JOURNEY_LANE_PRESETS = {
  essential:{label:'Essencial',lanes:['need','touchpoint','emotion','problem','opportunity']},
  research:{label:'Pesquisa',lanes:['need','touchpoint','emotion','evidence','problem','opportunity']},
  measure:{label:'Medição',lanes:['touchpoint','emotion','evidence','problem','opportunity','metric']},
  complete:{label:'Completa',lanes:journeyLanes.map(x=>x.key)},
};

export const tone = {slate:'#64748b',blue:'#2563eb',emerald:'#059669',amber:'#d97706',violet:'#7c3aed',rose:'#e11d48',yellow:'#ca8a04'};
export const toneBg = {slate:'#ffffff',blue:'#eff6ff',emerald:'#ecfdf5',amber:'#fffbeb',violet:'#f5f3ff',rose:'#fff1f2',yellow:'#fef9c3'};
