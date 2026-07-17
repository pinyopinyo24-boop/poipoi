import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

interface GoogleAuthButtonProps {
  onAuthSuccess: () => void;
}

export function GoogleAuthButton({ onAuthSuccess }: GoogleAuthButtonProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleGoogleAuth = async () => {
    try {
      setIsAuthenticating(true);

      // Google OAuth フローを開始
      const clientId = '242998209586-jgm9fbj2eqchnb5f5p0rtdhh78oj7a14.apps.googleusercontent.com';
      const redirectUri = `${window.location.origin}/api/oauth/google/callback`;
      const scope = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file';

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${encodeURIComponent(window.location.origin)}`;

      // 新しいウィンドウで認証フローを開く
      const authWindow = window.open(authUrl, 'google_auth', 'width=600,height=700');

      if (!authWindow) {
        throw new Error('ポップアップがブロックされています');
      }

      // 認証完了を待つ
      let authCheckCount = 0;
      const checkAuthInterval = setInterval(() => {
        try {
          if (authWindow && authWindow.closed) {
            clearInterval(checkAuthInterval);
            setIsAuthenticating(false);
            toast.success('Google 認証が完了しました！');
            // 認証後にコールバックを実行
            onAuthSuccess();
          }
          authCheckCount++;
        } catch (e) {
          // クロスオリジンエラーは無視
        }
      }, 1000);

      // タイムアウト設定（5分）
      setTimeout(() => {
        clearInterval(checkAuthInterval);
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
        if (authCheckCount > 0) {
          // 認証ウィンドウが開かれたが閉じられなかった場合
          toast.error('Google 認証がタイムアウトしました');
        }
        setIsAuthenticating(false);
      }, 300000);

    } catch (error) {
      console.error('Error during Google authentication:', error);
      toast.error('Google 認証に失敗しました');
      setIsAuthenticating(false);
    }
  };

  return (
    <Button
      onClick={handleGoogleAuth}
      disabled={isAuthenticating}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-8 text-xl font-bold"
    >
      {isAuthenticating ? (
        <>
          <Spinner className="mr-2 h-5 w-5" />
          Google 認証中...
        </>
      ) : (
        <>
          ♻️ Google で認証してFaceFusionを開始
        </>
      )}
    </Button>
  );
}
