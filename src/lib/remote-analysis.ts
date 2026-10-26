import type { DreamAnalysisDraft } from './analysis-storage';
import { generateLocalDreamAnalysis } from './analysis-service';
import type { DreamRecord } from './dream-storage';
import type { SleepNote } from './sleep-storage';

const ANALYSIS_API_URL = process.env.EXPO_PUBLIC_ANALYSIS_API_URL?.trim();
const ANALYSIS_ACCESS_CODE = process.env.EXPO_PUBLIC_ANALYSIS_ACCESS_CODE?.trim();

export function isRemoteAnalysisConfigured(): boolean {
  return Boolean(ANALYSIS_API_URL && ANALYSIS_ACCESS_CODE);
}

export async function generateRemoteDreamAnalysis(
  dream: DreamRecord,
  sleepNote: SleepNote | null
): Promise<DreamAnalysisDraft> {
  if (!ANALYSIS_API_URL || !ANALYSIS_ACCESS_CODE) {
    throw new Error('还没有完成分析服务配置');
  }

  const response = await fetch(ANALYSIS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Analysis-Access-Code': ANALYSIS_ACCESS_CODE,
    },
    body: JSON.stringify({
      dream: {
        content: dream.content,
        mood: dream.mood,
        clarity: dream.clarity,
        tags: dream.tags ?? [],
      },
      sleepNote: sleepNote
        ? {
            content: sleepNote.content,
            category: sleepNote.category,
            intensity: sleepNote.intensity,
          }
        : null,
    }),
  });

  const body = (await response.json().catch(() => null)) as {
    error?: string;
    analysis?: Partial<DreamAnalysisDraft>;
  } | null;

  if (!response.ok || !body?.analysis) {
    throw new Error(body?.error || '分析服务暂时不可用，请稍后重试');
  }

  const fields = [
    'emotionalThemes',
    'keyElements',
    'sleepNoteConnections',
    'alternativeInterpretations',
    'evidenceBoundaries',
    'observations',
    'possibleConnections',
    'reflectionQuestions',
    'gentleSuggestions',
  ] as const;

  for (const field of fields) {
    const value = body.analysis[field];
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
      throw new Error('分析服务返回格式不完整，请稍后重试');
    }
  }

  if (
    typeof body.analysis.dreamSummary !== 'string' ||
    !body.analysis.dreamSummary.trim()
  ) {
    throw new Error('分析服务返回的梦境摘要不完整，请稍后重试');
  }

  const localContext = generateLocalDreamAnalysis(dream, sleepNote);

  return {
    dreamSummary: body.analysis.dreamSummary.trim(),
    emotionalThemes: body.analysis.emotionalThemes as string[],
    keyElements: body.analysis.keyElements as string[],
    sleepNoteConnections: body.analysis.sleepNoteConnections as string[],
    alternativeInterpretations:
      body.analysis.alternativeInterpretations as string[],
    evidenceBoundaries: body.analysis.evidenceBoundaries as string[],
    observations: body.analysis.observations as string[],
    possibleConnections: body.analysis.possibleConnections as string[],
    reflectionQuestions: body.analysis.reflectionQuestions as string[],
    gentleSuggestions: body.analysis.gentleSuggestions as string[],
    evidenceSources: localContext.evidenceSources,
    disclaimer: localContext.disclaimer,
    generator: 'ai',
  };
}
