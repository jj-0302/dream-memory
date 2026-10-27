import { list, object, text } from './exploration-contract.js';

export function reviewInput(value: unknown) {
  if (JSON.stringify(value).length > 180000) throw new Error('本次内容过长，请减少记录');
  const input = object(value);
  if (!['7d', '30d', 'custom'].includes(String(input.range)) || typeof input.includeSleepNotes !== 'boolean') throw new Error('复盘范围格式不正确');
  if (!Array.isArray(input.dreams) || input.dreams.length < 2 || input.dreams.length > 20) throw new Error('请选择 2～20 条梦境');
  const dreams = input.dreams.map(value => {
    const item = object(value);
    const content = text(item.content, 8000); const ref = text(item.ref, 4);
    if (content.length < 2 || content === '语音梦境记录（等待转写）' || !/^D([1-9]|1\d|20)$/.test(ref)) throw new Error('需要有效的梦境文字与编号');
    return { ref, content, title: text(item.title, 200), date: text(item.date, 80), mood: item.mood === undefined ? undefined : text(item.mood, 80), clarity: item.clarity === undefined ? undefined : text(item.clarity, 80), tags: list(item.tags ?? [], 0, 20), sleepNoteRef: item.sleepNoteRef === undefined ? undefined : text(item.sleepNoteRef, 4) };
  });
  if (new Set(dreams.map(item => item.ref)).size !== dreams.length) throw new Error('梦境编号重复');
  if (!Array.isArray(input.sleepNotes) || input.sleepNotes.length > 20 || (!input.includeSleepNotes && input.sleepNotes.length)) throw new Error('睡前记录选择不正确');
  const sleepNotes = input.sleepNotes.map(value => {
    const item = object(value); const content = text(item.content, 8000); const ref = text(item.ref, 4);
    if (!content || !/^S([1-9]|1\d|20)$/.test(ref) || typeof item.intensity !== 'number' || !Number.isFinite(item.intensity) || item.intensity < 1 || item.intensity > 5) throw new Error('睡前记录格式不正确');
    return { ref, content, date: text(item.date, 80), category: item.category === undefined ? undefined : text(item.category, 80), intensity: item.intensity };
  });
  if (new Set(sleepNotes.map(item => item.ref)).size !== sleepNotes.length || sleepNotes.some(note => !dreams.some(dream => dream.sleepNoteRef === note.ref)) || dreams.some(dream => dream.sleepNoteRef && !sleepNotes.some(note => note.ref === dream.sleepNoteRef))) throw new Error('睡前记录与所选梦境不匹配');
  const associations = text(input.associations, 2000);
  if (dreams.reduce((sum, dream) => sum + dream.content.length, 0) + sleepNotes.reduce((sum, note) => sum + note.content.length, 0) + associations.length > 40000) throw new Error('本次文字超过 4 万字，请减少所选记录');
  return { range: input.range, includeSleepNotes: input.includeSleepNotes, dreams, sleepNotes, associations };
}
export function reviewResult(value: unknown, input: ReturnType<typeof reviewInput>) {
  const result = object(value);
  const sources = new Map([...input.dreams, ...input.sleepNotes].map(item => [item.ref, item.content]));
  if (input.associations) sources.set('A1', input.associations);
  const findings = (field: string) => {
    const items = result[field];
    if (!Array.isArray(items) || items.length > 4) throw new Error('复盘结构不完整');
    return items.map(value => {
      const item = object(value); const title = text(item.title, 100); const observation = text(item.observation, 1600);
      if (!title || !observation || !Array.isArray(item.evidence) || item.evidence.length < 1 || item.evidence.length > 8) throw new Error('观察缺少原文依据');
      const evidence = item.evidence.map(value => {
        const quote = object(value); const ref = text(quote.ref, 4); const fragment = text(quote.quote, 300);
        if (fragment.length < 2 || !sources.get(ref)?.includes(fragment)) throw new Error('原文依据不匹配');
        return { ref, quote: fragment };
      });
      const refs = new Set(evidence.map(item => item.ref));
      const dreamRefs = [...refs].filter(ref => ref.startsWith('D'));
      if ((field === 'repetitions' || field === 'changes') && dreamRefs.length < 2) throw new Error('比较至少需要两条不同梦境');
      if (field === 'sleepConnections' && (!dreamRefs.length || ![...refs].some(ref => ref.startsWith('S')) || !input.dreams.some(dream => refs.has(dream.ref) && dream.sleepNoteRef && refs.has(dream.sleepNoteRef)))) throw new Error('缺少关联睡前记录依据');
      if (field === 'personalAssociations' && !refs.has('A1')) throw new Error('缺少用户个人联想');
      return { title, observation, evidence };
    });
  };
  const overview = text(result.overview, 2000); if (!overview) throw new Error('缺少阶段概述');
  return { overview, repetitions: findings('repetitions'), changes: findings('changes'), sleepConnections: findings('sleepConnections'), personalAssociations: findings('personalAssociations'), observationClues: list(result.observationClues, 1, 4), limitations: list(result.limitations, 1, 4) };
}
