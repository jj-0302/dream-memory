import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const DRAFT_KEY = 'dream-memory:text-draft:v1';

type SaveState = 'loading' | 'saving' | 'saved' | 'error';

export default function TextEntryScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('loading');

  useEffect(() => {
    let active = true;

    async function loadDraft() {
      try {
        const savedDraft = await AsyncStorage.getItem(DRAFT_KEY);

        if (active && savedDraft) {
          setText(savedDraft);
        }

        if (active) {
          setSaveState('saved');
          setLoaded(true);
        }
      } catch {
        if (active) {
          setSaveState('error');
          setLoaded(true);
        }
      }
    }

    loadDraft();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    setSaveState('saving');

    const timer = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(DRAFT_KEY, text);
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [text, loaded]);

  async function saveAndReturn() {
    try {
      await AsyncStorage.setItem(DRAFT_KEY, text);
      setSaveState('saved');
      router.back();
    } catch {
      setSaveState('error');
    }
  }

  async function clearDraft() {
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
      setText('');
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }

  const stateText = {
    loading: '正在读取草稿',
    saving: '正在自动保存',
    saved: '草稿已保存在当前设备',
    error: '保存失败，请稍后重试',
  }[saveState];

  const canFinish = text.trim().length > 0;

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => router.back()}
              >
                <Text style={styles.backText}>‹</Text>
              </Pressable>

              <Text style={styles.headerTitle}>文字记录</Text>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.clearButton,
                  pressed && styles.pressed,
                ]}
                onPress={clearDraft}
              >
                <Text style={styles.clearText}>清空</Text>
              </Pressable>
            </View>

            <View style={styles.titleArea}>
              <Text style={styles.eyebrow}>醒来以后</Text>
              <Text style={styles.title}>把还记得的内容留下来</Text>
              <Text style={styles.description}>
                不需要完整，也不用整理顺序。一个画面、一个人，或者一句话都可以。
              </Text>
            </View>

            <View style={styles.editorCard}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="例如：我好像在一所学校里，走廊里有很多水……"
                placeholderTextColor="#606B84"
                multiline
                maxLength={5000}
                textAlignVertical="top"
                autoFocus={Platform.OS === 'web'}
                style={styles.input}
              />

              <View style={styles.editorFooter}>
                <Text
                  style={[
                    styles.saveState,
                    saveState === 'error' && styles.errorText,
                  ]}
                >
                  {stateText}
                </Text>

                <Text style={styles.counter}>{text.length} / 5000</Text>
              </View>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipSymbol}>✦</Text>
              <Text style={styles.tipText}>
                这里保存的是原始记忆。AI 整理会在下一步进行，并且不会覆盖你写下的内容。
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={!canFinish}
              style={({ pressed }) => [
                styles.finishButton,
                !canFinish && styles.finishButtonDisabled,
                pressed && canFinish && styles.pressed,
              ]}
              onPress={saveAndReturn}
            >
              <Text
                style={[
                  styles.finishText,
                  !canFinish && styles.finishTextDisabled,
                ]}
              >
                保存草稿
              </Text>
            </Pressable>

            <Text style={styles.privacy}>
              当前阶段的草稿只保存在这台设备中
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#080D1B',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  container: {
    width: '100%',
    maxWidth: 620,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#121B31',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: '#E8E2D5',
    fontSize: 34,
    lineHeight: 38,
    marginTop: -3,
  },
  headerTitle: {
    color: '#CCD3E2',
    fontSize: 15,
    fontWeight: '600',
  },
  clearButton: {
    minWidth: 44,
    paddingVertical: 10,
    alignItems: 'flex-end',
  },
  clearText: {
    color: '#8F9AB3',
    fontSize: 14,
  },
  titleArea: {
    marginBottom: 24,
  },
  eyebrow: {
    color: '#7180A3',
    fontSize: 13,
    marginBottom: 10,
  },
  title: {
    color: '#F4F0E7',
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    color: '#919DB6',
    fontSize: 14,
    lineHeight: 23,
  },
  editorCard: {
    minHeight: 300,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#293650',
    backgroundColor: '#10182B',
    padding: 18,
  },
  input: {
    flex: 1,
    minHeight: 230,
    color: '#EEEAE2',
    fontSize: 16,
    lineHeight: 27,
  },
  editorFooter: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#253047',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveState: {
    color: '#7180A0',
    fontSize: 12,
  },
  errorText: {
    color: '#D88686',
  },
  counter: {
    color: '#596680',
    fontSize: 12,
  },
  tipCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#0E1527',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipSymbol: {
    color: '#D8C89F',
    fontSize: 16,
    marginRight: 10,
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    color: '#7F8BA6',
    fontSize: 13,
    lineHeight: 21,
  },
  finishButton: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: '#E8E2D5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  finishButtonDisabled: {
    backgroundColor: '#1B2438',
  },
  finishText: {
    color: '#12182A',
    fontSize: 16,
    fontWeight: '600',
  },
  finishTextDisabled: {
    color: '#5E6980',
  },
  privacy: {
    color: '#505C75',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
});