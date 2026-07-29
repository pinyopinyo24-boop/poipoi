/**
 * VoiceInputUI - Voice AI UI Component (Phase 3 Preparation)
 * 
 * 機能:
 * - 音声入力UI
 * - 音声録音管理
 * - 音声品質表示
 * - 音声コマンド解析準備
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

export interface VoiceInputProps {
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
  onVoiceData?: (audioUri: string) => void;
  isEnabled?: boolean;
}

export const VoiceInputUI: React.FC<VoiceInputProps> = ({
  onVoiceStart,
  onVoiceStop,
  onVoiceData,
  isEnabled = true,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [soundLevel, setSoundLevel] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 初期化
  useEffect(() => {
    initializeAudio();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // パルスアニメーション
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  /**
   * Audio初期化
   */
  const initializeAudio = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  };

  /**
   * 音声録音開始
   */
  const handleStartRecording = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
      }

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingTime(0);
      setSoundLevel(0);

      onVoiceStart?.();

      // タイマー開始
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // 音声レベル監視開始
      startMonitoringAudioLevel();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  /**
   * 音声録音停止
   */
  const handleStopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      setIsRecording(false);
      setRecordingUri(uri);
      setRecordingTime(0);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      onVoiceStop?.();
      onVoiceData?.(uri || '');
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  /**
   * 音声レベル監視開始
   */
  const startMonitoringAudioLevel = async () => {
    try {
      const levelInterval = setInterval(async () => {
        if (recordingRef.current) {
          const status = await recordingRef.current.getStatusAsync();
          if (status.metering !== undefined) {
            // メータリング値を0-100に正規化
            const normalizedLevel = Math.max(0, Math.min(100, status.metering + 100));
            setSoundLevel(normalizedLevel);
          }
        }
      }, 100);

      return () => clearInterval(levelInterval);
    } catch (error) {
      console.error('Failed to monitor audio level:', error);
    }
  };

  /**
   * 時間フォーマット
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* 音声入力ボタン */}
      <Animated.View
        style={[
          styles.recordButtonContainer,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive,
          ]}
          onPress={isRecording ? handleStopRecording : handleStartRecording}
          activeOpacity={0.8}
        >
          <Text style={styles.recordButtonIcon}>
            {isRecording ? '⏹️' : '🎤'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* 録音情報表示 */}
      {isRecording && (
        <View style={styles.recordingInfoContainer}>
          <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
          
          {/* 音声レベルメーター */}
          <View style={styles.levelMeterContainer}>
            <View style={styles.levelMeterBackground}>
              <View
                style={[
                  styles.levelMeterFill,
                  { width: `${soundLevel}%` },
                ]}
              />
            </View>
          </View>

          <Text style={styles.recordingStatus}>録音中...</Text>
        </View>
      )}

      {/* 録音完了情報 */}
      {recordingUri && !isRecording && (
        <View style={styles.recordedInfoContainer}>
          <Text style={styles.recordedLabel}>音声ファイル準備完了</Text>
          <Text style={styles.recordedTime}>
            {formatTime(recordingTime)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  recordButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordButtonActive: {
    backgroundColor: '#ef4444',
  },
  recordButtonIcon: {
    fontSize: 28,
  },
  recordingInfoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  recordingTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0284c7',
  },
  levelMeterContainer: {
    width: width - 60,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelMeterBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
  },
  levelMeterFill: {
    height: '100%',
    backgroundColor: '#06b6d4',
    borderRadius: 4,
  },
  recordingStatus: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  recordedInfoContainer: {
    alignItems: 'center',
    gap: 4,
  },
  recordedLabel: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  recordedTime: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default VoiceInputUI;
