# BLUE OCEAN — Roadmap Service Project V1.19.5 → V1.21.2

## Princípio
O serviço não começa no canvas. Ele começa pelo entendimento do cliente, necessidade e problema; depois é definido e estruturado em uma matriz de etapas × camadas do serviço, validado, melhorado e finalmente operado.

| Versão | Foco | Critério principal |
|---|---|---|
| V1.19.5 | UX Truth & Runtime QA | Nenhuma mudança visual é DONE sem L1 Código + L2 Contrato + L3 Runtime + L4 Visual. |
| V1.19.6 | Service Project Foundation | Projeto de serviço passa a ser a raiz do contexto de Discovery, Definition e Design. |
| V1.19.7 | Service Home | Home dedicada organiza Entender → Definir → Desenhar → Validar → Melhorar. |
| V1.19.8 | Discovery Workspace | Personas, necessidades, jobs, dores, evidências e hipóteses em um workspace coerente. |
| V1.19.9 | Persona Studio | Persona simples/profissional conectada a evidências, necessidades e contexto. |
| V1.20.0 | Problem & Evidence Studio | Dor → hipótese → evidência → problema validado. |
| V1.20.1 | Service Definition | Promessa, outcome, escopo, início/fim, princípios e rastreabilidade. |
| V1.20.2 | Service Context Library | Home simplificada + abas canônicas + Universal Inspector + reutilização no Whiteboard. |
| V1.20.3 | Structured Service Frame | Etapas na horizontal × Cliente / Frontstage / Backstage / Processos / Sistemas e Recursos, com linhas semânticas e posicionamento estruturado. |
| V1.20.4 | Service Readiness | Readiness mede se há contexto e definição suficientes para estruturar/desenhar, sem confundir com Health. |
| V1.20.5 | Frontstage / Backstage Advanced System | Papéis, canais, dependências, políticas e evidências físicas/digitais aprofundam os objetos do Service Frame sem criar novas lanes. |
| V1.20.6 | Smart Cards V3 | Gramática visual semântica e consistente por objeto. |
| V1.20.7 | View Engine | Livre / Service Frame / Journey / Blueprint / Relações sobre os mesmos dados canônicos. |
| V1.20.8 | Guided Service Composition | Assistente usa Discovery + Definition para conduzir a composição do serviço. |
| V1.20.9 | Service Composition Entry | Entradas guiadas partem de contexto pronto e criam estrutura mínima sem canvas vazio. |
| V1.21.0 | Structured Service Canvas Advanced | Camadas customizáveis, templates e comparações Current × Future. |
| V1.21.1 | Validation & Simulation | Personas, problemas, evidências e métricas validam o serviço desenhado. |
| V1.21.2 | Service Design Complete | Primeiro ciclo fechado Discovery → Definition → Structured Design → Validation → Improvement. |

## Regra de arquitetura
Whiteboard é uma visualização e ambiente de raciocínio. O Service Frame grava apenas metadados de posicionamento (`serviceStageId` + `serviceLayer`) nas instâncias visuais. O conhecimento do serviço permanece canônico no Service Graph e pode ser projetado em Journey, Blueprint e outras views sem duplicação.
