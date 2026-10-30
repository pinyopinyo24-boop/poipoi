import * as fs from "node:fs";
import * as path from "node:path";

const identityFile = path.resolve(process.cwd(), "data", "poipoi-identity.json");

type Identity = {
  name: string;
  userNames?: Record<string, string>;
  aiNames?: Record<string, string>;
};

export class PoiPoiIdentity {
  private static read(): Identity {
    try {
      const data = JSON.parse(fs.readFileSync(identityFile, "utf8"));
      return {
        name: typeof data.name === "string" && data.name.trim()
          ? data.name.trim()
          : "AZ",
        userNames: data.userNames && typeof data.userNames === "object" ? data.userNames : {},
        aiNames: data.aiNames && typeof data.aiNames === "object" ? data.aiNames : {},
      };
    } catch {
      return { name: "AZ", userNames: {} };
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
    fs.writeFileSync(temp, JSON.stringify({ ...this.read(), name: value }, null, 2), "utf8");
    fs.renameSync(temp, identityFile);

    return value;
  }

  static getAIName(userId: string): string {
    return this.read().aiNames?.[userId] || this.getName();
  }
  static setAIName(userId: string, name: string): string {
    const value = name.trim();
    if (!value || value.length > 40) throw new Error("名前は1～40文字で指定してください");
    const current = this.read();
    fs.mkdirSync(path.dirname(identityFile), { recursive: true });
    const temp = identityFile + "." + process.pid + "." + Date.now() + ".tmp";
    fs.writeFileSync(temp, JSON.stringify({ ...current, aiNames: { ...current.aiNames, [userId]: value } }, null, 2), "utf8");
    fs.renameSync(temp, identityFile);
    return value;
  }
  static resetName(): string {
    return this.setName("AZ");
  }

  static getUserName(userId: string): string | undefined {
    return this.read().userNames?.[userId];
  }
  static setUserName(userId: string, name: string): string {
    const value = name.trim();
    if (!value || value.length > 40) throw new Error("名前は1～40文字で指定してください");
    const current = this.read();
    fs.mkdirSync(path.dirname(identityFile), { recursive: true });
    const temp = identityFile + "." + process.pid + "." + Date.now() + ".tmp";
    fs.writeFileSync(temp, JSON.stringify({ ...current, userNames: { ...current.userNames, [userId]: value } }, null, 2), "utf8");
    fs.renameSync(temp, identityFile);
    return value;
  }
  static getSystemPrompt(userId?: string): string {
    return [
      `あなたはPoiPoiのAIコアAZです。AIの名前は「${userId ? this.getAIName(userId) : this.getName()}」です。`,
      `ユーザーの名前は「${userId ? (this.getUserName(userId) ?? "未登録") : "未登録"}」です。`,
      "「私の名前」はユーザーの名前、「あなたの名前」はAIの名前を意味します。未登録の名前は推測しないでください。",
      "内部AIモデルの名前を自分の名前として名乗らないでください。",
      "通常のチャットでは自然な日本語で回答してください。",
    ].join("\n");
  }
}