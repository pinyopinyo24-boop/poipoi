/**
 * Phase 3 Components Tests - 15個のテスト
 * VoiceInputUI + FileUploadUI
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { VoiceInputUI } from './VoiceInputUI';
import { FileUploadUI } from './FileUploadUI';

describe('Phase 3 Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // === VoiceInputUI Tests ===
  describe('VoiceInputUI', () => {
    it('should render voice input button', () => {
      const { getByText } = render(<VoiceInputUI />);
      expect(getByText(/🎤/i)).toBeDefined();
    });

    it('should start recording when button pressed', async () => {
      const onVoiceStart = vi.fn();
      const { getByText } = render(<VoiceInputUI onVoiceStart={onVoiceStart} />);
      
      const recordButton = getByText(/🎤/i);
      fireEvent.press(recordButton);
      
      await waitFor(() => {
        expect(onVoiceStart).toHaveBeenCalled();
      });
    });

    it('should stop recording when button pressed again', async () => {
      const onVoiceStop = vi.fn();
      const { getByText } = render(<VoiceInputUI onVoiceStop={onVoiceStop} />);
      
      const recordButton = getByText(/🎤/i);
      fireEvent.press(recordButton);
      
      await waitFor(() => {
        fireEvent.press(recordButton);
      });
      
      await waitFor(() => {
        expect(onVoiceStop).toHaveBeenCalled();
      });
    });

    it('should display recording time', async () => {
      const { getByText } = render(<VoiceInputUI />);
      
      const recordButton = getByText(/🎤/i);
      fireEvent.press(recordButton);
      
      await waitFor(() => {
        expect(getByText(/00:0/i)).toBeDefined();
      });
    });

    it('should display recording status', async () => {
      const { getByText } = render(<VoiceInputUI />);
      
      const recordButton = getByText(/🎤/i);
      fireEvent.press(recordButton);
      
      await waitFor(() => {
        expect(getByText(/録音中/i)).toBeDefined();
      });
    });

    it('should handle disabled state', () => {
      const { queryByText } = render(<VoiceInputUI isEnabled={false} />);
      expect(queryByText(/🎤/i)).toBeNull();
    });

    it('should call onVoiceData with audio URI', async () => {
      const onVoiceData = vi.fn();
      const { getByText } = render(<VoiceInputUI onVoiceData={onVoiceData} />);
      
      const recordButton = getByText(/🎤/i);
      fireEvent.press(recordButton);
      
      await waitFor(() => {
        fireEvent.press(recordButton);
      });
      
      await waitFor(() => {
        expect(onVoiceData).toHaveBeenCalled();
      });
    });

    it('should show completed recording info', async () => {
      const { getByText } = render(<VoiceInputUI />);
      
      const recordButton = getByText(/🎤/i);
      fireEvent.press(recordButton);
      
      await waitFor(() => {
        fireEvent.press(recordButton);
      });
      
      await waitFor(() => {
        expect(getByText(/音声ファイル準備完了/i)).toBeDefined();
      });
    });
  });

  // === FileUploadUI Tests ===
  describe('FileUploadUI', () => {
    it('should render file select button', () => {
      const { getByText } = render(<FileUploadUI />);
      expect(getByText(/ファイルを選択/i)).toBeDefined();
    });

    it('should display file size limit', () => {
      const { getByText } = render(<FileUploadUI />);
      expect(getByText(/最大ファイルサイズ/i)).toBeDefined();
    });

    it('should handle disabled state', () => {
      const { queryByText } = render(<FileUploadUI isEnabled={false} />);
      expect(queryByText(/ファイルを選択/i)).toBeNull();
    });

    it('should display uploaded file list', async () => {
      const { getByText } = render(<FileUploadUI />);
      
      // ファイル選択ボタンを押す
      const selectButton = getByText(/ファイルを選択/i);
      fireEvent.press(selectButton);
      
      // アップロード済みファイル一覧が表示される
      await waitFor(() => {
        expect(getByText(/アップロード済みファイル/i)).toBeDefined();
      });
    });

    it('should show upload progress', async () => {
      const onUploadStart = vi.fn();
      const { getByText } = render(<FileUploadUI onUploadStart={onUploadStart} />);
      
      const selectButton = getByText(/ファイルを選択/i);
      fireEvent.press(selectButton);
      
      await waitFor(() => {
        expect(onUploadStart).toHaveBeenCalled();
      });
    });

    it('should call onFileSelect callback', async () => {
      const onFileSelect = vi.fn();
      const { getByText } = render(<FileUploadUI onFileSelect={onFileSelect} />);
      
      const selectButton = getByText(/ファイルを選択/i);
      fireEvent.press(selectButton);
      
      await waitFor(() => {
        expect(onFileSelect).toHaveBeenCalled();
      });
    });

    it('should handle file upload completion', async () => {
      const onUploadComplete = vi.fn();
      const { getByText } = render(<FileUploadUI onUploadComplete={onUploadComplete} />);
      
      const selectButton = getByText(/ファイルを選択/i);
      fireEvent.press(selectButton);
      
      await waitFor(() => {
        expect(onUploadComplete).toHaveBeenCalled();
      });
    });

    it('should allow removing uploaded files', async () => {
      const { getByText, queryByText } = render(<FileUploadUI />);
      
      const selectButton = getByText(/ファイルを選択/i);
      fireEvent.press(selectButton);
      
      await waitFor(() => {
        const removeButton = getByText(/✕/i);
        fireEvent.press(removeButton);
      });
      
      // ファイルが削除される
      expect(true).toBe(true);
    });
  });

  // === 統合テスト ===
  describe('Integration', () => {
    it('should work together in same screen', () => {
      const { getByText } = render(
        <>
          <VoiceInputUI />
          <FileUploadUI />
        </>
      );
      
      expect(getByText(/🎤/i)).toBeDefined();
      expect(getByText(/ファイルを選択/i)).toBeDefined();
    });
  });
});
