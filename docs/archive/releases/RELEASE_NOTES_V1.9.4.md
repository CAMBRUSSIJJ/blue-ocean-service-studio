# V1.9.4 — Presentation & Workshop Mode

A V1.9.4 transforma o serviço em uma narrativa apresentável e adiciona facilitação local de workshops sem criar uma cópia paralela do Service Graph.

## Apresentação
- Frames podem ser ordenados e usados como slides.
- Se o quadro não tiver Frames, as etapas da Jornada formam automaticamente um roteiro de apresentação.
- Notas do apresentador ficam persistidas por slide.
- Modo apresentação oculta a maior parte do editor e permite navegar por teclado (←/→, Page Up/Down, Espaço, Esc).
- Etapas podem ser apresentadas em um layout limpo com ação do cliente, touchpoints, problemas e oportunidades.

## Workshop
- Agenda baseada em Frames ou etapas.
- Timer por atividade com iniciar, pausar e reiniciar.
- Modo "Conduzir no canvas" mantém um painel flutuante e deixa o canvas utilizável.
- Votação local sobre o objeto selecionado.
- Notas da sessão e histórico de workshops.
- Resumo com itens mais votados.

## Arquitetura
- Novo runtime `presentationWorkshop`.
- Novo `presentationBridge` no Whiteboard, exposto pelo Runtime Registry.
- Dados persistidos em `service.presentationStudio`, sem duplicar entidades do Service Graph.
- Mantém Research & Evidence, Service Layers & Scenarios, Journey Management, Guided Builder, Blueprint Health e Recovery.
