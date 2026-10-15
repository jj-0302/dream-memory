import type {
  DreamAnalysisDraft,
  EvidenceSource,
} from './analysis-storage';
import type { DreamRecord } from './dream-storage';
import type { SleepNote } from './sleep-storage';

const EVIDENCE_SOURCES: EvidenceSource[] = [
  {
    title: 'What about dreams? State of the art and open questions',
    authors:
      'Serena Scarpelli, Valentina Alfonsi, Maurizio Gorgoni, Luigi De Gennaro',
    year: 2022,
    url: 'https://pubmed.ncbi.nlm.nih.gov/35417930/',
    note:
      '综述梦境神经科学、梦境回忆、清醒经历连续性以及当前研究限制。',
  },
  {
    title:
      'Dreams reflect nocturnal cognitive processes: Early-night dreams are more continuous with waking life, and late-night dreams are more emotional and hyperassociative',
    authors: 'J. E. Malinowski, C. L. Horton',
    year: 2021,
    url: 'https://pubmed.ncbi.nlm.nih.gov/33360822/',
    note:
      '研究梦境内容与清醒经历、情绪及夜间认知过程之间的可能关系。',
  },
];

function buildObservations(
  dream: DreamRecord,
  sleepNote: SleepNote | null
): string[] {
  const observations: string[] = [];

  observations.push(
    `你记录了约 ${dream.content.length} 个字符，说明这段梦境保留了${
      dream.content.length >= 100
        ? '相对丰富'
        : '较为简短'
    }的可回忆内容。`
  );

  if (dream.mood) {
    observations.push(
      `你为这段梦标记的主要感受是“${dream.mood}”。这是你的主观感受记录，不代表心理诊断。`
    );
  }

  if (dream.clarity) {
    observations.push(
      `你将梦境清晰度标记为“${dream.clarity}”。清晰度可能影响你能回忆和描述多少细节。`
    );
  }

  if (dream.tags && dream.tags.length > 0) {
    observations.push(
      `你主动选择了这些主题标签：${dream.tags.join('、')}。`
    );
  }

  if (sleepNote) {
    observations.push(
      `这段梦与一条睡前记录相关联，睡前注意力程度为 ${sleepNote.intensity}/5。`
    );
  }

  return observations;
}

function buildConnections(
  dream: DreamRecord,
  sleepNote: SleepNote | null
): string[] {
  const connections: string[] = [];

  if (sleepNote) {
    connections.push(
      `睡前你在关注“${sleepNote.content}”。梦境内容与睡前关注之间可能存在连续性，但目前只能把它作为探索线索，不能推断因果。`
    );
  }

  if (
    dream.mood === '紧张' ||
    dream.mood === '悲伤' ||
    dream.mood === '混乱' ||
    dream.mood === '害怕'
  ) {
    connections.push(
      '这段梦带有较明显的负向或高唤醒情绪。它可能与近期压力、记忆加工或睡眠过程有关，但不能仅凭梦境判断现实中的心理状态。'
    );
  }

  if (
    dream.tags?.includes('工作') ||
    dream.tags?.includes('学校')
  ) {
    connections.push(
      '梦中出现了与日常任务或学习环境有关的主题，可以回想最近是否有相似场景、目标或压力进入了你的注意范围。'
    );
  }

  if (dream.tags?.includes('重复梦')) {
    connections.push(
      '你将它标记为重复梦。持续记录出现时间、情绪和现实背景，比给它套用固定象征含义更有参考价值。'
    );
  }

  if (connections.length === 0) {
    connections.push(
      '当前信息不足以支持具体解释。更稳妥的方式是继续记录，并观察主题、情绪与现实经历是否长期重复出现。'
    );
  }

  return connections;
}

function buildQuestions(
  dream: DreamRecord,
  sleepNote: SleepNote | null
): string[] {
  const questions = [
    '梦里最强烈的情绪出现在哪个时刻？',
    '梦中的人物、地点或任务，最近在现实生活中是否出现过相似版本？',
  ];

  if (sleepNote) {
    questions.push(
      '如果把睡前心事和梦境并排看，它们最明显的共同点和不同点分别是什么？'
    );
  }

  if (dream.tags && dream.tags.length > 0) {
    questions.push(
      `在“${dream.tags[0]}”这个主题里，什么细节最值得你继续记录？`
    );
  }

  return questions;
}

export function generateLocalDreamAnalysis(
  dream: DreamRecord,
  sleepNote: SleepNote | null
): DreamAnalysisDraft {
  return {
    observations: buildObservations(dream, sleepNote),

    possibleConnections: buildConnections(
      dream,
      sleepNote
    ),

    reflectionQuestions: buildQuestions(
      dream,
      sleepNote
    ),

    gentleSuggestions: [
      '未来几天继续记录相似主题，但不必刻意寻找固定象征。',
      '优先关注反复出现的情绪、人物关系和现实事件，而不是单个意象。',
      '如果噩梦频繁影响睡眠、日间情绪或安全感，可以考虑咨询专业医生或心理健康专业人员。',
    ],

    evidenceSources: EVIDENCE_SOURCES,

    disclaimer:
      '这是基于你所记录信息生成的反思性整理，不是医学或心理诊断，也不能证明梦境与现实事件之间存在因果关系。',

    generator: 'local-reflection',
  };
}