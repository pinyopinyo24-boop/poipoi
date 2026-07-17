/**
 * CameraInputUI - Camera Input Component (Phase 3 Preparation)
 * 
 * 機能:
 * - カメラ入力UI
 * - 写真撮影
 * - ビデオ録画
 * - ギャラリーアクセス
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

export interface CapturedMedia {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  timestamp: number;
  size?: number;
}

export interface CameraInputUIProps {
  onCapture?: (media: CapturedMedia) => void;
  onGallerySelect?: (media: CapturedMedia) => void;
  isEnabled?: boolean;
}

export const CameraInputUI: React.FC<CameraInputUIProps> = ({
  onCapture,
  onGallerySelect,
  isEnabled = true,
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>(CameraType.back);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const cameraRef = useRef<Camera>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  /**
   * カメラ権限リクエスト
   */
  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request camera permission:', error);
      return false;
    }
  };

  /**
   * カメラを開く
   */
  const handleOpenCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (hasPermission) {
      setShowCamera(true);
    }
  };

  /**
   * 写真撮影
   */
  const handleTakePhoto = async () => {
    try {
      if (!cameraRef.current) return;

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      const capturedMedia: CapturedMedia = {
        id: `photo_${Date.now()}`,
        uri: photo.uri,
        type: 'photo',
        timestamp: Date.now(),
      };

      onCapture?.(capturedMedia);
      setShowCamera(false);
    } catch (error) {
      console.error('Failed to take photo:', error);
    }
  };

  /**
   * ビデオ録画開始
   */
  const handleStartRecording = async () => {
    try {
      if (!cameraRef.current) return;

      setIsRecording(true);
      setRecordingTime(0);

      // タイマー開始
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // 録画開始
      const video = await cameraRef.current.recordAsync({
        quality: Camera.Constants.VideoQuality['720'],
        maxDuration: 60, // 最大60秒
      });

      return video;
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
    }
  };

  /**
   * ビデオ録画停止
   */
  const handleStopRecording = async () => {
    try {
      if (!cameraRef.current) return;

      await cameraRef.current.stopRecording();
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      // 動画ファイルの取得と処理
      // 実装は環境に応じて調整
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  /**
   * カメラ切り替え
   */
  const handleToggleCamera = () => {
    setCameraType(
      cameraType === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  /**
   * ギャラリーから選択
   */
  const handleSelectFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const capturedMedia: CapturedMedia = {
          id: `gallery_${Date.now()}`,
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'photo',
          timestamp: Date.now(),
          size: asset.fileSize,
        };

        onGallerySelect?.(capturedMedia);
      }
    } catch (error) {
      console.error('Failed to select from gallery:', error);
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
      {/* カメラボタン */}
      <TouchableOpacity
        style={styles.cameraButton}
        onPress={handleOpenCamera}
        activeOpacity={0.7}
      >
        <Text style={styles.cameraButtonIcon}>📷</Text>
        <Text style={styles.cameraButtonText}>カメラ</Text>
      </TouchableOpacity>

      {/* ギャラリーボタン */}
      <TouchableOpacity
        style={styles.galleryButton}
        onPress={handleSelectFromGallery}
        activeOpacity={0.7}
      >
        <Text style={styles.galleryButtonIcon}>🖼️</Text>
        <Text style={styles.galleryButtonText}>ギャラリー</Text>
      </TouchableOpacity>

      {/* カメラモーダル */}
      <Modal
        visible={showCamera}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCamera(false)}
      >
        <SafeAreaView style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={cameraType}
            ratio="16:9"
          />

          {/* 録画時間表示 */}
          {isRecording && (
            <View style={styles.recordingTimeContainer}>
              <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
            </View>
          )}

          {/* コントロール */}
          <View style={styles.controlsContainer}>
            {/* 閉じるボタン */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCamera(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            {/* カメラ切り替えボタン */}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={handleToggleCamera}
            >
              <Text style={styles.toggleButtonText}>🔄</Text>
            </TouchableOpacity>

            {/* 撮影/録画ボタン */}
            <View style={styles.captureButtonContainer}>
              {!isRecording ? (
                <>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={handleTakePhoto}
                  >
                    <Text style={styles.photoButtonText}>📸</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.recordButton}
                    onPress={handleStartRecording}
                  >
                    <Text style={styles.recordButtonText}>🎥</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={handleStopRecording}
                >
                  <Text style={styles.stopButtonText}>⏹️</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
  },
  cameraButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
    borderColor: '#06b6d4',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  cameraButtonIcon: {
    fontSize: 18,
  },
  cameraButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
  galleryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
    borderColor: '#06b6d4',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  galleryButtonIcon: {
    fontSize: 18,
  },
  galleryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  recordingTimeContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  recordingTime: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  toggleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 24,
  },
  captureButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: 28,
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonText: {
    fontSize: 28,
  },
  stopButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonText: {
    fontSize: 28,
  },
});

export default CameraInputUI;
