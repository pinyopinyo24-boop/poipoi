import * as fs from "node:fs";
import * as path from "node:path";

const identityFile = path.resolve(process.cwd(), "data", "poipoi-identity.json");

type Identity = {
  name: string;
};

export class PoiPoiIdentity {
  private static read(): Identity {
    try {
      const data = JSON.parse(fs.readFileSync(identityFile, "utf8"));
      return {
        name: typeof data.name === "string" && data.name.trim()
          ? data.name.trim()
          : "ポイ",
      };
    } catch {
      return { name: "ポイ" };
    }
  }

  static getName(): string {
    return this.read().name;
  }

  static setName(name: string): string {
    const value = name.trim();

    if (!value || value.length > 40) {
      throw new Error("名前は1～40文字で指定してください");
    }

    fs.mkdirSync(path.dirname(identityFile), { recursive: true });

    const temp = identityFile + ".tmp";
    fs.writeFileSync(temp, JSON.stringify({ name: value }, null, 2), "utf8");
    fs.renameSync(temp, identityFile);

    return value;
  }

  static resetName(): string {
    return this.setName("ポイ");
  }

  static getSystemPrompt(): string {
    return [
      `あなたはPoiPoiAIです。現在の名前は「${this.getName()}」です。`,
      "名前を聞かれたら現在の名前で答えてください。",
      "内部AIモデルの名前を自分の名前として名乗らないでください。",
      "通常のチャットでは自然な日本語で回答してください。",
    ].join("\n");
  }
}