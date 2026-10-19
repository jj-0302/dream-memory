import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  DreamRecord,
  getDreamDraft,
  getDreamRecords,
} from '../lib/dream-storage';

export default function HomeScreen() {
  const router = useRouter();

  const [message, setMessage] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [latestDream, setLatestDream] =
    useState<DreamRecord | null>(null);
  const [dreamCount, setDreamCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadHomeData() {
        try {
          const [draft, records] = await Promise.all([
            getDreamDraft(),
            getDreamRecords(),
          ]);

          if (!isActive) {
            return;
          }

          setHasDraft(draft.trim().length > 0);
          setLatestDream(records[0] ?? null);
          setDreamCount(records.length);
        } catch {
          if (isActive) {
            setMessage('暂时无法读取本地记录，请稍后重试。');
          }
        }
      }

      loadHomeData();

      return () => {
        isActive = false;
      };
    }, [])
  );

const openVoiceRecorder = () => {
  router.push('/voice-entry');
};
  const openTextEntry = () => {
    router.push('/text-entry');
  };

  const formatDreamTime = (dateText: string) => {
    const date = new Date(dateText);

    if (Number.isNaN(date.getTime())) {
      return '刚刚记录';
    }

    return date.toLocaleString('zh-CN', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
<Pressable
  onPress={() => router.push('/insights')}
  style={({ pressed }) => [
    {
      position: 'absolute',
      top: 28,
      right: 28,
      zIndex: 20,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 18,
      backgroundColor: '#162442',
      borderWidth: 1,
      borderColor: '#304875',
    },
    pressed && styles.buttonPressed,
  ]}
>
  <Text
    style={{
      color: '#AFC0F3',
      fontSize: 12,
      fontWeight: '700',
    }}
  >
    阶段洞察
  </Text>
</Pressable>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.brand}>DREAM MEMORY</Text>
              <Text style={styles.dateText}>
                {dreamCount > 0
                  ? `已经留下 ${dreamCount} 个梦`
                  : '今天 · 醒来之后'}
              </Text>
            </View>

            <View style={styles.avatar}>
              <Text style={styles.avatarText}>✦</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.moonArea}>
              <View style={styles.moonGlowLarge} />
              <View style={styles.moonGlowSmall} />

              <View style={styles.moon}>
                <View style={styles.moonShadow} />
                <View style={styles.moonSpotOne} />
                <View style={styles.moonSpotTwo} />
              </View>

              <Text style={styles.starOne}>✦</Text>
              <Text style={styles.starTwo}>·</Text>
              <Text style={styles.starThree}>✧</Text>
            </View>

            <Text style={styles.eyebrow}>醒来以后</Text>
            <Text style={styles.title}>你还记得什么？</Text>

            <Text style={styles.subtitle}>
              不必完整，也不必合理。先把梦里仍然记得的片段留下来。
            </Text>
          </View>

          <View style={styles.actionArea}>
            <Pressable
              onPress={openVoiceRecorder}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={styles.primaryIcon}>
                <Text style={styles.primaryIconText}>●</Text>
              </View>

              <View style={styles.buttonTextArea}>
                <Text style={styles.primaryButtonTitle}>
                  说给我听
                </Text>

                <Text style={styles.primaryButtonDescription}>
                  可以停顿、重复，也可以慢慢想
                </Text>
              </View>

              <Text style={styles.primaryArrow}>›</Text>
            </Pressable>

            <Pressable
              onPress={openTextEntry}
              style={({ pressed }) => [
                styles.secondaryButton,
                hasDraft && styles.draftButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={styles.secondaryIcon}>
                <Text style={styles.secondaryIconText}>✎</Text>
              </View>

              <View style={styles.buttonTextArea}>
                <Text style={styles.secondaryButtonTitle}>
                  {hasDraft ? '继续未完成的记录' : '用文字记录'}
                </Text>

                <Text style={styles.secondaryButtonDescription}>
                  {hasDraft
                    ? '你有一份保存在当前设备的草稿'
                    : '写下一句话或一段梦境'}
                </Text>
              </View>

              <Text style={styles.secondaryArrow}>›</Text>
            </Pressable>

            {message ? (
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            ) : null}
          </View>

          {latestDream ? (
            <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
  <Text style={styles.sectionTitle}>最近的梦</Text>

  <Pressable
    onPress={() => router.push('/history')}
    style={({ pressed }) => [
      pressed && styles.buttonPressed,
    ]}
  >
    <Text style={styles.sectionCount}>
      查看全部 · 共 {dreamCount} 条 ›
    </Text>
  </Pressable>
</View>

              <View style={styles.dreamCard}>
                <View style={styles.dreamCardHeader}>
                  <View style={styles.dreamDateArea}>
                    <Text style={styles.dreamDot}>●</Text>

                    <Text style={styles.dreamDate}>
                      {formatDreamTime(latestDream.createdAt)}
                    </Text>
                  </View>

                  <Text style={styles.dreamType}>文字记录</Text>
                </View>

                <Text
                  style={styles.dreamContent}
                  numberOfLines={4}
                >
                  {latestDream.content}
                </Text>

                <View style={styles.savedRow}>
                  <Text style={styles.savedIcon}>✓</Text>
                  <Text style={styles.savedText}>
                    已保存为正式梦境
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.seedCard}>
              <View style={styles.seedHeader}>
                <View style={styles.seedTitleArea}>
                  <Text style={styles.seedIcon}>✦</Text>
                  <Text style={styles.seedLabel}>梦境种子</Text>
                </View>

                <Text style={styles.seedTag}>随机提示</Text>
              </View>

              <Text style={styles.seedQuestion}>
                梦里有没有一个让你印象很深的地方？
              </Text>

              <Text style={styles.seedDescription}>
                它可能是一间房子、一条路、一所学校，或者一个现实中不存在的地方。
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerText}>
              你的梦境数据目前只保存在当前设备中
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080D1B',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },

  page: {
    width: '100%',
    maxWidth: 720,
    minHeight: '100%',
    paddingTop: 48,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brand: {
    color: '#7185AD',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },

  dateText: {
    color: '#4F5E7B',
    fontSize: 12,
    marginTop: 6,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111B32',
    borderWidth: 1,
    borderColor: '#243453',
  },

  avatarText: {
    color: '#AFC7FF',
    fontSize: 16,
  },

  hero: {
    alignItems: 'center',
    marginTop: 30,
  },

  moonArea: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  moonGlowLarge: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(88, 117, 199, 0.08)',
  },

  moonGlowSmall: {
    position: 'absolute',
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: 'rgba(104, 139, 226, 0.11)',
  },

  moon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    overflow: 'hidden',
    backgroundColor: '#DCE6FF',
    shadowColor: '#91ADFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 10,
  },

  moonShadow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    top: -13,
    right: -18,
    backgroundColor: '#111A32',
  },

  moonSpotOne: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    left: 16,
    top: 44,
    backgroundColor: 'rgba(140, 158, 203, 0.35)',
  },

  moonSpotTwo: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    left: 27,
    top: 55,
    backgroundColor: 'rgba(140, 158, 203, 0.24)',
  },

  starOne: {
    position: 'absolute',
    top: 16,
    right: 20,
    color: '#7794D2',
    fontSize: 13,
  },

  starTwo: {
    position: 'absolute',
    left: 18,
    bottom: 27,
    color: '#8CA5D9',
    fontSize: 20,
  },

  starThree: {
    position: 'absolute',
    right: 5,
    bottom: 10,
    color: '#526B9E',
    fontSize: 11,
  },

  eyebrow: {
    color: '#7185AD',
    fontSize: 13,
    letterSpacing: 3,
    marginBottom: 11,
  },

  title: {
    color: '#F4F6FD',
    fontSize: 31,
    lineHeight: 40,
    fontWeight: '700',
    textAlign: 'center',
  },

  subtitle: {
    maxWidth: 480,
    color: '#8390AA',
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 13,
  },

  actionArea: {
    marginTop: 32,
  },

  primaryButton: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: '#526FCA',
    shadowColor: '#4E6ECF',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 6,
  },

  primaryIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },

  primaryIconText: {
    color: '#FFFFFF',
    fontSize: 15,
  },

  buttonTextArea: {
    flex: 1,
  },

  primaryButtonTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  primaryButtonDescription: {
    color: '#D6DFFF',
    fontSize: 12,
    marginTop: 5,
  },

  primaryArrow: {
    color: '#E4EAFF',
    fontSize: 31,
    fontWeight: '300',
    marginLeft: 10,
  },

  secondaryButton: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#283858',
    backgroundColor: '#11192C',
  },

  draftButton: {
    borderColor: '#526FCA',
    backgroundColor: '#121D36',
  },

  secondaryIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    backgroundColor: '#1C2944',
  },

  secondaryIconText: {
    color: '#AAC0F5',
    fontSize: 20,
  },

  secondaryButtonTitle: {
    color: '#E8ECF8',
    fontSize: 17,
    fontWeight: '700',
  },

  secondaryButtonDescription: {
    color: '#71809E',
    fontSize: 12,
    marginTop: 5,
  },

  secondaryArrow: {
    color: '#7585A6',
    fontSize: 31,
    fontWeight: '300',
    marginLeft: 10,
  },

  buttonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },

  messageBox: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#11192C',
    borderWidth: 1,
    borderColor: '#253451',
  },

  messageText: {
    color: '#91A4CB',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  recentSection: {
    marginTop: 28,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    color: '#DDE4F4',
    fontSize: 15,
    fontWeight: '700',
  },

  sectionCount: {
    color: '#5D6B88',
    fontSize: 11,
  },

  dreamCard: {
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#293B60',
    backgroundColor: '#10192C',
  },

  dreamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dreamDateArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dreamDot: {
    color: '#7898F2',
    fontSize: 8,
    marginRight: 9,
  },

  dreamDate: {
    color: '#8192B3',
    fontSize: 12,
  },

  dreamType: {
    color: '#60739A',
    fontSize: 11,
  },

  dreamContent: {
    color: '#E3E8F4',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 17,
  },

  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 17,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#253451',
  },

  savedIcon: {
    color: '#7CB9A3',
    fontSize: 12,
    marginRight: 7,
  },

  savedText: {
    color: '#647891',
    fontSize: 11,
  },

  seedCard: {
    marginTop: 26,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#223250',
    backgroundColor: '#0E1628',
  },

  seedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  seedTitleArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  seedIcon: {
    color: '#E8CD7A',
    fontSize: 14,
    marginRight: 9,
  },

  seedLabel: {
    color: '#A9B7D2',
    fontSize: 13,
    fontWeight: '600',
  },

  seedTag: {
    color: '#596B8C',
    fontSize: 11,
  },

  seedQuestion: {
    color: '#E8ECF6',
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
    marginTop: 18,
  },

  seedDescription: {
    color: '#7786A4',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 9,
  },

  footer: {
    alignItems: 'center',
    marginTop: 30,
  },

  footerLine: {
    width: 30,
    height: 1,
    marginBottom: 13,
    backgroundColor: '#26334C',
  },

  footerText: {
    color: '#46536B',
    fontSize: 11,
  },
});