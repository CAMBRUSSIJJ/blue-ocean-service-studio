# BLUE OCEAN Service Studio — V1.19.0
## Service Builder Assistant

### Objetivo
Transformar o Whiteboard em um ambiente profissional onde o usuário consegue **aprender e construir um serviço desde o início**, sem sair do canvas e sem receber objetos pré-preenchidos pelo sistema.

A V1.19.0 adiciona um assistente metodológico persistente ao Whiteboard e preserva integralmente o reset de criação da V1.18.9:

```text
Criar Serviço
→ Whiteboard realmente vazio
→ iniciar Assistente de Serviço
→ definir contexto
→ criar objetos somente após confirmação
→ estruturar o mesmo Service Graph
```

### Service Builder Assistant
O Whiteboard agora oferece um assistente lateral com quatro modos:

1. **Criar** — conduz a montagem do serviço do zero.
2. **Entender** — explica conceitos e diferenças metodológicas.
3. **Revisar** — examina o que já foi estruturado e aponta lacunas determinísticas.
4. **Melhorar** — ajuda a avançar de problemas para oportunidades, métricas e melhoria.

O assistente pode ser pausado e retomado. Seu estado é persistido por Whiteboard.

### Caminho guiado de criação
O modo Criar trabalha com uma sequência de construção, sem exigir que tudo seja preenchido de uma vez:

```text
01 Serviço
02 Objetivo e limites
03 Cliente / Persona
04 Etapas
05 Experiência
06 Operação
07 Evidências
08 Problemas
09 Métricas
10 Melhorias
11 Revisão final
```

Os blocos posteriores podem ser marcados como **Fazer depois** quando ainda não fizer sentido estruturá-los.

### Linguagem orientada ao negócio
A orientação não começa exigindo que o usuário conheça termos de Service Design. Primeiro pergunta, por exemplo:

- O que o cliente está tentando realizar?
- Onde esse serviço começa e termina?
- Quem vive essa experiência?
- Quais são os principais momentos?
- O que o cliente faz?
- Onde ele interage?
- O que ele consegue perceber?
- O que precisa acontecer internamente?
- Qual processo sustenta isso?
- Qual sistema sustenta o processo?

Depois essas respostas podem ser estruturadas como Persona, Stage, Customer Action, Touchpoint, Frontstage, Backstage, Process, System etc.

### Objetos reais — sem duplicação
O assistente não mantém um modelo paralelo de dados.

Quando o usuário confirma uma criação:
- Persona vira entidade real no Service Graph e Smart Object no Whiteboard;
- Journey vira Journey real;
- Stage vira Stage real e Smart Object;
- Experience/Operation usam as entidades canônicas do mesmo Service Graph;
- Problemas, evidências, métricas e oportunidades continuam usando o domínio canônico.

### Whiteboard-first
O assistente foi construído para manter o usuário no `viewKind=free`.

Criar uma Journey ou estruturar Frontstage/Backstage não força a troca imediata para outra visualização. Journey e Blueprint continuam podendo ser abertos depois como **views do mesmo serviço**.

### Nenhuma criação escondida
Esta release mantém como contrato:

```text
Abrir Whiteboard        != criar conteúdo
Abrir Assistente        != criar conteúdo
Perguntar ao Assistente != criar conteúdo
Calcular progresso      != criar conteúdo
Revisar                 != criar conteúdo
```

Persona, Journey, Stage, Blueprint e demais objetos só surgem após ação explícita do usuário.

### Entrada pela Home e biblioteca
- **Construção guiada** na Home garante primeiro um Whiteboard livre/blank e só então inicia o assistente.
- Biblioteca **Whiteboards** possui ação dedicada **Montar com assistente**.
- Whiteboard vazio oferece **Montar com assistente / Continuar sozinho / Usar template**.

### Entender
O modo Entender possui respostas metodológicas determinísticas para conceitos como:
- Persona;
- Etapa;
- Touchpoint;
- Journey;
- Frontstage;
- Backstage;
- Processo;
- Sistema;
- Evidência;
- Problema;
- Oportunidade;
- Métrica;
- Blueprint.

Nesta versão isso não depende de IA generativa.

### Revisar e Melhorar
**Revisar** lê a estrutura existente e informa o que está ou não conectado, sem fabricar evidências ou conclusões.

**Melhorar** oferece caminhos explícitos para estruturar problemas, oportunidades e métricas a partir do que o usuário decidiu registrar.

### Preservado
Sem quebra intencional de:
- Creation Architecture Reset V1.18.9;
- Service Graph Schema V3;
- IDs e projetos existentes;
- backups/import/export;
- IndexedDB/local persistence;
- Service Health;
- Attention Engine;
- Continue/Favorites/Pins;
- Service Architecture;
- Journey;
- Blueprint;
- Guided Service Builder legado da V1.18.8.

### QA
- Service Builder Assistant: **51/51**.
- Creation Architecture Reset: **83/83**.
- Guided Service Builder Foundation: **117/117**.
- Regressão completa V1.12 → V1.19.0: **861 OK / 0 FAIL**.
- `tsc --noEmit --noCheck`: aprovado.
- `node --check`: Whiteboard Core e Guidance Engine aprovados.
- package-lock verify: aprovado.
- source authority: aprovado.
- source foundation: aprovado.
- Linux preflight: aprovado.

### Limitação do ambiente
O `npm ci` completo não pôde ser concluído porque o registry npm apresentou falhas/timeout de rede `EAI_AGAIN` durante os downloads. O `node_modules` parcial foi removido antes do empacotamento.

Por isso esta release **não declara** o `npm run build` React/Vite completo como aprovado neste ambiente. Nenhum `dist` antigo é incluído como substituto.
