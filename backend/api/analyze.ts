import type { VercelRequest, VercelResponse } from '@vercel/node';

type DreamInput = { content: string; mood?: string; clarity?: string; tags?: string[] };
type SleepInput = { content: string; category?: string; intensity: number } | null;
const SOURCES = [
  { title: 'What about dreams? State of the art and open questions', authors: 'Serena Scarpelli, Valentina Alfonsi, Maurizio Gorgoni, Luigi De Gennaro', year: 2022, url: 'https://pubmed.ncbi.nlm.nih.gov/35417930/', note: '梦境回忆与梦境神经科学综述，不提供固定象征解释。' },
  { title: 'Dreams reflect nocturnal cognitive processes: Early-night dreams are more continuous with waking life, and late-night dreams are more emotional and hyperassociative', authors: 'J. E. Malinowski, C. L. Horton', year: 2021, url: 'https://pubmed.ncbi.nlm.nih.gov/33360822/', note: '关于梦境与清醒经历连续性的研究，不可直接套用到个人梦境。' },
];
function send(res: VercelResponse, status: number, body: unknown) { return res.status(status).json(body); }
function cleanArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out = value.filter((x): x is string => typeof x === 'string').map(x => x.trim()).filter(Boolean).slice(0, 4);
  return out.length >= 2 ? out : null;
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
  const prompt = `你是谨慎的梦境记录反思助手。请用简体中文输出 JSON，不要 Markdown。帮助整理梦境与近期经历的可能联系，不是破解梦、诊断心理状态或预测未来。只将用户明确写出的内容当事实；推测用“可能”“可以探索”等措辞；不使用固定象征词典，不把睡前记录与梦境的时间关联说成因果；不编造研究、作者、书名或引文；不诊断疾病，不给药物或治疗建议。输出字段 observations、possibleConnections、reflectionQuestions、gentleSuggestions，每个字段是 2 至 4 条字符串数组。只输出结构为 {"observations":[],"possibleConnections":[],"reflectionQuestions":[],"gentleSuggestions":[]} 的 JSON。参考研究背景：${JSON.stringify(SOURCES)}\n梦境：${JSON.stringify(dream)}\n睡前记录：${JSON.stringify(sleep)}`;
  try {
    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-flash', messages: [{ role: 'system', content: '生成克制、非诊断性的梦境反思内容。' }, { role: 'user', content: prompt }], response_format: { type: 'json_object' }, thinking: { type: 'disabled' }, max_tokens: 1200, stream: false }),
      signal: AbortSignal.timeout(45000),
    });
    if (!upstream.ok) return send(res, 502, { error: upstream.status === 429 ? '分析服务暂时繁忙，请稍后重试' : 'AI 服务暂时无法完成分析' });
    const result = await upstream.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = result.choices?.[0]?.message?.content;
    if (!raw) return send(res, 502, { error: 'AI 服务没有返回分析内容' });
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const analysis = { observations: cleanArray(parsed.observations), possibleConnections: cleanArray(parsed.possibleConnections), reflectionQuestions: cleanArray(parsed.reflectionQuestions), gentleSuggestions: cleanArray(parsed.gentleSuggestions) };
    if (Object.values(analysis).some(x => x === null)) return send(res, 502, { error: 'AI 返回格式暂时不完整，请重新生成' });
    return send(res, 200, { analysis });
  } catch { return send(res, 502, { error: '连接 AI 服务失败，请检查网络和服务端配置' }); }
}
