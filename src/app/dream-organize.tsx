import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  getDreamRecordById,
  type DreamClarity,
  type DreamMood,
  type DreamRecord,
  updateDreamMetadata,
} from '../lib/dream-storage';

const MOODS: DreamMood[] = [
  '平静',
  '愉快',
  '紧张',
  '悲伤',
  '混乱',
  '害怕',
];

const CLARITY_OPTIONS: DreamClarity[] = [
  '模糊',
  '零散片段',
  '比较清晰',
  '非常清晰',
];

const TAG_OPTIONS = [
  '人物',
  '学校',
  '工作',
  '家',
  '陌生地点',
  '追逐',
  '飞行',
  '水',
  '动物',
  '重复梦',
];

const DREAM_ORDER_OPTIONS = [1, 2, 3, 4, 5];

export default function DreamOrganizeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const dreamId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [record, setRecord] = useState<DreamRecord | null>(
    null
  );
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState<DreamMood | undefined>();
  const [clarity, setClarity] =
    useState<DreamClarity | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [dreamOrder, setDreamOrder] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadDream() {
      if (!dreamId) {
        setErrorMessage('缺少梦境编号');
        setIsLoading(false);
        return;
      }

      try {
        const savedRecord = await getDreamRecordById(dreamId);

        if (!savedRecord) {
          setErrorMessage('没有找到这条梦境');
          return;
        }

        setRecord(savedRecord);
        setTitle(savedRecord.title ?? '');
        setMood(savedRecord.mood);
        setClarity(savedRecord.clarity);
        setTags(savedRecord.tags ?? []);
        setDreamOrder(savedRecord.dreamOrder ?? 1);
      } catch {
        setErrorMessage('读取梦境失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    }

    loadDream();
  }, [dreamId]);

  const toggleTag = (tag: string) => {
    setTags((currentTags) => {
      if (currentTags.includes(tag)) {
        return currentTags.filter(
          (currentTag) => currentTag !== tag
        );
      }

      if (currentTags.length >= 5) {
        return currentTags;
      }

      return [...currentTags, tag];
    });
  };

  const saveMetadata = async () => {
    if (!record || isSaving) {
      return;
    }

    const defaultTitle =
      record.content.length > 14
        ? `${record.content.slice(0, 14)}……`
        : record.content;

    try {
      setIsSaving(true);
      setErrorMessage('');

      await updateDreamMetadata(record.id, {
        title: title.trim() || defaultTitle,
        mood,
        clarity,
        tags,
        dreamOrder,
      });

      router.replace('/');
    } catch {
      setErrorMessage('保存整理信息失败，请稍后重试');
      setIsSaving(false);
    }
  };

  const skipOrganize = () => {
    router.replace('/');
  };

  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>
          正在准备梦境信息……
        </Text>
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.centerScreen}>
        <StatusBar style="light" />
        <Text style={styles.errorText}>{errorMessage}</Text>

        <Pressable
          onPress={() => router.replace('/')}
          style={styles.returnButton}
        >
          <Text style={styles.returnButtonText}>返回首页</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>整理梦境</Text>

            <Pressable onPress={skipOrganize}>
              <Text style={styles.skipText}>稍后整理</Text>
            </Pressable>
          </View>

          <View style={styles.titleArea}>
            <Text style={styles.eyebrow}>记录已经安全保存</Text>
            <Text style={styles.title}>再补充一点信息</Text>
            <Text style={styles.subtitle}>
              这些信息能帮助你日后查找梦境，也会成为 AI 分析的背景。
            </Text>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>原始记录</Text>
            <Text style={styles.previewText} numberOfLines={4}>
              {record.content}
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>给这个梦起个名字</Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              maxLength={40}
              placeholder="例如：被水淹没的学校"
              placeholderTextColor="#56627A"
              selectionColor="#7898F2"
              style={styles.titleInput}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>
              这个梦给你的主要感受
            </Text>

            <View style={styles.optionWrap}>
              {MOODS.map((option) => {
                const isSelected = mood === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() =>
                      setMood(isSelected ? undefined : option)
                    }
                    style={[
                      styles.optionChip,
                      isSelected && styles.selectedChip,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.selectedText,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>
              你还记得多清楚？
            </Text>

            <View style={styles.optionWrap}>
              {CLARITY_OPTIONS.map((option) => {
                const isSelected = clarity === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() =>
                      setClarity(
                        isSelected ? undefined : option
                      )
                    }
                    style={[
                      styles.optionChip,
                      isSelected && styles.selectedChip,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.selectedText,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>梦境标签</Text>
              <Text style={styles.sectionHint}>
                最多选择 5 个
              </Text>
            </View>

            <View style={styles.optionWrap}>
              {TAG_OPTIONS.map((tag) => {
                const isSelected = tags.includes(tag);

                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[
                      styles.optionChip,
                      isSelected && styles.selectedChip,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.selectedText,
                      ]}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>
              这是这一晚记得的第几个不同梦境？
            </Text>

            <View style={styles.orderRow}>
              {DREAM_ORDER_OPTIONS.map((order) => {
                const isSelected = dreamOrder === order;

                return (
                  <Pressable
                    key={order}
                    onPress={() => setDreamOrder(order)}
                    style={[
                      styles.orderButton,
                      isSelected && styles.selectedOrderButton,
                    ]}
                  >
                    <Text
                      style={[
                        styles.orderText,
                        isSelected && styles.selectedText,
                      ]}
                    >
                      {order}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <Pressable
            disabled={isSaving}
            onPress={saveMetadata}
            style={({ pressed }) => [
              styles.saveButton,
              isSaving && styles.disabledButton,
              pressed && !isSaving && styles.pressed,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? '正在保存……' : '保存梦境信息'}
            </Text>
          </Pressable>

          <Text style={styles.bottomHint}>
            没有把握的信息可以不选，之后仍然可以修改
          </Text>
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
    backgroundColor: '#080D1B',
  },

  loadingText: {
    color: '#8290AA',
    fontSize: 14,
  },

  screen: {
    flex: 1,
    backgroundColor: '#080D1B',
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
    paddingTop: 36,
    paddingHorizontal: 28,
    paddingBottom: 45,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    color: '#E9EDF7',
    fontSize: 16,
    fontWeight: '700',
  },

  skipText: {
    color: '#71809E',
    fontSize: 13,
  },

  titleArea: {
    marginTop: 38,
  },

  eyebrow: {
    color: '#7CB9A3',
    fontSize: 12,
    letterSpacing: 1,
  },

  title: {
    color: '#F4F6FD',
    fontSize: 29,
    fontWeight: '700',
    marginTop: 12,
  },

  subtitle: {
    color: '#8290AA',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },

  previewCard: {
    marginTop: 25,
    padding: 18,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#273855',
    backgroundColor: '#0F182A',
  },

  previewLabel: {
    color: '#667897',
    fontSize: 11,
  },

  previewText: {
    color: '#C8D1E4',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },

  formSection: {
    marginTop: 27,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: '#DDE4F4',
    fontSize: 14,
    fontWeight: '700',
  },

  sectionHint: {
    color: '#5F6E88',
    fontSize: 11,
  },

  titleInput: {
    height: 54,
    marginTop: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3B5D',
    color: '#E8ECF6',
    backgroundColor: '#10192C',
    fontSize: 15,
    outlineStyle: 'none',
  },

  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    marginHorizontal: -5,
  },

  optionChip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 5,
    marginTop: 10,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#293957',
    backgroundColor: '#10192C',
  },

  selectedChip: {
    borderColor: '#6685DE',
    backgroundColor: '#1B2B50',
  },

  optionText: {
    color: '#8390AA',
    fontSize: 13,
  },

  selectedText: {
    color: '#DCE5FF',
    fontWeight: '700',
  },

  orderRow: {
    flexDirection: 'row',
    marginTop: 13,
  },

  orderButton: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#293957',
    backgroundColor: '#10192C',
  },

  selectedOrderButton: {
    borderColor: '#6685DE',
    backgroundColor: '#526FCA',
  },

  orderText: {
    color: '#8390AA',
    fontSize: 14,
  },

  errorCard: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#291A25',
  },

  errorText: {
    color: '#E59090',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },

  returnButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#526FCA',
  },

  returnButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  saveButton: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    borderRadius: 29,
    backgroundColor: '#526FCA',
  },

  disabledButton: {
    opacity: 0.55,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  bottomHint: {
    color: '#4E5B73',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 15,
  },

  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
});