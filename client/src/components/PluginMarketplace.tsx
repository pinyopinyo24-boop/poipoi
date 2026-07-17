import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star, Download, Settings } from 'lucide-react';

interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  rating: number;
  downloads: number;
  tags: string[];
  installed?: boolean;
}

interface PluginMarketplaceProps {
  onInstall?: (pluginId: string) => void;
  onUninstall?: (pluginId: string) => void;
}

export const PluginMarketplace: React.FC<PluginMarketplaceProps> = ({ onInstall, onUninstall }) => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [installedPlugins, setInstalledPlugins] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Mock plugins data
    const mockPlugins: Plugin[] = [
      {
        id: 'advanced-nlp',
        name: 'Advanced NLP',
        version: '1.0.0',
        author: 'PoiPoi Team',
        description: '高度な自然言語処理機能を追加します',
        rating: 4.8,
        downloads: 1250,
        tags: ['NLP', 'テキスト処理', 'AI'],
      },
      {
        id: 'image-enhancement',
        name: 'Image Enhancement',
        version: '2.1.0',
        author: 'Creative Labs',
        description: '画像強化と処理ツールを提供します',
        rating: 4.6,
        downloads: 890,
        tags: ['画像', 'ビジョン', '処理'],
      },
      {
        id: 'data-visualization',
        name: 'Data Visualization',
        version: '1.5.0',
        author: 'Analytics Pro',
        description: 'データ可視化とチャート生成機能',
        rating: 4.7,
        downloads: 1100,
        tags: ['データ', 'ビジュアライゼーション', '分析'],
      },
      {
        id: 'code-optimizer',
        name: 'Code Optimizer',
        version: '3.0.0',
        author: 'Dev Tools',
        description: 'コード最適化と性能改善ツール',
        rating: 4.5,
        downloads: 750,
        tags: ['コード', '最適化', '開発'],
      },
    ];

    setPlugins(mockPlugins);
  }, []);

  const filteredPlugins = plugins.filter((plugin) => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || plugin.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(new Set(plugins.flatMap(p => p.tags)));

  const handleInstall = (pluginId: string) => {
    setInstalledPlugins(prev => new Set(Array.from(prev).concat([pluginId])));
    onInstall?.(pluginId);
  };

  const handleUninstall = (pluginId: string) => {
    setInstalledPlugins(prev => {
      const newSet = new Set(prev);
      newSet.delete(pluginId);
      return newSet;
    });
    onUninstall?.(pluginId);
  };

  return (
    <div className="w-full space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">プラグインマーケットプレイス</h1>
        <p className="text-gray-600">ポイポイの機能を拡張するプラグインを検索・インストール</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <Input
          placeholder="プラグインを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Tag Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedTag === null ? 'default' : 'outline'}
          onClick={() => setSelectedTag(null)}
          size="sm"
        >
          すべて
        </Button>
        {Array.from(allTags).map((tag: string) => (
          <Button
            key={tag}
            variant={selectedTag === tag ? 'default' : 'outline'}
            onClick={() => setSelectedTag(tag)}
            size="sm"
          >
            {tag}
          </Button>
        ))}
      </div>

      {/* Plugin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from(filteredPlugins).map((plugin: Plugin) => (
          <Card key={plugin.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{plugin.name}</CardTitle>
                  <p className="text-sm text-gray-600">{plugin.author}</p>
                </div>
                {installedPlugins.has(plugin.id) && (
                  <Badge variant="secondary">インストール済み</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">{plugin.description}</p>

              {/* Rating and Downloads */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{plugin.rating}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Download className="w-4 h-4" />
                  <span>{plugin.downloads}</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {plugin.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Version */}
              <p className="text-xs text-gray-500">v{plugin.version}</p>

              {/* Action Button */}
              <div className="flex gap-2">
                {installedPlugins.has(plugin.id) ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleUninstall(plugin.id)}
                    >
                      アンインストール
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => handleInstall(plugin.id)}
                  >
                    インストール
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPlugins.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">プラグインが見つかりません</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>マーケットプレイス統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">総プラグイン数</p>
              <p className="text-2xl font-bold">{plugins.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">インストール済み</p>
              <p className="text-2xl font-bold">{installedPlugins.size}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">平均評価</p>
              <p className="text-2xl font-bold">
                {(plugins.reduce((sum, p) => sum + p.rating, 0) / plugins.length).toFixed(1)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PluginMarketplace;
