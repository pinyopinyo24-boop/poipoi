/**
 * Code Generator - PoiPoi AI Core
 * コード自動生成
 */

export interface GeneratedCode {
  code: string;
  language: string;
  timestamp: string;
}

class CodeGenerator {
  private templates: Record<string, (name: string) => string> = {
    function: (name) => `
function ${name}() {
  console.log("${name} started");
}
`,
    class: (name) => `
class ${name} {
  constructor() {
    console.log("${name} created");
  }
}
`,
    api: (name) => `
async function ${name}() {
  try {
    // API処理
  } catch (error) {
    console.error(error);
  }
}
`,
  };

  private history: GeneratedCode[] = [];
  private languages: Set<string> = new Set(["JavaScript", "TypeScript", "Python"]);

  generate(type: string, name: string): string {
    if (!this.templates[type]) {
      throw new Error("Unknown template");
    }

    return this.templates[type](name);
  }

  optimize(code: string): string {
    return code
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n");
  }

  validate(code: string): { success: boolean; message: string } {
    if (!code || code.length === 0) {
      return {
        success: false,
        message: "コードが空です",
      };
    }

    return {
      success: true,
      message: "検証OK",
    };
  }

  save(code: string, language: string = "JavaScript"): void {
    this.history.push({
      code,
      language,
      timestamp: new Date().toISOString(),
    });
    this.languages.add(language);
  }

  getHistory(): GeneratedCode[] {
    return [...this.history];
  }

  getStats(): { total: number; languages: string[] } {
    return {
      total: this.history.length,
      languages: Array.from(this.languages),
    };
  }
}

export default CodeGenerator;
