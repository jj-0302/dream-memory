import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getDreamAnalyses,
  saveDreamAnalysis,
  type DreamAnalysis,
} from '../lib/analysis-storage';
import { generateLocalDreamAnalysis } from '../lib/analysis-service';
import { AnalysisExperience } from '../components/analysis-experience';
import {
  generateRemoteDreamAnalysis,
  isRemoteAnalysisConfigured,
} from '../lib/remote-analysis';
import {
  getDreamRecordById,
  type DreamRecord,
} from '../lib/dream-storage';
import {
  getSleepNoteById,
  type SleepNote,
} from '../lib/sleep-storage';

const ANALYSIS_CONSENT_KEY =
  'dream-memory:ai-analysis-consent:v1';

export default function DreamAnalysisScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const dreamId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [dream, setDream] = useState<DreamRecord | null>(
    null
  );
  const [sleepNote, setSleepNote] =
    useState<SleepNote | null>(null);
  const [analyses, setAnalyses] = useState<
    DreamAnalysis[]
  >([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const generating = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useFocusEffect(useCallback(() => {
    async function loadData() {
      if (!dreamId) {
        setErrorMessage('缺少梦境编号');
        setIsLoading(false);
        return;
      }

      try {
        const savedDream =
          await getDreamRecordById(dreamId);

        if (!savedDream) {
          setErrorMessage('没有找到这条梦境');
          return;
        }

        const [savedAnalyses, linkedNote] =
          await Promise.all([
            getDreamAnalyses(savedDream.id),
            savedDream.sleepNoteId
              ? getSleepNoteById(savedDream.sleepNoteId)
              : Promise.resolve(null),
          ]);

        setDream(savedDream);
        setSleepNote(linkedNote);
        setAnalyses(savedAnalyses);
        setSelectedIndex(0);
      } catch {
        setErrorMessage('读取分析数据失败');
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [dreamId]));

  const generateAnalysis = async () => {
    if (!dream || generating.current) {
      return;
    }

    generating.current = true;
    try {
      setIsGenerating(true);
      setErrorMessage('');

      let draft;

      if (isRemoteAnalysisConfigured()) {
        const consent = await AsyncStorage.getItem(
          ANALYSIS_CONSENT_KEY
        );
        let allowed = consent === 'accepted';

        if (!allowed) {
          allowed = await new Promise<boolean>((resolve) => {
            const disclosure =
              '为生成分析，这段梦境、情绪和关联的睡前记录会发送到你配置的服务端，再由 AI 服务商处理。请不要提交不希望传出的敏感信息。是否继续？';

            if (Platform.OS === 'web') {
              resolve(window.confirm(disclosure));
              return;
            }

            Alert.alert(
              '梦境内容将发送给 AI 服务',
              disclosure,
              [
                {
                  text: '暂不发送',
                  style: 'cancel',
                  onPress: () => resolve(false),
                },
                {
                  text: '同意并继续',
                  onPress: () => resolve(true),
                },
              ],
              {
                cancelable: true,
                onDismiss: () => resolve(false),
              }
            );
          });

          if (!allowed) {
            return;
          }

          await AsyncStorage.setItem(
            ANALYSIS_CONSENT_KEY,
            'accepted'
          );
        }

        draft = await generateRemoteDreamAnalysis(
          dream,
          sleepNote
        );
      } else {
        draft = generateLocalDreamAnalysis(
          dream,
          sleepNote
        );
      }

      const savedAnalysis = await saveDreamAnalysis(
        dream.id,
        draft
      );

      setAnalyses((current) => [
        savedAnalysis,
        ...current,
      ]);
      setSelectedIndex(0);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '生成分析失败，请稍后重试'
      );
    } finally {
      generating.current = false;
      setIsGenerating(false);
    }
  };

  const formatTime = (dateText: string) => {
    const date = new Date(dateText);

    if (Number.isNaN(date.getTime())) {
      return '时间未知';
    }

    return date.toLocaleString('zh-CN', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const currentAnalysis = analyses[selectedIndex];

  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <StatusBar style="dark" />
        <Text style={styles.loadingText}>
          正在读取梦境分析……
        </Text>
      </View>
    );
  }

  if (!dream) {
    return (
      <View style={styles.centerScreen}>
        <StatusBar style="dark" />
        <Text style={styles.errorText}>
          {errorMessage || '没有找到梦境'}
        </Text>

        <Pressable
          onPress={() => router.replace('/history')}
          style={styles.returnButton}
        >
          <Text style={styles.returnButtonText}>
            返回全部梦境
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <Pressable
              onPress={() => {
                router.replace({ pathname: '/dream-detail', params: { id: dreamId } });
              }}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>

            <Text style={styles.headerTitle}>梦境分析</Text>

            <View style={styles.headerSpace} />
          </View>

          <View style={styles.titleArea}>
            <Text style={styles.eyebrow}>
              REFLECTIVE ANALYSIS
            </Text>

            <Text style={styles.title}>
              {dream.title || '这段梦可能在说什么？'}
            </Text>

            <Text style={styles.subtitle}>
              从梦里的细节出发，看看哪些理解与你的经历贴近，也给不确定的地方留些空间。
            </Text>
          </View>

          <View style={styles.modeCard}>
            <View style={styles.modeHeader}>
              <Text style={styles.modeTitle}>
                {isRemoteAnalysisConfigured()
                  ? 'AI 分析服务已配置'
                  : '当前为离线基础分析'}
              </Text>

              <Text style={styles.modeTag}>
                {isRemoteAnalysisConfigured()
                  ? '在线 AI'
                  : '本地运行'}
              </Text>
            </View>

            <Text style={styles.modeDescription}>
              {isRemoteAnalysisConfigured()
                ? '分析请求会发送到你配置的服务端。API 密钥保存在服务端，不放在手机 App 中。首次使用前会说明数据传输并征求同意。'
                : '当前版本使用结构化规则验证完整流程，还没有接入真实大模型。配置服务端后才会发送梦境内容进行 AI 分析。'}
            </Text>
          </View>

          {!currentAnalysis ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✦</Text>
              <Text style={styles.emptyTitle}>
                还没有分析这段梦
              </Text>

              <Text style={styles.emptyDescription}>
                分析会结合梦境正文、情绪、标签、清晰度和关联的睡前心事。
              </Text>

              <Pressable
                disabled={isGenerating}
                onPress={generateAnalysis}
                style={({ pressed }) => [
                  styles.generateButton,
                  isGenerating && styles.disabledButton,
                  pressed &&
                    !isGenerating &&
                    styles.pressed,
                ]}
              >
                <Text style={styles.generateButtonText}>
                  {isGenerating
                    ? '正在整理……'
                    : '开始分析'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.versionHeader}>
                <Text style={styles.versionText}>
                  共 {analyses.length} 个分析版本
                </Text>

                <Pressable
                  onPress={generateAnalysis}
                  disabled={isGenerating}
                >
                  <Text style={styles.regenerateText}>
                    {isGenerating
                      ? '正在生成……'
                      : '重新生成'}
                  </Text>
                </Pressable>
              </View>

              {analyses.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.versionList}
                >
                  {analyses.map((analysis, index) => (
                    <Pressable
                      key={analysis.id}
                      onPress={() => setSelectedIndex(index)}
                      style={[
                        styles.versionButton,
                        selectedIndex === index &&
                          styles.selectedVersionButton,
                      ]}
                    >
                      <Text
                        style={[
                          styles.versionButtonText,
                          selectedIndex === index &&
                            styles.selectedVersionText,
                        ]}
                      >
                        {formatTime(analysis.createdAt)} ·{' '}
                        {analysis.generator === 'ai'
                          ? 'AI'
                          : '本地'}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}

              <AnalysisExperience key={currentAnalysis.id} dream={dream} analysis={currentAnalysis} sleepNote={sleepNote} />
            </>
          )}

          {errorMessage ? (
            <Text style={styles.errorMessage}>
              {errorMessage}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#F5FBF6',
  },

  loadingText: {
    color: '#728F89',
    fontSize: 14,
  },

  screen: {
    flex: 1,
    backgroundColor: '#F5FBF6',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    alignItems: 'center',
  },

  page: {
    width: '100%',
    maxWidth: 720,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 45,
  },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  backButtonText: {
    color: '#173B37',
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
  },

  headerTitle: {
    color: '#173B37',
    fontSize: 16,
    fontWeight: '700',
  },

  headerSpace: {
    width: 44,
  },

  titleArea: {
    marginTop: 22,
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#EAF6F0',
  },

  eyebrow: {
    color: '#728F89',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },

  title: {
    color: '#173B37',
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '700',
    marginTop: 12,
  },

  subtitle: {
    color: '#728F89',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 9,
  },

  modeCard: {
    marginTop: 24,
    padding: 17,
    borderWidth: 1,
    borderColor: '#E1EDE7',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },

  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  modeTitle: {
    color: '#466A63',
    fontSize: 13,
    fontWeight: '700',
  },

  modeTag: {
    color: '#5FAF9C',
    fontSize: 10,
  },

  modeDescription: {
    color: '#728F89',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 9,
  },

  emptyCard: {
    alignItems: 'center',
    marginTop: 24,
    padding: 28,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E1EDE7',
    backgroundColor: '#FFFFFF',
  },

  emptyIcon: {
    color: '#A47737',
    fontSize: 20,
  },

  emptyTitle: {
    color: '#173B37',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 15,
  },

  emptyDescription: {
    color: '#728F89',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 9,
  },

  generateButton: {
    height: 54,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    borderRadius: 27,
    backgroundColor: '#5FAF9C',
  },

  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.55,
  },

  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },

  versionText: {
    color: '#728F89',
    fontSize: 11,
  },

  regenerateText: {
    color: '#5FAF9C',
    fontSize: 11,
  },

  versionList: {
    marginTop: 12,
  },

  versionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
  },

  selectedVersionButton: {
    backgroundColor: '#D9F0E1',
  },

  versionButtonText: {
    color: '#728F89',
    fontSize: 10,
  },

  selectedVersionText: {
    color: '#173B37',
  },

  summaryCard: {
    marginTop: 27,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#EAF6F0',
  },

  summaryLabel: {
    color: '#5FAF9C',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  summaryText: {
    color: '#2D554E',
    fontSize: 14,
    lineHeight: 23,
    marginTop: 10,
  },

  analysisSection: {
    marginTop: 27,
  },

  sectionTitle: {
    color: '#173B37',
    fontSize: 16,
    fontWeight: '700',
  },

  sectionDescription: {
    color: '#728F89',
    fontSize: 11,
    marginTop: 5,
  },

  analysisCard: {
    marginTop: 12,
    padding: 18,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#E1EDE7',
    backgroundColor: '#FFFFFF',
  },

  analysisItem: {
    flexDirection: 'row',
  },

  analysisItemSpacing: {
    marginTop: 16,
  },

  analysisBullet: {
    color: '#5FAF9C',
    fontSize: 11,
    marginRight: 10,
    marginTop: 4,
  },

  analysisText: {
    flex: 1,
    color: '#466A63',
    fontSize: 13,
    lineHeight: 21,
  },

  sourceSection: {
    marginTop: 28,
  },

  sourceCard: {
    marginTop: 12,
    padding: 17,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E1EDE7',
    backgroundColor: '#FFFFFF',
  },

  sourceTitle: {
    color: '#173B37',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },

  sourceAuthors: {
    color: '#728F89',
    fontSize: 10,
    marginTop: 7,
  },

  sourceNote: {
    color: '#728F89',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 9,
  },

  sourceLink: {
    color: '#5FAF9C',
    fontSize: 11,
    marginTop: 11,
  },

  disclaimerCard: {
    marginTop: 25,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFF5F6',
  },

  disclaimerTitle: {
    color: '#8E6F78',
    fontSize: 12,
    fontWeight: '700',
  },

  disclaimerText: {
    color: '#8E7880',
    fontSize: 11,
    lineHeight: 19,
    marginTop: 8,
  },

  errorMessage: {
    color: '#AE5B68',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 18,
  },

  errorText: {
    color: '#AE5B68',
    fontSize: 13,
  },

  returnButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#5FAF9C',
  },

  returnButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
});
