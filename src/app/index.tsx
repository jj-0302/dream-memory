import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DreamBottomNav } from '../components/dream-bottom-nav';
import { dreamTheme as c } from '../constants/dream-theme';
import { getDreamDraft, getDreamRecords, type DreamRecord } from '../lib/dream-storage';
import { isValidReviewDream } from '../lib/review-service';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '最近记录';
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [hasDraft, setHasDraft] = useState(false);
  const [recentDreams, setRecentDreams] = useState<DreamRecord[]>([]);
  const [dreamCount, setDreamCount] = useState(0);
  const [validDreamCount, setValidDreamCount] = useState(0);
  const [message, setMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          const [draft, records] = await Promise.all([getDreamDraft(), getDreamRecords()]);
          if (!active) return;
          setHasDraft(draft.trim().length > 0);
          setRecentDreams(records.slice(0, 2));
          setDreamCount(records.length);
          setValidDreamCount(records.filter(isValidReviewDream).length);
          setMessage('');
        } catch {
          if (active) setMessage('暂时无法读取本地记录，请稍后重试。');
        }
      };
      void load();
      return () => { active = false; };
    }, [])
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.page, { paddingTop: Math.max(insets.top, 18) + 14 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>DREAM MEMORY</Text>
            <Text style={styles.topCaption}>给梦一个安静的地方</Text>
          </View>
          <Pressable
            accessibilityLabel="数据管理"
            onPress={() => router.push('/data-management')}
            style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}
          >
            <Text style={styles.profileIcon}>◌</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCircleOuter} />
          <View style={styles.heroCircleInner} />
          <Text style={styles.heroKicker}>醒来之后 · 此刻</Text>
          <Text style={styles.heroTitle}>你还记得什么？</Text>
          <Text style={styles.heroDescription}>
            不必完整，也不必合理。先留下梦里最清晰的一个片段。
          </Text>
          <Text style={styles.heroMoon}>☾</Text>
        </View>

        <Text style={[styles.sectionTitle, styles.recordHeading]}>记录一个梦</Text>
        <Text style={styles.sectionDescription}>选择最自然的方式，慢慢说或慢慢写。</Text>

        <Pressable
          onPress={() => router.push('/sleep-notes' as Href)}
          style={({ pressed }) => [styles.sleepButton, pressed && styles.pressed]}
        >
          <View style={styles.sleepIcon}><Text style={styles.sleepIconText}>☾</Text></View>
          <View style={styles.actionCopy}>
            <Text style={styles.sleepTitle}>睡前记下心事</Text>
            <Text style={styles.sleepDescription}>写下牵挂或期待，醒来后可以和梦境一起回顾</Text>
          </View>
          <Text style={styles.textArrow}>›</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/voice-entry')}
          style={({ pressed }) => [styles.voiceButton, pressed && styles.pressed]}
        >
          <View style={styles.voiceIcon}><Text style={styles.voiceIconText}>●</Text></View>
          <View style={styles.actionCopy}>
            <Text style={styles.voiceTitle}>说给我听</Text>
            <Text style={styles.voiceDescription}>录下刚醒来时的记忆</Text>
          </View>
          <Text style={styles.voiceArrow}>›</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/text-entry')}
          style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
        >
          <View style={styles.textIcon}><Text style={styles.textIconText}>✎</Text></View>
          <View style={styles.actionCopy}>
            <Text style={styles.textTitle}>{hasDraft ? '继续写草稿' : '用文字记录'}</Text>
            <Text style={styles.textDescription}>
              {hasDraft ? '上次的草稿仍在这里' : '一句话也可以是开始'}
            </Text>
          </View>
          <Text style={styles.textArrow}>›</Text>
        </Pressable>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>最近的梦</Text>
          <Pressable onPress={() => router.push('/history')} hitSlop={8}>
            <Text style={styles.allLink}>查看全部  ›</Text>
          </Pressable>
        </View>

        {recentDreams.length > 0 ? (
          recentDreams.map((record) => (
            <Pressable
              key={record.id}
              onPress={() => router.push({ pathname: '/dream-detail', params: { id: record.id } })}
              style={({ pressed }) => [styles.dreamCard, pressed && styles.pressed]}
            >
              <View style={styles.dreamMeta}>
                <Text style={styles.dreamDate}>{formatDate(record.createdAt)}</Text>
                <Text style={styles.dreamType}>{record.inputType === 'voice' ? '语音' : '文字'}</Text>
              </View>
              <Text style={styles.dreamTitle} numberOfLines={1}>
                {record.title?.trim() || (record.inputType === 'voice' ? '一段语音梦境' : '未命名的梦')}
              </Text>
              <Text style={styles.dreamContent} numberOfLines={2}>{record.content}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.cardHint}>查看梦境</Text>
                <Text style={styles.cardArrow}>↗</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>还没有留下梦境</Text>
            <Text style={styles.emptyText}>醒来后记下一句话，就能开始你的梦境档案。</Text>
          </View>
        )}

        {validDreamCount >= 5 ? <Pressable accessibilityRole="button" onPress={() => router.push('./dream-review')} style={styles.dreamCard}>
          <Text style={styles.dreamTitle}>你已经记录了{validDreamCount}个梦</Text>
          <Text style={styles.dreamContent}>要不要看看最近反复出现的情绪和主题？</Text>
          <Text style={styles.allLink}>选择记录，开始阶段复盘 ›</Text>
        </Pressable> : null}
        <Text style={styles.footer}>{dreamCount} 条梦境保存在当前设备中</Text>
      </ScrollView>
      <DreamBottomNav active="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  scroll: { flex: 1 },
  page: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 32 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: c.primaryDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  topCaption: { color: c.muted, fontSize: 12, marginTop: 6 },
  profileButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  profileIcon: { color: c.primaryDark, fontSize: 25 },
  hero: { marginTop: 26, minHeight: 222, backgroundColor: c.surfaceSoft, borderRadius: 30, padding: 27, overflow: 'hidden', justifyContent: 'center' },
  heroCircleOuter: { position: 'absolute', right: -52, top: -64, width: 240, height: 240, borderRadius: 120, backgroundColor: '#DCF2E8' },
  heroCircleInner: { position: 'absolute', right: -14, top: 12, width: 130, height: 130, borderRadius: 65, backgroundColor: '#D0EDE4' },
  heroKicker: { color: c.primaryDark, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { color: c.text, fontSize: 28, lineHeight: 38, fontWeight: '700', marginTop: 13 },
  heroDescription: { color: '#57756D', fontSize: 14, lineHeight: 23, maxWidth: 230, marginTop: 10 },
  heroMoon: { position: 'absolute', right: 29, bottom: 12, color: '#87CDBA', fontSize: 75, fontWeight: '300' },
  sectionTitle: { color: c.text, fontSize: 19, fontWeight: '700' },
  recordHeading: { marginTop: 30 },
  sectionDescription: { color: c.muted, fontSize: 13, marginTop: 7 },
  voiceButton: { marginTop: 18, minHeight: 80, borderRadius: 22, backgroundColor: c.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },
  voiceIcon: { width: 43, height: 43, borderRadius: 22, backgroundColor: '#FFFFFF33', alignItems: 'center', justifyContent: 'center' },
  voiceIconText: { color: '#FFFFFF', fontSize: 15 },
  actionCopy: { flex: 1, marginLeft: 14 },
  voiceTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  voiceDescription: { color: '#E4F7EE', fontSize: 12, marginTop: 5 },
  voiceArrow: { color: '#FFFFFF', fontSize: 28 },
  textButton: { marginTop: 12, minHeight: 80, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },
  textIcon: { width: 43, height: 43, borderRadius: 22, backgroundColor: c.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  textIconText: { color: c.primaryDark, fontSize: 21 },
  textTitle: { color: c.text, fontSize: 17, fontWeight: '700' },
  textDescription: { color: c.muted, fontSize: 12, marginTop: 5 },
  textArrow: { color: c.primaryDark, fontSize: 28 },
  sleepButton: { marginTop: 12, minHeight: 76, borderRadius: 22, backgroundColor: '#EFF7F1', borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },
  sleepIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#DDEFE5', alignItems: 'center', justifyContent: 'center' },
  sleepIconText: { color: c.primaryDark, fontSize: 23 },
  sleepTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
  sleepDescription: { color: c.muted, fontSize: 11, lineHeight: 16, marginTop: 4, flexShrink: 1 },
  message: { color: c.error, fontSize: 13, marginTop: 13 },
  sectionRow: { marginTop: 34, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  allLink: { color: c.primaryDark, fontSize: 13, fontWeight: '600' },
  dreamCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 19, marginBottom: 11 },
  dreamMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dreamDate: { color: c.muted, fontSize: 12 },
  dreamType: { color: c.primaryDark, fontSize: 11, backgroundColor: c.surfaceSoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 11 },
  dreamTitle: { color: c.text, fontSize: 16, fontWeight: '700', marginTop: 11 },
  dreamContent: { color: '#66827A', fontSize: 13, lineHeight: 21, marginTop: 7 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  cardHint: { color: c.primaryDark, fontSize: 12, fontWeight: '600' },
  cardArrow: { color: c.primaryDark, fontSize: 17 },
  emptyCard: { backgroundColor: c.surface, borderRadius: 22, padding: 23, borderColor: c.border, borderWidth: 1 },
  emptyTitle: { color: c.text, fontSize: 15, fontWeight: '700' },
  emptyText: { color: c.muted, fontSize: 13, lineHeight: 21, marginTop: 7 },
  footer: { color: c.muted, fontSize: 11, marginTop: 18, textAlign: 'center' },
  pressed: { opacity: 0.75 },
});
