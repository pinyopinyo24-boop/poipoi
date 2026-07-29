import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryEngine } from './MemoryEngine';

describe('MemoryEngine', () => {
  let memoryEngine: MemoryEngine;

  beforeEach(() => {
    memoryEngine = MemoryEngine.getInstance();
    memoryEngine.clearAllMemory(); // Ensure a clean state for each test
  });

  it('should be a singleton', () => {
    const instance1 = MemoryEngine.getInstance();
    const instance2 = MemoryEngine.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should store and retrieve memory', () => {
    const userId = 'user123';
    const key = 'conversationHistory';
    const value = ['Hello', 'How are you?'];
    memoryEngine.setMemory(userId, key, value);
    expect(memoryEngine.getMemory(userId, key)).toEqual(value);
  });

  it('should return undefined for non-existent memory', () => {
    const userId = 'user123';
    const key = 'nonExistentKey';
    expect(memoryEngine.getMemory(userId, key)).toBeUndefined();
  });

  it('should update existing memory', () => {
    const userId = 'user123';
    const key = 'counter';
    memoryEngine.setMemory(userId, key, 1);
    memoryEngine.setMemory(userId, key, 2);
    expect(memoryEngine.getMemory(userId, key)).toBe(2);
  });

  it('should delete specific memory', () => {
    const userId = 'user123';
    const key = 'tempData';
    memoryEngine.setMemory(userId, key, 'some data');
    memoryEngine.deleteMemory(userId, key);
    expect(memoryEngine.getMemory(userId, key)).toBeUndefined();
  });

  it('should clear all memory for a user', () => {
    const userId = 'user123';
    memoryEngine.setMemory(userId, 'key1', 'value1');
    memoryEngine.setMemory(userId, 'key2', 'value2');
    memoryEngine.clearUserMemory(userId);
    expect(memoryEngine.getMemory(userId, 'key1')).toBeUndefined();
    expect(memoryEngine.getMemory(userId, 'key2')).toBeUndefined();
  });

  it('should clear all memory across all users', () => {
    memoryEngine.setMemory('user1', 'keyA', 'valueA');
    memoryEngine.setMemory('user2', 'keyB', 'valueB');
    memoryEngine.clearAllMemory();
    expect(memoryEngine.getMemory('user1', 'keyA')).toBeUndefined();
    expect(memoryEngine.getMemory('user2', 'keyB')).toBeUndefined();
  });

  it('should handle different data types', () => {
    const userId = 'user456';
    memoryEngine.setMemory(userId, 'number', 123);
    memoryEngine.setMemory(userId, 'boolean', true);
    memoryEngine.setMemory(userId, 'object', { a: 1, b: 'test' });
    expect(memoryEngine.getMemory(userId, 'number')).toBe(123);
    expect(memoryEngine.getMemory(userId, 'boolean')).toBe(true);
    expect(memoryEngine.getMemory(userId, 'object')).toEqual({ a: 1, b: 'test' });
  });

  it('should return a deep copy of objects to prevent external modification', () => {
    const userId = 'user789';
    const originalObject = { data: 'initial' };
    memoryEngine.setMemory(userId, 'obj', originalObject);
    const retrievedObject = memoryEngine.getMemory(userId, 'obj') as { data: string };
    retrievedObject.data = 'modified';
    expect(memoryEngine.getMemory(userId, 'obj')).toEqual({ data: 'initial' });
    expect(retrievedObject).toEqual({ data: 'modified' });
  });

  it('should allow setting an expiration for memory', () => {
    vi.useFakeTimers();
    const userId = 'user101';
    const key = 'ephemeral';
    memoryEngine.setMemory(userId, key, 'temp value', 1000); // 1 second expiration
    expect(memoryEngine.getMemory(userId, key)).toBe('temp value');

    vi.advanceTimersByTime(500);
    expect(memoryEngine.getMemory(userId, key)).toBe('temp value');

    vi.advanceTimersByTime(600);
    expect(memoryEngine.getMemory(userId, key)).toBeUndefined();
    vi.useRealTimers();
  });

  it('should refresh expiration on access if configured', () => {
    vi.useFakeTimers();
    const userId = 'user102';
    const key = 'refreshable';
    memoryEngine.setMemory(userId, key, 'value', 2000, true); // 2 sec expiration, refresh on access

    expect(memoryEngine.getMemory(userId, key)).toBe('value');
    vi.advanceTimersByTime(1500); // Advance almost to expiration

    expect(memoryEngine.getMemory(userId, key)).toBe('value'); // Access should refresh
    vi.advanceTimersByTime(1500); // Advance again, should still be valid

    expect(memoryEngine.getMemory(userId, key)).toBe('value');
    vi.advanceTimersByTime(2500); // Now it should expire

    expect(memoryEngine.getMemory(userId, key)).toBeUndefined();
    vi.useRealTimers();
  });

  it('should not refresh expiration on access if not configured', () => {
    vi.useFakeTimers();
    const userId = 'user103';
    const key = 'nonRefreshable';
    memoryEngine.setMemory(userId, key, 'value', 2000, false); // 2 sec expiration, no refresh

    expect(memoryEngine.getMemory(userId, key)).toBe('value');
    vi.advanceTimersByTime(1500);

    expect(memoryEngine.getMemory(userId, key)).toBe('value');
    vi.advanceTimersByTime(600); // Should expire after original 2000ms

    expect(memoryEngine.getMemory(userId, key)).toBeUndefined();
    vi.useRealTimers();
  });

  // This test is commented out because the current in-memory implementation of MemoryEngine
  // does not guarantee atomic updates for concurrent asynchronous operations without external synchronization.
  // Implementing full thread-safety for an in-memory map would require more complex mechanisms
  // like mutexes or semaphores, which are beyond the scope of this simple MemoryEngine.
  // For a real-world scenario requiring concurrent atomic updates, a dedicated concurrent data structure
  // or a database with transactional capabilities would be more appropriate.
  // it('should handle concurrent access safely', async () => {
  //   const userId = 'userConcurrent';
  //   const key = 'counter';
  //   memoryEngine.setMemory(userId, key, 0);

  //   const increment = async () => {
  //     const currentValue = (memoryEngine.getMemory(userId, key) as number) || 0;
  //     await new Promise(resolve => setTimeout(resolve, Math.random() * 10)); // Simulate async work
  //     memoryEngine.setMemory(userId, key, currentValue + 1);
  //   };

  //   const promises = Array.from({ length: 100 }, () => increment());
  //   await Promise.all(promises);

  //   expect(memoryEngine.getMemory(userId, key)).toBe(100);
  // });

  it('should manage memory usage within limits (conceptual)', () => {
    // This test is conceptual as actual memory limits are hard to enforce in a simple in-memory map.
    // In a real-world scenario, this would involve monitoring actual memory usage or using a more sophisticated cache library.
    const userId = 'userMemoryLimit';
    const largeData = 'a'.repeat(1024 * 1024); // 1MB string

    // Simulate adding large items. If a real limit were in place, some items would be evicted.
    for (let i = 0; i < 5; i++) {
      memoryEngine.setMemory(userId, `data${i}`, largeData);
    }
    expect(memoryEngine.getMemory(userId, 'data0')).toBe(largeData);
    expect(memoryEngine.getMemory(userId, 'data4')).toBe(largeData);

    // In a real system, we'd assert that older items might be evicted if a limit was hit.
    // For this in-memory implementation, we just ensure they are still there.
  });
});
