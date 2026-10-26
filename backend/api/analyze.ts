import type { VercelRequest, VercelResponse } from '@vercel/node';

type DreamInput = { content: string; mood?: string; clarity?: string; tags?: string[] };
type SleepInput = { content: string; category?: string; intensity: number } | null;
const SOURCES = [
  { title: 'What about dreams? State of the art and open questions', authors: 'Serena Scarpelli, Valentina Alfonsi, Maurizio Gorgoni, Luigi De Gennaro', year: 2022, url: 'https://pubmed.ncbi.nlm.nih.gov/35417930/', note: '梦境回忆与梦境神经科学综述，不提供固定象征解释。' },
  { title: 'Dreams reflect nocturnal cognitive processes: Early-night dreams are more continuous with waking life, and late-night dreams are more emotional and hyperassociative', authors: 'J. E. Malinowski, C. L. Horton', year: 2021, url: 'https://pubmed.ncbi.nlm.nih.gov/33360822/', note: '关于梦境与清醒经历连续性的研究，不可直接套用到个人梦境。' },
];
function send(res: VercelResponse, status: number, body: unknown) { return res.status(status).json(body); }
function cleanArray(value: unknown, maxItems = 4, minItems = 2): string[] | null {
  if (!Array.isArray(value)) return null;
  const out = value.filter((x): x is string => typeof x === 'string').map(x => x.trim()).filter(Boolean).slice(0, maxItems);
  return out.length >= minItems ? out : null;
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  const allowed = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(x => x.trim()).filter(Boolean);
  if (origin && !allowed.includes(origin)) return send(res, 403, { error: '当前网页来源未获允许' });
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Analysis-Access-Code');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return send(res, 405, { error: '只支持 POST 请求' });
  const key = process.env.DEEPSEEK_API_KEY;
  const access = process.env.ANALYSIS_ACCESS_CODE;
  if (!key || !access) return send(res, 503, { error: '分析服务尚未完成配置' });
  if (req.headers['x-analysis-access-code'] !== access) return send(res, 401, { error: '无法访问分析服务' });
  const payload = req.body as { dream?: DreamInput; sleepNote?: SleepInput };
  const dream = payload?.dream;
  if (!dream || typeof dream.content !== 'string' || dream.content.trim().length < 2 || dream.content.length > 8000) return send(res, 400, { error: '没有收到有效的梦境文字' });
  const sleep = payload.sleepNote && typeof payload.sleepNote.content === 'string' ? payload.sleepNote : null;
  const prompt = `你是谨慎、细致的梦境记录反思助手。请用简体中文输出 JSON，不要 Markdown。

目标：帮助用户区分梦中事实、情绪线索、近期经历的可能连续性和仍不确定的解释。你不是在破解梦境、诊断心理状态或预测未来。

必须遵循：
- 只把用户明确写出的内容当成事实；不得补写梦中没有出现的人物、地点、事件或情绪。
- 推测必须使用“可能”“也可以从……理解”“信息有限”等措辞。
- 不使用固定梦境象征词典，例如不能断言某个物体必然代表某种心理含义。
- 睡前记录与梦境只可讨论可能的主题或情绪连续性，不能表述为因果关系。
- 每个解释必须写出依据来自哪一段用户记录；依据不足时明确说不足。
- 只使用下面提供的研究背景，不编造论文、作者、数据、书名或引文。
- 不诊断疾病，不提供药物或治疗建议，不使用“你就是”“这说明你一定”等确定措辞。
- alternativeInterpretations 每条以“有限把握｜”或“中等把握｜”开头，不得使用“高度确定”。
- 如果没有睡前记录，sleepNoteConnections 写 1 至 2 条，明确说明缺少对照信息以及可以怎样补充。

输出字段：
- dreamSummary：80 至 160 字，忠实概括梦境情节和最突出的情绪，不加入解释。
- emotionalThemes：2 至 4 条，区分用户明确记录的情绪与可探索的情绪线索。
- keyElements：2 至 5 条，描述关键人物、场景、事件及它们在叙事中的作用，不套用象征词典。
- observations：2 至 4 条，只写明确事实。
- sleepNoteConnections：1 至 3 条，讨论与睡前记录的可能联系或信息缺口。
- possibleConnections：2 至 4 条，连接近期经历的探索方向，每条说明文本依据。
- alternativeInterpretations：2 至 3 条，给出不同方向与把握程度，避免单一答案。
- evidenceBoundaries：2 至 3 条，说明研究背景能支持什么、不能支持什么。
- reflectionQuestions：2 至 4 条，具体、开放、可以由用户回答。
- gentleSuggestions：2 至 4 条，温和且可执行，以记录和自我观察为主。

只输出以下 JSON 结构：
{"dreamSummary":"","emotionalThemes":[],"keyElements":[],"observations":[],"sleepNoteConnections":[],"possibleConnections":[],"alternativeInterpretations":[],"evidenceBoundaries":[],"reflectionQuestions":[],"gentleSuggestions":[]}

可使用的研究背景：${JSON.stringify(SOURCES)}
用户梦境记录：${JSON.stringify(dream)}
关联睡前记录：${JSON.stringify(sleep)}`;
  try {
    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-flash', messages: [{ role: 'system', content: '生成有依据、保留不确定性、非诊断性的梦境反思内容。严格按 JSON 结构输出。' }, { role: 'user', content: prompt }], response_format: { type: 'json_object' }, thinking: { type: 'disabled' }, max_tokens: 2200, stream: false }),
      signal: AbortSignal.timeout(45000),
    });
    if (!upstream.ok) return send(res, 502, { error: upstream.status === 429 ? '分析服务暂时繁忙，请稍后重试' : 'AI 服务暂时无法完成分析' });
    const result = await upstream.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = result.choices?.[0]?.message?.content;
    if (!raw) return send(res, 502, { error: 'AI 服务没有返回分析内容' });
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const dreamSummary = typeof parsed.dreamSummary === 'string' ? parsed.dreamSummary.trim().slice(0, 600) : '';
    const analysis = {
      dreamSummary: dreamSummary || null,
      emotionalThemes: cleanArray(parsed.emotionalThemes),
      keyElements: cleanArray(parsed.keyElements, 5),
      observations: cleanArray(parsed.observations),
      sleepNoteConnections: cleanArray(parsed.sleepNoteConnections, 3, 1),
      possibleConnections: cleanArray(parsed.possibleConnections),
      alternativeInterpretations: cleanArray(parsed.alternativeInterpretations, 3),
      evidenceBoundaries: cleanArray(parsed.evidenceBoundaries, 3),
      reflectionQuestions: cleanArray(parsed.reflectionQuestions),
      gentleSuggestions: cleanArray(parsed.gentleSuggestions),
    };
    if (Object.values(analysis).some(x => x === null)) return send(res, 502, { error: 'AI 返回格式暂时不完整，请重新生成' });
    return send(res, 200, { analysis });
  } catch { return send(res, 502, { error: '连接 AI 服务失败，请检查网络和服务端配置' }); }
}
