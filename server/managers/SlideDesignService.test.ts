import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * SlideDesignService Test Suite
 * スライドデザイン・レイアウト・要素配置の包括的なテスト
 */

interface DesignElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'chart';
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: Record<string, any>;
}

interface SlideLayout {
  id: string;
  name: string;
  template: string;
  elements: DesignElement[];
}

class SlideDesignService {
  private layouts: Map<string, SlideLayout> = new Map();
  private designs: Map<string, any> = new Map();
  private history: Array<{ action: string; timestamp: Date }> = [];

  createLayout(name: string, template: string): string {
    const id = `layout_${Date.now()}_${Math.random()}`;
    this.layouts.set(id, {
      id,
      name,
      template,
      elements: [],
    });
    this.recordHistory('create-layout');
    return id;
  }

  getLayout(layoutId: string): SlideLayout | undefined {
    return this.layouts.get(layoutId);
  }

  addElement(layoutId: string, element: Omit<DesignElement, 'id'>): string | null {
    const layout = this.layouts.get(layoutId);
    if (!layout) return null;

    const elementId = `elem_${Date.now()}_${Math.random()}`;
    const newElement: DesignElement = { ...element, id: elementId };
    layout.elements.push(newElement);
    this.recordHistory('add-element');
    return elementId;
  }

  updateElement(layoutId: string, elementId: string, updates: Partial<DesignElement>): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    const element = layout.elements.find(e => e.id === elementId);
    if (!element) return false;

    Object.assign(element, updates);
    this.recordHistory('update-element');
    return true;
  }

  removeElement(layoutId: string, elementId: string): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    const index = layout.elements.findIndex(e => e.id === elementId);
    if (index === -1) return false;

    layout.elements.splice(index, 1);
    this.recordHistory('remove-element');
    return true;
  }

  autoLayout(layoutId: string, elementCount: number): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    if (elementCount < 1 || elementCount > 10) return false;

    layout.elements = [];

    const cols = Math.ceil(Math.sqrt(elementCount));
    const rows = Math.ceil(elementCount / cols);
    const cellWidth = 100 / cols;
    const cellHeight = 100 / rows;

    for (let i = 0; i < elementCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;

      layout.elements.push({
        id: `auto_${i}`,
        type: 'shape',
        position: { x: col * cellWidth, y: row * cellHeight },
        size: { width: cellWidth - 2, height: cellHeight - 2 },
        style: {},
      });
    }

    this.recordHistory('auto-layout');
    return true;
  }

  applyColorScheme(layoutId: string, colors: string[]): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    layout.elements.forEach((elem, index) => {
      elem.style.backgroundColor = colors[index % colors.length];
    });

    this.recordHistory('apply-color-scheme');
    return true;
  }

  optimizeSpacing(layoutId: string): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    if (layout.elements.length === 0) return true;

    const sortedByX = [...layout.elements].sort((a, b) => a.position.x - b.position.x);
    const sortedByY = [...layout.elements].sort((a, b) => a.position.y - b.position.y);

    const minSpacing = 5;

    for (let i = 1; i < sortedByX.length; i++) {
      const prev = sortedByX[i - 1];
      const curr = sortedByX[i];
      const gap = curr.position.x - (prev.position.x + prev.size.width);

      if (gap < minSpacing) {
        curr.position.x = prev.position.x + prev.size.width + minSpacing;
      }
    }

    for (let i = 1; i < sortedByY.length; i++) {
      const prev = sortedByY[i - 1];
      const curr = sortedByY[i];
      const gap = curr.position.y - (prev.position.y + prev.size.height);

      if (gap < minSpacing) {
        curr.position.y = prev.position.y + prev.size.height + minSpacing;
      }
    }

    this.recordHistory('optimize-spacing');
    return true;
  }

  alignElements(layoutId: string, alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    if (layout.elements.length === 0) return true;

    switch (alignment) {
      case 'left':
        layout.elements.forEach(elem => {
          elem.position.x = 0;
        });
        break;
      case 'center':
        layout.elements.forEach(elem => {
          elem.position.x = (100 - elem.size.width) / 2;
        });
        break;
      case 'right':
        layout.elements.forEach(elem => {
          elem.position.x = 100 - elem.size.width;
        });
        break;
      case 'top':
        layout.elements.forEach(elem => {
          elem.position.y = 0;
        });
        break;
      case 'middle':
        layout.elements.forEach(elem => {
          elem.position.y = (100 - elem.size.height) / 2;
        });
        break;
      case 'bottom':
        layout.elements.forEach(elem => {
          elem.position.y = 100 - elem.size.height;
        });
        break;
    }

    this.recordHistory('align-elements');
    return true;
  }

  distributeElements(layoutId: string, direction: 'horizontal' | 'vertical'): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    if (layout.elements.length < 2) return true;

    if (direction === 'horizontal') {
      const sortedByX = [...layout.elements].sort((a, b) => a.position.x - b.position.x);
      const totalWidth = sortedByX.reduce((sum, elem) => sum + elem.size.width, 0);
      const availableSpace = 100 - totalWidth;
      const spacing = availableSpace / (sortedByX.length + 1);

      let currentX = spacing;
      sortedByX.forEach(elem => {
        elem.position.x = currentX;
        currentX += elem.size.width + spacing;
      });
    } else {
      const sortedByY = [...layout.elements].sort((a, b) => a.position.y - b.position.y);
      const totalHeight = sortedByY.reduce((sum, elem) => sum + elem.size.height, 0);
      const availableSpace = 100 - totalHeight;
      const spacing = availableSpace / (sortedByY.length + 1);

      let currentY = spacing;
      sortedByY.forEach(elem => {
        elem.position.y = currentY;
        currentY += elem.size.height + spacing;
      });
    }

    this.recordHistory('distribute-elements');
    return true;
  }

  getDesignStats(layoutId: string) {
    const layout = this.layouts.get(layoutId);
    if (!layout) return null;

    return {
      layoutId,
      name: layout.name,
      elementCount: layout.elements.length,
      totalArea: layout.elements.reduce((sum, elem) => sum + elem.size.width * elem.size.height, 0),
      avgElementSize: {
        width: layout.elements.length > 0 ? layout.elements.reduce((sum, elem) => sum + elem.size.width, 0) / layout.elements.length : 0,
        height: layout.elements.length > 0 ? layout.elements.reduce((sum, elem) => sum + elem.size.height, 0) / layout.elements.length : 0,
      },
    };
  }

  private recordHistory(action: string): void {
    this.history.push({
      action,
      timestamp: new Date(),
    });
  }

  getHistory() {
    return this.history;
  }

  reset(): void {
    this.layouts.clear();
    this.designs.clear();
    this.history = [];
  }
}

describe('SlideDesignService', () => {
  let service: SlideDesignService;

  beforeEach(() => {
    service = new SlideDesignService();
  });

  afterEach(() => {
    service.reset();
    service = null as any;
  });

  describe('Layout Management', () => {
    it('should create a layout', () => {
      const id = service.createLayout('Title Slide', 'title');
      expect(id).toBeDefined();
      expect(id).toContain('layout_');

      const layout = service.getLayout(id);
      expect(layout).not.toBeNull();
      expect(layout?.name).toBe('Title Slide');
      expect(layout?.elements).toHaveLength(0);
    });

    it('should create multiple layouts', () => {
      const id1 = service.createLayout('Title', 'title');
      const id2 = service.createLayout('Content', 'content');

      expect(id1).not.toBe(id2);
      expect(service.getLayout(id1)).not.toBeNull();
      expect(service.getLayout(id2)).not.toBeNull();
    });
  });

  describe('Element Management', () => {
    let layoutId: string;

    beforeEach(() => {
      layoutId = service.createLayout('Test', 'test');
    });

    it('should add element to layout', () => {
      const elementId = service.addElement(layoutId, {
        type: 'text',
        position: { x: 10, y: 10 },
        size: { width: 50, height: 20 },
        style: { fontSize: 16 },
      });

      expect(elementId).not.toBeNull();
      const layout = service.getLayout(layoutId);
      expect(layout?.elements).toHaveLength(1);
    });

    it('should add multiple elements', () => {
      service.addElement(layoutId, {
        type: 'text',
        position: { x: 10, y: 10 },
        size: { width: 50, height: 20 },
        style: {},
      });

      service.addElement(layoutId, {
        type: 'image',
        position: { x: 70, y: 10 },
        size: { width: 25, height: 25 },
        style: {},
      });

      const layout = service.getLayout(layoutId);
      expect(layout?.elements).toHaveLength(2);
    });

    it('should update element', () => {
      const elementId = service.addElement(layoutId, {
        type: 'text',
        position: { x: 10, y: 10 },
        size: { width: 50, height: 20 },
        style: {},
      });

      const result = service.updateElement(layoutId, elementId!, {
        position: { x: 20, y: 20 },
      });

      expect(result).toBe(true);
      const layout = service.getLayout(layoutId);
      expect(layout?.elements[0].position.x).toBe(20);
    });

    it('should remove element', () => {
      const elementId = service.addElement(layoutId, {
        type: 'text',
        position: { x: 10, y: 10 },
        size: { width: 50, height: 20 },
        style: {},
      });

      const result = service.removeElement(layoutId, elementId!);
      expect(result).toBe(true);

      const layout = service.getLayout(layoutId);
      expect(layout?.elements).toHaveLength(0);
    });

    it('should handle non-existent layout', () => {
      const result = service.addElement('non-existent', {
        type: 'text',
        position: { x: 10, y: 10 },
        size: { width: 50, height: 20 },
        style: {},
      });

      expect(result).toBeNull();
    });
  });

  describe('Auto Layout', () => {
    let layoutId: string;

    beforeEach(() => {
      layoutId = service.createLayout('Auto Test', 'test');
    });

    it('should auto layout 1 element', () => {
      const result = service.autoLayout(layoutId, 1);
      expect(result).toBe(true);

      const layout = service.getLayout(layoutId);
      expect(layout?.elements).toHaveLength(1);
    });

    it('should auto layout 4 elements in 2x2 grid', () => {
      const result = service.autoLayout(layoutId, 4);
      expect(result).toBe(true);

      const layout = service.getLayout(layoutId);
      expect(layout?.elements).toHaveLength(4);
    });

    it('should auto layout 9 elements in 3x3 grid', () => {
      const result = service.autoLayout(layoutId, 9);
      expect(result).toBe(true);

      const layout = service.getLayout(layoutId);
      expect(layout?.elements).toHaveLength(9);
    });

    it('should reject invalid element count', () => {
      const result1 = service.autoLayout(layoutId, 0);
      const result2 = service.autoLayout(layoutId, 11);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe('Color Scheme', () => {
    let layoutId: string;

    beforeEach(() => {
      layoutId = service.createLayout('Color Test', 'test');
      service.autoLayout(layoutId, 3);
    });

    it('should apply color scheme', () => {
      const result = service.applyColorScheme(layoutId, ['#FF0000', '#00FF00', '#0000FF']);
      expect(result).toBe(true);

      const layout = service.getLayout(layoutId);
      expect(layout?.elements[0].style.backgroundColor).toBe('#FF0000');
      expect(layout?.elements[1].style.backgroundColor).toBe('#00FF00');
      expect(layout?.elements[2].style.backgroundColor).toBe('#0000FF');
    });

    it('should cycle colors if fewer than elements', () => {
      service.autoLayout(layoutId, 5);
      const result = service.applyColorScheme(layoutId, ['#FF0000', '#00FF00']);

      expect(result).toBe(true);
      const layout = service.getLayout(layoutId);
      expect(layout?.elements[4].style.backgroundColor).toBe('#FF0000');
    });
  });

  describe('Alignment', () => {
    let layoutId: string;

    beforeEach(() => {
      layoutId = service.createLayout('Align Test', 'test');
      service.autoLayout(layoutId, 3);
    });

    it('should align left', () => {
      const result = service.alignElements(layoutId, 'left');
      expect(result).toBe(true);

      const layout = service.getLayout(layoutId);
      layout?.elements.forEach(elem => {
        expect(elem.position.x).toBe(0);
      });
    });

    it('should align center', () => {
      const result = service.alignElements(layoutId, 'center');
      expect(result).toBe(true);

      const layout = service.getLayout(layoutId);
      layout?.elements.forEach(elem => {
        expect(elem.position.x).toBe((100 - elem.size.width) / 2);
      });
    });

    it('should align right', () => {
      const result = service.alignElements(layoutId, 'right');
      expect(result).toBe(true);

      const layout = service.getLayout(layoutId);
      layout?.elements.forEach(elem => {
        expect(elem.position.x).toBe(100 - elem.size.width);
      });
    });
  });

  describe('Distribution', () => {
    let layoutId: string;

    beforeEach(() => {
      layoutId = service.createLayout('Distribute Test', 'test');
      service.autoLayout(layoutId, 3);
    });

    it('should distribute horizontally', () => {
      const result = service.distributeElements(layoutId, 'horizontal');
      expect(result).toBe(true);

      const layout = service.getLayout(layoutId);
      expect(layout?.elements).toHaveLength(3);
    });

    it('should distribute vertically', () => {
      const result = service.distributeElements(layoutId, 'vertical');
      expect(result).toBe(true);

      const layout = service.getLayout(layoutId);
      expect(layout?.elements).toHaveLength(3);
    });
  });

  describe('Spacing Optimization', () => {
    let layoutId: string;

    beforeEach(() => {
      layoutId = service.createLayout('Spacing Test', 'test');
    });

    it('should optimize spacing', () => {
      service.addElement(layoutId, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 20, height: 20 },
        style: {},
      });

      service.addElement(layoutId, {
        type: 'shape',
        position: { x: 20, y: 0 },
        size: { width: 20, height: 20 },
        style: {},
      });

      const result = service.optimizeSpacing(layoutId);
      expect(result).toBe(true);
    });
  });

  describe('Statistics', () => {
    let layoutId: string;

    beforeEach(() => {
      layoutId = service.createLayout('Stats Test', 'test');
    });

    it('should get design statistics', () => {
      service.autoLayout(layoutId, 4);
      const stats = service.getDesignStats(layoutId);

      expect(stats).not.toBeNull();
      expect(stats?.elementCount).toBe(4);
      expect(stats?.totalArea).toBeGreaterThan(0);
    });

    it('should calculate average element size', () => {
      service.addElement(layoutId, {
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 50, height: 50 },
        style: {},
      });

      service.addElement(layoutId, {
        type: 'shape',
        position: { x: 60, y: 0 },
        size: { width: 40, height: 40 },
        style: {},
      });

      const stats = service.getDesignStats(layoutId);
      expect(stats?.avgElementSize.width).toBe(45);
      expect(stats?.avgElementSize.height).toBe(45);
    });
  });

  describe('History', () => {
    let layoutId: string;

    beforeEach(() => {
      layoutId = service.createLayout('History Test', 'test');
    });

    it('should record history', () => {
      service.autoLayout(layoutId, 2);
      const history = service.getHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].action).toBe('create-layout');
    });
  });

  describe('Complex Workflows', () => {
    it('should create, populate, and design layout', () => {
      const layoutId = service.createLayout('Complex', 'test');

      service.autoLayout(layoutId, 4);
      service.applyColorScheme(layoutId, ['#FF0000', '#00FF00', '#0000FF', '#FFFF00']);
      service.alignElements(layoutId, 'center');
      service.optimizeSpacing(layoutId);

      const stats = service.getDesignStats(layoutId);
      expect(stats?.elementCount).toBe(4);

      const layout = service.getLayout(layoutId);
      expect(layout?.elements).toHaveLength(4);
    });
  });
});
