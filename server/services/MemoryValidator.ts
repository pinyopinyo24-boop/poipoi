import type { MemoryItem } from '../core/MemoryIntelligenceAIManager';

export interface ValidationResult {
  memoryId: string;
  isValid: boolean;
  error?: string;
  warnings: string[];
}

export class MemoryValidator {
  /**
   * メモリをバリデーション
   */
  async validateMemories(memories: MemoryItem[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const memory of memories) {
      const result = await this.validateMemory(memory);
      results.push(result);
    }

    return results;
  }

  /**
   * 単一メモリをバリデーション
   */
  async validateMemory(memory: MemoryItem): Promise<ValidationResult> {
    const warnings: string[] = [];
    let isValid = true;

    // 必須フィールドチェック
    if (!memory.id || memory.id.trim() === '') {
      return {
        memoryId: memory.id || 'unknown',
        isValid: false,
        error: 'Memory ID is required',
        warnings,
      };
    }

    if (!memory.userId || memory.userId.trim() === '') {
      return {
        memoryId: memory.id,
        isValid: false,
        error: 'User ID is required',
        warnings,
      };
    }

    if (!memory.content || memory.content.trim() === '') {
      return {
        memoryId: memory.id,
        isValid: false,
        error: 'Memory content is required',
        warnings,
      };
    }

    // 値の範囲チェック
    if (memory.importance < 0 || memory.importance > 1) {
      warnings.push('Importance score should be between 0 and 1');
    }

    if (memory.accessCount < 0) {
      warnings.push('Access count cannot be negative');
    }

    // タイムスタンプチェック
    if (memory.timestamp > Date.now()) {
      warnings.push('Timestamp is in the future');
    }

    if (memory.lastAccessed > Date.now()) {
      warnings.push('Last accessed time is in the future');
    }

    if (memory.lastAccessed < memory.timestamp) {
      warnings.push('Last accessed time is before creation time');
    }

    // コンテンツチェック
    if (memory.content.length > 1000000) {
      warnings.push('Memory content is very large (>1MB)');
    }

    // 圧縮状態チェック
    if (memory.compressed && !memory.compressedData) {
      warnings.push('Memory is marked as compressed but no compressed data found');
    }

    if (!memory.compressed && memory.compressedData) {
      warnings.push('Memory is not marked as compressed but compressed data exists');
    }

    // メタデータチェック
    if (!memory.metadata || Object.keys(memory.metadata).length === 0) {
      warnings.push('Memory has no metadata');
    }

    return {
      memoryId: memory.id,
      isValid: isValid && warnings.length === 0,
      warnings,
    };
  }

  /**
   * 整合性をチェック
   */
  async checkConsistency(memories: MemoryItem[]): Promise<{
    isConsistent: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const idSet = new Set<string>();

    for (const memory of memories) {
      // 重複IDチェック
      if (idSet.has(memory.id)) {
        issues.push(`Duplicate memory ID: ${memory.id}`);
      }
      idSet.add(memory.id);

      // ユーザーIDの一貫性チェック
      if (!memory.userId) {
        issues.push(`Memory ${memory.id} has no user ID`);
      }
    }

    return {
      isConsistent: issues.length === 0,
      issues,
    };
  }

  /**
   * データ型をバリデーション
   */
  async validateDataTypes(memory: MemoryItem): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (typeof memory.id !== 'string') {
      errors.push('Memory ID must be a string');
    }

    if (typeof memory.userId !== 'string') {
      errors.push('User ID must be a string');
    }

    if (typeof memory.content !== 'string') {
      errors.push('Memory content must be a string');
    }

    if (typeof memory.timestamp !== 'number') {
      errors.push('Timestamp must be a number');
    }

    if (typeof memory.importance !== 'number') {
      errors.push('Importance must be a number');
    }

    if (typeof memory.category !== 'string' && memory.category !== undefined) {
      errors.push('Category must be a string or undefined');
    }

    if (typeof memory.accessCount !== 'number') {
      errors.push('Access count must be a number');
    }

    if (typeof memory.lastAccessed !== 'number') {
      errors.push('Last accessed must be a number');
    }

    if (typeof memory.compressed !== 'boolean') {
      errors.push('Compressed must be a boolean');
    }

    if (memory.compressedData !== undefined && typeof memory.compressedData !== 'string') {
      errors.push('Compressed data must be a string or undefined');
    }

    if (typeof memory.metadata !== 'object' || memory.metadata === null) {
      errors.push('Metadata must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * ビジネスロジックをバリデーション
   */
  async validateBusinessLogic(memory: MemoryItem): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // 重要度と最後のアクセス時刻の関係
    if (memory.importance > 0.8 && Date.now() - memory.lastAccessed > 30 * 24 * 60 * 60 * 1000) {
      issues.push('High importance memory has not been accessed in 30 days');
    }

    // アクセス回数と重要度の関係
    if (memory.accessCount === 0 && memory.importance > 0.7) {
      issues.push('High importance memory has never been accessed');
    }

    // 圧縮状態と古さの関係
    if (!memory.compressed && Date.now() - memory.timestamp > 365 * 24 * 60 * 60 * 1000) {
      issues.push('Old memory should be compressed');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * 完全なバリデーション
   */
  async validateComplete(memory: MemoryItem): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const typeValidation = await this.validateDataTypes(memory);
    const singleValidation = await this.validateMemory(memory);
    const businessValidation = await this.validateBusinessLogic(memory);

    const errors = [
      ...typeValidation.errors,
      ...(singleValidation.error ? [singleValidation.error] : []),
      ...businessValidation.issues,
    ];

    const warnings = singleValidation.warnings;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * バリデーションレポートを生成
   */
  async generateValidationReport(memories: MemoryItem[]): Promise<{
    totalMemories: number;
    validMemories: number;
    invalidMemories: number;
    totalWarnings: number;
    issues: ValidationResult[];
  }> {
    const results = await this.validateMemories(memories);

    const validMemories = results.filter(r => r.isValid).length;
    const invalidMemories = results.filter(r => !r.isValid).length;
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const issues = results.filter(r => !r.isValid || r.warnings.length > 0);

    return {
      totalMemories: memories.length,
      validMemories,
      invalidMemories,
      totalWarnings,
      issues,
    };
  }
}
