import { useState } from 'react';
import { Brain, Plus, Trash2, Edit2, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';

interface Memory {
  id: string;
  memoryType: 'preference' | 'context' | 'learning' | 'relationship' | 'skill';
  key: string;
  value: string;
  importance: number;
  accessCount: number;
  lastAccessed: Date;
}

export function MemoryPanel() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [newMemory, setNewMemory] = useState({
    memoryType: 'context' as const,
    key: '',
    value: '',
    importance: 5,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredMemories = memories.filter(m => {
    const matchesSearch = m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.value.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterType || m.memoryType === filterType;
    return matchesSearch && matchesType;
  });

  const handleAddMemory = () => {
    if (!newMemory.key.trim() || !newMemory.value.trim()) return;

    const memory: Memory = {
      id: `mem_${Date.now()}`,
      memoryType: newMemory.memoryType,
      key: newMemory.key,
      value: newMemory.value,
      importance: newMemory.importance,
      accessCount: 1,
      lastAccessed: new Date(),
    };

    setMemories([...memories, memory]);
    setNewMemory({
      memoryType: 'context',
      key: '',
      value: '',
      importance: 5,
    });
  };

  const handleDeleteMemory = (id: string) => {
    setMemories(memories.filter(m => m.id !== id));
  };

  const handleUpdateImportance = (id: string, importance: number) => {
    setMemories(memories.map(m =>
      m.id === id ? { ...m, importance } : m
    ));
  };

  const memoryTypeColors: Record<string, string> = {
    preference: 'bg-indigo-100 text-indigo-800',
    context: 'bg-blue-100 text-blue-800',
    learning: 'bg-green-100 text-green-800',
    relationship: 'bg-pink-100 text-pink-800',
    skill: 'bg-yellow-100 text-yellow-800',
  };

  const memoryTypeLabels: Record<string, string> = {
    preference: '好み',
    context: 'コンテキスト',
    learning: '学習',
    relationship: '関係',
    skill: 'スキル',
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-6 h-6" />
          <h2 className="text-2xl font-bold">長期記憶</h2>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="記憶を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  新規記憶
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新しい記憶を追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">記憶タイプ</label>
                    <Select
                      value={newMemory.memoryType}
                      onValueChange={(value: any) =>
                        setNewMemory({
                          ...newMemory,
                          memoryType: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(memoryTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">キー</label>
                    <Input
                      placeholder="例：好きな言語"
                      value={newMemory.key}
                      onChange={(e) =>
                        setNewMemory({ ...newMemory, key: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">値</label>
                    <Textarea
                      placeholder="例：Python、JavaScript、TypeScript"
                      value={newMemory.value}
                      onChange={(e) =>
                        setNewMemory({ ...newMemory, value: e.target.value })
                      }
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">重要度: {newMemory.importance}</label>
                    <Slider
                      value={[newMemory.importance]}
                      onValueChange={([value]) =>
                        setNewMemory({ ...newMemory, importance: value })
                      }
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>

                  <Button onClick={handleAddMemory} className="w-full">
                    記憶を保存
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex gap-2 flex-wrap">
            {Object.entries(memoryTypeLabels).map(([key, label]) => (
              <Button
                key={key}
                variant={filterType === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(filterType === key ? null : key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredMemories.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            <p>記憶がありません</p>
          </Card>
        ) : (
          filteredMemories.map(memory => (
            <Card key={memory.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{memory.key}</h3>
                    <Badge className={memoryTypeColors[memory.memoryType]}>
                      {memoryTypeLabels[memory.memoryType]}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{memory.value}</p>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <TrendingUp className="w-3 h-3" />
                      重要度: {memory.importance}/10
                    </div>
                    <div className="text-xs text-gray-500">
                      アクセス: {memory.accessCount}回
                    </div>
                    <div className="text-xs text-gray-500">
                      最終: {new Date(memory.lastAccessed).toLocaleDateString('ja-JP')}
                    </div>
                  </div>

                  <div className="mt-2">
                    <Slider
                      value={[memory.importance]}
                      onValueChange={([value]) =>
                        handleUpdateImportance(memory.id, value)
                      }
                      min={1}
                      max={10}
                      step={1}
                      className="w-24"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMemory(memory.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
