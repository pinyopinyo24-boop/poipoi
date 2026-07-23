import { describe, it, expect, beforeEach } from 'vitest';
import { DataIntegrationLayer, DataSource, TransformedData } from './DataIntegrationLayer';

describe('DataIntegrationLayer', () => {
  let layer: DataIntegrationLayer;

  beforeEach(() => {
    layer = new DataIntegrationLayer();
  });

  describe('DataSource Management', () => {
    it('should register a data source', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      const id = layer.registerDataSource(source);
      expect(id).toBe('excel-1');
    });

    it('should get a registered data source', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);
      const retrieved = layer.getDataSource('excel-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Production Data');
    });

    it('should get all data sources', () => {
      const source1: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      const source2: DataSource = {
        id: 'csv-1',
        type: 'csv',
        name: 'Quality Data',
        path: '/data/quality.csv',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source1);
      layer.registerDataSource(source2);

      const sources = layer.getAllDataSources();
      expect(sources.length).toBe(2);
    });

    it('should remove a data source', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);
      const removed = layer.removeDataSource('excel-1');
      expect(removed).toBe(true);
      expect(layer.getDataSource('excel-1')).toBeUndefined();
    });

    it('should generate ID if not provided', () => {
      const source: DataSource = {
        id: '',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      const id = layer.registerDataSource(source);
      expect(id).toMatch(/source-\d+/);
    });
  });

  describe('Excel Data Import', () => {
    it('should import Excel data', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const data = [
        { production: 100, date: '2024-01-01' },
        { production: 120, date: '2024-01-02' },
      ];

      const imported = layer.importExcelData('excel-1', data);
      expect(imported.length).toBe(2);
      expect(imported[0].dataType).toBe('production');
    });

    it('should throw error for invalid source', () => {
      const data = [{ production: 100 }];
      expect(() => layer.importExcelData('invalid', data)).toThrow();
    });

    it('should update last sync time', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);
      const before = layer.getDataSource('excel-1')?.lastSync || 0;

      layer.importExcelData('excel-1', [{ production: 100 }]);

      const after = layer.getDataSource('excel-1')?.lastSync || 0;
      expect(after).toBeGreaterThan(before);
    });
  });

  describe('CSV Data Import', () => {
    it('should import CSV data', () => {
      const source: DataSource = {
        id: 'csv-1',
        type: 'csv',
        name: 'Quality Data',
        path: '/data/quality.csv',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const csv = 'quality,date\n95,2024-01-01\n97,2024-01-02';
      const imported = layer.importCSVData('csv-1', csv);
      expect(imported.length).toBe(2);
      expect(imported[0].dataType).toBe('quality');
    });

    it('should handle CSV with multiple columns', () => {
      const source: DataSource = {
        id: 'csv-1',
        type: 'csv',
        name: 'Quality Data',
        path: '/data/quality.csv',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const csv = 'quality,defects,date\n95,5,2024-01-01\n97,3,2024-01-02';
      const imported = layer.importCSVData('csv-1', csv);
      expect(imported.length).toBe(2);
      expect(imported[0].content.defects).toBe('5');
    });
  });

  describe('PDF Data Import', () => {
    it('should import PDF data', () => {
      const source: DataSource = {
        id: 'pdf-1',
        type: 'pdf',
        name: 'Production Report',
        path: '/data/report.pdf',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const pdfContent = 'Production Report Content...';
      const imported = layer.importPDFData('pdf-1', pdfContent);
      expect(imported.length).toBeGreaterThanOrEqual(1);
      if (imported.length > 0) {
        expect(['production', 'quality', 'cost', 'inventory', 'maintenance']).toContain(imported[0].dataType);
      }
    });
  });

  describe('Data Type Detection', () => {
    it('should detect production data type', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const data = [{ production: 100, 製造: 50 }];
      const imported = layer.importExcelData('excel-1', data);
      expect(imported[0].dataType).toBe('production');
    });

    it('should detect quality data type', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Quality Data',
        path: '/data/quality.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const data = [{ quality: 95, 品質: 98 }];
      const imported = layer.importExcelData('excel-1', data);
      expect(imported[0].dataType).toBe('quality');
    });

    it('should detect cost data type', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Cost Data',
        path: '/data/cost.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const data = [{ cost: 10000, コスト: 12000 }];
      const imported = layer.importExcelData('excel-1', data);
      expect(imported[0].dataType).toBe('cost');
    });

    it('should detect inventory data type', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Inventory Data',
        path: '/data/inventory.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const data = [{ inventory: 500, 在庫: 600 }];
      const imported = layer.importExcelData('excel-1', data);
      expect(imported[0].dataType).toBe('inventory');
    });

    it('should detect maintenance data type', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Maintenance Data',
        path: '/data/maintenance.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const data = [{ maintenance: 'scheduled', 保守: 'completed' }];
      const imported = layer.importExcelData('excel-1', data);
      expect(imported[0].dataType).toBe('maintenance');
    });
  });

  describe('Data Transformation', () => {
    it('should transform data', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const data = [{ production: 100 }];
      const imported = layer.importExcelData('excel-1', data);
      const dataId = imported[0].id;

      const transformed = layer.transformData(dataId, (d) => ({
        ...d,
        production: d.production * 2,
      }));

      expect(transformed).toBeDefined();
      expect(transformed?.content.production).toBe(200);
      expect(transformed?.version).toBe(2);
    });

    it('should return undefined for non-existent data', () => {
      const transformed = layer.transformData('non-existent', (d) => d);
      expect(transformed).toBeUndefined();
    });
  });

  describe('Data Retrieval', () => {
    it('should get transformed data by ID', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const data = [{ production: 100 }];
      const imported = layer.importExcelData('excel-1', data);
      const dataId = imported[0].id;

      const retrieved = layer.getTransformedData(dataId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(dataId);
    });

    it('should get all transformed data', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const data = [
        { production: 100 },
        { production: 120 },
        { production: 150 },
      ];
      layer.importExcelData('excel-1', data);

      const all = layer.getAllTransformedData();
      expect(all.length).toBe(3);
    });

    it('should get transformed data by type', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const data = [
        { production: 100 },
        { quality: 95 },
        { production: 120 },
      ];
      layer.importExcelData('excel-1', data);

      const production = layer.getTransformedDataByType('production');
      expect(production.length).toBe(2);
    });
  });

  describe('Data Validation', () => {
    it('should validate valid data', () => {
      const result = layer.validateData({ production: 100 });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject null data', () => {
      const result = layer.validateData(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject empty data', () => {
      const result = layer.validateData({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Batch Processing', () => {
    it('should process data in batches', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const data = Array.from({ length: 250 }, (_, i) => ({
        production: 100 + i,
      }));
      layer.importExcelData('excel-1', data);

      const allData = layer.getAllTransformedData();
      const results = layer.batchProcessData(allData, (d) => d.content.production);

      expect(results.length).toBe(250);
    });

    it('should respect batch size', () => {
      const layer2 = new DataIntegrationLayer({ batchSize: 50 });

      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer2.registerDataSource(source);

      const data = Array.from({ length: 100 }, (_, i) => ({
        production: 100 + i,
      }));
      layer2.importExcelData('excel-1', data);

      const allData = layer2.getAllTransformedData();
      const results = layer2.batchProcessData(allData, (d) => d.content.production);

      expect(results.length).toBe(100);
    });
  });

  describe('Sync History', () => {
    it('should record sync history', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);
      layer.importExcelData('excel-1', [{ production: 100 }]);

      const history = layer.getSyncHistory('excel-1');
      expect(history.length).toBeGreaterThanOrEqual(1);
      if (history.length > 0) {
        expect(history[history.length - 1].status).toBe('success');
      }
    });

    it('should get all sync history', () => {
      const source1: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      const source2: DataSource = {
        id: 'csv-1',
        type: 'csv',
        name: 'Quality Data',
        path: '/data/quality.csv',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source1);
      layer.registerDataSource(source2);

      layer.importExcelData('excel-1', [{ production: 100 }]);
      layer.importCSVData('csv-1', 'quality\n95');

      const history = layer.getSyncHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Data Statistics', () => {
    it('should get data statistics', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const data = [
        { production: 100 },
        { production: 120 },
        { quality: 95 },
      ];
      layer.importExcelData('excel-1', data);

      const stats = layer.getDataStatistics();
      expect(stats.totalSources).toBe(1);
      expect(stats.totalData).toBe(3);
      expect(stats.dataByType.production).toBe(2);
      expect(stats.dataByType.quality).toBe(1);
    });
  });

  describe('Configuration', () => {
    it('should get configuration', () => {
      const config = layer.getConfig();
      expect(config.autoSync).toBe(true);
      expect(config.syncInterval).toBe(3600000);
    });

    it('should update configuration', () => {
      layer.updateConfig({ autoSync: false, syncInterval: 7200000 });
      const config = layer.getConfig();
      expect(config.autoSync).toBe(false);
      expect(config.syncInterval).toBe(7200000);
    });
  });

  describe('Data Export', () => {
    it('should export data as JSON', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);
      layer.importExcelData('excel-1', [{ production: 100 }]);

      const exported = layer.exportData('json');
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });

    it('should export data as CSV', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);
      layer.importExcelData('excel-1', [{ production: 100 }]);

      const exported = layer.exportData('csv');
      expect(exported).toContain('id');
      expect(exported).toContain('sourceId');
    });
  });

  describe('Data Cleanup', () => {
    it('should clear all data', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);
      layer.importExcelData('excel-1', [{ production: 100 }]);

      layer.clearData();

      const all = layer.getAllTransformedData();
      expect(all.length).toBe(0);
    });

    it('should clear all data sources', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);
      layer.clearDataSources();

      const sources = layer.getAllDataSources();
      expect(sources.length).toBe(0);
    });

    it('should remove transformed data', () => {
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      const data = [{ production: 100 }];
      const imported = layer.importExcelData('excel-1', data);
      const dataId = imported[0].id;

      const removed = layer.removeTransformedData(dataId);
      expect(removed).toBe(true);
      expect(layer.getTransformedData(dataId)).toBeUndefined();
    });
  });

  describe('Integration', () => {
    it('should handle complete workflow', () => {
      // Register source
      const source: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source);

      // Import data
      const data = [
        { production: 100, date: '2024-01-01' },
        { production: 120, date: '2024-01-02' },
      ];

      const imported = layer.importExcelData('excel-1', data);
      expect(imported.length).toBe(2);

      // Get statistics
      const stats = layer.getDataStatistics();
      expect(stats.totalData).toBe(2);

      // Export data
      const exported = layer.exportData('json');
      const parsed = JSON.parse(exported);
      expect(parsed.length).toBe(2);
    });

    it('should handle multiple data sources', () => {
      const source1: DataSource = {
        id: 'excel-1',
        type: 'excel',
        name: 'Production Data',
        path: '/data/production.xlsx',
        lastSync: 0,
        status: 'active',
      };

      const source2: DataSource = {
        id: 'csv-1',
        type: 'csv',
        name: 'Quality Data',
        path: '/data/quality.csv',
        lastSync: 0,
        status: 'active',
      };

      layer.registerDataSource(source1);
      layer.registerDataSource(source2);

      layer.importExcelData('excel-1', [{ production: 100 }]);
      layer.importCSVData('csv-1', 'quality\n95');

      const stats = layer.getDataStatistics();
      expect(stats.totalSources).toBe(2);
      expect(stats.totalData).toBe(2);
    });
  });
});
