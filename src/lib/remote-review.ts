import { isReviewResult, type ReviewResult, type ReviewSelection } from './review-service';

let requesting = false;
export async function generateRemoteReview(selection: ReviewSelection, consentConfirmed = false): Promise<ReviewResult> {
  if (!consentConfirmed) throw new Error('请先确认本次发送的记录和数量');
  if (requesting) throw new Error('正在生成复盘，请稍候');
  requesting = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const configured = process.env.EXPO_PUBLIC_ANALYSIS_API_URL?.trim();
    const code = process.env.EXPO_PUBLIC_ANALYSIS_ACCESS_CODE?.trim();
    if (!configured || !code) throw new Error('还没有配置分析服务');
    const url = new URL(configured); url.pathname = url.pathname.replace(/\/analyze\/?$/, '/review'); url.search = ''; url.hash = '';
    if (!url.pathname.endsWith('/review')) throw new Error('分析接口地址格式不正确');
    const response = await fetch(url.toString(), {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-Analysis-Access-Code': code },
      body: JSON.stringify({ range: selection.range, includeSleepNotes: selection.includeSleepNotes, associations: selection.associations,
        dreams: selection.dreams.map(({ sourceId: _sourceId, ...source }) => source),
        sleepNotes: selection.sleepNotes.map(({ sourceId: _sourceId, ...source }) => source),
      }),
    });
    const body = await response.json().catch(() => null) as { error?: string; review?: unknown } | null;
    if (!response.ok) throw new Error(response.status === 404 ? '阶段复盘接口尚未部署，所选内容仍在本机' : body?.error || '复盘服务暂时不可用');
    if (!isReviewResult(body?.review, selection)) throw new Error('复盘结果或原文依据不完整，请重试');
    return body.review;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('复盘请求超时，请稍后重试');
    throw error;
  } finally { clearTimeout(timer); requesting = false; }
}
