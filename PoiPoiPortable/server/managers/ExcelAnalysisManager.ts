/**
 * ExcelAnalysisManager
 * Excel ファイルの解析と統計処理
 */

import * as XLSX from 'xlsx';

export interface ExcelSheet {
  name: string;
  data: any[][];
  headers: string[];
}

export interface ExcelAnalysisResult {
  fileName: string;
  sheets: ExcelSheet[];
  statistics: {
    sheetCount: number;
    totalRows: number;
    totalColumns: number;
  };
  numericalData: {
    [key: string]: {
      sum: number;
      average: number;
      max: number;
      min: number;
      count: number;
    };
  };
}

export class ExcelAnalysisManager {
  /**
   * Excel ファイルを読み込む
   */
  parseExcel(filePath: string): ExcelAnalysisResult | null {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheets: ExcelSheet[] = [];
      const numericalData: { [key: string]: any } = {};
      let totalRows = 0;
      let totalColumns = 0;

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (data.length === 0) continue;

        const headers = (data[0] || []).map((h: any) => String(h || ''));
        const rows = data.slice(1);

        sheets.push({
          name: sheetName,
          data: rows,
          headers,
        });

        totalRows += rows.length;
        totalColumns = Math.max(totalColumns, headers.length);

        // 数値データの抽出
        this.extractNumericalData(sheetName, headers, rows, numericalData);
      }

      return {
        fileName: filePath,
        sheets,
        statistics: {
          sheetCount: workbook.SheetNames.length,
          totalRows,
          totalColumns,
        },
        numericalData,
      };
    } catch (error) {
      console.error('Excel parsing error:', error);
      return null;
    }
  }

  /**
   * シートを取得
   */
  getSheet(result: ExcelAnalysisResult, sheetName: string): ExcelSheet | undefined {
    return result.sheets.find(s => s.name === sheetName);
  }

  /**
   * 行列解析
   */
  analyzeRowColumn(sheet: ExcelSheet): {
    rowCount: number;
    columnCount: number;
    dataTypes: { [key: string]: string };
  } {
    const dataTypes: { [key: string]: string } = {};

    for (let i = 0; i < sheet.headers.length; i++) {
      const header = sheet.headers[i];
      const column = sheet.data.map(row => row[i]);
      dataTypes[header] = this.detectDataType(column);
    }

    return {
      rowCount: sheet.data.length,
      columnCount: sheet.headers.length,
      dataTypes,
    };
  }

  /**
   * 数値データを抽出
   */
  private extractNumericalData(
    sheetName: string,
    headers: string[],
    rows: any[][],
    result: { [key: string]: any }
  ): void {
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const header = headers[colIndex];
      const column = rows.map(row => row[colIndex]);
      const numbers = column.filter(v => typeof v === 'number' || !isNaN(Number(v))).map(Number);

      if (numbers.length > 0) {
        const key = `${sheetName}.${header}`;
        result[key] = {
          sum: numbers.reduce((a, b) => a + b, 0),
          average: numbers.reduce((a, b) => a + b, 0) / numbers.length,
          max: Math.max(...numbers),
          min: Math.min(...numbers),
          count: numbers.length,
        };
      }
    }
  }

  /**
   * データ型を検出
   */
  private detectDataType(column: any[]): string {
    const nonNull = column.filter(v => v !== null && v !== undefined);
    if (nonNull.length === 0) return 'empty';

    const numbers = nonNull.filter(v => typeof v === 'number' || !isNaN(Number(v)));
    if (numbers.length === nonNull.length) return 'number';

    const dates = nonNull.filter(v => !isNaN(Date.parse(String(v))));
    if (dates.length === nonNull.length) return 'date';

    return 'string';
  }

  /**
   * 基本統計を計算
   */
  calculateStatistics(
    numbers: number[]
  ): {
    sum: number;
    average: number;
    median: number;
    max: number;
    min: number;
    stdDev: number;
  } {
    if (numbers.length === 0) {
      return { sum: 0, average: 0, median: 0, max: 0, min: 0, stdDev: 0 };
    }

    const sorted = [...numbers].sort((a, b) => a - b);
    const sum = numbers.reduce((a, b) => a + b, 0);
    const average = sum / numbers.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const max = Math.max(...numbers);
    const min = Math.min(...numbers);

    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - average, 2), 0) / numbers.length;
    const stdDev = Math.sqrt(variance);

    return { sum, average, median, max, min, stdDev };
  }

  /**
   * JSON に変換
   */
  toJSON(result: ExcelAnalysisResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * 結果をオブジェクトに変換
   */
  toObject(result: ExcelAnalysisResult): Record<string, any> {
    return {
      fileName: result.fileName,
      sheetCount: result.statistics.sheetCount,
      totalRows: result.statistics.totalRows,
      totalColumns: result.statistics.totalColumns,
      sheets: result.sheets.map(sheet => ({
        name: sheet.name,
        rowCount: sheet.data.length,
        columnCount: sheet.headers.length,
        headers: sheet.headers,
        preview: sheet.data.slice(0, 5),
      })),
      numericalData: result.numericalData,
    };
  }
}
