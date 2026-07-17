/**
 * Inventory Engine - PoiPoi AI Core
 * 在庫管理エンジン
 */

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  unit: string;
  lastUpdated: string;
}

class InventoryEngine {
  private items: Map<string, InventoryItem> = new Map();
  private history: { itemId: string; quantity: number; action: string; timestamp: string }[] = [];

  addItem(name: string, quantity: number, minStock: number, maxStock: number, unit: string = "個"): InventoryItem {
    const item: InventoryItem = {
      id: `inv_${Date.now()}`,
      name,
      quantity,
      minStock,
      maxStock,
      unit,
      lastUpdated: new Date().toISOString(),
    };

    this.items.set(item.id, item);
    this.recordHistory(item.id, quantity, "add");
    console.log(`📦 在庫追加: ${name}`);

    return item;
  }

  updateQuantity(id: string, quantity: number): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    const oldQuantity = item.quantity;
    item.quantity = quantity;
    item.lastUpdated = new Date().toISOString();

    this.recordHistory(id, quantity - oldQuantity, "update");
    return true;
  }

  getItem(id: string): InventoryItem | undefined {
    return this.items.get(id);
  }

  getAllItems(): InventoryItem[] {
    return Array.from(this.items.values());
  }

  getLowStockItems(): InventoryItem[] {
    return this.getAllItems().filter((item) => item.quantity <= item.minStock);
  }

  getHighStockItems(): InventoryItem[] {
    return this.getAllItems().filter((item) => item.quantity >= item.maxStock);
  }

  private recordHistory(itemId: string, quantity: number, action: string): void {
    this.history.push({
      itemId,
      quantity,
      action,
      timestamp: new Date().toISOString(),
    });
  }

  getHistory(itemId?: string) {
    if (!itemId) return [...this.history];
    return this.history.filter((h) => h.itemId === itemId);
  }

  getStats() {
    const items = this.getAllItems();
    const totalValue = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      totalItems: items.length,
      totalQuantity: totalValue,
      lowStockItems: this.getLowStockItems().length,
      highStockItems: this.getHighStockItems().length,
      historyCount: this.history.length,
    };
  }
}

export default InventoryEngine;
