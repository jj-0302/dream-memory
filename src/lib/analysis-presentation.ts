import type { AnalysisPublicSections, DreamAnalysisDraft } from './analysis-storage';

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean))]
    : [];
}

/** Validate new responses without silently accepting broken new-format output. */
export function isAnalysisPublicSections(value: unknown, allowEmptyReadings = false): value is AnalysisPublicSections {
  if (!value || typeof value !== 'object') return false;
  const sections = value as Record<string, unknown>;
  const validList = (list: unknown) => Array.isArray(list) && list.length >= 1 && list.length <= 4 && list.every(item => typeof item === 'string' && Boolean(item.trim()) && item.length <= 1200);
  if (typeof sections.understanding !== 'string' || !sections.understanding.trim() || sections.understanding.length > 1600) return false;
  if (!validList(sections.keyClues) || !validList(sections.wakingConnections) || !validList(sections.furtherExploration)) return false;
  if (!Array.isArray(sections.possibleReadings) || sections.possibleReadings.length < (allowEmptyReadings ? 0 : 2) || sections.possibleReadings.length > 3) return false;
  const ids = new Set<string>();
  const readings = new Set<string>();
  return sections.possibleReadings.every(item => {
    if (!item || typeof item !== 'object') return false;
    const reading = item as Record<string, unknown>;
    if (typeof reading.id !== 'string' || !reading.id.trim() || reading.id.length > 80 || ids.has(reading.id)) return false;
    if (typeof reading.interpretation !== 'string' || !reading.interpretation.trim() || reading.interpretation.length > 1200 || readings.has(reading.interpretation.trim())) return false;
    if (typeof reading.evidence !== 'string' || !reading.evidence.trim() || reading.evidence.length > 1200) return false;
    ids.add(reading.id);
    readings.add(reading.interpretation.trim());
    return true;
  });
}

/** Read-only projection: never migrate or rewrite historical records. */
export function getAnalysisPresentation(analysis: DreamAnalysisDraft): AnalysisPublicSections {
  // Offline sections deliberately leave interpretations empty rather than inventing them.
  if (analysis.publicSections && isAnalysisPublicSections(analysis.publicSections, analysis.generator === 'local-reflection')) {
    return analysis.publicSections;
  }
  const alternatives = strings(analysis.alternativeInterpretations);
  return {
    understanding: analysis.generator === 'local-reflection'
      ? '这份离线整理还不能给出具体理解。可以先从你最在意的细节和它带来的感受开始。'
      : '这份旧版分析还没有生成整体理解。下面保留了当时的线索和解释；你对这些细节的个人联想仍需要补充。',
    keyClues: strings(analysis.keyElements).length ? strings(analysis.keyElements) : ['这份旧版分析未保存独立的关键线索，可以回看梦境原文。'],
    wakingConnections: strings([...(analysis.sleepNoteConnections ?? []), ...(analysis.possibleConnections ?? [])]).length
      ? strings([...(analysis.sleepNoteConnections ?? []), ...(analysis.possibleConnections ?? [])])
      : ['目前没有足够的现实背景或睡前记录可供对照。'],
    possibleReadings: alternatives.map((interpretation, index) => ({
      id: 'legacy-' + index,
      interpretation,
      evidence: '这是旧版保存的解释，未单独保存依据；请结合原文核对。',
    })),
    furtherExploration: strings(analysis.reflectionQuestions).length
      ? strings(analysis.reflectionQuestions)
      : ['想到梦中最在意的一个细节时，你首先联想到什么？不必急着解释。'],
  };
}
