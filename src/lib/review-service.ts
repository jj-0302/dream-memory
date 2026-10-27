import type { DreamRecord } from './dream-storage';
import type { SleepNote } from './sleep-storage';

export const MAX_REVIEW_DREAMS = 20;
export const MAX_REVIEW_CHARACTERS = 40000;
export type ReviewRange = '7d' | '30d' | 'custom';
export type ReviewDream = { ref: string; sourceId: string; title: string; date: string; content: string; mood?: string; clarity?: string; tags: string[]; sleepNoteRef?: string };
export type ReviewSleepNote = { ref: string; sourceId: string; date: string; content: string; category?: string; intensity: number };
export type ReviewSelection = { range: ReviewRange; includeSleepNotes: boolean; dreams: ReviewDream[]; sleepNotes: ReviewSleepNote[]; associations: string; selectedAt: string };
export type ReviewEvidence = { ref: string; quote: string };
export type ReviewFinding = { title: string; observation: string; evidence: ReviewEvidence[] };
export type ReviewResult = { overview: string; repetitions: ReviewFinding[]; changes: ReviewFinding[]; sleepConnections: ReviewFinding[]; personalAssociations: ReviewFinding[]; observationClues: string[]; limitations: string[] };

function localDate(date: Date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
export function reviewDreamDate(record: DreamRecord): string {
  if (record.sleepDate && /^\d{4}-\d{2}-\d{2}$/.test(record.sleepDate)) {
    const date = new Date(record.sleepDate + 'T12:00:00');
    if (Number.isFinite(date.getTime()) && localDate(date) === record.sleepDate) return record.sleepDate;
  }
  const created = new Date(record.createdAt);
  return Number.isFinite(created.getTime()) ? localDate(created) : '日期未知';
}
export function isValidReviewDream(record: DreamRecord): boolean {
  if (!record || typeof record.id !== 'string' || !record.id || typeof record.content !== 'string') return false;
  const content = record.content.trim();
  return content.length >= 2 && content.length <= 8000 && content !== '语音梦境记录（等待转写）';
}
export function filterReviewDreams(records: DreamRecord[], range: ReviewRange, now = new Date()): DreamRecord[] {
  const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (range === '7d' ? 6 : 29));
  const first = localDate(start); const last = localDate(now);
  return records.filter(isValidReviewDream).filter(record => range === 'custom' || (reviewDreamDate(record) !== '日期未知' && reviewDreamDate(record) >= first && reviewDreamDate(record) <= last))
    .sort((a, b) => reviewDreamDate(b).localeCompare(reviewDreamDate(a)) || b.createdAt.localeCompare(a.createdAt));
}
export function linkedReviewNotes(dreams: DreamRecord[], notes: SleepNote[]) {
  const ids = new Set(dreams.map(dream => dream.sleepNoteId).filter(Boolean));
  return notes.filter(note => ids.has(note.id));
}
export function createReviewSelection(records: DreamRecord[], notes: SleepNote[], range: ReviewRange, selectedIds: string[], includeSleepNotes: boolean, excludedNoteIds: string[], associations: string, now = new Date()): ReviewSelection {
  const wanted = new Set(selectedIds);
  const chosen = filterReviewDreams(records, range, now).filter(dream => wanted.has(dream.id)).reverse();
  if (chosen.length !== wanted.size) throw new Error('部分所选梦境已变更或不在当前范围，请重新确认');
  if (chosen.length < 2 || chosen.length > MAX_REVIEW_DREAMS) throw new Error('请选择 2～20 条有效梦境');
  if (associations.length > 2000) throw new Error('自由联想请控制在 2000 字以内');
  const linked = includeSleepNotes ? linkedReviewNotes(chosen, notes).filter(note => !excludedNoteIds.includes(note.id)) : [];
  if (linked.some(note => !note.content.trim() || note.content.length > 8000)) throw new Error('部分睡前记录为空或过长，请排除后再分析');
  const sleepNotes = linked.map((note, index) => ({ ref: 'S' + (index + 1), sourceId: note.id, date: Number.isFinite(new Date(note.createdAt).getTime()) ? localDate(new Date(note.createdAt)) : '日期未知', content: note.content.trim(), category: note.category, intensity: note.intensity }));
  const dreams = chosen.map((dream, index) => ({ ref: 'D' + (index + 1), sourceId: dream.id, title: dream.title?.trim() || '未命名的梦', date: reviewDreamDate(dream), content: dream.content.trim(), mood: dream.mood, clarity: dream.clarity, tags: dream.tags ?? [], sleepNoteRef: sleepNotes.find(note => note.sourceId === dream.sleepNoteId)?.ref }));
  if (dreams.reduce((sum, dream) => sum + dream.content.length, 0) + sleepNotes.reduce((sum, note) => sum + note.content.length, 0) + associations.length > MAX_REVIEW_CHARACTERS) throw new Error('本次文字超过 4 万字，请减少所选记录后再分析');
  return { range, includeSleepNotes, dreams, sleepNotes, associations: associations.trim(), selectedAt: now.toISOString() };
}
export function isReviewResult(value: unknown, selection: ReviewSelection): value is ReviewResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  const validText = (item: unknown, max: number) => typeof item === 'string' && !!item.trim() && item.length <= max;
  if (!validText(result.overview, 2000)) return false;
  const sources = new Map([...selection.dreams, ...selection.sleepNotes].map(source => [source.ref, source.content]));
  if (selection.associations) sources.set('A1', selection.associations);
  for (const field of ['repetitions', 'changes', 'sleepConnections', 'personalAssociations'] as const) {
    const findings = result[field];
    if (!Array.isArray(findings) || findings.length > 4) return false;
    for (const finding of findings) {
      if (!finding || !validText(finding.title, 100) || !validText(finding.observation, 1600) || !Array.isArray(finding.evidence) || finding.evidence.length < 1 || finding.evidence.length > 8) return false;
      const refs = new Set<string>();
      for (const item of finding.evidence) {
        if (!item || typeof item.ref !== 'string' || !validText(item.quote, 300) || item.quote.trim().length < 2 || !sources.get(item.ref)?.includes(item.quote)) return false;
        refs.add(item.ref);
      }
      const dreamRefs = [...refs].filter(ref => ref.startsWith('D'));
      if ((field === 'repetitions' || field === 'changes') && dreamRefs.length < 2) return false;
      if (field === 'sleepConnections' && (!dreamRefs.length || ![...refs].some(ref => ref.startsWith('S')) || !selection.dreams.some(dream => refs.has(dream.ref) && dream.sleepNoteRef && refs.has(dream.sleepNoteRef)))) return false;
      if (field === 'personalAssociations' && !refs.has('A1')) return false;
    }
  }
  return ['observationClues', 'limitations'].every(field => Array.isArray(result[field]) && result[field].length >= 1 && result[field].length <= 4 && result[field].every(item => validText(item, 1200)));
}
