import { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  const [message, setMessage] = useState(
    '一个画面、一句话、一个完整的梦，都可以。'
  );

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <Text style={styles.brand}>DREAM MEMORY</Text>

          <View style={styles.moonGlow}>
            <View style={styles.moon}>
              <Text style={styles.moonSymbol}>☾</Text>
            </View>
          </View>

          <Text style={styles.eyebrow}>早上好</Text>

          <Text style={styles.title}>
            醒来以后，{'\n'}你还记得什么？
          </Text>

          <Text style={styles.description}>{message}</Text>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.recordButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => setMessage('录音功能将在下一阶段接入。')}
          >
            <Text style={styles.recordIcon}>●</Text>
            <Text style={styles.recordText}>说给我听</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.textButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => setMessage('你也可以直接输入记得的梦境。')}
          >
            <Text style={styles.textButtonLabel}>用文字记录</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.seedCard,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => setMessage('睡前梦种功能将在后续页面完成。')}
          >
            <View style={styles.seedIcon}>
              <Text style={styles.seedIconText}>✦</Text>
            </View>

            <View style={styles.seedContent}>
              <Text style={styles.seedLabel}>睡觉以前</Text>
              <Text style={styles.seedTitle}>
                今晚，有什么想带进梦里？
              </Text>
              <Text style={styles.seedDescription}>
                留下一件困惑、一个目标，或者一种希望靠近的状态。
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </Pressable>

          <Text style={styles.privacy}>
            你的梦境默认仅自己可见
          </Text>
        </View>
      </ScrollView>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  brand: {
    color: '#7783A2',
    fontSize: 12,
    letterSpacing: 4,
    marginBottom: 42,
  },
  moonGlow: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111A35',
    marginBottom: 34,
  },
  moon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E2D5',
  },
  moonSymbol: {
    color: '#17203B',
    fontSize: 48,
    lineHeight: 56,
  },
  eyebrow: {
    color: '#8E9AB8',
    fontSize: 14,
    marginBottom: 12,
  },
  title: {
    color: '#F5F2EA',
    fontSize: 34,
    lineHeight: 46,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
  },
  description: {
    color: '#9BA6BF',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    minHeight: 48,
    marginBottom: 24,
  },
  recordButton: {
    width: '100%',
    minHeight: 58,
    borderRadius: 29,
    backgroundColor: '#E8E2D5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  recordIcon: {
    color: '#9A5362',
    fontSize: 16,
  },
  recordText: {
    color: '#11182C',
    fontSize: 17,
    fontWeight: '600',
  },
  textButton: {
    marginTop: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  textButtonLabel: {
    color: '#BBC3D6',
    fontSize: 15,
  },
  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  divider: {
    width: 42,
    height: 1,
    backgroundColor: '#35405A',
    marginVertical: 30,
  },
  seedCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#283450',
    backgroundColor: '#10182D',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  seedIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C2948',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  seedIconText: {
    color: '#D8C89F',
    fontSize: 20,
  },
  seedContent: {
    flex: 1,
  },
  seedLabel: {
    color: '#7786AA',
    fontSize: 12,
    marginBottom: 5,
  },
  seedTitle: {
    color: '#F0ECE2',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 7,
  },
  seedDescription: {
    color: '#8C98B3',
    fontSize: 13,
    lineHeight: 19,
  },
  arrow: {
    color: '#7080A3',
    fontSize: 28,
    marginLeft: 8,
  },
  privacy: {
    color: '#56627D',
    fontSize: 12,
    marginTop: 24,
  },
});