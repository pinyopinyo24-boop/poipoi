import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { CodeEvolutionEngine } from "./CodeEvolutionEngine";
import { aiProviderManager } from "../ai/AIProviderManager";
const ROOT = process.cwd();
const FORBIDDEN = [
  ".env",
  ".env.local",
  ".env.production",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  ".git"
];
function safePath(filePath) {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\/+/, "");
  const absolute = path.resolve(ROOT, normalized);
  if (!absolute.startsWith(ROOT + path.sep) && absolute !== ROOT) {
    throw new Error(`\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u5916\u306E\u30D5\u30A1\u30A4\u30EB\u306F\u7981\u6B62: ${filePath}`);
  }
  if (!fs.existsSync(absolute)) {
    throw new Error(`\u5909\u66F4\u5BFE\u8C61\u30D5\u30A1\u30A4\u30EB\u304C\u5B58\u5728\u3057\u307E\u305B\u3093: ${filePath}`);
  }
  const realRoot = fs.realpathSync(ROOT);
  const realAbsolute = fs.realpathSync(absolute);
  if (!realAbsolute.startsWith(realRoot + path.sep) && realAbsolute !== realRoot) {
    throw new Error(`\u5B9F\u4F53\u30D1\u30B9\u304C\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u5916\u3067\u3059: ${filePath}`);
  }
  if (FORBIDDEN.some(
    (x) => normalized === x || normalized.startsWith(x + "/")
  )) {
    throw new Error(`\u5909\u66F4\u7981\u6B62\u30D5\u30A1\u30A4\u30EB\u3067\u3059: ${filePath}`);
  }
  return absolute;
}
function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8"
  }).trim();
}
function commitChanges(changedFiles) {
  const expectedFiles = [...new Set(changedFiles)].sort();
  if (expectedFiles.length === 0) {
    throw new Error("Git\u306B\u78BA\u5B9A\u3059\u308B\u5909\u66F4\u304C\u3042\u308A\u307E\u305B\u3093");
  }
  const existingStaged = git(["diff", "--cached", "--name-only"]).split(/\r?\n/).filter(Boolean);
  if (existingStaged.length > 0) {
    throw new Error(
      "\u65E2\u5B58\u306E\u30B9\u30C6\u30FC\u30B8\u6E08\u307F\u5909\u66F4\u304C\u3042\u308A\u307E\u3059\u3002\u8AA4\u30B3\u30DF\u30C3\u30C8\u9632\u6B62\u306E\u305F\u3081\u4E2D\u6B62\u3057\u307E\u3059\u3002\n" + existingStaged.join("\n")
    );
  }
  git(["add", ...expectedFiles]);
  const stagedFiles = git(["diff", "--cached", "--name-only"]).split(/\r?\n/).filter(Boolean);
  const actualFiles = [...new Set(stagedFiles)].sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    git(["reset", "--", ...expectedFiles]);
    throw new Error(
      "\u30B9\u30C6\u30FC\u30B8\u5BFE\u8C61\u3068\u5909\u66F4\u5BFE\u8C61\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002\u30B3\u30DF\u30C3\u30C8\u3092\u4E2D\u6B62\u3057\u307E\u3057\u305F\u3002\n\u4E88\u5B9A: " + expectedFiles.join(", ") + "\n\u5B9F\u969B: " + actualFiles.join(", ")
    );
  }
  try {
    git([
      "commit",
      "-m",
      "feat: apply safe poipoi self evolution"
    ]);
  } catch (commitError) {
    const commitMessage = commitError instanceof Error ? commitError.message : String(commitError);
    try {
      git(["reset", "--", ...expectedFiles]);
    } catch (unstageError) {
      const unstageMessage = unstageError instanceof Error ? unstageError.message : String(unstageError);
      throw new Error(
        "Git\u30B3\u30DF\u30C3\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u4F5C\u696D\u4E2D\u306E\u5909\u66F4\u306F\u4FDD\u6301\u3055\u308C\u3066\u3044\u307E\u3059\u3002\n\u30B9\u30C6\u30FC\u30B8\u89E3\u9664\u306B\u3082\u5931\u6557\u3057\u307E\u3057\u305F: " + unstageMessage + "\n\u30B3\u30DF\u30C3\u30C8\u30A8\u30E9\u30FC: " + commitMessage
      );
    }
    throw new Error(
      "Git\u30B3\u30DF\u30C3\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u4F5C\u696D\u4E2D\u306E\u5909\u66F4\u306F\u4FDD\u6301\u3057\u3001\u30B9\u30C6\u30FC\u30B8\u3060\u3051\u89E3\u9664\u3057\u307E\u3057\u305F\u3002\n" + commitMessage
    );
  }
}
function assertGitSafe() {
  const status = git(["status", "--porcelain"]);
  const unexpectedChanges = status.split(/\r?\n/).filter(Boolean).filter((line) => line.slice(0, 2) !== "??");
  if (unexpectedChanges.length > 0) {
    throw new Error(
      "\u8FFD\u8DE1\u5BFE\u8C61\u306B\u672A\u30B3\u30DF\u30C3\u30C8\u5909\u66F4\u307E\u305F\u306F\u30B9\u30C6\u30FC\u30B8\u6E08\u307F\u5909\u66F4\u304C\u3042\u308A\u307E\u3059\u3002\u5B89\u5168\u306E\u305F\u3081\u4E2D\u6B62\u3057\u307E\u3059\u3002\n" + unexpectedChanges.join("\n")
    );
  }
}
function extractTarget(request) {
  const match = request.match(
    /((?:server|src)[\/\\][^\s"'`]+?\.(?:ts|tsx|js|jsx))/
  );
  if (!match) {
    throw new Error(
      "\u5BFE\u8C61\u30D5\u30A1\u30A4\u30EB\u3092\u7279\u5B9A\u3067\u304D\u307E\u305B\u3093\u3002\n\u4F8B: server/core/SelfEvolutionWorkflow.ts \u3092\u6539\u5584\u3059\u308B"
    );
  }
  return match[1].replace(/\\/g, "/");
}
function extractJson(text) {
  const candidates = [
    text.trim(),
    text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
  ];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const normalize = (value, index) => {
        if (!value || typeof value !== "object") {
          throw new Error(`AI\u5909\u66F4 #${index + 1} \u306E\u5F62\u5F0F\u304C\u4E0D\u6B63\u3067\u3059`);
        }
        const item = value;
        if (typeof item.filePath !== "string" || typeof item.oldCode !== "string" || typeof item.newCode !== "string" || typeof item.reason !== "string") {
          throw new Error(`AI\u5909\u66F4 #${index + 1} \u306E\u5F62\u5F0F\u304C\u4E0D\u6B63\u3067\u3059`);
        }
        return {
          filePath: item.filePath,
          oldCode: item.oldCode,
          newCode: item.newCode,
          reason: item.reason
        };
      };
      if (Array.isArray(parsed)) {
        return parsed.map(normalize);
      }
      if (parsed && typeof parsed === "object") {
        const value = parsed;
        if (Array.isArray(value.changes)) {
          return value.changes.map(normalize);
        }
        return [normalize(value, 0)];
      }
    } catch {
      continue;
    }
  }
  throw new Error("AI\u5FDC\u7B54\u306B\u6709\u52B9\u306AJSON\u5909\u66F4\u5185\u5BB9\u304C\u3042\u308A\u307E\u305B\u3093");
}
async function invokeAI(messages) {
  const manager = aiProviderManager;
  if (typeof manager.invoke !== "function") {
    throw new Error("AIProviderManager.invoke() \u304C\u5229\u7528\u3067\u304D\u307E\u305B\u3093");
  }
  return await manager.invoke(messages);
}
function findRelevantTests(targetPath) {
  const absoluteTarget = safePath(targetPath);
  const directory = path.dirname(absoluteTarget);
  const base = path.basename(
    absoluteTarget,
    path.extname(absoluteTarget)
  );
  const candidates = [
    path.join(directory, `${base}.test.ts`),
    path.join(directory, `${base}.test.tsx`),
    path.join(directory, `${base}.spec.ts`),
    path.join(directory, `${base}.spec.tsx`)
  ];
  return candidates.filter((file) => fs.existsSync(file));
}
function validateChanges(changes, targetPath) {
  const seenTargets = /* @__PURE__ */ new Set();
  for (const change of changes) {
    if (change === null || typeof change !== "object" || Array.isArray(change) || typeof change.newCode !== "string") {
      continue;
    }
    const generated = change.newCode;
    if (/(^|\n)\s*process\.env\.[A-Z0-9_]+\s*=/.test(generated) || /\beval\s*\(/.test(generated) || /\bnew\s+Function\s*\(/.test(generated) || /\bimport\s+.*from\s+["']child_process["']/.test(generated) || /\brequire\s*\(\s*["']child_process["']\s*\)/.test(generated)) {
      throw new Error(
        "AI\u751F\u6210\u30B3\u30FC\u30C9\u306B\u8A31\u53EF\u3055\u308C\u3066\u3044\u306A\u3044\u5371\u967A\u306A\u30D1\u30BF\u30FC\u30F3\u304C\u3042\u308A\u307E\u3059: " + change.filePath
      );
    }
  }
  return changes.map((item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("\u5909\u66F4\u5019\u88DC\u304C\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u3067\u306F\u3042\u308A\u307E\u305B\u3093");
    }
    if (typeof item.filePath !== "string" || typeof item.oldCode !== "string" || typeof item.newCode !== "string" || !item.filePath.trim() || !item.oldCode.trim()) {
      throw new Error("\u5909\u66F4\u5019\u88DC\u306E\u5FC5\u9808\u9805\u76EE\u304C\u6B20\u843D\u3057\u3066\u3044\u308B\u304B\u3001\u578B\u304C\u4E0D\u6B63\u3067\u3059");
    }
    const filePath = item.filePath.replace(/\\/g, "/");
    const absolutePath = safePath(filePath);
    if (filePath !== targetPath) {
      throw new Error(
        `\u5909\u66F4\u5BFE\u8C61\u5916\u306E\u30D5\u30A1\u30A4\u30EB\u3067\u3059: ${filePath}`
      );
    }
    const code = fs.readFileSync(absolutePath, "utf8");
    const sourceLineEnding = code.includes("\r\n") ? "\r\n" : "\n";
    const normalizeLineEndings = (value) => value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const normalizedOldCode = normalizeLineEndings(item.oldCode);
    const normalizedNewCode = normalizeLineEndings(item.newCode);
    const oldCode = sourceLineEnding === "\n" ? normalizedOldCode : normalizedOldCode.replace(/\n/g, "\r\n");
    const newCode = sourceLineEnding === "\n" ? normalizedNewCode : normalizedNewCode.replace(/\n/g, "\r\n");
    const targetKey = JSON.stringify([filePath, oldCode]);
    if (seenTargets.has(targetKey)) {
      throw new Error(`\u540C\u3058\u7F6E\u63DB\u5BFE\u8C61\u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059: ${filePath}`);
    }
    seenTargets.add(targetKey);
    if (!oldCode) {
      throw new Error(`\u7F6E\u63DB\u5BFE\u8C61\u30B3\u30FC\u30C9\u304C\u7A7A\u3067\u3059: ${filePath}`);
    }
    const occurrences = code.split(oldCode).length - 1;
    if (occurrences !== 1) {
      throw new Error(
        `\u7F6E\u63DB\u5BFE\u8C61\u30B3\u30FC\u30C9\u3092\u4E00\u610F\u306B\u7279\u5B9A\u3067\u304D\u307E\u305B\u3093: ${filePath} / ${occurrences}\u4EF6`
      );
    }
    if (newCode === oldCode) {
      throw new Error(`AI\u751F\u6210\u30B3\u30FC\u30C9\u306B\u5909\u66F4\u304C\u3042\u308A\u307E\u305B\u3093: ${filePath}`);
    }
    const forbiddenGeneratedPatterns = [
      "export const export const",
      "export default export default",
      "import import ",
      "class class ",
      "function function ",
      "interface interface ",
      "type type ",
      "const const ",
      "let let ",
      "var var "
    ];
    if (forbiddenGeneratedPatterns.some((pattern) => newCode.includes(pattern))) {
      throw new Error(
        `AI\u751F\u6210\u30B3\u30FC\u30C9\u306B\u4E0D\u6B63\u306A\u91CD\u8907\u69CB\u6587\u304C\u3042\u308A\u307E\u3059: ${filePath}`
      );
    }
    if (newCode.includes("process.env.") || newCode.includes("API_KEY") || newCode.includes("SECRET")) {
      throw new Error(
        `\u79D8\u5BC6\u60C5\u5831\u3092\u542B\u3080\u53EF\u80FD\u6027\u304C\u3042\u308B\u5909\u66F4\u3092\u62D2\u5426\u3057\u307E\u3057\u305F: ${filePath}`
      );
    }
    return {
      filePath,
      oldCode,
      newCode,
      reason: item.reason
    };
  });
}
async function main() {
  const request = process.argv.slice(2).join(" ").trim();
  if (!request) {
    console.error(
      '\u4F7F\u3044\u65B9: pnpm poipoi:evolve "\u6539\u5584\u5185\u5BB9"'
    );
    process.exit(1);
  }
  assertGitSafe();
  console.log("\u{1F43E} \u30DD\u30A4\u30DD\u30A4\u81EA\u5DF1\u9032\u5316");
  console.log(`\u8981\u6C42: ${request}`);
  const targetPath = extractTarget(request);
  const absoluteTarget = safePath(targetPath);
  console.log(`\u5BFE\u8C61: ${targetPath}`);
  const currentCode = fs.readFileSync(
    absoluteTarget,
    "utf8"
  );
  if (!currentCode.trim()) {
    throw new Error("\u5BFE\u8C61\u30D5\u30A1\u30A4\u30EB\u304C\u7A7A\u3067\u3059");
  }
  const messages = [
    {
      role: "system",
      content: [
        "\u3042\u306A\u305F\u306FPoipoi\u306E\u5B89\u5168\u306A\u30B3\u30FC\u30C9\u6539\u5584AI\u3067\u3059\u3002",
        "\u5FC5\u305AJSON\u914D\u5217\u3060\u3051\u3092\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
        "",
        "\u5F62\u5F0F:",
        '[{"filePath":"\u76F8\u5BFE\u30D1\u30B9","oldCode":"\u73FE\u5728\u30B3\u30FC\u30C9\u304B\u3089\u5B8C\u5168\u4E00\u81F4\u3059\u308B\u7F6E\u63DB\u5BFE\u8C61","newCode":"\u7F6E\u63DB\u5F8C\u30B3\u30FC\u30C9","reason":"\u7406\u7531"}]',
        "",
        "\u30EB\u30FC\u30EB:",
        "1. filePath\u306F\u5BFE\u8C61\u30D5\u30A1\u30A4\u30EB\u3068\u540C\u3058\u3082\u306E\u3060\u3051\u3092\u8FD4\u3059",
        "2. oldCode\u306F\u73FE\u5728\u30B3\u30FC\u30C9\u304B\u3089\u5B8C\u5168\u30B3\u30D4\u30FC\u3059\u308B",
        "3. oldCode\u306F\u5FC5\u305A\u73FE\u5728\u30B3\u30FC\u30C9\u5185\u306B\u5B58\u5728\u3059\u308B\u6587\u5B57\u5217\u306B\u3059\u308B",
        "4. newCode\u306FoldCode\u3092\u7F6E\u63DB\u3059\u308B\u5B8C\u5168\u306A\u30B3\u30FC\u30C9\u306B\u3059\u308B",
        "5. oldCode\u306E\u524D\u5F8C\u3092\u52DD\u624B\u306B\u5909\u66F4\u3057\u306A\u3044",
        "6. \u5909\u66F4\u306F\u5B89\u5168\u3067\u5C0F\u3055\u306A\u3082\u306E\u30921\u4EF6\u3060\u3051\u63D0\u6848\u3059\u308B",
        "7. \u8AAC\u660E\u6587\u3001Markdown\u3001\u30B3\u30FC\u30C9\u30D5\u30A7\u30F3\u30B9\u306F\u7981\u6B62",
        "8. \u5FC5\u305AJSON\u914D\u5217\u3060\u3051\u3092\u8FD4\u3059"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `\u6539\u5584\u8981\u6C42:
${request}`,
        `\u5BFE\u8C61\u30D5\u30A1\u30A4\u30EB:
${targetPath}`,
        `\u73FE\u5728\u30B3\u30FC\u30C9:
${currentCode}`
      ].join("\n\n")
    }
  ];
  let aiText = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`AI\u751F\u6210: ${attempt}/3`);
      aiText = await invokeAI(messages);
      break;
    } catch (error) {
      if (attempt === 3) {
        throw new Error(
          "AI Provider\u547C\u3073\u51FA\u3057\u306B3\u56DE\u5931\u6557\u3057\u307E\u3057\u305F: " + (error instanceof Error ? error.message : String(error))
        );
      }
      await new Promise(
        (resolve) => setTimeout(resolve, 1e3 * attempt)
      );
    }
  }
  let changes = [];
  let validationError = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const aiChanges = extractJson(aiText);
      if (!Array.isArray(aiChanges) || aiChanges.length === 0) {
        throw new Error("AI\u306E\u5909\u66F4\u5019\u88DC\u304C\u7A7A\u3001\u307E\u305F\u306F\u914D\u5217\u3067\u306F\u3042\u308A\u307E\u305B\u3093");
      }
      if (aiChanges.length > 10) {
        throw new Error("AI\u306E\u5909\u66F4\u5019\u88DC\u304C10\u4EF6\u3092\u8D85\u3048\u3066\u3044\u307E\u3059");
      }
      for (const change of aiChanges) {
        if (change === null || typeof change !== "object" || Array.isArray(change) || typeof change.filePath !== "string" || change.filePath.replace(/\\/g, "/") !== targetPath) {
          throw new Error("AI\u304C\u5BFE\u8C61\u5916\u30D5\u30A1\u30A4\u30EB\u307E\u305F\u306F\u4E0D\u6B63\u306A\u5909\u66F4\u5019\u88DC\u3092\u8FD4\u3057\u307E\u3057\u305F");
        }
        if (typeof change.oldCode !== "string" || change.oldCode.length === 0 || typeof change.newCode !== "string" || change.newCode.trim().length === 0) {
          throw new Error("oldCode\u307E\u305F\u306FnewCode\u304C\u4E0D\u6B63\u3067\u3059");
        }
        const normalizedOldCode = change.oldCode.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const sourceLineEnding = currentCode.includes("\r\n") ? "\r\n" : "\n";
        const sourceCompatibleOldCode = sourceLineEnding === "\n" ? normalizedOldCode : normalizedOldCode.replace(/\n/g, "\r\n");
        const occurrences = normalizedOldCode.length === 0 ? 0 : currentCode.split(sourceCompatibleOldCode).length - 1;
        if (occurrences !== 1) {
          throw new Error(
            `oldCode\u304C\u73FE\u5728\u30B3\u30FC\u30C9\u5185\u306B\u4E00\u610F\u306B\u5B58\u5728\u3057\u307E\u305B\u3093\uFF08\u51FA\u73FE\u56DE\u6570: ${occurrences}\uFF09`
          );
        }
      }
      changes = validateChanges(aiChanges, targetPath);
      if (changes.length === 0) {
        throw new Error("\u5909\u66F4\u5019\u88DC\u304C0\u4EF6\u3067\u3059");
      }
      validationError = "";
      break;
    } catch (error) {
      validationError = error instanceof Error ? error.message : String(error);
      if (attempt === 3) {
        throw new Error(
          "AI\u751F\u6210\u30B3\u30FC\u30C9\u306E\u691C\u8A3C\u306B3\u56DE\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u5909\u66F4\u306F\u9069\u7528\u3057\u3066\u3044\u307E\u305B\u3093: " + validationError
        );
      }
      console.warn(`\u5909\u66F4\u5019\u88DC\u306E\u691C\u8A3C\u5931\u6557: ${attempt}/3\u3002AI\u306B\u518D\u751F\u6210\u3092\u8981\u6C42\u3057\u307E\u3059\u3002`);
      messages.push(
        { role: "assistant", content: aiText },
        {
          role: "user",
          content: "\u76F4\u524D\u306E\u5909\u66F4\u5019\u88DC\u306F\u691C\u8A3C\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\n\u5931\u6557\u7406\u7531: " + validationError + "\n\n\u5BFE\u8C61\u30D5\u30A1\u30A4\u30EB: " + targetPath + "\n\n\u4EE5\u4E0B\u304C\u5BFE\u8C61\u30D5\u30A1\u30A4\u30EB\u306E\u73FE\u5728\u30B3\u30FC\u30C9\u3067\u3059\u3002\noldCode\u306B\u306F\u3001\u6B21\u306E\u30B3\u30FC\u30C9\u304B\u3089\u9023\u7D9A\u3057\u305F\u6587\u5B57\u5217\u3092\u4E00\u5B57\u4E00\u53E5\u305D\u306E\u307E\u307E\u30B3\u30D4\u30FC\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\u7A7A\u767D\u3001\u6539\u884C\u3001\u30A4\u30F3\u30C7\u30F3\u30C8\u3082\u4E00\u81F4\u3055\u305B\u3001\u73FE\u5728\u30B3\u30FC\u30C9\u5185\u306B1\u56DE\u3060\u3051\u5B58\u5728\u3059\u308B\u7BC4\u56F2\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002\n\u5909\u66F4\u306F\u5B89\u5168\u306A\u6700\u5C0F\u9650\u306E\u3082\u306E\u30921\u4EF6\u3060\u3051\u63D0\u6848\u3057\u3066\u304F\u3060\u3055\u3044\u3002\nfilePath\u306F\u5BFE\u8C61\u30D5\u30A1\u30A4\u30EB\u3068\u540C\u3058\u5024\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\nJSON\u914D\u5217\u3060\u3051\u3092\u8FD4\u3057\u3001\u8AAC\u660E\u6587\u3084Markdown\u306F\u4ED8\u3051\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\n\n\u73FE\u5728\u30B3\u30FC\u30C9:\n" + currentCode
        }
      );
      aiText = await invokeAI(messages);
    }
  }
  console.log(`\u5909\u66F4\u5019\u88DC: ${changes.length}\u4EF6`);
  const stagedBeforeEvolution = git(["diff", "--cached", "--name-only"]);
  if (stagedBeforeEvolution.trim()) {
    throw new Error(
      "\u81EA\u5DF1\u9032\u5316\u524D\u306E\u30B9\u30C6\u30FC\u30B8\u6E08\u307F\u5909\u66F4\u3092\u4FDD\u8B77\u3059\u308B\u305F\u3081\u4E2D\u6B62\u3057\u307E\u3057\u305F\u3002\n" + stagedBeforeEvolution
    );
  }
  const targetStatusBeforeEvolution = git(["status", "--porcelain", "--", targetPath]);
  if (targetStatusBeforeEvolution.trim()) {
    throw new Error(
      "\u81EA\u5DF1\u9032\u5316\u5BFE\u8C61\u30D5\u30A1\u30A4\u30EB\u306B\u65E2\u5B58\u306E\u5909\u66F4\u304C\u3042\u308B\u305F\u3081\u4E2D\u6B62\u3057\u307E\u3057\u305F\u3002\n" + targetStatusBeforeEvolution
    );
  }
  const engine = new CodeEvolutionEngine(ROOT);
  const result = await engine.apply(
    changes
  );
  if (!result.success) {
    console.error("\u274C \u81EA\u5DF1\u9032\u5316\u5931\u6557");
    console.error(result.error);
    console.error(
      "\u30ED\u30FC\u30EB\u30D0\u30C3\u30AF:",
      result.rolledBack ? "\u5B9F\u884C\u6E08\u307F" : "\u5931\u6557/\u306A\u3057"
    );
    process.exit(1);
  }
  if (result.changedFiles.length === 0) {
    throw new Error("\u81EA\u5DF1\u9032\u5316\u6210\u529F\u3068\u5224\u5B9A\u3055\u308C\u307E\u3057\u305F\u304C\u5909\u66F4\u30D5\u30A1\u30A4\u30EB\u304C\u3042\u308A\u307E\u305B\u3093");
  }
  const expectedTarget = targetPath.replace(/\\/g, "/");
  const unexpectedResultFiles = result.changedFiles.filter(
    (filePath) => filePath.replace(/\\/g, "/") !== expectedTarget
  );
  if (unexpectedResultFiles.length > 0) {
    throw new Error(
      "\u81EA\u5DF1\u9032\u5316\u30A8\u30F3\u30B8\u30F3\u304C\u5BFE\u8C61\u5916\u30D5\u30A1\u30A4\u30EB\u3092\u8FD4\u3057\u307E\u3057\u305F\u3002\u30B3\u30DF\u30C3\u30C8\u3092\u4E2D\u6B62\u3057\u307E\u3059\u3002\n" + unexpectedResultFiles.join("\n")
    );
  }
  const afterStatus = git([
    "status",
    "--porcelain",
    "--",
    ...result.changedFiles
  ]);
  if (!afterStatus) {
    throw new Error(
      "\u81EA\u5DF1\u9032\u5316\u6210\u529F\u3068\u5224\u5B9A\u3055\u308C\u307E\u3057\u305F\u304C\u5909\u66F4\u5BFE\u8C61\u30D5\u30A1\u30A4\u30EB\u306BGit\u5DEE\u5206\u304C\u3042\u308A\u307E\u305B\u3093"
    );
  }
  commitChanges(result.changedFiles);
  console.log("================================");
  console.log("\u2705 \u81EA\u5DF1\u9032\u5316\u6210\u529F\uFF08Git\u30B3\u30DF\u30C3\u30C8\u5B8C\u4E86\uFF09");
  console.log(`\u5909\u66F4\u30D5\u30A1\u30A4\u30EB: ${result.changedFiles.join(", ")}`);
  console.log("================================");
}
main().catch((error) => {
  console.error("\u274C CLI\u30A8\u30E9\u30FC");
  console.error(
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
