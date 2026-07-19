#!/usr/bin/env node

/**
 * Gemini を使用して顔入れ替えプログラムを生成
 */

const MANUS_LLM_URL = process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.ai";
const MANUS_LLM_KEY = process.env.BUILT_IN_FORGE_API_KEY || "";

async function generateFaceSwapCode() {
  const prompt = `
あなたはPython画像処理の専門家です。

以下の要件で、顔入れ替え処理を行うPythonプログラムを作成してください：

【要件】
1. 入力：ソース画像パス、ターゲット画像パス、出力パス
2. 処理：ソース画像の顔をターゲット画像の顔に置き換える
3. 出力：処理済み画像をファイルに保存
4. 外部ライブラリ：PIL/Pillow のみ使用（numpy, opencv, face_recognition は不可）
5. 顔検出：シンプルな色・形状ベースの検出
6. 顔交換：ピクセルレベルの画像処理で実装

【実装ポイント】
- 顔領域を検出（肌色検出など）
- 顔領域を抽出
- アフィン変換で顔を合わせる
- ブレンド処理で自然に見せる
- エラーハンドリング

完全に動作するPythonコードを提供してください。
`;

  console.log("🤖 Gemini に顔入れ替えコードを生成させています...\n");

  try {
    const response = await fetch(`${MANUS_LLM_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MANUS_LLM_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "あなたは優秀なPythonプログラマーです。完全に動作するコードを提供します。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      console.error("❌ API エラー:", response.statusText);
      const error = await response.text();
      console.error("詳細:", error);
      return;
    }

    const data = await response.json();
    const code = data.choices[0].message.content;

    console.log("✅ コード生成完了！\n");
    console.log("=" .repeat(80));
    console.log(code);
    console.log("=" .repeat(80));

    // コードをファイルに保存
    const fs = await import("fs");
    fs.writeFileSync("/home/ubuntu/poipoi/server/_core/faceswap-ai-generated.py", code);
    console.log("\n✅ コードを保存しました: /home/ubuntu/poipoi/server/_core/faceswap-ai-generated.py");
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
  }
}

generateFaceSwapCode();
