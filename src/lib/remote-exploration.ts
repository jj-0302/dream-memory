import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAnalysisPublicSections } from './analysis-presentation';
import { saveDreamAnalysis, type DreamAnalysisDraft } from './analysis-storage';
import { EXPLORATION_CONSENT_KEY, TOPICS, getExploration, updateExploration, type ExplorationQuestion } from './exploration-storage';

export type ExplorationAction = 'question' | 'swap' | 'finalize';
const activeRequests = new Set<string>();

export function explorationEndpoint(): string {
  const configured = process.env.EXPO_PUBLIC_ANALYSIS_API_URL?.trim();
  if (!configured) throw new Error('还没有配置分析服务');
  const url = new URL(configured);
  url.pathname = url.pathname.replace(/\/analyze\/?$/, '/explore');
  if (!url.pathname.endsWith('/explore')) throw new Error('分析接口地址格式不正确');
  url.search = ''; url.hash = '';
  return url.toString();
}
export function isExplorationQuestion(value: unknown): value is ExplorationQuestion {
  if (!value || typeof value !== 'object') return false;
  const q = value as ExplorationQuestion;
  return typeof q.id === 'string' && q.id.length <= 80 && TOPICS.includes(q.topic) && typeof q.text === 'string' && !!q.text.trim() && q.text.length <= 500 && Array.isArray(q.options) && q.options.length >= 3 && q.options.length <= 4 && new Set(q.options).size === q.options.length && q.options.every(option => typeof option === 'string' && !!option.trim() && option.length <= 160);
}

export async function requestExploration(id: string, action: ExplorationAction) {
  if (activeRequests.has(id)) throw new Error('正在处理这次探索，请稍候');
  activeRequests.add(id);
  try {
    const item = await getExploration(id);
    if (!item) throw new Error('没有找到这次探索');
    if (await AsyncStorage.getItem(EXPLORATION_CONSENT_KEY) !== 'accepted') throw new Error('请先确认对话内容的发送说明');
    if (action !== 'finalize' && item.round >= 4) throw new Error('已达到 4 轮，请生成深度分析或补充信息');
    if (action === 'question' && item.currentQuestion) throw new Error('先回答当前问题，或选择换一个问题');
    if (action === 'swap' && !item.currentQuestion) throw new Error('当前没有可替换的问题');
    if (action === 'swap' && item.draft.trim()) throw new Error('请先提交或清空当前回答草稿');
    const code = process.env.EXPO_PUBLIC_ANALYSIS_ACCESS_CODE?.trim();
    if (!code) throw new Error('还没有配置分析服务');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55000);
    try {
      const dream = item.dreamSnapshot;
      const note = item.sleepNoteSnapshot;
      const response = await fetch(explorationEndpoint(), {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Analysis-Access-Code': code }, signal: controller.signal,
        body: JSON.stringify({
          action,
          dream: { content: dream.content, mood: dream.mood, clarity: dream.clarity, tags: dream.tags ?? [] },
          sleepNote: note ? { content: note.content, category: note.category, intensity: note.intensity } : null,
          analysis: item.analysisSnapshot,
          session: {
            round: item.round, currentQuestion: item.currentQuestion, feedback: item.feedback,
            // Preserve all original messages locally; questions use the lossless user summary.
            messages: action === 'finalize' ? item.messages : item.messages.map(message => message.role === 'user' ? { ...message, text: '用户原话见 contextSummary' } : message),
            contextSummary: item.contextSummary, confirmedConnections: item.confirmedConnections, rejectedConnections: item.rejectedConnections,
          },
        }),
      });
      const body = await response.json().catch(() => null) as { error?: string; question?: unknown; analysis?: DreamAnalysisDraft } | null;
      if (!response.ok) throw new Error(response.status === 404 ? '引导探索接口尚未部署，已保存的内容不会丢失' : body?.error || '探索服务暂时不可用');
      if (action === 'finalize') {
        const result = body?.analysis;
        if (!result || typeof result.deepNarrative !== 'string' || result.deepNarrative.trim().length < 200 || result.deepNarrative.length > 4000 || result.schemaVersion !== 3 || !isAnalysisPublicSections(result.publicSections) || !['emotionalThemes', 'keyElements', 'observations', 'sleepNoteConnections', 'possibleConnections', 'alternativeInterpretations', 'evidenceBoundaries', 'reflectionQuestions', 'gentleSuggestions'].every(field => { const value = result[field as keyof DreamAnalysisDraft]; return Array.isArray(value) && value.every(item => typeof item === 'string' && !!item.trim()); }) || typeof result.dreamSummary !== 'string' || !result.dreamSummary.trim()) throw new Error('深度分析格式不完整，请重试');
        const now = new Date().toISOString();
        const finalAnalysis = { ...item.analysisSnapshot, ...result, generator: 'ai' as const, explorationId: id, kind: 'deep' as const, id: 'deep-' + id + '-' + Date.now(), dreamId: item.dreamId, createdAt: now, evidenceSources: item.analysisSnapshot.evidenceSources, disclaimer: item.analysisSnapshot.disclaimer };
        const saved = await updateExploration(id, current => ({ ...current, status: 'completed', currentQuestion: null, finalAnalysis, consentedAt: current.consentedAt ?? now }), item.revision);
        // A stable id makes history synchronization safe to retry after a storage failure.
        await saveDreamAnalysis(saved.dreamId, finalAnalysis, finalAnalysis.id);
        return saved;
      }
      if (!isExplorationQuestion(body?.question)) throw new Error('问题格式不完整，请重试');
      const question = body.question;
      if (question.id !== 'q-' + (item.round + 1) || item.messages.some(message => message.kind === 'question' && (message.topic === question.topic || message.text.trim() === question.text.trim()))) throw new Error('AI 返回了重复问题，请重试或生成深度分析');
      return await updateExploration(id, current => {
        const now = new Date().toISOString();
        const messages = [...current.messages];
        if (action === 'swap' && current.currentQuestion) messages.push({ id: id + '-skip-' + current.currentQuestion.id, role: 'user', kind: 'skipped', questionId: current.currentQuestion.id, topic: current.currentQuestion.topic, text: '用户选择换一个问题，不推断原因。', createdAt: now });
        messages.push({ id: id + '-' + question.id, role: 'assistant', kind: 'question', questionId: question.id, topic: question.topic, text: question.text, createdAt: now });
        return { ...current, status: 'active', round: current.round + 1, currentQuestion: question, messages, consentedAt: current.consentedAt ?? now };
      }, item.revision);
    } catch (error) {
      if (controller.signal.aborted) throw new Error('请求超时，回答已保存在本机，可稍后重试');
      throw error;
    } finally { clearTimeout(timer); }
  } finally { activeRequests.delete(id); }
}
