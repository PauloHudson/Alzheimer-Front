# M-XAI · Front-end

Interface web de apoio ao **diagnóstico explicável da doença de Alzheimer**, front-end do *M-XAI Net*, um framework multimodal de IA explicável para diagnóstico da doença de Alzheimer.

> **A IA sugere e explica. O médico decide.**
> Enquanto o backend não estiver integrado, pacientes, imagens e sugestões são **simulados**. Não use para decisões clínicas reais.

O escopo da interface acompanha o que o pipeline do modelo (repositório `tcc-alzheimer-diagnosis-multimodal-xai`, branch `codigo-treinamento`) produz hoje:

1. o médico envia a **RM T1** e os **dados clínicos** do paciente;
2. o modelo devolve a **probabilidade por classe**, o **Grad-CAM** sobre o corte analisado e o **peso de cada modalidade** (SHAP);
3. o médico registra a **decisão**, com concordância, conclusão e justificativa.

---

## Como rodar

Requisitos: Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de produção em dist/
npm run preview    # serve o build
```

Conta de demonstração: `medico@mxai.app` / `demo1234` (a tela de login tem um botão que preenche).

Deploy na Vercel: o projeto é detectado como Vite e o `vercel.json` redireciona as rotas para `index.html`. Sem variáveis de ambiente, usa a API simulada; para o backend real, configure `VITE_USE_MOCK=false` e `VITE_API_URL`.

Os dados da API simulada ficam no `localStorage`. Para voltar ao estado inicial: menu do usuário → **Restaurar dados iniciais**.

### Roteiro (≈3 min)

1. Abra **Ivo Bittencourt**: sugestão de DA com confiança alta. Ajuste a opacidade do mapa de atenção (tecla **O** liga e desliga).
2. Abra **Maria Silva**: confiança baixa e volumetria imputada (avisos em "Limites desta sugestão").
3. Registre a decisão de um dos dois casos. Ela não pode ser editada depois.
4. Crie um **Novo caso** com "Usar exame de exemplo": a análise simulada leva cerca de 12 s.
5. **José Carlos Lima** mostra o estado de falha (série que não é T1 volumétrica).

---

## Stack

| Camada | Escolha |
|---|---|
| Base | React 18 + TypeScript (strict) + Vite 6 |
| Estilo | Tailwind CSS v4 com tokens de design em `src/index.css`; modo noturno pela classe `dark` no `<html>` (`src/store/theme.ts`) |
| Componentes | Primitivos acessíveis do Radix UI, no padrão shadcn/ui (`src/components/ui`) |
| Rotas | React Router 6, páginas com *lazy loading* |
| Dados do servidor | TanStack Query (cache e *polling* enquanto o caso está em análise) |
| Sessão | Zustand persistido em `sessionStorage` |
| Formulários | React Hook Form + Zod |

## Estrutura

```
src/
├── types/               # contrato de domínio (o que o backend deve devolver)
├── services/
│   ├── contract.ts      # interface Api — única dependência das telas
│   ├── api.ts           # escolhe mock ou HTTP via VITE_USE_MOCK
│   ├── http/            # cliente fetch + implementação HTTP do contrato
│   └── mock/            # API simulada, casos de exemplo, imagens sintéticas
├── hooks/               # React Query (useCases), logout, inatividade
├── store/               # sessão (Zustand)
├── lib/                 # vocabulário clínico, glossário, utilitários
├── components/          # UI base, layout autenticado, selos de domínio
└── features/
    ├── landing/         # página inicial (vitrine; showcase/ é só ilustrativo)
    ├── auth/            # login e cadastro
    ├── cases/           # lista com busca e filtro por status
    ├── new-case/        # envio de RM + dados clínicos
    ├── case-detail/     # sugestão, explicação, decisão, relatório
    └── viewer/          # corte axial + Grad-CAM com opacidade
```

---

## Integração com o backend

As telas só conhecem a interface `Api` (`src/services/contract.ts`). Para trocar a simulação pelo backend real:

```bash
cp .env.example .env.local
# VITE_USE_MOCK=false
# VITE_API_URL=http://localhost:8000/api
```

> O repositório do modelo hoje tem **só o código de treino**. Falta uma API de inferência (ex.: FastAPI) que carregue um modelo treinado e siga o contrato abaixo.

### Endpoints

Implementados em `src/services/http/httpApi.ts`; tipos em `src/types/index.ts`.

| Método | Rota | Corpo → Resposta |
|---|---|---|
| POST | `/auth/login` | `LoginInput` → `AuthSession` |
| POST | `/auth/register` | `RegisterInput` → `AuthSession` |
| POST | `/auth/logout` | — → 204 |
| GET | `/cases?search&status` | → `CaseSummary[]` |
| GET | `/cases/:id` | → `ClinicalCase` |
| POST | `/cases` | multipart: `data` (JSON de `NewCaseInput` sem o arquivo) + `mri` (arquivo) → `ClinicalCase` com status `processando` |
| POST | `/cases/:id/decision` | `DecisionInput` → `ClinicalCase` (409 se já houver decisão) |

Autenticação por `Authorization: Bearer <token>`; um 401 encerra a sessão local. Erros devem vir como `{ message, code? }` (FastAPI: `detail` também é aceito).

A inferência é assíncrona: `POST /cases` responde logo com `status: "processando"` e a interface consulta `GET /cases/:id` a cada 2 s até o status virar `aguardando_revisao` (ou `erro`, com a mensagem em `error`).

### De onde vem cada campo no pipeline

| Front (`src/types`) | Backend (`src/multimodal`) |
|---|---|
| `patient.age`, `patient.sex`, `patient.educationYears` | colunas `age`, `sex` (`Female`/`Male` ↔ `F`/`M`), `educ` |
| `tabular.apoe` | coluna `apoe` no formato da ADNI (`ε3/ε4`…); o backend deriva `apoe4_alleles` |
| `tabular.marital` | coluna `marital` (valores da ADNI: `Married`, `Widowed`…) |
| `tabular.icvMm3`, `hippocampusMm3`, `lateralVentriclesMm3` | `etiv`, `hippocampus_norm = hipocampo / ICV`, `ventricle_norm = ventrículos / ICV` (`_volumetria` em `rda_tabular.py`); as razões derivadas saem de `_derivar_features` |
| campo ausente | imputado pelo `KNNImputer` do pré-processador da dobra |
| `prediction.classes`, `probabilities` | ordem de `classes_atuais()` e `softmax` dos logits |
| `prediction.gradcam.sliceUrl` | canal central do tensor de entrada, `denormalize(image)[..., 1]` (`gradcam.py`), como PNG 224×224 em tons de cinza |
| `prediction.gradcam.heatmapUrl` | `GradCAM(model)(image, tabular, class_idx=AD)` → `(cam * 255).astype(uint8)` como PNG em tons de cinza; a interface aplica a paleta |
| `prediction.modalityShare` | ponto B do `shap_analysis.py` (SHAP na entrada da MLP de fusão): Σ\|SHAP\| do bloco visual ÷ total, **para este exame** — hoje o script só grava a média por classe |
| `prediction.architecture`, `modelVersion` | nome da arquitetura e identificação do checkpoint (ex.: `late_fusion-kfold-centro-d1`) |

As imagens podem ir como *data URI* (`data:image/png;base64,…`) ou como URL. Se forem URL de outra origem, o servidor precisa mandar cabeçalho CORS, porque a interface lê os pixels do mapa num `<canvas>` para colorir.

### Decisões em aberto com a equipe do modelo

- **Binário ou 3 classes.** Os resultados mais recentes (k-fold por centro) são CN × AD. A interface funciona com qualquer conjunto: desenha uma barra por item de `classes`. A conclusão do médico continua podendo ser CN, CCL, DA ou inconclusivo.
- **Volumetria de um paciente novo.** No treino, ICV, hipocampo e ventrículos vêm do FreeSurfer da UCSF (`UCSFFSX51`). Para um exame novo é preciso rodar o FreeSurfer (horas por exame) ou aceitar a imputação. Por isso os campos são opcionais. `nwbv` não é pedido na interface (soma de 118 parcelações; o próprio README do modelo aponta que o nome não corresponde ao valor) e fica a cargo da imputação.
- **Limiares de confiança** (`confidenceFromProbabilities` em `src/lib/domain.ts`) são provisórios. O README do modelo mostra que a calibração não transfere entre bases.
- **Formato do arquivo.** O ETL atual lê séries DICOM (`dicom_etl.py`); a interface aceita `.zip` (DICOM) e NIfTI. Se o backend só aceitar DICOM, basta restringir o `accept` em `NewCasePage.tsx`.

---

## O que foi cortado e por quê

A primeira versão (commit `f25089a`) simulava saídas que o modelo não produz. Esta versão mantém só o que o backend sustenta:

| Removido | Motivo |
|---|---|
| Visualizador 3D com três planos e regiões anatômicas nomeadas | O Grad-CAM é de **um corte axial 2D**, em grade 7×7, sem rótulo anatômico |
| SHAP por variável clínica ("fatores") | O ramo tabular é uma Random Forest; o SHAP só separa imagem × clínica (§5.2 do README do modelo) |
| Biomarcadores com percentil normativo | Não há referência normativa no pipeline |
| MMSE, MoCA e CDR no formulário | Ficam fora do modelo de propósito: o rótulo da ADNI é derivado deles |
| Perfis (técnico, radiologista, neurologista), encaminhamento e parecer, adendos, trilha de auditoria, histórico de exames, painel com gráficos | Exigiriam um backend de aplicação inteiro além da inferência |
| Recuperação de senha e glossário em página própria | Fora do escopo atual; o glossário continua como dica no próprio termo |

A **landing page** (`src/features/landing`) foi mantida como vitrine. Ela tem uma demonstração ilustrativa própria (visualizador 3D sintético e fatores) isolada em `features/landing/showcase/`, com tipos próprios, que não faz parte do contrato com o backend.

Tudo continua no histórico do git, caso algo volte ao escopo.

## Acessibilidade

- Componentes Radix (teclado, foco e ARIA corretos em diálogos, menus, selects e sliders).
- Mapa de atenção operável por teclado (tecla **O**) e com opacidade ajustável.
- Foco levado ao primeiro erro do formulário, sem ficar sob o cabeçalho fixo (WCAG 2.4.11).
- Cor nunca é o único canal (faixas de confiança e status têm texto).
- Respeita `prefers-reduced-motion`; layout responsivo sem rolagem horizontal em 390 px.
