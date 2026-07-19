/**
 * Dashboard Engine - PoiPoi AI Core
 * ダッシュボード管理エンジン
 */

export interface DashboardWidget {
  id: string;
  title: string;
  type: string;
  data: any;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

class DashboardEngine {
  private widgets: Map<string, DashboardWidget> = new Map();
  private layouts: Map<string, DashboardWidget[]> = new Map();

  addWidget(widget: Omit<DashboardWidget, "id">): DashboardWidget {
    const fullWidget: DashboardWidget = {
      ...widget,
      id: `widget_${Date.now()}`,
    };

    this.widgets.set(fullWidget.id, fullWidget);
    console.log(`📊 ウィジェット追加: ${widget.title}`);

    return fullWidget;
  }

  getWidget(id: string): DashboardWidget | undefined {
    return this.widgets.get(id);
  }

  getAllWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  updateWidget(id: string, updates: Partial<DashboardWidget>): boolean {
    const widget = this.widgets.get(id);
    if (!widget) return false;

    Object.assign(widget, updates);
    return true;
  }

  removeWidget(id: string): boolean {
    return this.widgets.delete(id);
  }

  saveLayout(name: string): void {
    this.layouts.set(name, this.getAllWidgets());
    console.log(`💾 レイアウト保存: ${name}`);
  }

  loadLayout(name: string): boolean {
    const layout = this.layouts.get(name);
    if (!layout) return false;

    this.widgets.clear();
    layout.forEach((widget) => {
      this.widgets.set(widget.id, widget);
    });

    console.log(`📂 レイアウト読み込み: ${name}`);
    return true;
  }

  getStats() {
    return {
      totalWidgets: this.widgets.size,
      totalLayouts: this.layouts.size,
      layouts: Array.from(this.layouts.keys()),
    };
  }
}

export default DashboardEngine;
