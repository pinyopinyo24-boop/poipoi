import { describe, it, expect, beforeEach } from 'vitest';
import { OperationsDashboardService } from './OperationsDashboardService';

describe('OperationsDashboardService', () => {
  let service: OperationsDashboardService;

  beforeEach(() => {
    service = new OperationsDashboardService();
  });

  describe('createWidget', () => {
    it('should create a widget', () => {
      const widget = service.createWidget('metric', 'Uptime', { value: 99.9 }, 60000);

      expect(widget).toBeDefined();
      expect(widget.type).toBe('metric');
      expect(widget.widgetId).toMatch(/^WID-/);
    });
  });

  describe('getWidget', () => {
    it('should retrieve a widget', () => {
      const created = service.createWidget('chart', 'Response Time', { data: [] }, 60000);
      const retrieved = service.getWidget(created.widgetId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Response Time');
    });
  });

  describe('getWidgetsByType', () => {
    it('should retrieve widgets by type', () => {
      service.createWidget('metric', 'Widget1', {}, 60000);
      service.createWidget('metric', 'Widget2', {}, 60000);
      service.createWidget('chart', 'Widget3', {}, 60000);

      const metrics = service.getWidgetsByType('metric');
      expect(metrics.length).toBe(2);
    });
  });

  describe('updateWidget', () => {
    it('should update a widget', () => {
      const widget = service.createWidget('metric', 'Title', { value: 100 }, 60000);
      const result = service.updateWidget(widget.widgetId, { value: 200 });

      expect(result).toBe(true);

      const updated = service.getWidget(widget.widgetId);
      expect(updated?.data.value).toBe(200);
    });
  });

  describe('generateReport', () => {
    it('should generate a report', () => {
      const report = service.generateReport(
        'daily',
        10000,
        99.5,
        150,
        50,
        85,
        ['Issue 1'],
        ['Recommendation 1']
      );

      expect(report).toBeDefined();
      expect(report.period).toBe('daily');
      expect(report.reportId).toMatch(/^REP-/);
    });
  });

  describe('getReport', () => {
    it('should retrieve a report', () => {
      const created = service.generateReport('daily', 10000, 99.5, 150, 50, 85, [], []);
      const retrieved = service.getReport(created.reportId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.summary.totalRequests).toBe(10000);
    });
  });

  describe('getReportsByPeriod', () => {
    it('should retrieve reports by period', () => {
      service.generateReport('daily', 10000, 99.5, 150, 50, 85, [], []);
      service.generateReport('daily', 10000, 99.5, 150, 50, 85, [], []);
      service.generateReport('weekly', 70000, 99.6, 140, 30, 86, [], []);

      const daily = service.getReportsByPeriod('daily');
      expect(daily.length).toBe(2);
    });
  });

  describe('createKPI', () => {
    it('should create a KPI', () => {
      const kpi = service.createKPI('Uptime', 99.9, 99.95, 99.0);

      expect(kpi).toBeDefined();
      expect(kpi.name).toBe('Uptime');
      expect(kpi.kpiId).toMatch(/^KPI-/);
    });
  });

  describe('getKPI', () => {
    it('should retrieve a KPI', () => {
      const created = service.createKPI('Response Time', 150, 100, 200);
      const retrieved = service.getKPI(created.kpiId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.currentValue).toBe(150);
    });
  });

  describe('updateKPI', () => {
    it('should update a KPI', () => {
      const kpi = service.createKPI('Uptime', 99.9, 99.95, 99.0);
      const result = service.updateKPI(kpi.kpiId, 99.95);

      expect(result).toBe(true);

      const updated = service.getKPI(kpi.kpiId);
      expect(updated?.currentValue).toBe(99.95);
      expect(updated?.trend).toBe('up');
    });

    it('should set status to critical when below threshold', () => {
      const kpi = service.createKPI('Uptime', 99.9, 99.95, 99.0);
      service.updateKPI(kpi.kpiId, 98.5);

      const updated = service.getKPI(kpi.kpiId);
      expect(updated?.status).toBe('critical');
    });
  });

  describe('getAllWidgets', () => {
    it('should retrieve all widgets', () => {
      service.createWidget('metric', 'W1', {}, 60000);
      service.createWidget('chart', 'W2', {}, 60000);

      const all = service.getAllWidgets();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllReports', () => {
    it('should retrieve all reports', () => {
      service.generateReport('daily', 10000, 99.5, 150, 50, 85, [], []);
      service.generateReport('weekly', 70000, 99.6, 140, 30, 86, [], []);

      const all = service.getAllReports();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllKPIs', () => {
    it('should retrieve all KPIs', () => {
      service.createKPI('KPI1', 100, 110, 90);
      service.createKPI('KPI2', 200, 210, 190);

      const all = service.getAllKPIs();
      expect(all.length).toBe(2);
    });
  });

  describe('getLatestReport', () => {
    it('should retrieve latest report for period', () => {
      service.generateReport('daily', 10000, 99.5, 150, 50, 85, [], []);
      const latest = service.generateReport('daily', 10000, 99.5, 150, 50, 85, [], []);

      const retrieved = service.getLatestReport('daily');
      expect(retrieved?.timestamp).toBeGreaterThanOrEqual(latest.timestamp);
    });
  });

  describe('getDashboardStats', () => {
    it('should calculate dashboard statistics', () => {
      service.createWidget('metric', 'W1', {}, 60000);
      service.generateReport('daily', 10000, 99.5, 150, 50, 85, [], []);
      service.createKPI('KPI1', 100, 110, 90);

      const stats = service.getDashboardStats();

      expect(stats.totalWidgets).toBe(1);
      expect(stats.totalReports).toBe(1);
      expect(stats.totalKPIs).toBe(1);
    });
  });

  describe('deleteWidget', () => {
    it('should delete a widget', () => {
      const widget = service.createWidget('metric', 'Title', {}, 60000);
      const result = service.deleteWidget(widget.widgetId);

      expect(result).toBe(true);
      expect(service.getWidget(widget.widgetId)).toBeUndefined();
    });
  });

  describe('deleteReport', () => {
    it('should delete a report', () => {
      const report = service.generateReport('daily', 10000, 99.5, 150, 50, 85, [], []);
      const result = service.deleteReport(report.reportId);

      expect(result).toBe(true);
      expect(service.getReport(report.reportId)).toBeUndefined();
    });
  });

  describe('deleteKPI', () => {
    it('should delete a KPI', () => {
      const kpi = service.createKPI('KPI', 100, 110, 90);
      const result = service.deleteKPI(kpi.kpiId);

      expect(result).toBe(true);
      expect(service.getKPI(kpi.kpiId)).toBeUndefined();
    });
  });
});
