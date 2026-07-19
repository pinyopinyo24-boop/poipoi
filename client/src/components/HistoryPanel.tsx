import { useState } from 'react';
import { Trash2, Star, Search, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface HistoryItem {
  id: string;
  type: 'text' | 'code' | 'document' | 'analysis' | 'image' | 'audio';
  title: string;
  content: string;
  createdAt: Date;
  isStarred: boolean;
  tags?: string[];
}

export function HistoryPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [starredOnly, setStarredOnly] = useState(false);

  const filteredItems = historyItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterType || item.type === filterType;
    const matchesStarred = !starredOnly || item.isStarred;
    return matchesSearch && matchesType && matchesStarred;
  });

  const handleDelete = (id: string) => {
    setHistoryItems(items => items.filter(item => item.id !== id));
  };

  const handleToggleStar = (id: string) => {
    setHistoryItems(items =>
      items.map(item =>
        item.id === id ? { ...item, isStarred: !item.isStarred } : item
      )
    );
  };

  const typeColors: Record<string, string> = {
    text: 'bg-blue-100 text-blue-800',
    code: 'bg-green-100 text-green-800',
    document: 'bg-purple-100 text-purple-800',
    analysis: 'bg-orange-100 text-orange-800',
    image: 'bg-pink-100 text-pink-800',
    audio: 'bg-cyan-100 text-cyan-800',
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">履歴</h2>
        
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="履歴を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              variant={starredOnly ? 'default' : 'outline'}
              onClick={() => setStarredOnly(!starredOnly)}
              className="gap-2"
            >
              <Star className="w-4 h-4" />
              お気に入り
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {['text', 'code', 'document', 'analysis', 'image', 'audio'].map(type => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(filterType === type ? null : type)}
              >
                <Filter className="w-3 h-3 mr-1" />
                {type}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            <p>履歴がありません</p>
          </Card>
        ) : (
          filteredItems.map(item => (
            <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold truncate">{item.title}</h3>
                    <Badge className={typeColors[item.type]}>
                      {item.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleString('ja-JP')}
                    </span>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex gap-1">
                        {item.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStar(item.id)}
                  >
                    <Star
                      className="w-4 h-4"
                      fill={item.isStarred ? 'currentColor' : 'none'}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
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
