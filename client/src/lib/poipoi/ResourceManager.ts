/**
 * ResourceManager - PoiPoi System Core
 * リソース管理
 */

export interface Resource {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  lastModified: string;
}

class ResourceManager {
  private resources: Map<string, Resource> = new Map();
  private maxSize: number = 1000000000; // 1GB
  private currentSize: number = 0;

  addResource(name: string, type: string, size: number): Resource {
    if (this.currentSize + size > this.maxSize) {
      throw new Error("リソースサイズが上限を超えています");
    }

    const resource: Resource = {
      id: `res_${Date.now()}`,
      name,
      type,
      size,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    this.resources.set(resource.id, resource);
    this.currentSize += size;
    console.log(`📦 リソース追加: ${name} (${size} bytes)`);

    return resource;
  }

  getResource(id: string): Resource | undefined {
    return this.resources.get(id);
  }

  getAllResources(): Resource[] {
    return Array.from(this.resources.values());
  }

  removeResource(id: string): boolean {
    const resource = this.resources.get(id);
    if (!resource) return false;

    this.currentSize -= resource.size;
    this.resources.delete(id);
    console.log(`🗑️ リソース削除: ${resource.name}`);

    return true;
  }

  getUsagePercent(): number {
    return (this.currentSize / this.maxSize) * 100;
  }

  getStats() {
    return {
      totalResources: this.resources.size,
      totalSize: this.currentSize,
      maxSize: this.maxSize,
      usagePercent: this.getUsagePercent().toFixed(2),
      availableSize: this.maxSize - this.currentSize,
    };
  }
}

export default ResourceManager;
