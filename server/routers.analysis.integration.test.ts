/**
 * Analysis + Presentation Integration Test
 * Complete flow: Excel → Analysis → Presentation → Export
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExcelAnalysisManager } from './managers/ExcelAnalysisManager';
import { PDFAnalysisManager } from './managers/PDFAnalysisManager';
import { AnalysisEngine } from './managers/AnalysisEngine';
import { PresentationAIManager } from './managers/PresentationAIManager';
import { PresentationRepository } from './managers/PresentationRepository';

describe('Analysis + Presentation Integration', () => {
  let excelManager: ExcelAnalysisManager;
  let pdfManager: PDFAnalysisManager;
  let analysisEngine: AnalysisEngine;
  let presentationManager: PresentationAIManager;
  let repository: PresentationRepository;

  beforeEach(() => {
    excelManager = new ExcelAnalysisManager();
    pdfManager = new PDFAnalysisManager();
    analysisEngine = new AnalysisEngine();
    repository = new PresentationRepository();
    presentationManager = new PresentationAIManager(repository);
  });

  describe('Analysis Engine Processing', () => {
    it('should analyze Excel data and generate findings', () => {
      const mockExcelResult = {
        fileName: 'test.xlsx',
        sheets: [{ name: 'Data', data: [], headers: [] }],
        numericalData: {
          'Cost': { sum: 1000, average: 250, max: 500, min: 100, count: 4 },
          'Quantity': { sum: 200, average: 50, max: 100, min: 20, count: 4 },
        },
        statistics: { sheetCount: 1, totalRows: 5, totalColumns: 2 },
      };

      const analysis = analysisEngine.analyzeExcel(mockExcelResult);
      
      expect(analysis).toBeDefined();
      expect(analysis.summary).toBeDefined();
      expect(analysis.findings).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
      expect(analysis.metrics).toBeDefined();
    });

    it('should generate presentation data from analysis', () => {
      const mockExcelResult = {
        fileName: 'test.xlsx',
        sheets: [{ name: 'Data', data: [], headers: [] }],
        numericalData: {
          'Cost': { sum: 1000, average: 250, max: 500, min: 100, count: 4 },
        },
        statistics: { sheetCount: 1, totalRows: 5, totalColumns: 1 },
      };

      const analysis = analysisEngine.analyzeExcel(mockExcelResult);
      const presentationData = analysisEngine.generatePresentationData(analysis);
      
      expect(presentationData).toBeDefined();
      expect(presentationData.title).toBeDefined();
      expect(presentationData.slides).toBeDefined();
      expect(presentationData.slides.length).toBeGreaterThan(0);
    });

    it('should detect outliers and variability', () => {
      const mockExcelResult = {
        fileName: 'test.xlsx',
        sheets: [{ name: 'Data', data: [], headers: [] }],
        numericalData: {
          'Value': { sum: 1000, average: 100, max: 500, min: 50, count: 10 },
        },
        statistics: { sheetCount: 1, totalRows: 11, totalColumns: 1 },
      };

      const analysis = analysisEngine.analyzeExcel(mockExcelResult);
      
      expect(analysis.findings.length).toBeGreaterThan(0);
      const hasOutlier = analysis.findings.some(f => f.category === 'Outlier Detection');
      const hasVariability = analysis.findings.some(f => f.category === 'Variability');
      
      expect(hasOutlier || hasVariability).toBe(true);
    });
  });

  describe('Presentation Generation', () => {
    it('should create presentation from analysis', () => {
      const mockExcelResult = {
        fileName: 'test.xlsx',
        sheets: [{ name: 'Data', data: [], headers: [] }],
        numericalData: {
          'Cost': { sum: 1000, average: 250, max: 500, min: 100, count: 4 },
        },
        statistics: { sheetCount: 1, totalRows: 5, totalColumns: 1 },
      };

      const analysis = analysisEngine.analyzeExcel(mockExcelResult);
      const presentationData = analysisEngine.generatePresentationData(analysis);

      // Create presentation
      const presentation = presentationManager.createPresentation(
        presentationData.title,
        'Cost Analysis Report'
      );

      expect(presentation).toBeDefined();
      expect(presentation.id).toBeDefined();
      expect(presentation.title).toBe(presentationData.title);
    });

    it('should add slides from analysis', () => {
      const mockExcelResult = {
        fileName: 'test.xlsx',
        sheets: [{ name: 'Data', data: [], headers: [] }],
        numericalData: {
          'Cost': { sum: 1000, average: 250, max: 500, min: 100, count: 4 },
        },
        statistics: { sheetCount: 1, totalRows: 5, totalColumns: 1 },
      };

      const analysis = analysisEngine.analyzeExcel(mockExcelResult);
      const presentationData = analysisEngine.generatePresentationData(analysis);

      const presentation = presentationManager.createPresentation(
        presentationData.title,
        'Report'
      );

      // Add slides
      for (const slideData of presentationData.slides) {
        presentationManager.addSlide(presentation.id, {
          title: slideData.title,
          content: slideData.content,
          layout: slideData.layout || 'content',
          elements: [],
        });
      }

      const updated = presentationManager.getPresentation(presentation.id);
      expect(updated?.slides.length).toBeGreaterThan(0);
    });

    it('should update presentation theme', () => {
      const presentation = presentationManager.createPresentation(
        'Test Presentation',
        'Test'
      );

      const updated = presentationManager.updatePresentation(presentation.id, {
        theme: 'Corporate',
      });

      expect(updated).toBeDefined();
      expect(updated?.theme).toBe('Corporate');
    });

    it('should export presentation to JSON', () => {
      const presentation = presentationManager.createPresentation(
        'Test Presentation',
        'Test'
      );

      presentationManager.addSlide(presentation.id, {
        title: 'Slide 1',
        content: 'Content',
        layout: 'content',
        elements: [],
      });

      const exportResult = presentationManager.exportJSON(presentation.id);
      expect(exportResult).toBeDefined();
      expect(typeof exportResult).toBe('string');
      
      const parsed = JSON.parse(exportResult!);
      expect(parsed.id).toBe(presentation.id);
    });

    it('should export presentation to PowerPoint', () => {
      const presentation = presentationManager.createPresentation(
        'Test Presentation',
        'Test'
      );

      presentationManager.addSlide(presentation.id, {
        title: 'Slide 1',
        content: 'Content',
        layout: 'content',
        elements: [],
      });

      const buffer = presentationManager.exportPowerPoint(presentation.id);
      expect(buffer).toBeDefined();
      expect(buffer instanceof Buffer).toBe(true);
    });

    it('should export presentation to PDF', () => {
      const presentation = presentationManager.createPresentation(
        'Test Presentation',
        'Test'
      );

      presentationManager.addSlide(presentation.id, {
        title: 'Slide 1',
        content: 'Content',
        layout: 'content',
        elements: [],
      });

      const buffer = presentationManager.exportPDF(presentation.id);
      expect(buffer).toBeDefined();
      expect(buffer instanceof Buffer).toBe(true);
    });
  });

  describe('Complete Integration Flow', () => {
    it('should complete full flow: Excel → Analysis → Presentation → Export', () => {
      // Step 1: Excel Analysis
      const mockExcelData = {
        fileName: 'cost-data.xlsx',
        sheets: [
          {
            name: 'Cost Data',
            data: [
              ['Item', 'Cost', 'Quantity'],
              ['Part A', 100, 50],
              ['Part B', 200, 30],
            ],
            headers: ['Item', 'Cost', 'Quantity'],
          },
        ],
        numericalData: {
          'Cost': { sum: 300, average: 150, max: 200, min: 100, count: 2 },
          'Quantity': { sum: 80, average: 40, max: 50, min: 30, count: 2 },
        },
        statistics: { sheetCount: 1, totalRows: 3, totalColumns: 3 },
      };

      // Step 2: Analysis
      const analysis = analysisEngine.analyzeExcel(mockExcelData);
      expect(analysis.findings).toBeDefined();
      expect(analysis.recommendations).toBeDefined();

      // Step 3: Generate Presentation Data
      const presentationData = analysisEngine.generatePresentationData(analysis);
      expect(presentationData.slides.length).toBeGreaterThan(0);

      // Step 4: Create Presentation
      const presentation = presentationManager.createPresentation(
        presentationData.title,
        'Generated from Excel analysis'
      );
      expect(presentation.id).toBeDefined();

      // Step 5: Add Slides
      for (const slideData of presentationData.slides) {
        presentationManager.addSlide(presentation.id, {
          title: slideData.title,
          content: slideData.content,
          layout: slideData.layout || 'content',
          elements: [],
        });
      }

      // Step 6: Apply Theme
      presentationManager.updatePresentation(presentation.id, {
        theme: 'Corporate',
      });

      // Step 7: Export
      const jsonExport = presentationManager.exportJSON(presentation.id);
      expect(jsonExport).toBeDefined();

      // Verify final state
      const final = presentationManager.getPresentation(presentation.id);
      expect(final?.slides.length).toBeGreaterThan(0);
      expect(final?.theme).toBe('Corporate');
    });

    it('should handle multiple findings and recommendations', () => {
      // Create data with high variability
      const mockExcelData = {
        fileName: 'analysis.xlsx',
        sheets: [{ name: 'Data', data: [], headers: [] }],
        numericalData: {
          'Value1': { sum: 1000, average: 100, max: 500, min: 10, count: 10 },
          'Value2': { sum: 2000, average: 200, max: 800, min: 50, count: 10 },
        },
        statistics: { sheetCount: 1, totalRows: 11, totalColumns: 2 },
      };

      const analysis = analysisEngine.analyzeExcel(mockExcelData);
      expect(analysis.findings.length).toBeGreaterThan(0);
      expect(analysis.recommendations.length).toBeGreaterThan(0);

      const presentationData = analysisEngine.generatePresentationData(analysis);
      expect(presentationData.slides.length).toBeGreaterThan(2);
    });

    it('should handle error cases gracefully', () => {
      // Test with minimal data
      const emptyData = {
        fileName: 'empty.xlsx',
        sheets: [],
        numericalData: {},
        statistics: { sheetCount: 0, totalRows: 0, totalColumns: 0 },
      };

      const analysis = analysisEngine.analyzeExcel(emptyData);
      expect(analysis).toBeDefined();
      
      const presentationData = analysisEngine.generatePresentationData(analysis);
      expect(presentationData.slides).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid presentation ID', () => {
      const result = presentationManager.getPresentation('invalid-id');
      expect(result).toBeUndefined();
    });

    it('should handle slide addition to non-existent presentation', () => {
      const result = presentationManager.addSlide('invalid-id', {
        title: 'Test',
        content: 'Content',
        layout: 'content',
        elements: [],
      });
      expect(result).toBeNull();
    });

    it('should handle presentation deletion', () => {
      const presentation = presentationManager.createPresentation(
        'Test',
        'Test'
      );

      const deleted = presentationManager.deletePresentation(presentation.id);
      expect(deleted).toBe(true);

      const result = presentationManager.getPresentation(presentation.id);
      expect(result).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should process analysis within reasonable time', () => {
      const mockData = {
        fileName: 'perf-test.xlsx',
        sheets: [{ name: 'Data', data: [], headers: [] }],
        numericalData: {
          'Value': { sum: 5000, average: 500, max: 1000, min: 100, count: 10 },
        },
        statistics: { sheetCount: 1, totalRows: 11, totalColumns: 1 },
      };

      const start = Date.now();
      const analysis = analysisEngine.analyzeExcel(mockData);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(5000);
      expect(analysis).toBeDefined();
    });

    it('should generate presentation within reasonable time', () => {
      const presentation = presentationManager.createPresentation(
        'Performance Test',
        'Test'
      );

      const start = Date.now();
      for (let i = 0; i < 10; i++) {
        presentationManager.addSlide(presentation.id, {
          title: `Slide ${i}`,
          content: `Content ${i}`,
          layout: 'content',
          elements: [],
        });
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(2000);
    });

    it('should handle large number of presentations', () => {
      const presentations = [];
      for (let i = 0; i < 100; i++) {
        const pres = presentationManager.createPresentation(
          `Presentation ${i}`,
          `Description ${i}`
        );
        presentations.push(pres);
      }

      const all = presentationManager.getAllPresentations();
      expect(all.length).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency through operations', () => {
      const presentation = presentationManager.createPresentation(
        'Consistency Test',
        'Test'
      );

      const slide1 = presentationManager.addSlide(presentation.id, {
        title: 'Slide 1',
        content: 'Content 1',
        layout: 'content',
        elements: [],
      });

      const slide2 = presentationManager.addSlide(presentation.id, {
        title: 'Slide 2',
        content: 'Content 2',
        layout: 'content',
        elements: [],
      });

      const updated = presentationManager.getPresentation(presentation.id);
      expect(updated?.slides.length).toBe(2);
      expect(updated?.slides[0].title).toBe('Slide 1');
      expect(updated?.slides[1].title).toBe('Slide 2');
    });

    it('should update presentation metadata correctly', () => {
      const presentation = presentationManager.createPresentation(
        'Original Title',
        'Original Description'
      );

      const updated = presentationManager.updatePresentation(presentation.id, {
        title: 'Updated Title',
        description: 'Updated Description',
      });

      expect(updated?.title).toBe('Updated Title');
      expect(updated?.description).toBe('Updated Description');
      expect(updated?.id).toBe(presentation.id);
    });
  });
});
