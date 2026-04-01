#!/usr/bin/env tsx
/**
 * Fill Missing Translations
 *
 * Adds missing translation keys to pt-PT.json and zh-CN.json
 * using hand-written translations (not machine-generated placeholders).
 *
 * Usage:
 *   npx tsx scripts/fill-translations.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const MESSAGES_DIR = path.join(ROOT, 'messages');

// ── Helper: deep merge (target wins for existing keys) ─────────────
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      result[key] &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key]) &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      );
    } else if (!(key in result)) {
      result[key] = source[key];
    }
  }
  return result;
}

// ── Portuguese (pt-PT) translations ────────────────────────────────

const ptAdditions: Record<string, unknown> = {
  Navigation: {
    marketplace: 'Impulsionar',
  },

  Proposals: {
    categoryShortFeature: 'Funcionalidade',
    categoryShortGovernance: 'Governação',
    categoryShortTreasury: 'Tesouraria',
    categoryShortCommunity: 'Comunidade',
    categoryShortDevelopment: 'Desenvolvimento',
    infoSection1Title: 'Como Funcionam as Propostas',
    infoSection1Point1:
      '**As propostas são o coração da governação.** Qualquer membro com um ID Orgânico pode submeter uma proposta para sugerir funcionalidades, alocar fundos da tesouraria ou definir a direção da DAO.',
    infoSection1Point2:
      'Cada proposta passa por fases: **Pública → Qualificada → Discussão → Votação → Finalizada.** O envolvimento da comunidade em cada fase determina o que avança.',
    infoSection1Point3:
      'As propostas que chegam à fase de votação são decididas por toda a comunidade. Um membro, um voto — transparente e registado.',
    infoSection2Title: 'O Teu Papel',
    infoSection2Point1:
      '**Vota em propostas ativas** para moldar o futuro da DAO. Cada voto ganha XP e avança-te no percurso de governação.',
    infoSection2Point2:
      '**Comenta nas discussões** para refinar propostas antes da votação. Feedback construtivo é recompensado com XP.',
    infoSection2Point3:
      '**Submete as tuas próprias propostas** quando vires uma oportunidade de melhorar a DAO. Boas propostas começam com um problema claro e uma solução concreta.',
    infoSection3Title: 'Dicas',
    infoSection3Point1:
      'Usa os **filtros de categoria** para te focares no que te interessa — propostas de Tesouraria, Governação, Comunidade, Desenvolvimento ou Funcionalidade.',
    infoSection3Point2:
      'A **Barra Lateral de Governação** mostra o pulso da atividade atual — temas quentes, distribuição por fase e tendências de envolvimento da comunidade.',
  },

  ProposalWizard: {
    stepperLabelCategory: 'Categoria',
    stepperLabelProblem: 'Problema',
    stepperLabelBudget: 'Orçamento',
    stepperLabelReview: 'Revisão',
  },

  ProposalDetail: {
    accordionGovernanceStatus: 'Estado da Governação',
    accordionGovernanceStatusCollapsed: 'Estado: {status}',
    accordionVersionProvenance: 'Histórico de Versões',
    accordionVersionCollapsed: 'Versão {version}',
  },

  Profile: {
    tabAccount: 'Conta',
    tabSocial: 'Redes Sociais',
    tabWallet: 'Carteira e Segurança',
    tabNotifications: 'Notificações',
  },

  Gamification: {
    questTableName: 'Missão',
    questTableCadence: 'Cadência',
    questTableProgress: 'Progresso',
    questTableStatus: 'Estado',
    questTableAction: 'Ação',
  },

  Analytics: {
    personal: {
      totalXp: 'XP Total',
      xp: 'XP Total',
      level: 'Nível',
      currentStreak: 'Sequência',
      streak: 'Sequência',
      claimablePoints: 'Pontos',
      points: 'Pontos',
      tasksCompleted: 'Tarefas Concluídas',
      tasks: 'Tarefas Concluídas',
      longestStreak: 'Melhor Sequência',
      achievements: 'Melhor Sequência',
      xpTrendTitle: 'XP Ganho ao Longo do Tempo',
      xpTrendDesc: 'XP diário ganho nos últimos 90 dias',
      xpEarned: 'XP Ganho',
      heatmapTitle: 'Mapa de Atividade',
      heatmapDesc: 'A tua atividade diária no último ano',
      engagementTitle: 'Detalhes de Envolvimento',
      engagementDesc: 'As tuas publicações, comentários e gostos',
      posts: 'Publicações',
      comments: 'Comentários',
      likesGiven: 'Gostos Dados',
      likesReceived: 'Gostos Recebidos',
      noData: 'Sem dados ainda',
      less: 'Menos',
      more: 'Mais',
    },
    aiSummary: {
      title: 'Resumo de Governação por IA',
      noSummary:
        'Ainda não há resumo de governação disponível. Os resumos são gerados diariamente.',
      insights: 'Perceções',
      risks: 'Riscos',
      generatedBy: 'Gerado por {model}',
      sentiment: {
        healthy: 'Saudável',
        caution: 'Cautela',
        critical: 'Crítico',
      },
    },
  },

  IdeaDetail: {
    harvestCta: 'Colheita Semanal',
    infoSection1Title: 'O Que São Ideias?',
    infoSection1Point1:
      '**As ideias são propostas ligeiras** — um espaço para lançar conceitos antes de se comprometer com uma proposta formal de governação. Pensa nisto como o quadro de brainstorming da DAO.',
    infoSection1Point2:
      'Vota nas ideias em que acreditas. As ideias mais apoiadas são **promovidas a propostas completas** e entram no processo de governação.',
    infoSection1Point3:
      'Ideias com impulso ganham XP e progresso em conquistas para os seus autores. As melhores ideias são destacadas no resumo da **Colheita Semanal**.',
    infoSection2Title: 'Como Participar',
    infoSection2Point1:
      '**Submete ideias** sobre qualquer tema — funcionalidades, parcerias, eventos, melhorias de governação. Nenhuma ideia é pequena demais para iniciar uma conversa.',
    infoSection2Point2:
      '**Vota e comenta** para ajudar as melhores ideias a destacarem-se. O teu envolvimento aqui molda diretamente o que a DAO trabalha a seguir.',
    infoSection2Point3:
      'Consulta o separador **Tendências** para ver o que está a gerar interesse, ou navega em **Promovidas** para ver quais ideias se tornaram propostas.',
    infoSection3Title: 'Ganhar Recompensas',
    infoSection3Point1:
      'Criar ideias, votar e comentar ganha **XP e progresso em missões.** Missões diárias como "Partilhar uma Ideia" e "Votar em Ideias" recompensam participação consistente.',
    infoSection3Point2:
      'A missão **Campeão de Ideias** recompensa ter uma ideia promovida a proposta — a validação máxima da tua comunidade.',
  },

  Harvest: {
    title: 'Colheita Semanal',
    subtitle:
      'Um olhar curado sobre as melhores ideias da semana, principais contribuidores e impulso da comunidade.',
    backToIdeas: 'Voltar às ideias',
    disabledTitle: 'Incubadora de ideias desativada',
    disabledDescription: 'Ativa a funcionalidade para aceder a esta página.',
    winnerTitle: 'Ideia da Semana',
    unknownAuthor: 'Membro desconhecido',
    noWinner: 'Ainda não foram submetidas ideias esta semana. Sê o primeiro!',
    contributorsTitle: 'Principais Contribuidores',
    noContributors: 'Ainda não foi ganho XP esta semana.',
    statVotes: 'Votos esta semana',
    statIdeas: 'Novas ideias',
    statStreaks: 'Sequências ativas',
    nextWeekTitle: 'Desafio da próxima semana',
    nextWeekDescription:
      'Partilha uma ideia e obtém 3 votos positivos para ganhar o bónus da missão Voz da Comunidade. O principal contribuidor ganha um distintivo de destaque!',
    infoSection1Title: 'A Colheita Semanal',
    infoSection1Point1:
      '**Todas as semanas, as melhores ideias são destacadas aqui.** A ideia vencedora, os principais contribuidores e as estatísticas da comunidade são reunidas numa única página.',
    infoSection1Point2:
      'É aqui que o impulso se torna visível — vê quem está a impulsionar a DAO e que conceitos estão a ganhar tração.',
    infoSection2Title: 'Como Ser Destacado',
    infoSection2Point1:
      '**Submete ideias que ressoem.** As ideias com mais votos positivos e envolvimento sobem ao topo do destaque semanal.',
    infoSection2Point2:
      '**Mantém-te ativo.** Contribuidores consistentes que votam, comentam e propõem ideias ganham reconhecimento no destaque e XP bónus.',
  },

  Community: {
    infoSection1Title: 'Classificações da Comunidade',
    infoSection1Point1:
      '**As classificações refletem contribuições reais, não apenas atividade.** O XP ganho em tarefas, governação e envolvimento comunitário determina a tua posição no ranking.',
    infoSection1Point2:
      'Os níveis desbloqueiam novas capacidades — níveis mais altos podem criar propostas, moderar conteúdo e aceder a missões exclusivas.',
    infoSection1Point3:
      'A tua classificação atualiza-se em tempo real à medida que tu e outros ganham XP. Cada ação conta.',
    infoSection2Title: 'Diretório de Membros',
    infoSection2Point1:
      '**Navega pela lista completa de membros** para encontrar colaboradores, ver quem está ativo e explorar perfis individuais com histórico de contribuições.',
    infoSection2Point2:
      'Cada cartão de membro mostra o seu papel, nível, XP e atividade recente — um resumo rápido do seu envolvimento na DAO.',
    infoSection3Title: 'Subir nas Classificações',
    infoSection3Point1:
      '**Completa tarefas** para os maiores ganhos de XP. Tarefas de desenvolvimento, conteúdo e design contribuem todas para a tua classificação.',
    infoSection3Point2:
      '**Participa na governação** — votar, comentar e propor ideias ganha XP e melhora a tua posição.',
  },

  Marketplace: {
    title: 'Mercado de Envolvimento',
    description:
      'Impulsiona os teus tweets gastando pontos. Outros membros ganham pontos ao interagir com o teu conteúdo — gostos, retweets e comentários.',
    tabActive: 'Impulsos Ativos',
    tabMyBoosts: 'Os Meus Impulsos',
    createBoost: 'Criar Impulso',
    createBoostTitle: 'Criar um Impulso',
    tweetUrlLabel: 'URL do Tweet',
    pointsLabel: 'Pontos a Oferecer',
    pointsHint:
      'Os pontos ficam em custódia e são pagos aos participantes. Mín. 5, máx. 1000.',
    maxEngagementsLabel: 'Máximo de Interações',
    points: 'pts',
    viewTweet: 'Ver Tweet',
    engage: 'Interagir',
    cancel: 'Cancelar',
    cancelAction: 'Cancelar',
    creating: 'A criar...',
    submitting: 'A submeter...',
    submitProofTitle: 'Submeter Prova de Interação',
    submitProof: 'Submeter Prova',
    proofTypeLabel: 'Tipo de Interação',
    proofType: {
      like: 'Gosto',
      retweet: 'Retweet',
      comment: 'Comentário',
    },
    proofUrlLabel: 'URL da Prova (opcional)',
    proofUrlPlaceholder: 'Link para a tua interação',
    proofUrlHint:
      'Opcional: link para o teu retweet ou comentário para verificação.',
    noActiveBoosts:
      'Não há impulsos ativos neste momento. Sê o primeiro a criar um!',
    noMyBoosts: 'Ainda não criaste nenhum impulso.',
    disabledTitle: 'Mercado Em Breve',
    disabledDesc:
      'O mercado de envolvimento ainda não está disponível. Volta mais tarde!',
    status: {
      pending: 'Pendente',
      active: 'Ativo',
      completed: 'Concluído',
      expired: 'Expirado',
      cancelled: 'Cancelado',
    },
  },

  PageGuides: {
    Dashboard: {
      step1Title: 'Bem-vindo ao Organic',
      step1Desc:
        'O painel é a tua base. Mostra a secção principal com uma visão geral rápida do que é o Organic — uma plataforma de coordenação onde o trabalho real da comunidade é público e verificável.',
      step2Title: 'Pulso de Confiança',
      step2Desc:
        'Quatro cartões ao vivo mostram sinais chave de saúde da DAO: a contagem regressiva do sprint atual, fases das propostas, principais contribuidores no ranking e contagem de atividade recente.',
      step3Title: 'Navegação Rápida',
      step3Desc:
        'Abaixo do pulso de confiança, cartões de navegação permitem-te saltar diretamente para Tarefas, Propostas, Sprints, Análises e mais. Cada cartão mostra uma breve descrição.',
      step4Title: 'Estado do Membro',
      step4Desc:
        'Esta secção mostra a tua identidade dentro da DAO — se estás autenticado, se tens um ID Orgânico e o teu nível de acesso à governação. Liga uma carteira com $ORG para desbloquear todas as capacidades.',
      step5Title: 'Estatísticas de Apoio',
      step5Desc:
        'Uma barra compacta no fundo resume métricas da plataforma: total de tarefas, sprints ativos, membros e propostas.',
    },
    Tasks: {
      step1Title: 'Visão Geral do Quadro de Tarefas',
      step1Desc:
        'A página de tarefas é onde todo o trabalho da DAO vive. Navega pelas tarefas abertas, filtra por categoria ou sprint e encontra trabalho adequado às tuas competências.',
      step2Title: 'Estados das Tarefas',
      step2Desc:
        'As tarefas passam por fases: Aberta → Reclamada → Em Revisão → Aprovada. Cada estado tem código de cores para veres o progresso rapidamente.',
      step3Title: 'Reclamar uma Tarefa',
      step3Desc:
        'Encontraste algo em que queres trabalhar? Clica no cartão da tarefa para ver detalhes e depois carrega em Reclamar. Precisas de um ID Orgânico para reclamar tarefas.',
      step4Title: 'Submeter Trabalho',
      step4Desc:
        'Quando terminares, submete o teu trabalho para revisão. Anexa provas (links, capturas de ecrã, descrições) para que os revisores possam verificar a tua contribuição.',
      step5Title: 'Pontos e XP',
      step5Desc:
        'Cada tarefa tem um valor em pontos. Tarefas aprovadas ganham-te XP que constrói a tua reputação e desbloqueia trabalho de nível superior.',
      step6Title: 'Filtros e Ordenação',
      step6Desc:
        'Usa a barra de filtros para limitar tarefas por categoria, contribuidor, sprint ou termo de pesquisa. Ordena por mais recente, data limite ou valor em pontos.',
    },
    Proposals: {
      step1Title: 'Centro de Governação',
      step1Desc:
        'As propostas são como a DAO toma decisões. Qualquer pessoa com um ID Orgânico pode submeter uma proposta para a comunidade considerar.',
      step2Title: 'Ciclo de Vida da Proposta',
      step2Desc:
        'As propostas passam por fases: Pública → Qualificada → Discussão → Votação → Finalizada. Cada fase tem requisitos específicos antes de avançar.',
      step3Title: 'Submeter uma Proposta',
      step3Desc:
        "Clica em 'Nova Proposta' para começar. Fornece um título, descrição, categoria e o que estás a propor. A comunidade vai rever e discutir antes de votar.",
      step4Title: 'Qualificação',
      step4Desc:
        'Novas propostas precisam de envolvimento da comunidade para se qualificarem para votação. Comentários, gostos e visualizações suficientes sinalizam que a comunidade quer votar.',
      step5Title: 'Votação',
      step5Desc:
        'Propostas qualificadas entram numa janela de votação. Detentores de tokens votam com peso proporcional aos seus $ORG. Os resultados são vinculativos.',
      step6Title: 'Filtragem e Descoberta',
      step6Desc:
        'Ordena propostas por Novas, Populares, Mais Discutidas ou Mais Votadas. Filtra por categoria para te focares na tua área de interesse.',
    },
    Sprints: {
      step1Title: 'Visão Geral dos Sprints',
      step1Desc:
        'Sprints são ciclos de execução focados onde a DAO entrega trabalho. Agrupam tarefas em períodos com datas de início e fim claras.',
      step2Title: 'Ciclo de Vida do Sprint',
      step2Desc:
        'Os sprints progridem por fases: Planeamento → Ativo → Revisão → Janela de Disputa → Liquidação. Cada fase tem regras específicas.',
      step3Title: 'Visualizações',
      step3Desc:
        'Alterna entre vistas de Quadro, Lista e Cronologia. O Quadro mostra colunas estilo Kanban, a Lista é compacta e a Cronologia mostra datas.',
      step4Title: 'Avanço de Fase',
      step4Desc:
        'Os administradores avançam os sprints pelas fases. Quando um sprint passa para Revisão, todo o trabalho submetido é avaliado.',
      step5Title: 'Planeamento de Capacidade',
      step5Desc:
        'Cada sprint tem um limite de capacidade. A barra de progresso mostra quanto do orçamento de pontos está alocado.',
    },
    Rewards: {
      step1Title: 'Visão Geral das Recompensas',
      step1Desc:
        'A página de recompensas acompanha como as contribuições se transformam em pagamentos. Vê os teus pontos ganhos, reclamações pendentes e histórico de pagamentos.',
      step2Title: 'Sistema de Pontos',
      step2Desc:
        'Tarefas aprovadas ganham-te pontos. Os pontos acumulam e tornam-se reclamáveis quando atingem o limite definido pela DAO.',
      step3Title: 'Reclamar Recompensas',
      step3Desc:
        'Quando tiveres pontos suficientes, submete uma reclamação. A tua reclamação passa por um processo de aprovação antes do pagamento.',
      step4Title: 'Fluxo de Aprovação',
      step4Desc:
        'As reclamações são revistas pelos membros do conselho. Reclamações aprovadas entram na fila de pagamento.',
      step5Title: 'Histórico de Pagamentos',
      step5Desc:
        'O separador Distribuições mostra todos os pagamentos concluídos. Acompanha quando os pagamentos foram feitos, montantes e estado das transações.',
    },
    Disputes: {
      step1Title: 'Sistema de Disputas',
      step1Desc:
        'As disputas existem para manter a DAO justa. Se acreditas que uma revisão de tarefa foi incorreta ou uma decisão foi injusta, podes abrir uma disputa.',
      step2Title: 'Quando Abrir',
      step2Desc:
        'Abre uma disputa durante a janela de disputa do sprint. Precisas de apostar XP — isto previne disputas frívolas.',
      step3Title: 'Aposta de XP',
      step3Desc:
        'Abrir uma disputa requer apostar XP. Se a disputa for aceite, recuperas a aposta mais a resolução. Se negada, perdes a aposta.',
      step4Title: 'Processo de Arbitragem',
      step4Desc:
        'Os membros do conselho reveem as disputas e votam no resultado. O processo é transparente — todas as partes podem ver o raciocínio.',
      step5Title: 'Resolução',
      step5Desc:
        'Uma vez completa a arbitragem, a decisão é vinculativa. Revisões de tarefas podem ser revertidas, pontos ajustados e apostas de XP liquidadas.',
    },
    Quests: {
      step1Title: 'Sistema de Missões',
      step1Desc:
        'As missões são desafios gamificados que recompensam participação consistente. Completa objetivos diários, semanais e de longo prazo para ganhar XP bónus.',
      step2Title: 'Missões Diárias',
      step2Desc:
        'Pequenas ações diárias como iniciar sessão, comentar numa proposta ou rever uma submissão de tarefa. Reiniciam a cada 24 horas.',
      step3Title: 'Missões Semanais',
      step3Desc:
        'Objetivos maiores que abrangem uma semana: completar uma tarefa, votar em propostas ou participar em discussões.',
      step4Title: 'Missões de Longo Prazo',
      step4Desc:
        'Missões de conquista para contribuição sustentada: completar o primeiro sprint, alcançar um nível de reputação ou atingir um marco de sequência.',
      step5Title: 'XP e Cadência',
      step5Desc:
        'O XP das missões soma-se à tua pontuação total de reputação. O sistema de cadência recompensa consistência — manter sequências multiplica as tuas recompensas.',
    },
    Analytics: {
      step1Title: 'Visão Geral de Análises',
      step1Desc:
        'As análises fornecem uma visão baseada em dados da saúde da DAO. Acompanha tendências de atividade, crescimento de membros, velocidade de tarefas e participação na governação.',
      step2Title: 'Tendências de Atividade',
      step2Desc:
        'O gráfico de atividade mostra o volume diário/semanal — conclusões de tarefas, submissões de propostas, votos e comentários.',
      step3Title: 'Estatísticas Pessoais',
      step3Desc:
        'Muda para o separador Pessoal para ver as tuas métricas de contribuição: tarefas concluídas, propostas votadas, XP ganho e sequência de atividade.',
      step4Title: 'Saúde da Governação',
      step4Desc:
        'O separador Governação acompanha resultados de propostas, taxas de participação de votantes e qualidade das decisões.',
      step5Title: 'Cartões de KPI',
      step5Desc:
        'Indicadores chave de desempenho no topo dão-te resumos instantâneos: total de membros, contribuidores ativos, tarefas neste sprint e taxa de participação na governação.',
    },
    Treasury: {
      step1Title: 'Visão Geral da Tesouraria',
      step1Desc:
        'A página da tesouraria mostra como a DAO gere os seus fundos. A transparência é central no Organic — qualquer pessoa pode inspecionar saldos e princípios de alocação.',
      step2Title: 'Saldo e Alocação',
      step2Desc:
        'Vê o saldo atual da tesouraria e como os fundos estão alocados: operações, recompensas, desenvolvimento e reservas.',
      step3Title: 'Política de Emissão',
      step3Desc:
        'A política de emissão define como os tokens fluem da tesouraria para os contribuidores. Isto controla o ritmo de distribuição de recompensas.',
      step4Title: 'Histórico de Transações',
      step4Desc:
        'Um registo de todos os movimentos da tesouraria — entradas, saídas, pagamentos de recompensas e despesas operacionais.',
      step5Title: 'Transparência On-Chain',
      step5Desc:
        'As operações da tesouraria são verificáveis on-chain. A funcionalidade de premir e manter permite inspecionar detalhes sensíveis apenas quando escolheres.',
    },
    Community: {
      step1Title: 'Centro da Comunidade',
      step1Desc:
        'A página da comunidade mostra as pessoas por trás da DAO. Vê quem está a contribuir, como se classificam e explora o diretório de membros.',
      step2Title: 'Ranking',
      step2Desc:
        'As classificações baseiam-se em XP verificado ganho através de contribuições reais — não apenas tokens. O ranking atualiza em tempo real.',
      step3Title: 'Diretório de Membros',
      step3Desc:
        'Navega por todos os membros, os seus papéis, histórico de contribuições e pontuações de reputação. Encontra colaboradores ou vê quem está ativo.',
      step4Title: 'Sistema de Rankings',
      step4Desc:
        'Os membros são classificados pela consistência e qualidade das contribuições. O sistema recompensa participação sustentada em vez de rajadas de atividade.',
    },
    Ideas: {
      step1Title: 'Incubadora de Ideias',
      step1Desc:
        'As ideias são discussões ligeiras pré-proposta. Partilha conceitos iniciais, obtém feedback da comunidade e refina antes de te comprometeres com uma proposta formal.',
      step2Title: 'Submeter uma Ideia',
      step2Desc:
        'Publica uma ideia com título e descrição. Mantém informal — as ideias são exploratórias. A comunidade vai votar e comentar.',
      step3Title: 'Votar em Ideias',
      step3Desc:
        'Vota positivamente nas ideias que achas que merecem atenção. A contagem de votos ajuda a destacar os conceitos mais promissores.',
      step4Title: 'Tendências e Descoberta',
      step4Desc:
        'Ordena por Populares, Novas, Top da Semana ou Top de Sempre. O separador Tendências destaca ideias com impulso rápido.',
      step5Title: 'Promoção a Proposta',
      step5Desc:
        'Quando uma ideia tem tração suficiente, o autor pode promovê-la a proposta formal. Isto transporta o contexto da discussão e sinais de apoio da comunidade.',
    },
  },
};

// ── Simplified Chinese (zh-CN) translations ────────────────────────

const zhAdditions: Record<string, unknown> = {
  Navigation: {
    marketplace: '推广',
  },

  Proposals: {
    categoryShortFeature: '功能',
    categoryShortGovernance: '治理',
    categoryShortTreasury: '金库',
    categoryShortCommunity: '社区',
    categoryShortDevelopment: '开发',
    infoSection1Title: '提案运作方式',
    infoSection1Point1:
      '**提案是治理的核心。**任何拥有 Organic ID 的成员都可以提交提案，建议新功能、分配金库资金或确定 DAO 的发展方向。',
    infoSection1Point2:
      '每个提案经历多个阶段：**公开 → 达标 → 讨论 → 投票 → 完结。**社区在每个阶段的参与决定了哪些提案能够推进。',
    infoSection1Point3:
      '进入投票阶段的提案由全体社区决定。一人一票——透明且有据可查。',
    infoSection2Title: '你的角色',
    infoSection2Point1:
      '**为活跃提案投票**以塑造 DAO 的未来。每次投票都能获得 XP 并推进你的治理之路。',
    infoSection2Point2:
      '**参与讨论评论**以在投票前完善提案。建设性反馈将获得 XP 奖励。',
    infoSection2Point3:
      '**提交你自己的提案**——当你发现改进 DAO 的机会时。好的提案始于一个清晰的问题和一个具体的解决方案。',
    infoSection3Title: '使用技巧',
    infoSection3Point1:
      '使用**分类筛选器**聚焦你感兴趣的领域——金库、治理、社区、开发或功能提案。',
    infoSection3Point2:
      '**治理侧边栏**展示当前活动的脉搏——热门话题、阶段分布和社区参与趋势。',
  },

  ProposalWizard: {
    stepperLabelCategory: '分类',
    stepperLabelProblem: '问题',
    stepperLabelBudget: '预算',
    stepperLabelReview: '审核',
  },

  ProposalDetail: {
    accordionGovernanceStatus: '治理状态',
    accordionGovernanceStatusCollapsed: '状态：{status}',
    accordionVersionProvenance: '版本历史',
    accordionVersionCollapsed: '版本 {version}',
  },

  Profile: {
    tabAccount: '账户',
    tabSocial: '社交网络',
    tabWallet: '钱包与安全',
    tabNotifications: '通知',
  },

  Gamification: {
    questTableName: '任务',
    questTableCadence: '周期',
    questTableProgress: '进度',
    questTableStatus: '状态',
    questTableAction: '操作',
  },

  Analytics: {
    personal: {
      totalXp: '总 XP',
      xp: '总 XP',
      level: '等级',
      currentStreak: '连续天数',
      streak: '连续天数',
      claimablePoints: '积分',
      points: '积分',
      tasksCompleted: '已完成任务',
      tasks: '已完成任务',
      longestStreak: '最佳连续',
      achievements: '最佳连续',
      xpTrendTitle: '随时间获得的 XP',
      xpTrendDesc: '过去90天的每日 XP 收入',
      xpEarned: '获得的 XP',
      heatmapTitle: '活动热力图',
      heatmapDesc: '你过去一年的每日活动',
      engagementTitle: '互动详情',
      engagementDesc: '你的帖子、评论和点赞',
      posts: '帖子',
      comments: '评论',
      likesGiven: '点赞数',
      likesReceived: '收到的赞',
      noData: '暂无数据',
      less: '较少',
      more: '较多',
    },
    aiSummary: {
      title: 'AI 治理摘要',
      noSummary: '暂无治理摘要。摘要每日自动生成。',
      insights: '洞察',
      risks: '风险',
      generatedBy: '由 {model} 生成',
      sentiment: {
        healthy: '健康',
        caution: '谨慎',
        critical: '危急',
      },
    },
  },

  IdeaDetail: {
    harvestCta: '每周精选',
    infoSection1Title: '什么是创意？',
    infoSection1Point1:
      '**创意是轻量级提案**——一个在正式提交治理提案之前抛出想法的空间。可以将其视为 DAO 的头脑风暴白板。',
    infoSection1Point2:
      '为你认可的创意投票。获得最多支持的创意将**晋升为正式提案**并进入治理流程。',
    infoSection1Point3:
      '有势头的创意为其作者赢得 XP 和成就进度。最佳创意会在**每周精选**摘要中被重点展示。',
    infoSection2Title: '如何参与',
    infoSection2Point1:
      '**提交创意**——任何主题皆可：功能、合作、活动、治理改进。没有任何想法小到不值得开启一场讨论。',
    infoSection2Point2:
      '**投票和评论**以帮助最佳创意脱颖而出。你在这里的参与直接塑造了 DAO 接下来的工作方向。',
    infoSection2Point3:
      '查看**趋势**标签了解当前热门内容，或浏览**已晋升**标签查看哪些创意已成为提案。',
    infoSection3Title: '获取奖励',
    infoSection3Point1:
      '创建创意、投票和评论可获得 **XP 和任务进度。**"分享创意"和"为创意投票"等每日任务奖励持续参与。',
    infoSection3Point2:
      '**创意冠军**任务奖励将创意晋升为提案——这是来自社区的最高认可。',
  },

  Harvest: {
    title: '每周精选',
    subtitle: '精心策划的每周最佳创意、顶级贡献者和社区动力一览。',
    backToIdeas: '返回创意',
    disabledTitle: '创意孵化器已禁用',
    disabledDescription: '请启用该功能以访问此页面。',
    winnerTitle: '本周最佳创意',
    unknownAuthor: '未知成员',
    noWinner: '本周尚未提交任何创意。成为第一个！',
    contributorsTitle: '顶级贡献者',
    noContributors: '本周尚未获得 XP。',
    statVotes: '本周投票数',
    statIdeas: '新创意',
    statStreaks: '活跃连续',
    nextWeekTitle: '下周挑战',
    nextWeekDescription:
      '分享一个创意并获得3个赞同票，即可赢得社区之声任务奖励。顶级贡献者将获得聚光徽章！',
    infoSection1Title: '每周精选',
    infoSection1Point1:
      '**每周，最佳创意都会在此展示。**获胜创意、顶级贡献者和社区统计数据汇集在一个页面中。',
    infoSection1Point2:
      '这里是势头变得可见的地方——看看谁在推动 DAO 前进，哪些概念正在获得关注。',
    infoSection2Title: '如何被推荐',
    infoSection2Point1:
      '**提交能引起共鸣的创意。**获得最多赞同票和互动的创意将登上每周推荐榜首。',
    infoSection2Point2:
      '**保持活跃。**持续投票、评论和提出创意的贡献者将获得推荐认可和额外 XP。',
  },

  Community: {
    infoSection1Title: '社区排行',
    infoSection1Point1:
      '**排行反映真实贡献，而不仅仅是活跃度。**通过任务、治理和社区参与获得的 XP 决定你在排行榜上的位置。',
    infoSection1Point2:
      '等级解锁新能力——更高等级可以创建提案、审核内容和解锁专属任务。',
    infoSection1Point3:
      '你的排名会随着你和其他人获得 XP 而实时更新。每一个行动都很重要。',
    infoSection2Title: '成员目录',
    infoSection2Point1:
      '**浏览完整的成员列表**以寻找协作者，查看谁在活跃，以及探索包含贡献历史的个人档案。',
    infoSection2Point2:
      '每张成员卡片展示其角色、等级、XP 和近期活动——快速了解其在 DAO 中的参与情况。',
    infoSection3Title: '提升排名',
    infoSection3Point1:
      '**完成任务**以获得最多 XP。开发、内容和设计任务都计入你的排名。',
    infoSection3Point2:
      '**参与治理**——投票、评论和提出创意都能获得 XP 并提升你的排名。',
  },

  Marketplace: {
    title: '互动市场',
    description:
      '花费积分推广你的推文。其他成员通过与你的内容互动来赚取积分——点赞、转发和评论。',
    tabActive: '活跃推广',
    tabMyBoosts: '我的推广',
    createBoost: '创建推广',
    createBoostTitle: '创建推广',
    tweetUrlLabel: '推文链接',
    pointsLabel: '提供积分',
    pointsHint: '积分将被托管并支付给参与者。最少5，最多1000。',
    maxEngagementsLabel: '最大互动数',
    points: '分',
    viewTweet: '查看推文',
    engage: '互动',
    cancel: '取消',
    cancelAction: '取消',
    creating: '创建中...',
    submitting: '提交中...',
    submitProofTitle: '提交互动证明',
    submitProof: '提交证明',
    proofTypeLabel: '互动类型',
    proofType: {
      like: '点赞',
      retweet: '转发',
      comment: '评论',
    },
    proofUrlLabel: '证明链接（可选）',
    proofUrlPlaceholder: '你的互动链接',
    proofUrlHint: '可选：提供你的转发或评论链接以供验证。',
    noActiveBoosts: '目前没有活跃的推广。成为第一个创建者！',
    noMyBoosts: '你还没有创建任何推广。',
    disabledTitle: '市场即将上线',
    disabledDesc: '互动市场尚未开放，请稍后再来！',
    status: {
      pending: '待处理',
      active: '进行中',
      completed: '已完成',
      expired: '已过期',
      cancelled: '已取消',
    },
  },

  PageGuides: {
    Dashboard: {
      step1Title: '欢迎来到 Organic',
      step1Desc:
        '仪表盘是你的大本营。它展示了主要区域，快速概述 Organic 是什么——一个让社区真实工作公开透明且可验证的协作平台。',
      step2Title: '信任脉冲',
      step2Desc:
        '四张实时卡片展示 DAO 关键健康信号：当前冲刺倒计时、提案阶段、排行榜顶级贡献者和近期活动计数。',
      step3Title: '快捷导航',
      step3Desc:
        '信任脉冲下方的导航卡片可让你直接跳转到任务、提案、冲刺、分析等页面。每张卡片都有简短说明。',
      step4Title: '成员状态',
      step4Desc:
        '此区域展示你在 DAO 中的身份——是否已登录、是否拥有 Organic ID 以及治理访问级别。连接持有 $ORG 的钱包以解锁全部功能。',
      step5Title: '支撑数据',
      step5Desc:
        '底部的紧凑统计栏汇总平台指标：总任务数、活跃冲刺、成员数和提案数。',
    },
    Tasks: {
      step1Title: '任务看板概览',
      step1Desc:
        '任务页面是 DAO 所有工作的集合地。浏览开放任务、按分类或冲刺筛选，找到适合你技能的工作。',
      step2Title: '任务状态',
      step2Desc:
        '任务经历多个阶段：开放 → 已认领 → 审核中 → 已批准。每个状态都有颜色编码，方便快速查看进度。',
      step3Title: '认领任务',
      step3Desc:
        '找到想要参与的工作？点击任务卡片查看详情，然后点击认领。认领任务需要 Organic ID。',
      step4Title: '提交工作',
      step4Desc:
        '完成后，将你的工作提交审核。附上证据（链接、截图、说明），以便审核者验证你的贡献。',
      step5Title: '积分与 XP',
      step5Desc:
        '每个任务都有积分价值。批准的任务为你赚取 XP，建立声誉并解锁更高级别的工作。',
      step6Title: '筛选与排序',
      step6Desc:
        '使用筛选栏按分类、贡献者、冲刺或搜索词限制任务。按最新、截止日期或积分价值排序。',
    },
    Proposals: {
      step1Title: '治理中心',
      step1Desc:
        '提案是 DAO 做出决策的方式。任何拥有 Organic ID 的人都可以提交提案供社区审议。',
      step2Title: '提案生命周期',
      step2Desc:
        '提案经历多个阶段：公开 → 达标 → 讨论 → 投票 → 完结。每个阶段都有特定要求才能推进。',
      step3Title: '提交提案',
      step3Desc:
        "点击'新建提案'开始。提供标题、描述、分类和你的提议内容。社区将在投票前审阅和讨论。",
      step4Title: '达标条件',
      step4Desc:
        '新提案需要社区参与才能获得投票资格。足够的评论、点赞和浏览量表明社区希望对此投票。',
      step5Title: '投票',
      step5Desc:
        '达标的提案进入投票窗口。代币持有者按其 $ORG 持有量加权投票。结果具有约束力。',
      step6Title: '筛选与发现',
      step6Desc:
        '按最新、最热、最多讨论或最多投票排序提案。按分类筛选以聚焦你感兴趣的领域。',
    },
    Sprints: {
      step1Title: '冲刺概览',
      step1Desc:
        '冲刺是 DAO 交付工作的集中执行周期。将任务分组到有明确开始和结束日期的时间段中。',
      step2Title: '冲刺生命周期',
      step2Desc:
        '冲刺按阶段推进：规划 → 进行中 → 审核 → 争议窗口 → 结算。每个阶段都有特定规则。',
      step3Title: '视图切换',
      step3Desc:
        '在看板、列表和时间线视图间切换。看板显示看板风格列，列表紧凑显示，时间线展示日期。',
      step4Title: '阶段推进',
      step4Desc:
        '管理员推进冲刺的各个阶段。当冲刺进入审核阶段时，所有已提交的工作将被评估。',
      step5Title: '容量规划',
      step5Desc:
        '每个冲刺都有容量上限。进度条显示已分配积分预算的使用情况。',
    },
    Rewards: {
      step1Title: '奖励概览',
      step1Desc:
        '奖励页面跟踪贡献如何转化为收益。查看你已赚取的积分、待领取的奖励和支付历史。',
      step2Title: '积分系统',
      step2Desc:
        '批准的任务为你赚取积分。积分会累积，达到 DAO 设定的阈值后即可领取。',
      step3Title: '领取奖励',
      step3Desc:
        '当你有足够的积分时，提交领取申请。你的申请在支付前需要经过审批流程。',
      step4Title: '审批流程',
      step4Desc:
        '领取申请由委员会成员审核。批准的申请将进入支付队列。',
      step5Title: '支付历史',
      step5Desc:
        '分配标签页显示所有已完成的支付。跟踪支付时间、金额和交易状态。',
    },
    Disputes: {
      step1Title: '争议系统',
      step1Desc:
        '争议机制确保 DAO 的公平性。如果你认为任务审核不正确或决策不公，可以发起争议。',
      step2Title: '何时发起',
      step2Desc:
        '在冲刺的争议窗口期间发起争议。你需要质押 XP——这可以防止轻率的争议。',
      step3Title: 'XP 质押',
      step3Desc:
        '发起争议需要质押 XP。如果争议被接受，你将收回质押金加上解决方案。如果被拒绝，你将失去质押金。',
      step4Title: '仲裁流程',
      step4Desc:
        '委员会成员审查争议并对结果进行投票。整个过程透明——所有方都可以查看推理依据。',
      step5Title: '解决方案',
      step5Desc:
        '仲裁完成后，决定具有约束力。任务审核可被撤销、积分可被调整、XP 质押金将被结算。',
    },
    Quests: {
      step1Title: '任务系统',
      step1Desc:
        '任务是奖励持续参与的游戏化挑战。完成每日、每周和长期目标以获得额外 XP。',
      step2Title: '每日任务',
      step2Desc:
        '小型每日操作，如登录、评论提案或审核任务提交。每24小时重置。',
      step3Title: '每周任务',
      step3Desc:
        '跨越一周的更大目标：完成一个任务、为提案投票或参与讨论。',
      step4Title: '长期任务',
      step4Desc:
        '持续贡献的成就任务：完成第一个冲刺、达到声誉等级或实现连续天数里程碑。',
      step5Title: 'XP 与周期',
      step5Desc:
        '任务 XP 计入你的总声誉分数。周期系统奖励持续性——保持连续可以倍增你的奖励。',
    },
    Analytics: {
      step1Title: '分析概览',
      step1Desc:
        '分析提供基于数据的 DAO 健康状况视图。跟踪活动趋势、成员增长、任务速度和治理参与度。',
      step2Title: '活动趋势',
      step2Desc:
        '活动图表显示每日/每周的活动量——任务完成、提案提交、投票和评论。',
      step3Title: '个人统计',
      step3Desc:
        '切换到个人标签页查看你的贡献指标：已完成任务、已投票提案、获得的 XP 和活动连续天数。',
      step4Title: '治理健康',
      step4Desc:
        '治理标签页跟踪提案结果、投票参与率和决策质量。',
      step5Title: 'KPI 卡片',
      step5Desc:
        '顶部的关键绩效指标提供即时摘要：总成员数、活跃贡献者、本冲刺任务数和治理参与率。',
    },
    Treasury: {
      step1Title: '金库概览',
      step1Desc:
        '金库页面展示 DAO 如何管理其资金。透明是 Organic 的核心——任何人都可以查看余额和分配原则。',
      step2Title: '余额与分配',
      step2Desc:
        '查看当前金库余额及资金分配方式：运营、奖励、开发和储备。',
      step3Title: '发行政策',
      step3Desc:
        '发行政策定义代币如何从金库流向贡献者，控制奖励分配的节奏。',
      step4Title: '交易历史',
      step4Desc:
        '所有金库变动的记录——收入、支出、奖励支付和运营费用。',
      step5Title: '链上透明',
      step5Desc:
        '金库操作可在链上验证。长按功能允许你在需要时检查敏感细节。',
    },
    Community: {
      step1Title: '社区中心',
      step1Desc:
        '社区页面展示 DAO 背后的人。查看谁在贡献、他们的排名，以及浏览成员目录。',
      step2Title: '排行榜',
      step2Desc:
        '排名基于通过真实贡献获得的经验证 XP——不仅仅是代币。排行榜实时更新。',
      step3Title: '成员目录',
      step3Desc:
        '浏览所有成员、他们的角色、贡献历史和声誉分数。寻找协作者或查看谁在活跃。',
      step4Title: '排名体系',
      step4Desc:
        '成员按贡献的持续性和质量排名。系统奖励持续参与而非间歇性活跃。',
    },
    Ideas: {
      step1Title: '创意孵化器',
      step1Desc:
        '创意是轻量级的提案前讨论。分享初步概念、获取社区反馈，在正式提交提案前进行完善。',
      step2Title: '提交创意',
      step2Desc:
        '发布一个带标题和描述的创意。保持非正式——创意是探索性的。社区会投票和评论。',
      step3Title: '为创意投票',
      step3Desc:
        '为你认为值得关注的创意投赞成票。投票数有助于突出最有前景的概念。',
      step4Title: '趋势与发现',
      step4Desc:
        '按热门、最新、本周最佳或历史最佳排序。趋势标签页突出显示快速增长的创意。',
      step5Title: '晋升为提案',
      step5Desc:
        '当一个创意获得足够的关注，作者可以将其晋升为正式提案。这会携带讨论上下文和社区支持信号。',
    },
  },
};

// ── Main ───────────────────────────────────────────────────────────

function run() {
  const locales: Array<{ file: string; additions: Record<string, unknown>; label: string }> = [
    { file: 'pt-PT.json', additions: ptAdditions, label: 'pt-PT' },
    { file: 'zh-CN.json', additions: zhAdditions, label: 'zh-CN' },
  ];

  for (const { file, additions, label } of locales) {
    const filePath = path.join(MESSAGES_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;

    let addedCount = 0;

    // Count keys being added (recursively)
    function countKeys(obj: Record<string, unknown>): number {
      let count = 0;
      for (const val of Object.values(obj)) {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          count += countKeys(val as Record<string, unknown>);
        } else {
          count++;
        }
      }
      return count;
    }

    // Count only truly new keys
    function countNewKeys(
      target: Record<string, unknown>,
      source: Record<string, unknown>
    ): number {
      let count = 0;
      for (const [key, val] of Object.entries(source)) {
        if (!(key in target)) {
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            count += countKeys(val as Record<string, unknown>);
          } else {
            count++;
          }
        } else if (
          val &&
          typeof val === 'object' &&
          !Array.isArray(val) &&
          target[key] &&
          typeof target[key] === 'object'
        ) {
          count += countNewKeys(
            target[key] as Record<string, unknown>,
            val as Record<string, unknown>
          );
        }
      }
      return count;
    }

    // Report per-section
    for (const [section, sectionData] of Object.entries(additions)) {
      const existing = (data[section] || {}) as Record<string, unknown>;
      const sectionAdditions = sectionData as Record<string, unknown>;
      const newCount = countNewKeys(existing, sectionAdditions);
      if (newCount > 0) {
        console.log(`  [${label}] ${section}: +${newCount} keys`);
        addedCount += newCount;
      }
    }

    // Merge
    const merged = deepMerge(data, additions);

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
    console.log(`\n  [${label}] Total: +${addedCount} keys added → ${filePath}\n`);
  }
}

run();
