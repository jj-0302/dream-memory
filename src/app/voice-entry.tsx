import { useRouter } from 'expo-router';
import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DreamAudioPlayer } from '../components/dream-audio-player';
import { completeVoiceDream } from '../lib/dream-storage';
import {
  clearVoiceDraft,
  getVoiceDraft,
  saveVoiceDraft,
} from '../lib/voice-storage';

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  directory: 'document' as const,
};

export default function VoiceEntryScreen() {
  const router = useRouter();

  const audioRecorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(
    audioRecorder,
    200
  );

  const [recordingUri, setRecordingUri] =
    useState<string | null>(null);
  const [durationMillis, setDurationMillis] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [statusText, setStatusText] = useState(
    '点击下方按钮开始录音'
  );
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadDraft() {
      const draft = await getVoiceDraft();

      if (draft) {
        setRecordingUri(draft.uri);
        setDurationMillis(draft.durationMillis);
        setStatusText('已恢复上一次的语音草稿');
      }
    }

    loadDraft();
  }, []);

  const ensurePermission = async () => {
    const currentPermission =
      await getRecordingPermissionsAsync();

    if (currentPermission.granted) {
      return true;
    }

    const requestedPermission =
      await requestRecordingPermissionsAsync();

    return requestedPermission.granted;
  };

  const startRecording = async () => {
    try {
      setErrorMessage('');

      const hasPermission = await ensurePermission();

      if (!hasPermission) {
        setErrorMessage(
          '没有获得麦克风权限，请在浏览器或手机设置中允许使用麦克风。'
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setRecordingUri(null);
      setDurationMillis(0);
      setIsPaused(false);
      setStatusText('正在录音，可以自然停顿和重复');
    } catch {
      setErrorMessage(
        '无法开始录音，请检查麦克风是否被其他程序占用。'
      );
    }
  };

  const pauseRecording = () => {
    try {
      audioRecorder.pause();
      setIsPaused(true);
      setStatusText('录音已暂停');
    } catch {
      setErrorMessage('暂停录音失败');
    }
  };

  const resumeRecording = () => {
    try {
      audioRecorder.record();
      setIsPaused(false);
      setStatusText('继续录音中');
    } catch {
      setErrorMessage('继续录音失败');
    }
  };

  const stopRecording = async () => {
    try {
      setErrorMessage('');

      const finalDuration = recorderState.durationMillis;

      await audioRecorder.stop();

      const uri = audioRecorder.uri;

      if (!uri) {
        setErrorMessage('没有生成录音文件，请重新录制');
        return;
      }

      setRecordingUri(uri);
      setDurationMillis(finalDuration);
      setIsPaused(false);
      setStatusText('录音已经保存在当前设备');

      await saveVoiceDraft({
        uri,
        durationMillis: finalDuration,
        createdAt: new Date().toISOString(),
      });

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch {
      setErrorMessage('结束录音失败，请重新尝试');
    }
  };

  const discardRecording = async () => {
    setRecordingUri(null);
    setDurationMillis(0);
    setIsPaused(false);
    setErrorMessage('');
    setStatusText('录音草稿已清除，可以重新录制');

    await clearVoiceDraft();
  };

   const completeRecording = async () => {
    if (!recordingUri || isCompleting) {
      return;
    }

    try {
      setIsCompleting(true);
      setErrorMessage('');

      const newRecord = await completeVoiceDream(
        recordingUri,
        durationMillis
      );

      await clearVoiceDraft();

      router.replace({
        pathname: '/dream-organize',
        params: {
          id: newRecord.id,
        },
      });
    } catch (error) {
      console.error('保存语音梦境失败：', error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : '保存语音梦境失败，请稍后重试'
      );
    } finally {
      setIsCompleting(false);
    }
  };

  const formatRecordingTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;
  };

  const isRecording =
    recorderState.isRecording || isPaused;

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
              onPress={() => router.replace('/')}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>

            <Text style={styles.headerTitle}>语音记录</Text>

            <View style={styles.headerSpace} />
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>刚刚醒来</Text>
            <Text style={styles.title}>慢慢说，我在听</Text>

            <Text style={styles.subtitle}>
              不需要组织语言。停顿、重复、语气词和突然想起的新片段都可以保留。
            </Text>
          </View>

          <View
            style={[
              styles.recorderCard,
              recorderState.isRecording &&
                styles.activeRecorderCard,
            ]}
          >
            <View style={styles.recordingCircle}>
              <View
                style={[
                  styles.recordingDot,
                  recorderState.isRecording &&
                    styles.activeRecordingDot,
                ]}
              />
            </View>

            <Text style={styles.timer}>
              {formatRecordingTime(
                recorderState.durationMillis
              )}
            </Text>

            <Text style={styles.statusText}>
              {statusText}
            </Text>

            {!isRecording && !recordingUri ? (
              <Pressable
                onPress={startRecording}
                style={({ pressed }) => [
                  styles.startButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.startButtonText}>
                  开始录音
                </Text>
              </Pressable>
            ) : null}

            {isRecording ? (
              <View style={styles.recordingActions}>
                <Pressable
                  onPress={
                    isPaused
                      ? resumeRecording
                      : pauseRecording
                  }
                  style={({ pressed }) => [
                    styles.pauseButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.pauseButtonText}>
                    {isPaused ? '继续' : '暂停'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={stopRecording}
                  style={({ pressed }) => [
                    styles.stopButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.stopButtonText}>
                    结束录音
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {recordingUri ? (
            <>
              <DreamAudioPlayer
                uri={recordingUri}
                durationMillis={durationMillis}
              />

              <View style={styles.tipCard}>
                <Text style={styles.tipIcon}>✦</Text>
                <Text style={styles.tipText}>
                  当前保存的是原始录音。语音转文字会在接入安全后端后完成，原始录音不会被覆盖。
                </Text>
              </View>

              <Pressable
                disabled={isCompleting}
                onPress={completeRecording}
                style={({ pressed }) => [
                  styles.completeButton,
                  isCompleting && styles.disabledButton,
                  pressed &&
                    !isCompleting &&
                    styles.pressed,
                ]}
              >
                <Text style={styles.completeButtonText}>
                  {isCompleting
                    ? '正在保存……'
                    : '完成语音梦境记录'}
                </Text>
              </Pressable>

              <Pressable
                onPress={discardRecording}
                style={({ pressed }) => [
                  styles.discardButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.discardButtonText}>
                  放弃并重新录制
                </Text>
              </Pressable>
            </>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <Text style={styles.webHint}>
            网页测试时请允许浏览器访问麦克风；最终 APK 会使用手机麦克风权限。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingTop: 30,
    paddingHorizontal: 28,
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

  hero: {
    alignItems: 'center',
    marginTop: 24,
    padding: 24,
    borderRadius: 25,
    backgroundColor: '#EAF6F0',
  },

  eyebrow: {
    color: '#728F89',
    fontSize: 12,
    letterSpacing: 2,
  },

  title: {
    color: '#173B37',
    fontSize: 30,
    fontWeight: '700',
    marginTop: 12,
  },

  subtitle: {
    maxWidth: 500,
    color: '#728F89',
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 11,
  },

  recorderCard: {
    alignItems: 'center',
    marginTop: 18,
    padding: 28,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E1EDE7',
    backgroundColor: '#FFFFFF',
  },

  activeRecorderCard: {
    borderColor: '#A7DCD0',
    backgroundColor: '#F3FBF6',
  },

  recordingCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF6F0',
  },

  recordingDot: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#A7DCD0',
  },

  activeRecordingDot: {
    backgroundColor: '#5FAF9C',
  },

  timer: {
    color: '#173B37',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 19,
  },

  statusText: {
    color: '#728F89',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 9,
  },

  startButton: {
    height: 54,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    borderRadius: 27,
    backgroundColor: '#5FAF9C',
  },

  startButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  recordingActions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    marginTop: 22,
  },

  pauseButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E1EDE7',
    backgroundColor: '#FFFFFF',
  },

  pauseButtonText: {
    color: '#466A63',
    fontSize: 14,
    fontWeight: '700',
  },

  stopButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
    borderRadius: 26,
    backgroundColor: '#5FAF9C',
  },

  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  tipCard: {
    flexDirection: 'row',
    marginTop: 16,
    padding: 16,
    borderRadius: 17,
    backgroundColor: '#10182A',
  },

  tipIcon: {
    color: '#E7CA73',
    marginRight: 10,
  },

  tipText: {
    flex: 1,
    color: '#466A63',
    fontSize: 12,
    lineHeight: 20,
  },

  completeButton: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    borderRadius: 29,
    backgroundColor: '#5FAF9C',
  },

  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.55,
  },

  discardButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },

  discardButtonText: {
    color: '#728F89',
    fontSize: 12,
  },

  errorCard: {
    marginTop: 17,
    padding: 15,
    borderRadius: 15,
    backgroundColor: '#FCECEF',
  },

  errorText: {
    color: '#AE5B68',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },

  webHint: {
    color: '#728F89',
    fontSize: 10,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 23,
  },

  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
});
