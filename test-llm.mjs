#!/usr/bin/env node

/**
 * LLM API テストスクリプト
 * Manus LLM API が正常に動作しているか確認
 */

const MANUS_LLM_URL = process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.ai";
const MANUS_LLM_KEY = process.env.BUILT_IN_FORGE_API_KEY || "";

console.log("🧪 LLM API テスト開始");
console.log(`📍 API URL: ${MANUS_LLM_URL}`);
console.log(`🔑 API Key: ${MANUS_LLM_KEY ? "✅ 設定済み" : "❌ 未設定"}`);
console.log("");

async function testLLM() {
  try {
    console.log("1️⃣  シンプルなテスト");
    const response1 = await fetch(`${MANUS_LLM_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MANUS_LLM_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "こんにちは" }],
        max_tokens: 100,
      }),
    });

    if (!response1.ok) {
      console.error("❌ API エラー:", response1.statusText);
      const error = await response1.text();
      console.error("詳細:", error);
      return;
    }

    const data1 = await response1.json();
    console.log("✅ 応答:", data1.choices[0].message.content);
    console.log("");

    console.log("2️⃣  日本語テスト");
    const response2 = await fetch(`${MANUS_LLM_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MANUS_LLM_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "あなたは日本語で回答するアシスタントです。" },
          { role: "user", content: "ポイポイについて説明してください" },
        ],
        max_tokens: 200,
      }),
    });

    if (!response2.ok) {
      console.error("❌ API エラー:", response2.statusText);
      return;
    }

    const data2 = await response2.json();
    console.log("✅ 応答:", data2.choices[0].message.content);
    console.log("");

    console.log("3️⃣  複雑なテスト（複数ターン）");
    const response3 = await fetch(`${MANUS_LLM_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MANUS_LLM_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "あなたは優秀なプログラマーです。" },
          { role: "user", content: "JavaScriptで配列をソートするコードを書いてください" },
        ],
        max_tokens: 300,
      }),
    });

    if (!response3.ok) {
      console.error("❌ API エラー:", response3.statusText);
      return;
    }

    const data3 = await response3.json();
    console.log("✅ 応答:", data3.choices[0].message.content);
    console.log("");

    console.log("✅ すべてのテストが成功しました！");
    console.log("LLM API は正常に動作しています。");
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
  }
}

testLLM();
