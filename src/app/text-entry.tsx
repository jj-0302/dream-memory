import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  clearDreamDraft,
  completeTextDream,
  getDreamDraft,
  saveDreamDraft,
} from '../lib/dream-storage';

type SaveStatus =
  | 'loading'
  | 'editing'
  | 'saving'
  | 'saved'
  | 'error';

export default function TextEntryScreen() {
  const router = useRouter();

  const [content, setContent] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saveStatus, setSaveStatus] =
    useState<SaveStatus>('loading');
  const [isCompleting, setIsCompleting] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const saveTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCompletingRef = useRef(false);

  useEffect(() => {
    async function loadDraft() {
      try {
        const savedDraft = await getDreamDraft();

        setContent(savedDraft);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      } finally {
        setHasLoaded(true);
      }
    }

    loadDraft();
  }, []);

  useEffect(() => {
    if (!hasLoaded || isCompletingRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSaveStatus('editing');

    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await saveDreamDraft(content);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [content, hasLoaded]);

  const saveAndGoBack = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    try {
      setSaveStatus('saving');
      await saveDreamDraft(content);
      setSaveStatus('saved');
      router.back();
    } catch {
      setSaveStatus('error');
    }
  };

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    try {
      setContent('');
      await clearDreamDraft();
      setSaveStatus('saved');
      setConfirmClear(false);
    } catch {
      setSaveStatus('error');
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setConfirmClear(false);
  };

  const handleComplete = async () => {
    if (!content.trim() || isCompleting) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    isCompletingRef.current = true;
    setIsCompleting(true);

    try {
    const newRecord = await completeTextDream(content);

setContent('');

router.replace({
  pathname: '/dream-organize',
  params: {
    id: newRecord.id,
  },
});
    } catch {
      isCompletingRef.current = false;
      setIsCompleting(false);
      setSaveStatus('error');
    }
  };

  const getStatusText = () => {
    if (saveStatus === 'loading') {
      return '正在读取草稿……';
    }

    if (saveStatus === 'editing') {
      return '正在编辑';
    }

    if (saveStatus === 'saving') {
      return '正在保存……';
    }

    if (saveStatus === 'error') {
      return '保存失败，请稍后重试';
    }

    return '草稿已保存在当前设备';
  };

  const canComplete =
    hasLoaded && content.trim().length > 0 && !isCompleting;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <Pressable
              onPress={saveAndGoBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>

            <Text style={styles.headerTitle}>文字记录</Text>

            <Pressable
              onPress={handleClear}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.clearButtonText,
                  confirmClear && styles.clearConfirmText,
                ]}
              >
                {confirmClear ? '确认清空' : '清空'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.titleArea}>
            <Text style={styles.eyebrow}>醒来以后</Text>

            <Text style={styles.title}>
              把还记得的内容留下来
            </Text>

            <Text style={styles.subtitle}>
              不需要完整，也不用整理顺序。一个画面、一个人，或者一句话都可以。
            </Text>
          </View>

          <View style={styles.inputCard}>
            <TextInput
              value={content}
              onChangeText={handleContentChange}
              editable={hasLoaded && !isCompleting}
              multiline
              maxLength={5000}
              textAlignVertical="top"
              placeholder="例如：我好像在一所学校里，走廊里有很多水……"
              placeholderTextColor="#56627A"
              selectionColor="#7898F2"
              style={styles.textInput}
            />

            <View style={styles.inputFooter}>
              <Text
                style={[
                  styles.saveStatus,
                  saveStatus === 'error' && styles.errorText,
                ]}
              >
                {getStatusText()}
              </Text>

              <Text style={styles.characterCount}>
                {content.length} / 5000
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>✦</Text>

            <Text style={styles.tipText}>
              这里保存的是原始记忆。以后进行 AI 整理时，不会覆盖你写下的内容。
            </Text>
          </View>

          <Pressable
            disabled={!canComplete}
            onPress={handleComplete}
            style={({ pressed }) => [
              styles.completeButton,
              !canComplete && styles.completeButtonDisabled,
              pressed && canComplete && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.completeButtonText,
                !canComplete && styles.completeButtonTextDisabled,
              ]}
            >
              {isCompleting ? '正在完成记录……' : '完成梦境记录'}
            </Text>
          </Pressable>

          <Text style={styles.bottomHint}>
            返回上一页时会保留草稿；点击完成后会保存为正式梦境
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingTop: 30,
    paddingHorizontal: 28,
    paddingBottom: 36,
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
    backgroundColor: '#111B32',
  },

  backButtonText: {
    color: '#D9E3FA',
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
  },

  headerTitle: {
    color: '#E9EDF7',
    fontSize: 16,
    fontWeight: '700',
  },

  clearButton: {
    minWidth: 64,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  clearButtonText: {
    color: '#71809E',
    fontSize: 13,
  },

  clearConfirmText: {
    color: '#E59090',
  },

  titleArea: {
    marginTop: 24,
  },

  eyebrow: {
    color: '#7185AD',
    fontSize: 13,
    letterSpacing: 2,
  },

  title: {
    color: '#F4F6FD',
    fontSize: 29,
    lineHeight: 39,
    fontWeight: '700',
    marginTop: 12,
  },

  subtitle: {
    color: '#8290AA',
    fontSize: 14,
    lineHeight: 23,
    marginTop: 10,
  },

  inputCard: {
    minHeight: 300,
    marginTop: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2A3B5D',
    backgroundColor: '#10192C',
  },

  textInput: {
    flex: 1,
    minHeight: 230,
    color: '#E8ECF6',
    fontSize: 16,
    lineHeight: 26,
    padding: 0,
    outlineStyle: 'none',
  },

  inputFooter: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#263552',
  },

  saveStatus: {
    flex: 1,
    color: '#687898',
    fontSize: 11,
    marginRight: 12,
  },

  errorText: {
    color: '#E59090',
  },

  characterCount: {
    color: '#5F6D88',
    fontSize: 11,
  },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 17,
    paddingVertical: 16,
    borderRadius: 17,
    backgroundColor: '#10182A',
  },

  tipIcon: {
    color: '#E7CA73',
    fontSize: 13,
    marginRight: 11,
    marginTop: 2,
  },

  tipText: {
    flex: 1,
    color: '#839ACA',
    fontSize: 12,
    lineHeight: 20,
  },

  completeButton: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    borderRadius: 29,
    backgroundColor: '#526FCA',
    shadowColor: '#4E6ECF',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 5,
  },

  completeButtonDisabled: {
    backgroundColor: '#1C273D',
    shadowOpacity: 0,
    elevation: 0,
  },

  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  completeButtonTextDisabled: {
    color: '#59677F',
  },

  bottomHint: {
    color: '#46536B',
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 16,
  },

  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
});