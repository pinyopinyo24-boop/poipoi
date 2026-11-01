# Googleアカウントで登録・ログイン

通常のユーザー名・パスワードによる認証を維持したまま、Google認証を追加しています。接続設定が揃うまでGoogleボタンは無効です。DATABASE_URLが未設定ならPC内の `data/auth/accounts.sqlite` にアカウントを保存します（Node.js 24で利用）。設定済みなら従来のMySQLを使用し、接続障害時に別ストアへ切り替えません。設定済みという表示は接続成功や実機検証済みを意味しません。

1. Google Cloud ConsoleのGoogle Auth Platformでプロジェクト・同意画面を設定します。
2. OAuthクライアントを「ウェブ アプリケーション」として作成します。
3. 承認済みリダイレクトURIに `http://localhost:3000/api/oauth/google/callback` を登録します。テスト公開の場合は利用するGoogleアカウントをテストユーザーに追加します。
4. リポジトリのルートで `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\configure-google-login.ps1` を実行し、クライアントIDとクライアントシークレットを入力します。秘密情報をチャットやGitに貼り付ける必要はありません。
5. 設定反映にはサーバーの起動し直しが必要です。設定スクリプトは再起動を実行しません。稼働中の作業がある場合は先に終了し、承認したタイミングで起動し直してください。

使用する環境変数は `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REDIRECT_URI`、32文字以上の `JWT_SECRET`です。既存のMySQLを使う場合のみ `DATABASE_URL` を指定します。DATABASE_URLの接続文字列はこのスクリプトでは変更しません。既存のJWT_SECRETが短い場合も自動変更しません（既存セッションへの影響を避けるため）。

Google署名・発行元・対象クライアント・期限・nonceを検証し、認可コードをPKCEで交換します。stateはブラウザーのHttpOnly Cookieと10分間の一回限りの記録に結び付けています。Googleのsubjectから専用のユーザーIDを作り、同じメールの通常アカウントへは自動統合しません。既存アカウントの履歴は既存のログイン方法で利用できます。新規Googleアカウントの権限は一般ユーザーで、自己進化のコード適用に必要な管理者権限は自動付与しません。

Googleのトークンやシークレットはブラウザーへ返しません。パスワード保存機能のGoogle Password Managerとは別の機能です。PCでGoogleの認証情報は設定済みと報告されていますが、実認証は未確認です。テスト・ビルド・PC再起動は実行していません。

公式資料: https://developers.google.com/identity/protocols/oauth2/web-server

ローカル保存はアカウント認証のためのもので、すべての実務用データベースをSQLiteへ置き換えるものではありません。アカウントDBにはパスワードのハッシュが入り、GitとHTTP公開の対象から除外しています。将来MySQLへ切り替える場合はアカウントIDと履歴の移行が必要です。DATABASE_URLを追加するだけでは既存ローカルアカウントを利用できません。どちらの保存方式でも管理者権限は自動付与しません。
