import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteExplorationAnalyses, type DreamAnalysis } from './analysis-storage';
import type { DreamRecord } from './dream-storage';
import type { SleepNote } from './sleep-storage';

export const EXPLORATIONS_KEY = 'dream-memory:explorations:v1';
export const EXPLORATION_CONSENT_KEY = 'dream-memory:ai-exploration-consent:v1';
export const MAX_EXPLORATION_ROUNDS = 4;
export const TOPICS = ['scene', 'relationship', 'emotion', 'association', 'repetition', 'turningPoint', 'wakingEmotion', 'recentLife', 'sleepNote'] as const;
export type ExplorationTopic = typeof TOPICS[number];
export type ExplorationQuestion = { id: string; topic: ExplorationTopic; text: string; options: string[] };
export type ExplorationMessage = {
  id: string; role: 'assistant' | 'user'; kind: 'question' | 'answer' | 'skipped' | 'supplement';
  text: string; questionId?: string; topic?: ExplorationTopic; createdAt: string;
};
export type UnderstandingRating = '理解得差不多' | '有些地方不对' | '我想补充细节';
export type InterpretationRating = '很像我的情况' | '有一点像' | '不太像' | '完全不相关' | '不确定';
export type ExplorationFeedback = {
  understanding?: UnderstandingRating;
  detail: string;
  interpretations: { id: string; text: string; rating: InterpretationRating }[];
};
export type Exploration = {
  id: string; dreamId: string; analysisId: string; status: 'active' | 'paused' | 'completed';
  round: number; revision: number; messages: ExplorationMessage[]; contextSummary: string;
  confirmedConnections: string[]; rejectedConnections: string[]; currentQuestion: ExplorationQuestion | null;
  feedback: ExplorationFeedback; draft: string; consentedAt?: string; finalAnalysis?: DreamAnalysis;
  dreamSnapshot: DreamRecord; sleepNoteSnapshot: SleepNote | null; analysisSnapshot: DreamAnalysis;
  createdAt: string; updatedAt: string;
};

let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task);
  queue = result.catch(() => undefined);
  return result;
}
function id() { return Date.now() + '-' + Math.random().toString(36).slice(2, 10); }
async function readAll(): Promise<Exploration[]> {
  const raw = await AsyncStorage.getItem(EXPLORATIONS_KEY);
  if (!raw) return [];
  // Do not overwrite malformed backup data with an empty collection.
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(item => item && typeof item.id === 'string' && typeof item.dreamId === 'string' && Number.isInteger(item.round) && item.round >= 0 && item.round <= 4 && Array.isArray(item.messages) && item.feedback && Array.isArray(item.feedback.interpretations) && typeof item.feedback.detail === 'string' && typeof item.draft === 'string' && typeof item.contextSummary === 'string' && Array.isArray(item.confirmedConnections) && Array.isArray(item.rejectedConnections) && ['active', 'paused', 'completed'].includes(item.status) && Number.isInteger(item.revision) && (item.currentQuestion === null || (item.currentQuestion && typeof item.currentQuestion.text === 'string' && typeof item.currentQuestion.id === 'string' && TOPICS.includes(item.currentQuestion.topic) && Array.isArray(item.currentQuestion.options))) && item.dreamSnapshot && item.analysisSnapshot)) {
    throw new Error('探索记录格式异常，请先保留备份后再处理');
  }
  return parsed as Exploration[];
}
async function writeAll(items: Exploration[]) { await AsyncStorage.setItem(EXPLORATIONS_KEY, JSON.stringify(items)); }

export function getExploration(id: string): Promise<Exploration | null> {
  return exclusive(async () => (await readAll()).find(item => item.id === id) ?? null);
}
export function getOrCreateExploration(dream: DreamRecord, analysis: DreamAnalysis, note: SleepNote | null): Promise<Exploration> {
  return exclusive(async () => {
    const items = await readAll();
    const existing = items.find(item => item.dreamId === dream.id && item.analysisId === analysis.id);
    if (existing) return existing;
    const now = new Date().toISOString();
    const item: Exploration = {
      id: id(), dreamId: dream.id, analysisId: analysis.id, status: 'active', round: 0, revision: 0,
      messages: [], contextSummary: '', confirmedConnections: [], rejectedConnections: [], currentQuestion: null,
      feedback: { detail: '', interpretations: [] }, draft: '',
      dreamSnapshot: dream, analysisSnapshot: analysis, sleepNoteSnapshot: note, createdAt: now, updatedAt: now,
    };
    await writeAll([item, ...items]);
    return item;
  });
}
export function updateExploration(id: string, change: (item: Exploration) => Exploration, expectedRevision?: number): Promise<Exploration> {
  return exclusive(async () => {
    const items = await readAll();
    const index = items.findIndex(item => item.id === id);
    if (index < 0) throw new Error('这次探索已被删除');
    const previous = items[index];
    if (expectedRevision !== undefined && previous.revision !== expectedRevision) throw new Error('记录已更新，请重试；本次结果未覆盖新内容');
    const next = change(previous);
    if (next.round < previous.round || next.round > MAX_EXPLORATION_ROUNDS) throw new Error('最多探索 4 轮');
    if (next.feedback.interpretations.length > 20) throw new Error('已保存较多解释反馈，可以先生成深度分析');
    const latestRatings = [...new Map(next.feedback.interpretations.map(item => [item.text.trim(), item])).values()];
    const confirmedConnections = latestRatings.filter(item => item.rating === '很像我的情况').map(item => item.text);
    const rejectedConnections = latestRatings.filter(item => item.rating === '不太像' || item.rating === '完全不相关').map(item => item.text);
    const contextSummary = [
      '以下是用户原话摘要，不是已证实的心理结论。',
      next.feedback.understanding ? '对初步理解的反馈：' + next.feedback.understanding : '',
      next.feedback.detail ? '用户补充：' + next.feedback.detail : '',
      ...next.messages.filter(message => message.role === 'user').map(message => (message.kind === 'skipped' ? '跳过' : message.topic ?? '补充') + '：' + message.text),
    ].filter(Boolean).join('\n');
    if (contextSummary.length > 22000) throw new Error('补充内容已较多，请先生成深度分析');
    const updated = { ...next, id: previous.id, dreamId: previous.dreamId, analysisId: previous.analysisId, revision: previous.revision + 1, confirmedConnections, rejectedConnections, contextSummary, updatedAt: new Date().toISOString() };
    items[index] = updated;
    await writeAll(items);
    return updated;
  });
}
export function saveExplorationFeedback(id: string, change: (feedback: ExplorationFeedback) => ExplorationFeedback) {
  return updateExploration(id, item => {
    const feedback = change(item.feedback);
    return { ...item, feedback, status: JSON.stringify(feedback) === JSON.stringify(item.feedback) ? item.status : 'active' };
  });
}
export function answerExploration(id: string, questionId: string, text: string) {
  return updateExploration(id, item => {
    if (!text.trim() || text.length > 2000) throw new Error('请填写 1～2000 字的回答');
    if (item.currentQuestion?.id !== questionId) throw new Error('这个问题已回答，请查看当前进度');
    const question = item.currentQuestion;
    return { ...item, draft: '', status: 'active', currentQuestion: null, messages: [...item.messages, { id: id + '-answer-' + questionId, role: 'user', kind: 'answer', questionId, topic: question.topic, text: text.trim(), createdAt: new Date().toISOString() }] };
  });
}
export function supplementExploration(id: string, text: string) {
  return updateExploration(id, item => {
    if (!text.trim() || text.length > 2000) throw new Error('请填写 1～2000 字的补充');
    if (item.messages.filter(message => message.kind === 'supplement').length >= 6) throw new Error('已保存多条补充，可以生成深度分析了');
    return { ...item, status: 'active', draft: '', messages: [...item.messages, { id: id + '-extra-' + Date.now(), role: 'user', kind: 'supplement', text: text.trim(), createdAt: new Date().toISOString() }] };
  });
}
export function deleteExploration(id: string) {
  return exclusive(async () => {
    const items = await readAll();
    await deleteExplorationAnalyses(id);
    await writeAll(items.filter(item => item.id !== id));
  });
}
export function deleteDreamExplorations(dreamId: string) {
  return exclusive(async () => writeAll((await readAll()).filter(item => item.dreamId !== dreamId)));
}
