export type ExperienceLevel = 'foundation' | 'applied' | 'advanced';
export type ExperienceDensity = 'guided' | 'balanced' | 'dense';

export const EXPERIENCE_PROFILE_STORAGE_KEY = 'bo-experience-profile';
export const EXPERIENCE_PROFILE_EVENT = 'bo-experience-profile-changed';

export const EXPERIENCE_LEVELS: Record<ExperienceLevel, {
  label: string;
  shortLabel: string;
  description: string;
  density: ExperienceDensity;
}> = {
  foundation: {
    label: 'Fundamentos',
    shortLabel: 'Fundamentos',
    description: 'Mais orientação, linguagem explicativa e menos complexidade visível de uma vez.',
    density: 'guided',
  },
  applied: {
    label: 'Aplicado',
    shortLabel: 'Aplicado',
    description: 'Equilíbrio entre orientação, profundidade e velocidade para projetos reais.',
    density: 'balanced',
  },
  advanced: {
    label: 'Avançado',
    shortLabel: 'Avançado',
    description: 'Mais densidade, rastreabilidade e acesso direto às capacidades completas do serviço.',
    density: 'dense',
  },
};

export const ACTIVE_EXPERIENCE_LEVEL: ExperienceLevel = 'advanced';

export type ActiveExperienceProfile = {
  level: ExperienceLevel;
  setLevel: (next: ExperienceLevel) => void;
  meta: (typeof EXPERIENCE_LEVELS)[ExperienceLevel];
};

// H17: a plataforma opera em uma única experiência canônica.
// O vocabulário histórico dos três níveis permanece somente para compatibilidade
// com releases e estilos anteriores; foundation/applied não são selecionáveis.
export function readExperienceProfile(): ExperienceLevel {
  return ACTIVE_EXPERIENCE_LEVEL;
}

export function writeExperienceProfile(_level: ExperienceLevel) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(EXPERIENCE_PROFILE_STORAGE_KEY, ACTIVE_EXPERIENCE_LEVEL); } catch { /* compatibilidade local opcional */ }
  window.dispatchEvent(new CustomEvent(EXPERIENCE_PROFILE_EVENT, { detail: ACTIVE_EXPERIENCE_LEVEL }));
}

export function useExperienceProfile(): ActiveExperienceProfile {
  return {
    level: ACTIVE_EXPERIENCE_LEVEL,
    setLevel: (_next: ExperienceLevel) => writeExperienceProfile(ACTIVE_EXPERIENCE_LEVEL),
    meta: EXPERIENCE_LEVELS[ACTIVE_EXPERIENCE_LEVEL],
  };
}

export function isWorkspaceCapabilityVisible(level: ExperienceLevel, id: string) {
  if (level === 'advanced') return true;
  if (level === 'applied') return !['cockpit', 'readiness'].includes(id);
  return ['overview', 'research', 'proposition', 'journey', 'blueprint', 'prototypes', 'learning', 'improvement', 'portfolio', 'outcomes', 'operations'].includes(id);
}

export function isResearchTabVisible(level: ExperienceLevel, id: string) {
  if (level === 'advanced') return true;
  if (level === 'applied') return true;
  return id !== 'trace';
}

export function experienceTerm(level: ExperienceLevel, key: 'ecology' | 'proposition' | 'traceability' | 'readiness') {
  const terms = {
    foundation: {
      ecology: 'Pessoas e organizações',
      proposition: 'Valor do serviço',
      traceability: 'Origem das evidências',
      readiness: 'Preparação',
    },
    applied: {
      ecology: 'Ecologia',
      proposition: 'Proposição',
      traceability: 'Rastreabilidade',
      readiness: 'Prontidão',
    },
    advanced: {
      ecology: 'Ecologia do serviço',
      proposition: 'Proposição do serviço',
      traceability: 'Rastreabilidade',
      readiness: 'Prontidão',
    },
  } as const;
  return terms[level][key];
}


export type ExperienceCapabilityProjection = {
  label: string;
  description: string;
  action: string;
};

const FOUNDATION_CAPABILITY_COPY: Record<string, Partial<ExperienceCapabilityProjection>> = {
  research: { label: 'Pesquisa', description: 'Descubra o que precisa entender antes de decidir.' },
  ecology: { label: 'Pessoas e organizações', description: 'Veja quem participa, influencia ou sustenta a entrega.' },
  proposition: { label: 'Valor do serviço', description: 'Transforme o que você aprendeu em uma proposta clara de valor.' },
  journey: { label: 'Jornada do cliente', description: 'Organize a experiência do cliente ao longo do serviço.' },
  channels: { label: 'Canais', description: 'Organize por onde as interações acontecem.' },
  blueprint: { label: 'Como o serviço funciona', description: 'Conecte a experiência do cliente ao trabalho que acontece por trás.' },
  whiteboard: { label: 'Quadro de apoio', description: 'Explore ideias livremente quando precisar.' },
  prototypes: { label: 'Testar ideias', description: 'Faça testes simples antes de investir na solução final.' },
  learning: { label: 'O que aprendemos', description: 'Registre o que os testes mostraram e o que isso muda.' },
  decisions: { label: 'Decidir o que mudar', description: 'Transforme aprendizados em decisões claras.' },
  'current-future': { label: 'Como funciona hoje', description: 'Compare o serviço atual com o que você quer construir.' },
  improvement: { label: 'O que melhorar', description: 'Escolha os problemas e oportunidades mais importantes.' },
  portfolio: { label: 'Colocar melhorias em prática', description: 'Transforme prioridades em melhorias com responsáveis e andamento.' },
  outcomes: { label: 'Medir resultados', description: 'Defina como saber se a mudança realmente funcionou.' },
  governance: { label: 'Responsáveis', description: 'Deixe claro quem decide, acompanha e responde pelo serviço.' },
  operations: { label: 'Operação do serviço', description: 'Mapeie atividades, fluxos e dependências da operação.' },
  cockpit: { label: 'Acompanhar o serviço', description: 'Veja sinais importantes para acompanhar a evolução do serviço.' },
  readiness: { label: 'Condições para funcionar bem', description: 'Revise condições básicas para operar com segurança.' },
};

const FOUNDATION_ACTIONS: Record<string, Record<string, string>> = {
  prototypes: { empty: 'Criar teste', progress: 'Continuar testes', ready: 'Ver testes', attention: 'Revisar testes' },
  learning: { empty: 'Registrar aprendizado', progress: 'Continuar aprendizados', ready: 'Ver aprendizados', attention: 'Revisar aprendizados' },
  decisions: { empty: 'Registrar decisão', progress: 'Continuar decisões', ready: 'Ver decisões', attention: 'Revisar decisões' },
  improvement: { empty: 'Definir prioridades', progress: 'Continuar prioridades', ready: 'Ver prioridades', attention: 'Revisar prioridades' },
  portfolio: { empty: 'Criar melhoria', progress: 'Continuar melhorias', ready: 'Ver melhorias', attention: 'Revisar melhorias' },
  outcomes: { empty: 'Definir como medir', progress: 'Continuar medição', ready: 'Ver resultados', attention: 'Revisar resultados' },
  operations: { empty: 'Mapear operação', progress: 'Continuar operação', ready: 'Ver operação', attention: 'Revisar operação' },
};

export function projectExperienceCapability(
  level: ExperienceLevel,
  id: string,
  current: ExperienceCapabilityProjection,
  state?: string,
): ExperienceCapabilityProjection {
  if (level !== 'foundation') return current;
  const copy = FOUNDATION_CAPABILITY_COPY[id] ?? {};
  const action = state ? FOUNDATION_ACTIONS[id]?.[state] : undefined;
  return {
    label: copy.label ?? current.label,
    description: copy.description ?? current.description,
    action: action ?? copy.action ?? current.action,
  };
}

export function experiencePhaseLanguage(level: ExperienceLevel, phase: 'understand' | 'design' | 'validate' | 'improve' | 'operate') {
  if (level !== 'foundation') return null;
  return ({
    understand: { title: 'Entender', description: 'Pesquise para compreender pessoas, necessidades, dores e problemas antes de definir o valor do serviço.', flow: ['Pesquisa', 'Pessoas · necessidades · dores · problemas', 'Valor do serviço'] },
    design: { title: 'Desenhar', description: 'Transforme o que você aprendeu em uma experiência e em uma forma de entrega.', flow: ['Jornada do cliente', 'Como o serviço funciona'] },
    validate: { title: 'Testar', description: 'Experimente ideias, observe o resultado e registre o que aprendeu.', flow: ['Testar ideias', 'O que aprendemos'] },
    improve: { title: 'Melhorar', description: 'Escolha o que melhorar, coloque mudanças em prática e acompanhe resultados.', flow: ['O que melhorar', 'Melhorias', 'Medir resultados'] },
    operate: { title: 'Acompanhar', description: 'Mantenha a operação visível e acompanhe se o serviço continua funcionando bem.', flow: ['Operação do serviço'] },
  } as const)[phase];
}
