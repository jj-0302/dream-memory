import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dreamTheme as c } from '../constants/dream-theme';
import type { DreamReview } from '../lib/review-storage';
import type { ReviewFinding } from '../lib/review-service';

export function ReviewReport({ review }: { review: DreamReview }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const sourceLabel = (ref: string) => ref === 'A1' ? '你的自由联想' : ref.startsWith('D') ? '梦境 ' + ref.slice(1) : '睡前记录 ' + ref.slice(1);
  const findings = (title: string, items: ReviewFinding[], empty: string) => <View style={styles.section}>
    <Text style={styles.heading}>{title}</Text>
    {items.length ? items.map((item, index) => <View key={index} style={styles.card}>
      <Text style={styles.label}>{item.title}</Text><Text style={styles.body}>{item.observation}</Text>
      {item.evidence.map((evidence, index) => <Text key={index} style={styles.hint}>{sourceLabel(evidence.ref)}：“{evidence.quote}”</Text>)}
    </View>) : <Text style={styles.hint}>{empty}</Text>}
  </View>;
  return <View>
    <Text style={styles.heading}>这一阶段的梦</Text>
    <Text style={styles.hint}>{new Date(review.createdAt).toLocaleString('zh-CN')} · {review.selection.dreams.length} 条梦境 · {review.selection.sleepNotes.length} 条睡前记录</Text>
    <View style={styles.card}><Text style={styles.body}>{review.result.overview}</Text></View>
    {findings('重复出现的线索', review.result.repetitions, '本次记录还不足以支持具体的重复线索，不必勉强寻找模式。')}
    {findings('发生变化的地方', review.result.changes, '暂时没有足够依据比较情绪或反应方式的变化。')}
    {findings('与睡前记录的可能联系', review.result.sleepConnections, review.selection.sleepNotes.length ? '本次对照还没有形成清楚的联系。' : '本次没有发送睡前记录，没有进行这项对照。')}
    {findings('你对重复元素的个人联想', review.result.personalAssociations, '本次没有足够的个人联想可供整理，AI 不会替你赋予固定含义。')}
    <View style={styles.section}><Text style={styles.heading}>接下来值得观察</Text>{review.result.observationClues.map((item, index) => <Text key={index} style={styles.line}>✦ {item}</Text>)}</View>
    <View style={styles.section}><Text style={styles.heading}>复盘说明</Text>{review.result.limitations.map((item, index) => <Text key={index} style={styles.hint}>{item}</Text>)}<Text style={styles.hint}>这是基于所选记录的反思整理，不是诊断或预测。两次相似只算重复线索，不代表长期模式。</Text></View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: sourcesOpen }} onPress={() => setSourcesOpen(value => !value)} style={styles.card}><Text style={styles.label}>{sourcesOpen ? '收起' : '查看'}本次记录全文</Text><Text style={styles.hint}>保留发送时的快照，后续编辑不会改写这份复盘。</Text></Pressable>
    {sourcesOpen ? <View>{[...review.selection.dreams, ...review.selection.sleepNotes].map(source => <View key={source.ref} style={styles.card}><Text style={styles.label}>{sourceLabel(source.ref)} · {source.date}</Text><Text style={styles.body}>{source.content}</Text></View>)}{review.selection.associations ? <View style={styles.card}><Text style={styles.label}>你的自由联想</Text><Text style={styles.body}>{review.selection.associations}</Text></View> : null}</View> : null}
  </View>;
}
const styles = StyleSheet.create({
  section: { marginTop: 22 }, heading: { color: c.text, fontSize: 18, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  label: { color: c.primaryDark, fontSize: 14, fontWeight: '700', marginBottom: 10 }, card: { backgroundColor: c.surface, borderRadius: 18, borderColor: c.border, borderWidth: 1, padding: 17, marginTop: 12 },
  body: { color: c.text, fontSize: 15, lineHeight: 25 }, hint: { color: c.muted, fontSize: 12, lineHeight: 21, marginTop: 8 }, line: { color: c.text, fontSize: 14, lineHeight: 24, marginTop: 8 },
});
