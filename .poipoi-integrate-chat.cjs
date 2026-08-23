const fs = require("fs");

const file = "server/routers.chat.ts";
let s = fs.readFileSync(file, "utf8");

if (!s.includes("PoipoiCodeAgent")) {
  s = s.replace(
    "import { ChatCoreManager } from './core/ChatCoreManager';",
    "import { ChatCoreManager } from './core/ChatCoreManager';\nimport { PoipoiCodeAgent } from './core/PoipoiCodeAgent';"
  );
}

const oldBlock = `      try {
        const response = await manager.processMessage(
          input.userId,
          input.sessionId,
          input.message
        );

        return {
          message: response.message,
          session: response.session,
          relatedMemories: response.relatedMemories,
          reasoning: response.reasoning,
        };
      } catch (error) {`;

const newBlock = `      try {
        // 実装依頼だけをCodeAgentへルーティングする。
        // 通常チャットは既存のChatCoreManager処理をそのまま使用する。
        const isCodeImplementationRequest =
          /(?:実装|追加|修正|変更|作成|開発|コード).*(?:して|してください|したい|お願い)/.test(
            input.message
          );

        if (isCodeImplementationRequest) {
          const result = await PoipoiCodeAgent.getInstance().execute(
            input.message
          );

          if (!result.success) {
            return {
              message: \`コード実装に失敗しました: \${result.error ?? "不明なエラー"}\`,
              session: null,
              relatedMemories: [],
              reasoning: null,
            };
          }

          const message =
            result.changes?.length
              ? result.changes
                  .map((change: any) => \`実装完了: \${change.path}\`)
                  .join("\\n")
              : "コード実装が完了しました。";

          return {
            message,
            session: null,
            relatedMemories: [],
            reasoning: null,
          };
        }

        const response = await manager.processMessage(
          input.userId,
          input.sessionId,
          input.message
        );

        return {
          message: response.message,
          session: response.session,
          relatedMemories: response.relatedMemories,
          reasoning: response.reasoning,
        };
      } catch (error) {`;

if (!s.includes(oldBlock)) {
  throw new Error("processMessageの既存処理を特定できませんでした");
}

s = s.replace(oldBlock, newBlock);

fs.writeFileSync(file, s, "utf8");
console.log("CODE_AGENT_CHAT_ROUTING_IMPLEMENTED");
