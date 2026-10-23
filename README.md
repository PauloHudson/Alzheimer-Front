# M-XAI · Front-end

Interface web de apoio ao **diagnóstico explicável da doença de Alzheimer**, derivada do TCC *M-XAI Net: um framework multimodal de IA explicável para diagnóstico da doença de Alzheimer* e desenvolvida na disciplina de Interação Humano-Computador (CC8122, Centro Universitário FEI, 2º sem/2026, Equipe 08).

> **A IA sugere e explica. O médico decide.**
> Protótipo funcional: pacientes, imagens de RM e sugestões do modelo são **simulados**. Não use para decisões clínicas reais.

A documentação de IHC (Entregas 1–14) está no repositório [Alzheimer-XAI-ihc2026](https://github.com/rapha661/Alzheimer-XAI-ihc2026).

## Deploy (Vercel)

O projeto é detectado como Vite. O `vercel.json` já define o build (`npm run build` → `dist/`) e redireciona todas as rotas para `index.html`, para que endereços como `/app/casos/caso-1042` funcionem ao recarregar. Sem variáveis de ambiente, o deploy usa a API simulada; para o backend real, configure `VITE_USE_MOCK=false` e `VITE_API_URL` no painel da Vercel.

---

## Como rodar

Requisitos: Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de produção em dist/
npm run preview    # serve o build
```

### Contas de demonstração

Senha de todas: `demo1234` (a tela de login tem atalhos para preencher).

| Perfil | E-mail | O que muda |
|---|---|---|
| Médico clínico (P01) | `medico@mxai.app` | Fila "aguardando revisão", registra decisão, encaminha, cria caso |
| Neurologista (P02) | `neuro@mxai.app` | Vê encaminhados, emite parecer pelo sistema |
| Radiologista (P03) | `radio@mxai.app` | Consulta a explicação; não decide nem cria caso |
| Técnico em radiologia (P04) | `tecnico@mxai.app` | Fila de pendências, assistente de novo caso |

Os dados ficam no `localStorage` do navegador. Para voltar ao estado inicial: menu do usuário → **Restaurar dados de demonstração**.

### Roteiro sugerido (≈5 min)

1. Entre como **médico clínico** e abra **Ivo Bittencourt** — o parecer do neurologista, obtido por telefone dois meses antes, aparece estruturado no topo (cenário C02 / tarefa T01).
2. No visualizador, ajuste a **opacidade** do mapa de atenção, troque o plano (1, 2, 3) e role para mudar o corte. Clique em "Hipocampo esquerdo" na lista de regiões.
3. Veja as abas **Fatores**, **Biomarcadores** e **Histórico** (MMSE caindo e volume hipocampal ao longo do tempo).
4. Registre a decisão: escolha a concordância, marque evidências e use **Gerar rascunho**. Depois inclua um **adendo** — a decisão não é editável.
5. Abra **Maria Silva** (confiança baixa e aviso de pseudodemência) e **Aparecida Souza** (análise bloqueada por pendência de aquisição — cenário C03).
6. Entre como **técnico** e crie um **Novo caso**: o envio é bloqueado enquanto houver item obrigatório pendente; ao enviar, acompanhe o processamento até a sugestão ficar pronta.

---

## Stack

| Camada | Escolha |
|---|---|
| Base | React 18 + TypeScript (strict) + Vite 6 |
| Estilo | Tailwind CSS v4 com tokens de design em `src/index.css` |
| Componentes | Primitivos acessíveis do Radix UI, no padrão shadcn/ui (`src/components/ui`) |
| Rotas | React Router 6 (flags v7 ativas), páginas com *lazy loading* |
| Dados do servidor | TanStack Query (cache, polling do processamento, invalidação) |
| Sessão | Zustand persistido em `sessionStorage` |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |
| Ícones | lucide-react |
| Rolagem (landing) | Lenis, com inércia; desligado com `prefers-reduced-motion` |
| Tipografia | IBM Plex Sans (interface), IBM Plex Mono (dados), Instrument Serif (títulos de vitrine) |

## Estrutura

```
src/
├── types/               # contrato de domínio (o que o backend deve devolver)
├── services/
│   ├── contract.ts      # interface Api — única dependência das telas
│   ├── api.ts           # escolhe mock ou HTTP via VITE_USE_MOCK
│   ├── http/            # cliente fetch + implementação HTTP do contrato
│   └── mock/            # API simulada, seed de casos e gerador de predições
├── hooks/               # React Query (useCases), logout, inatividade
├── store/               # sessão (Zustand)
├── lib/                 # vocabulário clínico, glossário, utilitários
├── components/          # UI base, layout autenticado, selos de domínio
└── features/
    ├── landing/         # página inicial
    ├── auth/            # login, cadastro, recuperação de senha
    ├── dashboard/       # painel por perfil
    ├── cases/           # lista com busca e filtros
    ├── case-detail/     # explicação, decisão, parecer, relatório
    ├── new-case/        # assistente de preparo do caso
    ├── viewer/          # visualizador de RM (sintética) + mapa de atenção
    └── glossary/        # glossário contextual
```

---

## Integração com o backend

As telas só conhecem a interface `Api` (`src/services/contract.ts`). Para trocar a simulação pelo backend real:

```bash
cp .env.example .env.local
# VITE_USE_MOCK=false
# VITE_API_URL=http://localhost:8000/api
```

Endpoints esperados (implementados em `src/services/http/httpApi.ts`; tipos em `src/types/index.ts`):

| Método | Rota | Corpo → Resposta |
|---|---|---|
| POST | `/auth/login` | `LoginInput` → `AuthSession` |
| POST | `/auth/register` | `RegisterInput` → `AuthSession` |
| POST | `/auth/password-reset` | `{ email }` → 204 |
| POST | `/auth/logout` | — → 204 |
| GET | `/cases?search&status&suggested` | → `CaseSummary[]` |
| GET | `/cases/:id` | → `ClinicalCase` |
| GET | `/dashboard/stats` | → `DashboardStats` |
| POST | `/cases` | `NewCaseInput` → `ClinicalCase` |
| POST | `/cases/:id/decision` | `DecisionInput` → `ClinicalCase` (409 se já houver decisão) |
| POST | `/cases/:id/addenda` | `{ text }` → `ClinicalCase` |
| POST | `/cases/:id/referrals` | `ReferralInput` → `ClinicalCase` |
| POST | `/cases/:id/referrals/:rid/opinion` | `OpinionInput` → `ClinicalCase` |
| POST | `/cases/:id/events` | `{ action }` → 204 (auditoria de abertura/exportação) |

Autenticação por `Authorization: Bearer <token>`; um 401 encerra a sessão local. Erros devem vir como `{ message, code? }`.

**Pontos que o modelo M-XAI Net precisa fornecer** (`Prediction`): probabilidades por classe (CN/MCI/AD), regiões do Grad-CAM com âncoras por plano, contribuições SHAP já com rótulo e explicação clínica, biomarcadores com percentil normativo e avisos (*caveats*) do caso. A faixa de confiança é derivada das probabilidades em `src/lib/domain.ts` — **os limiares são provisórios e precisam ser calibrados com a equipe do modelo**.

**Visualizador:** `src/features/viewer/renderMri.ts` gera uma RM sintética. Com dados reais, ele deve ser substituído por um leitor DICOM/NIfTI (ex.: Cornerstone3D) mantendo a mesma API do componente `MriViewer` (regiões + opacidade + planos).

---

## O que é real e o que é simulado

Exigência da Entrega 8 — o protótipo avalia **a interação**, não o desempenho do modelo.

| Funcional de verdade | Simulado |
|---|---|
| Fluxos, navegação, validações, estados de erro/vazio/carregamento | Imagens de RM (procedurais, rotuladas na tela) |
| Registro de decisão imutável + adendos + trilha de auditoria | Predições, mapas de atenção, SHAP e biomarcadores |
| Encaminhamento e parecer estruturado | Latência e tempo de processamento (~18 s) |
| Controle por perfil, sessão com expiração por inatividade (15 min) | Importação do prontuário e envio de e-mail |
| Relatório imprimível / PDF | Pacientes (fictícios, vindos dos cenários) |

---

## Rastreabilidade com as entregas de IHC

| Tela / elemento | Persona · cenário · tarefa | Origem |
|---|---|---|
| Parecer de especialista estruturado (conclusão, critérios, recomendação, canal) | P01, P02 · C02 · T01 | H06; HTA T01 2.2–2.3 |
| Registrar parecer recebido por telefone | P01 · C02 · T01 | GOMS T01 M1 (o raciocínio ficava "na memória") |
| Visualizador com mapa de atenção e opacidade 0–100% | P01, P02, P03 | F02; RC01 (OHIF) |
| Fundo escuro só na área da imagem | todas | RC02 |
| Resumo → fatores → biomarcadores → histórico (camadas) | P01 | F03/F04; RC08 (iatroX) |
| Confiança em faixas, nunca número isolado | P01 | H03; RC03, RC10 |
| Origem do dado em cada fator; glossário no próprio termo | P01 | F08; RC04, RC09 |
| Limites do modelo (ADNI) em todo caso | todas | RC11 |
| Biomarcadores com percentil normativo | P01, P03 | Feature-Augmented (Entrega 1, 1.5); T02 2.3 |
| Comparação com exames anteriores | P01 | F05; HTA T01 1.2 |
| Relato da família e pergunta clínica junto ao caso | P02, P03 | C04 / T04; C01 / T02 1.2 |
| Decisão com concordância, evidências e rascunho automático | P01 | A02/F06; decisão de design de P01 (Entrega 3) |
| Decisão imutável + adendo | P01, P02 | Entrega 1, seção 8 (sem CRUD de edição) |
| Encaminhar sem sair do caso | P01 | F07; Jornada etapa 6 |
| Assistente de novo caso com checklist e bloqueio de envio | P04 · C03 · T03 | H07; HTA T03 3.1; RC05 |
| Importar do prontuário + confirmar identidade | P04 · T03 | GOMS T03 3.A; HTA 2.2.2 |
| Análise bloqueada por pendência de aquisição | P04 · C03 | GOMS T03 2.D |
| Sessão em `sessionStorage` + logout por inatividade | todas | Entrega 1, 5.3 (estação compartilhada) |
| Filas do painel diferentes por perfil | P01–P04 | Entrega 3, contexto de uso |

## Acessibilidade

- Componentes Radix (teclado, foco e ARIA corretos em diálogos, menus, selects, abas, sliders).
- Visualizador operável por teclado: ↑ ↓ corte, + − zoom, O mapa, R restaurar, 1 2 3 planos.
- Foco levado ao primeiro erro do formulário, sem ficar sob o cabeçalho fixo (WCAG 2.4.11).
- Cor nunca é o único canal (faixas de confiança têm texto; fatores dizem "aproxima/afasta").
- Respeita `prefers-reduced-motion`; layout responsivo sem rolagem horizontal em 390 px.
