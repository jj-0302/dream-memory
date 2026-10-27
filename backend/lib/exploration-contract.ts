export const topics = ['scene', 'relationship', 'emotion', 'association', 'repetition', 'turningPoint', 'wakingEmotion', 'recentLife', 'sleepNote'] as const;
export type Topic = typeof topics[number];
export type Question = { id: string; topic: Topic; text: string; options: string[] };
export type ApiRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body: unknown };
export type ApiResponse = { status(code: number): ApiResponse; json(body: unknown): unknown; setHeader(name: string, value: string): unknown; end(): unknown };
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('数据格式不正确');
  return value as Record<string, unknown>;
}
export function text(value: unknown, max = 2000): string {
  if (typeof value !== 'string' || value.length > max) throw new Error('文字长度或格式不正确');
  return value.trim();
}
export function list(value: unknown, min = 0, max = 5): string[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error('列表格式不正确');
  return value.map(item => { const clean = text(item, 1200); if (!clean) throw new Error('列表内容不能为空'); return clean; });
}
export function publicSections(value: unknown) {
  const input = object(value);
  const understanding = text(input.understanding, 1600);
  if (!understanding || !Array.isArray(input.possibleReadings) || input.possibleReadings.length < 2 || input.possibleReadings.length > 3) throw new Error('解释不完整');
  const possibleReadings = input.possibleReadings.map((item, index) => {
    const reading = object(item);
    const interpretation = text(reading.interpretation, 1200);
    const evidence = text(reading.evidence, 1200);
    if (!interpretation || !evidence) throw new Error('解释必须附带依据');
    return { id: 'reading-' + (index + 1), interpretation, evidence };
  });
  if (new Set(possibleReadings.map(item => item.interpretation)).size !== possibleReadings.length) throw new Error('解释方向重复');
  return { understanding, keyClues: list(input.keyClues, 1, 4), wakingConnections: list(input.wakingConnections, 1, 4), possibleReadings, furtherExploration: list(input.furtherExploration, 1, 4) };
}
export function analysisResult(value: unknown) {
  const input = object(value);
  const dreamSummary = text(input.dreamSummary, 600);
  if (!dreamSummary) throw new Error('缺少摘要');
  const readList = (field: string, min: number, max: number) => {
    try { return list(input[field], min, max); }
    catch { throw new Error('AI_ARRAY_' + field); }
  };
  return {
    schemaVersion: 3, publicSections: publicSections(input.publicSections), dreamSummary,
    emotionalThemes: readList('emotionalThemes', 1, 4), keyElements: readList('keyElements', 1, 5), observations: readList('observations', 1, 4),
    sleepNoteConnections: readList('sleepNoteConnections', 1, 3), possibleConnections: readList('possibleConnections', 1, 4),
    alternativeInterpretations: readList('alternativeInterpretations', 2, 3), evidenceBoundaries: readList('evidenceBoundaries', 1, 3),
    reflectionQuestions: readList('reflectionQuestions', 1, 4), gentleSuggestions: readList('gentleSuggestions', 1, 4),
  };
}
export type Input = ReturnType<typeof explorationInput>;
export function explorationInput(value: unknown) {
  if (JSON.stringify(value).length > 180000) throw new Error('本次内容过长，请减少补充');
  const input = object(value);
  if (!['question', 'swap', 'finalize'].includes(String(input.action))) throw new Error('不支持的探索操作');
  const action = input.action as 'question' | 'swap' | 'finalize';
  const rawDream = object(input.dream);
  const content = text(rawDream.content, 8000);
  if (content.length < 2) throw new Error('需要有效的梦境文字');
  const dream = { content, mood: rawDream.mood === undefined ? undefined : text(rawDream.mood, 80), clarity: rawDream.clarity === undefined ? undefined : text(rawDream.clarity, 80), tags: list(rawDream.tags ?? [], 0, 20) };
  const rawSleep = input.sleepNote == null ? null : object(input.sleepNote);
  const sleepNote = rawSleep ? { content: text(rawSleep.content, 8000), category: rawSleep.category === undefined ? undefined : text(rawSleep.category, 80), intensity: rawSleep.intensity } : null;
  if (sleepNote && (typeof sleepNote.intensity !== 'number' || sleepNote.intensity < 1 || sleepNote.intensity > 5)) throw new Error('睡前记录强度格式不正确');
  const rawAnalysis = object(input.analysis);
  // Whitelist the initial draft, keeping provider/system fields out of instructions.
  const analysis = {
    dreamSummary: rawAnalysis.dreamSummary === undefined ? '' : text(rawAnalysis.dreamSummary, 600),
    emotionalThemes: list(rawAnalysis.emotionalThemes ?? []), keyElements: list(rawAnalysis.keyElements ?? []),
    observations: list(rawAnalysis.observations ?? []), sleepNoteConnections: list(rawAnalysis.sleepNoteConnections ?? []),
    possibleConnections: list(rawAnalysis.possibleConnections ?? []), alternativeInterpretations: list(rawAnalysis.alternativeInterpretations ?? []),
    evidenceBoundaries: list(rawAnalysis.evidenceBoundaries ?? []),
    publicSections: rawAnalysis.publicSections === undefined ? null : object(rawAnalysis.publicSections),
  };
  const rawSession = object(input.session);
  const round = rawSession.round;
  if (typeof round !== 'number' || !Number.isInteger(round) || round < 0 || round > 4) throw new Error('最多主动提问 4 轮');
  if (action !== 'finalize' && round >= 4) throw new Error('已达到 4 轮，请生成深度分析或自行补充');
  if (!Array.isArray(rawSession.messages) || rawSession.messages.length > 20) throw new Error('探索对话格式不正确');
  const messages = rawSession.messages.map(value => {
    const message = object(value);
    if (!['assistant', 'user'].includes(String(message.role)) || !['question', 'answer', 'skipped', 'supplement'].includes(String(message.kind))) throw new Error('对话类型不正确');
    if ((message.kind === 'question') !== (message.role === 'assistant')) throw new Error('对话角色不正确');
    const topic = message.topic === undefined ? undefined : text(message.topic, 80);
    if (topic && !topics.includes(topic as Topic)) throw new Error('未知问题主题');
    return { role: message.role, kind: message.kind, text: text(message.text, 2000), questionId: message.questionId === undefined ? undefined : text(message.questionId, 80), topic };
  });
  const questions = messages.filter(message => message.kind === 'question');
  if (questions.length !== round || questions.some((question, index) => question.questionId !== 'q-' + (index + 1) || !topics.includes(question.topic as Topic)) || new Set(questions.map(question => question.topic)).size !== questions.length) throw new Error('提问轮次与记录不一致');
  const currentQuestion = rawSession.currentQuestion == null ? null : object(rawSession.currentQuestion);
  if (currentQuestion && (currentQuestion.id !== 'q-' + round || currentQuestion.text !== questions.at(-1)?.text)) throw new Error('当前问题与记录不一致');
  if (action === 'swap' && !currentQuestion) throw new Error('当前没有可替换的问题');
  if (action === 'question' && (currentQuestion || questions.some(question => !messages.some(message => ['answer', 'skipped'].includes(String(message.kind)) && message.questionId === question.questionId)))) throw new Error('请先回答当前问题');
  const rawFeedback = object(rawSession.feedback);
  const understanding = rawFeedback.understanding;
  if (understanding !== undefined && !['理解得差不多', '有些地方不对', '我想补充细节'].includes(String(understanding))) throw new Error('理解反馈格式不正确');
  if (!Array.isArray(rawFeedback.interpretations) || rawFeedback.interpretations.length > 20) throw new Error('解释反馈格式不正确');
  const feedback = {
    understanding, detail: text(rawFeedback.detail, 2000),
    interpretations: rawFeedback.interpretations.map(value => {
      const item = object(value);
      if (!['很像我的情况', '有一点像', '不太像', '完全不相关', '不确定'].includes(String(item.rating))) throw new Error('解释反馈选项不正确');
      return { id: text(item.id, 160), text: text(item.text, 1200), rating: item.rating };
    }),
  };
  return { action, dream, sleepNote, analysis, session: { round, messages, currentQuestion, feedback, contextSummary: text(rawSession.contextSummary, 22000), confirmedConnections: list(rawSession.confirmedConnections, 0, 20), rejectedConnections: list(rawSession.rejectedConnections, 0, 20) } };
}
