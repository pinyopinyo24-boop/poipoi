/**
 * Code Generator for PoiPoi AI
 * Foundation for code generation with templates, validation, and optimization
 */

export type CodeType = "function" | "class" | "api" | "component" | "hook" | "util";

export interface GeneratedCode {
  code: string;
  type: CodeType;
  name: string;
  createdAt: string;
  language: "javascript" | "typescript" | "python";
}

export interface ValidationResult {
  success: boolean;
  message: string;
  errors?: string[];
  warnings?: string[];
}

class CodeGenerator {
  private templates: Record<CodeType, (name: string, language?: string) => string> = {
    function: (name: string, language: string = "javascript") => {
      if (language === "typescript") {
        return `
function ${name}(): void {
  console.log("${name} started");
}
`;
      }
      return `
function ${name}() {
  console.log("${name} started");
}
`;
    },

    class: (name: string, language: string = "javascript") => {
      if (language === "typescript") {
        return `
class ${name} {
  constructor() {
    console.log("${name} created");
  }

  method(): void {
    // TODO: Implement method
  }
}
`;
      }
      return `
class ${name} {
  constructor() {
    console.log("${name} created");
  }

  method() {
    // TODO: Implement method
  }
}
`;
    },

    api: (name: string, language: string = "javascript") => {
      if (language === "typescript") {
        return `
async function ${name}(): Promise<any> {
  try {
    // API処理
    const response = await fetch('/api/endpoint');
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}
`;
      }
      return `
async function ${name}() {
  try {
    // API処理
    const response = await fetch('/api/endpoint');
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}
`;
    },

    component: (name: string, language: string = "javascript") => {
      if (language === "typescript") {
        return `
import React from 'react';

interface ${name}Props {
  // Props definition
}

export const ${name}: React.FC<${name}Props> = (props) => {
  return (
    <div>
      {/* Component content */}
    </div>
  );
};
`;
      }
      return `
import React from 'react';

export const ${name} = (props) => {
  return (
    <div>
      {/* Component content */}
    </div>
  );
};
`;
    },

    hook: (name: string, language: string = "javascript") => {
      if (language === "typescript") {
        return `
import { useState } from 'react';

export function ${name}(): any {
  const [state, setState] = useState(null);

  return {
    state,
    setState,
  };
}
`;
      }
      return `
import { useState } from 'react';

export function ${name}() {
  const [state, setState] = useState(null);

  return {
    state,
    setState,
  };
}
`;
    },

    util: (name: string, language: string = "javascript") => {
      if (language === "typescript") {
        return `
export function ${name}(input: any): any {
  // Utility function implementation
  return input;
}
`;
      }
      return `
export function ${name}(input) {
  // Utility function implementation
  return input;
}
`;
    },
  };

  private history: GeneratedCode[] = [];
  private maxHistory = 1000;

  /**
   * Generate code from template
   */
  generate(
    type: CodeType,
    name: string,
    language: "javascript" | "typescript" = "typescript"
  ): GeneratedCode {
    if (!this.templates[type]) {
      throw new Error(`Unknown template type: ${type}`);
    }

    const code = this.templates[type](name, language);

    const generated: GeneratedCode = {
      code,
      type,
      name,
      createdAt: new Date().toISOString(),
      language,
    };

    this.save(generated);

    console.log(`✅ コード生成: ${type}/${name}`);

    return generated;
  }

  /**
   * Optimize code
   */
  optimize(code: string): string {
    let optimized = code;

    // Remove trailing whitespace
    optimized = optimized.replace(/[ \t]+$/gm, "");

    // Normalize multiple newlines to double newlines
    optimized = optimized.replace(/\n{3,}/g, "\n\n");

    // Remove leading/trailing whitespace
    optimized = optimized.trim();

    console.log("🔧 コードを最適化しました");

    return optimized;
  }

  /**
   * Validate code
   */
  validate(code: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if code is empty
    if (!code || code.trim().length === 0) {
      errors.push("コードが空です");
      return {
        success: false,
        message: "検証失敗",
        errors,
      };
    }

    // Check for common syntax issues
    if (code.includes("TODO") || code.includes("FIXME")) {
      warnings.push("TODOまたはFIXMEコメントが含まれています");
    }

    // Check for console.log in production code
    const consoleLogCount = (code.match(/console\.log/g) || []).length;
    if (consoleLogCount > 3) {
      warnings.push(`console.log が ${consoleLogCount} 回使用されています`);
    }

    // Check for missing error handling
    if (code.includes("fetch") && !code.includes("catch")) {
      warnings.push("エラーハンドリングが見つかりません");
    }

    return {
      success: errors.length === 0,
      message: errors.length === 0 ? "検証OK" : "検証失敗",
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Save generated code to history
   */
  save(generated: GeneratedCode): void {
    this.history.push(generated);

    // Keep history size manageable
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    console.log(`📝 履歴に保存: ${generated.name}`);
  }

  /**
   * Get generation history
   */
  getHistory(): GeneratedCode[] {
    return [...this.history];
  }

  /**
   * Get recent generated code
   */
  getRecent(limit: number = 10): GeneratedCode[] {
    return this.history.slice(-limit).reverse();
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
    console.log("🧹 履歴をクリアしました");
  }

  /**
   * Get statistics
   */
  getStats() {
    const typeCount: Record<CodeType, number> = {
      function: 0,
      class: 0,
      api: 0,
      component: 0,
      hook: 0,
      util: 0,
    };

    this.history.forEach((item) => {
      typeCount[item.type]++;
    });

    const languageSet = new Set(this.history.map((h) => h.language));
    const languages = Array.from(languageSet);

    return {
      total: this.history.length,
      byType: typeCount,
      languages,
    };
  }

  /**
   * Export code as file content
   */
  export(generated: GeneratedCode): string {
    const header = `// Generated by PoiPoi CodeGenerator\n// Type: ${generated.type}\n// Created: ${generated.createdAt}\n\n`;
    return header + generated.code;
  }
}

export default CodeGenerator;
