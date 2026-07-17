/**
 * FileUploadUI - File Upload Component (Phase 3 Preparation)
 * 
 * 機能:
 * - ファイル選択UI
 * - ファイルアップロード管理
 * - アップロード進捗表示
 * - ファイル種別判定
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  FlatList,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

const { width } = Dimensions.get('window');

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

export interface FileUploadUIProps {
  onFileSelect?: (file: UploadedFile) => void;
  onUploadStart?: (file: UploadedFile) => void;
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (file: UploadedFile, error: string) => void;
  maxFileSize?: number; // バイト
  allowedTypes?: string[];
  isEnabled?: boolean;
}

export const FileUploadUI: React.FC<FileUploadUIProps> = ({
  onFileSelect,
  onUploadStart,
  onUploadComplete,
  onUploadError,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['image/*', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  isEnabled = true,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  /**
   * ファイル選択
   */
  const handleSelectFile = async () => {
    try {
      setIsSelecting(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: allowedTypes,
        multiple: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];

        // ファイルサイズチェック
        if (asset.size && asset.size > maxFileSize) {
          onUploadError?.(
            {
              id: `file_${Date.now()}`,
              name: asset.name,
              size: asset.size,
              type: asset.mimeType || 'unknown',
              uploadedAt: Date.now(),
              progress: 0,
              status: 'error',
            },
            `ファイルサイズが大きすぎます (最大: ${formatFileSize(maxFileSize)})`
          );
          return;
        }

        const uploadedFile: UploadedFile = {
          id: `file_${Date.now()}`,
          name: asset.name,
          size: asset.size || 0,
          type: asset.mimeType || 'unknown',
          uploadedAt: Date.now(),
          progress: 0,
          status: 'pending',
        };

        setUploadedFiles(prev => [...prev, uploadedFile]);
        onFileSelect?.(uploadedFile);

        // アップロード開始
        simulateUpload(uploadedFile);
      }
    } catch (error) {
      console.error('Failed to select file:', error);
    } finally {
      setIsSelecting(false);
    }
  };

  /**
   * アップロードシミュレーション
   */
  const simulateUpload = async (file: UploadedFile) => {
    try {
      // ステータスを更新
      updateFileStatus(file.id, 'uploading');
      onUploadStart?.(file);

      // 進捗をシミュレート
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        updateFileProgress(file.id, i);
      }

      // 完了
      updateFileStatus(file.id, 'completed');
      onUploadComplete?.(file);
    } catch (error) {
      updateFileStatus(file.id, 'error');
      onUploadError?.(file, 'アップロードに失敗しました');
    }
  };

  /**
   * ファイルステータス更新
   */
  const updateFileStatus = (fileId: string, status: UploadedFile['status']) => {
    setUploadedFiles(prev =>
      prev.map(f => (f.id === fileId ? { ...f, status } : f))
    );
  };

  /**
   * ファイル進捗更新
   */
  const updateFileProgress = (fileId: string, progress: number) => {
    setUploadedFiles(prev =>
      prev.map(f => (f.id === fileId ? { ...f, progress } : f))
    );
  };

  /**
   * ファイル削除
   */
  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  /**
   * ファイルサイズフォーマット
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * ファイルアイコン取得
   */
  const getFileIcon = (type: string): string => {
    if (type.includes('image')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    if (type.includes('word')) return '📝';
    if (type.includes('video')) return '🎬';
    if (type.includes('audio')) return '🎵';
    return '📎';
  };

  /**
   * ステータスカラー取得
   */
  const getStatusColor = (status: UploadedFile['status']): string => {
    switch (status) {
      case 'uploading':
        return '#06b6d4';
      case 'completed':
        return '#10b981';
      case 'error':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  /**
   * ステータステキスト取得
   */
  const getStatusText = (status: UploadedFile['status']): string => {
    switch (status) {
      case 'uploading':
        return 'アップロード中...';
      case 'completed':
        return 'アップロード完了';
      case 'error':
        return 'エラー';
      default:
        return '待機中';
    }
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* ファイル選択ボタン */}
      <TouchableOpacity
        style={styles.selectButton}
        onPress={handleSelectFile}
        disabled={isSelecting}
        activeOpacity={0.7}
      >
        <Text style={styles.selectButtonIcon}>📁</Text>
        <Text style={styles.selectButtonText}>
          {isSelecting ? 'ファイル選択中...' : 'ファイルを選択'}
        </Text>
      </TouchableOpacity>

      {/* アップロード済みファイル一覧 */}
      {uploadedFiles.length > 0 && (
        <View style={styles.fileListContainer}>
          <Text style={styles.fileListTitle}>
            アップロード済みファイル ({uploadedFiles.length})
          </Text>
          <FlatList
            data={uploadedFiles}
            renderItem={({ item }) => (
              <View style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileIcon}>{getFileIcon(item.type)}</Text>
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.fileSize}>
                      {formatFileSize(item.size)}
                    </Text>
                  </View>
                </View>

                {/* 進捗バー */}
                {item.status === 'uploading' && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBackground}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${item.progress}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>{item.progress}%</Text>
                  </View>
                )}

                {/* ステータス表示 */}
                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(item.status) },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {getStatusText(item.status)}
                  </Text>
                </View>

                {/* 削除ボタン */}
                {item.status !== 'uploading' && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveFile(item.id)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* ファイルサイズ制限表示 */}
      <Text style={styles.sizeLimit}>
        最大ファイルサイズ: {formatFileSize(maxFileSize)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    gap: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
    borderColor: '#06b6d4',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  selectButtonIcon: {
    fontSize: 24,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0284c7',
  },
  fileListContainer: {
    gap: 8,
  },
  fileListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  fileItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    gap: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileIcon: {
    fontSize: 24,
  },
  fileDetails: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  fileSize: {
    fontSize: 12,
    color: '#9ca3af',
  },
  progressContainer: {
    gap: 4,
  },
  progressBackground: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#06b6d4',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#06b6d4',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  removeButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  removeButtonText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  sizeLimit: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default FileUploadUI;
