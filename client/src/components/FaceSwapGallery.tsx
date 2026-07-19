import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Trash2, Share2, Search, Calendar } from "lucide-react";

interface GalleryItem {
  id: string;
  sourceFileName: string;
  targetFileName: string;
  resultImage: string;
  createdAt: Date;
  processingTime: number;
  quality: "low" | "medium" | "high";
}

interface FaceSwapGalleryProps {
  items: GalleryItem[];
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
}

export function FaceSwapGallery({
  items,
  onDelete,
  onShare,
}: FaceSwapGalleryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterQuality, setFilterQuality] = useState<"all" | "low" | "medium" | "high">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  const filteredItems = items
    .filter((item) => {
      const matchesSearch =
        item.sourceFileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.targetFileName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesQuality =
        filterQuality === "all" || item.quality === filterQuality;

      return matchesSearch && matchesQuality;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-2xl font-bold">ギャラリー</h2>
          <p className="text-gray-600 mt-2">
            処理済みの顔入れ替え結果を表示します
          </p>
        </div>

        <Card className="p-12 text-center">
          <p className="text-gray-500">
            まだ処理結果がありません。顔入れ替え処理を実行してください。
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-bold">ギャラリー</h2>
        <p className="text-gray-600 mt-2">
          {filteredItems.length} 件の処理結果
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="ファイル名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter and Sort */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">品質</label>
              <select
                value={filterQuality}
                onChange={(e) =>
                  setFilterQuality(
                    e.target.value as "all" | "low" | "medium" | "high"
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">すべて</option>
                <option value="low">低速（高速）</option>
                <option value="medium">標準</option>
                <option value="high">高品質</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">並び順</label>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "newest" | "oldest")
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="newest">新しい順</option>
                <option value="oldest">古い順</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition">
            {/* Image Preview */}
            <div className="relative bg-gray-100 aspect-square overflow-hidden">
              <img
                src={item.resultImage}
                alt={`${item.sourceFileName} → ${item.targetFileName}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2">
                <Badge variant="secondary">
                  {item.quality === "low"
                    ? "高速"
                    : item.quality === "medium"
                    ? "標準"
                    : "高品質"}
                </Badge>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="space-y-2 mb-4">
                <div className="text-xs text-gray-600 truncate">
                  <span className="font-medium">ソース:</span> {item.sourceFileName}
                </div>
                <div className="text-xs text-gray-600 truncate">
                  <span className="font-medium">ターゲット:</span>{" "}
                  {item.targetFileName}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {formatDate(item.createdAt)}
                </div>

                <div className="text-xs text-gray-500">
                  処理時間: {formatTime(item.processingTime)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = item.resultImage;
                    link.download = `faceswap-${item.id}.png`;
                    link.click();
                  }}
                >
                  <Download className="w-3 h-3 mr-1" />
                  保存
                </Button>

                {onShare && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onShare(item.id)}
                  >
                    <Share2 className="w-3 h-3" />
                  </Button>
                )}

                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500">
            検索条件に合致する結果がありません
          </p>
        </Card>
      )}
    </div>
  );
}
