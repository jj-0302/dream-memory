import { useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { dreamTheme as c } from '../constants/dream-theme';
import { getAnalysisPresentation } from '../lib/analysis-presentation';
import type { AnalysisInterpretation, DreamAnalysisDraft } from '../lib/analysis-storage';

type Props = {
  analysis: DreamAnalysisDraft;
  understandingFeedback?: ReactNode;
  interpretationFeedback?: (reading: AnalysisInterpretation) => ReactNode;
  explorationControls?: ReactNode;
};
export function AnalysisContent({ analysis, understandingFeedback, interpretationFeedback, explorationControls }: Props) {
  const [expanded, setExpanded] = useState(false);
  const content = getAnalysisPresentation(analysis);
  return <View>
    <Section title="我对这个梦的理解"><Text style={styles.body}>{content.understanding}</Text>{understandingFeedback}</Section>
    <Section title="梦里的关键线索"><Lines items={content.keyClues} /></Section>
    <Section title="与现实和睡前记录的联系"><Lines items={content.wakingConnections} /></Section>
    <Section title="几种可能的理解">
      <Text style={styles.hint}>可以同时保留不同方向，不必急着选一个答案。</Text>
      {content.possibleReadings.length ? content.possibleReadings.map(reading => <View key={reading.id} style={styles.reading}>
        <Text style={styles.body}>{reading.interpretation}</Text>
        <Text style={styles.hint}>依据：{reading.evidence}</Text>
        {interpretationFeedback?.(reading)}
      </View>) : <Text style={styles.body}>目前没有足够依据给出多种具体理解，先保留这个空白。</Text>}
    </Section>
    <Section title="继续探索"><Lines items={content.furtherExploration} />{explorationControls}</Section>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={styles.notes}>
      <Text style={styles.heading}>分析说明 {expanded ? '⌃' : '⌄'}</Text><Text style={styles.hint}>方法、研究来源与使用边界</Text>
    </Pressable>
    {expanded ? <View style={styles.card}>
      <Text style={styles.body}>自由联想借鉴弗洛伊德的方法：从梦中细节出发，探索你自己的记忆与感受。这是一种探索方式，不能证明某种潜意识解释，也不使用固定符号词典。</Text>
      <Lines items={analysis.evidenceBoundaries ?? []} />
      <Text style={styles.hint}>{analysis.disclaimer}</Text>
      {(analysis.evidenceSources ?? []).map(source => <Pressable accessibilityRole="link" key={source.url} onPress={() => Linking.openURL(source.url)} style={styles.reading}>
        <Text style={styles.body}>{source.title}</Text><Text style={styles.hint}>{source.authors} · {source.year}</Text>
        <Text style={styles.hint}>{source.note}</Text><Text style={styles.link}>查看来源 ›</Text>
      </Pressable>)}
    </View> : null}
  </View>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><Text style={styles.heading}>{title}</Text><View style={styles.card}>{children}</View></View>;
}
function Lines({ items }: { items: string[] }) {
  return <View>{items.map((item, index) => <Text key={index} style={styles.line}>✦ {item}</Text>)}</View>;
}
const styles = StyleSheet.create({
  section: { marginTop: 24 }, heading: { color: c.text, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  card: { padding: 18, borderRadius: 20, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 },
  body: { color: c.text, fontSize: 15, lineHeight: 25 }, line: { color: c.text, fontSize: 15, lineHeight: 25, marginVertical: 6 },
  hint: { color: c.muted, fontSize: 12, lineHeight: 20, marginTop: 8 }, reading: { marginTop: 14, paddingTop: 14, borderTopColor: c.border, borderTopWidth: 1 },
  notes: { padding: 18, backgroundColor: c.surfaceSoft, borderRadius: 18, marginTop: 24 }, link: { color: c.primaryDark, marginTop: 8, fontSize: 13 },
});
