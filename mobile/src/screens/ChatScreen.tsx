import * as React from 'react';
import { synchronizeMobilePoiPoiState } from '../services/PoiPoiUnifiedStateSync';
import * as Linking from 'expo-linking';
function extractAIMessage(value: unknown): string {
  if (typeof value !== "string") {
    return value == null ? "応答がありません" : JSON.stringify(value);
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (typeof parsed.message === "string") return parsed.message;
      if (typeof parsed.content === "string") return parsed.content;
      if (typeof parsed.description === "string") return parsed.description;
      if (typeof parsed.name === "string") return parsed.name;
    }
  } catch {
    // 通常の文章はそのまま表示
  }

  return value;
}
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MobileSelfEvolution } from '../services/MobileSelfEvolution';
import { AndroidAIModelManager } from '../services/AndroidAIModelManager';
import { AndroidLocalAI } from '../services/AndroidLocalAI';
import { replyWithLocalIdentity } from '../services/PoiPoiLocalIdentity';
import { Keyboard, 
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView, ActivityIndicator,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { VoiceInputUI } from '../components/VoiceInputUI';
import { MobileAPIConnector, ChatRequest, ChatResponse } from "../services/MobileAPIConnector";
import Constants from "expo-constants";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

export default function ChatScreen() {
  // POIPOI_UNIFIED_STATE_RUNTIME_V2
  React.useEffect(() => {
    let cancelled = false;



    return () => {
      cancelled = true;
    };
  }, []);


  // POIPOI_UNIFIED_STATE_RUNTIME_V1
  React.useEffect(() => {
    let active = true;

    const sync = async () => {
      if (!active) return;
      try {
        const savedPcUrl = await AsyncStorage.getItem('POIPOI_PC_URL');
        if (savedPcUrl) await synchronizeMobilePoiPoiState(savedPcUrl);
        await MobileSelfEvolution.restoreEvolutionFromUnifiedState();
        await MobileSelfEvolution.applyPcEvolutionResults();
      } catch (error) {
        console.warn('PoiPoi unified AI state sync:', error);
      }
    };

    void sync();

    return () => {
      active = false;
    };
  }, []);

  const POIPOI_LOCAL_CHAT_V1 = 'POIPOI_LOCAL_CHAT_V1';

  useEffect(() => {
    localHistoryLoad.current = AsyncStorage.getItem(POIPOI_LOCAL_CHAT_V1)
      .then(value => {
        if (value) {
          const saved = JSON.parse(value);
          if (Array.isArray(saved)) setMessages(saved);
        }
      })
      .catch(console.warn).finally(() => setLocalHistoryReady(true));
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    { id: "0", text: "ようこそPoiPoiへ。何かお手伝いできることはありますか？", isUser: false, timestamp: Date.now() }
  ]);
  const [localHistoryReady, setLocalHistoryReady] = useState(false);
  const localHistoryLoad = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!localHistoryReady) return;
    AsyncStorage.setItem(
      POIPOI_LOCAL_CHAT_V1,
      JSON.stringify(messages)
    ).catch(console.warn);
  }, [messages, localHistoryReady]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelDownloadProgress,setModelDownloadProgress]=useState<number|null>(null);
  const [chatSessions, setChatSessions] = useState<Array<{ id: string; title?: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);

  // POIPOI_UNIFIED_CONVERSATION_SYNC_V3
  const lastSyncedConversationRef = useRef('');
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    if (!localHistoryReady || !apiConnector || !isConnected || isLoading) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const sync = async () => {
      if (cancelled || isLoading) return;

      try {
        const current = messagesRef.current;
        const activeSessionId = apiConnector.getSessionId();
        const signature = JSON.stringify({
          sessionId: activeSessionId,
          messages: current.map(m => [m.id, m.text, m.isUser, m.timestamp]),
        });

        if (signature !== lastSyncedConversationRef.current) {
          const success = await apiConnector.syncMobileConversations(current);
          if (!success) throw new Error('PCへの会話同期に失敗しました');
          if (cancelled) return;
          lastSyncedConversationRef.current = signature;
        }

        const sessionId = apiConnector.getSessionId();
        if (!sessionId || cancelled) return;

        const result = await apiConnector.getChatHistory(sessionId);
        if (!result.success || !result.data || cancelled) return;

        const incoming = result.data
          .filter(m => m && typeof m.id === 'string' && typeof m.content === 'string')
          .map(m => ({
            id: m.id,
            text: m.content,
            isUser: m.role === 'user',
            timestamp: typeof m.timestamp === 'number'
              ? m.timestamp
              : new Date(m.timestamp).getTime(),
          }))
          .filter(m => Number.isFinite(m.timestamp));

        setMessages(prev => {
          const known = new Set(prev.map(m => m.id));
          const additions = incoming.filter(m => {
            if (known.has(m.id)) return false;
            // PC replies have different IDs from the optimistic mobile turns.
            return !prev.some(existing =>
              existing.isUser === m.isUser &&
              existing.text === m.text &&
              Math.abs(existing.timestamp - m.timestamp) < 120000
            );
          });
          return additions.length
            ? [...prev, ...additions].sort((a, b) => a.timestamp - b.timestamp)
            : prev;
        });
      } catch (error) {
        console.warn('[PoiPoi] 会話同期失敗:', error);
        if (!cancelled) {
          retryTimer = setTimeout(() => void sync(), 10000);
        }
      }
    };

    const timer = setTimeout(() => void sync(), 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [messages, localHistoryReady, apiConnector, isConnected, isLoading]);
  const openChatHistory = async () => {
    if (!apiConnector || !isConnected) {
      setShowHistory(true);
      return;
    }
    const result = await apiConnector.getChatSessions();
    if (!result.success || !result.data) {
      Alert.alert('履歴エラー', '履歴を取得できませんでした');
      return;
    }
    setChatSessions(result.data);
    setShowHistory(true);
  };

  const openChatSession = async (id: string) => {
    if (!apiConnector) return;
    const result = await apiConnector.getChatHistory(id);
    if (!result.success || !result.data) {
      Alert.alert('履歴エラー', '会話を取得できませんでした');
      return;
    }
    await apiConnector.selectChatSession(id);
    // A new history selection must not inherit the previous session's sync signature.
    lastSyncedConversationRef.current = '';
    setSessionId(id);
    setMessages(result.data.map(message => ({
      id: message.id,
      text: message.content,
      isUser: message.role === 'user',
      timestamp: message.timestamp,
    })));
    setShowHistory(false);
  };
  useEffect(()=>{AndroidAIModelManager.setProgressListener(setModelDownloadProgress);return ()=>AndroidAIModelManager.setProgressListener(null);},[]);
  const [apiConnector, setApiConnector] = useState<MobileAPIConnector | null>(null);
  const rateAssistantAnswer = (item: Message) => {
    if (item.isUser) return;
    if (!apiConnector || !isConnected || !(sessionId || apiConnector.getSessionId())) {
      Alert.alert('学習評価', 'PC接続時に評価できます。オフライン中の訂正はチャットで「正しくは…」と入力してください。');
      return;
    }
    Alert.alert('この回答を評価', '回答を長押しして評価できます。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '正しい', onPress: () => { void submitRating(item, true); } },
      { text: '間違い', onPress: () => { void submitRating(item, false); } },
    ]);
  };

  const submitRating = async (item: Message, accepted: boolean) => {
    const activeSession = sessionId || apiConnector?.getSessionId();
    if (!apiConnector || !activeSession) return;
    const result = await apiConnector.submitLearningFeedback({
      sessionId: activeSession,
      messageId: item.id,
      accepted,
    });
    Alert.alert('学習評価', result.success
      ? (accepted ? '正しい回答として記録しました' : '誤った回答として記録しました。正しい内容は「正しくは…」と送信してください。')
      : (result.error || '評価を保存できませんでした'));
  };


  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = async () => {
    if (!apiConnector || !loginUsername.trim() || !loginPassword || loginBusy) return;
    setLoginBusy(true);
    try {
      const baseURL = (await AsyncStorage.getItem('POIPOI_PC_URL')) || Constants.expoConfig?.extra?.apiBaseUrl;
      if (typeof baseURL !== 'string' || !baseURL.trim()) throw new Error('API URLが未設定です');
      const response = await fetch(`${baseURL.replace(/\/$/, '')}/api/trpc/auth.login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { username: loginUsername.trim(), password: loginPassword } }),
      });
      const result = await response.json();
      const token = result?.result?.data?.json?.token ?? result?.result?.data?.token;
      if (!response.ok || typeof token !== 'string' || !token) {
        throw new Error(result?.error?.message || 'ログインに失敗しました');
      }
      const previousSessionId = apiConnector.getSessionId();
      apiConnector.setAuthToken(token);
      const authResponse = await fetch(`${baseURL.replace(/\/$/, '')}/api/trpc/auth.me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const authResult = await authResponse.json();
      const authUser = authResult?.result?.data?.json ?? authResult?.result?.data;
      if (!authResponse.ok || !authUser?.id) throw new Error('認証確認に失敗しました');
      if (!apiConnector.getSessionId()) {
        setSessionId(undefined);
        
        setChatSessions([]);
        setShowHistory(false);
      } else {
        setSessionId(previousSessionId || undefined);
      }
      const nextOwner = String(authUser.id);
      const nextOfficeKey = 'POIPOI_OFFICE_SESSION_V1:' + baseURL.replace(/\/$/, '') + ':' + nextOwner;
      analyzedDocumentsRef.current = [];
      lastDocumentAnalysisRef.current = '';
      documentOwnerRef.current = nextOwner;
      officeSessionKeyRef.current = nextOfficeKey;
      try {
        const stored = await AsyncStorage.getItem(nextOfficeKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed?.files) && parsed.files.length <= 6 &&
              parsed.files.every((x: any) => x && typeof x.file === 'string' &&
                typeof x.name === 'string' && (x.type === 'pdf' || x.type === 'xlsx'))) {
            analyzedDocumentsRef.current = parsed.files;
            lastDocumentAnalysisRef.current = typeof parsed.analysis === 'string' ? parsed.analysis : '';
          }
        }
      } catch (storageError) {
        console.warn('Office作業状態を復元できませんでした:', storageError);
      }
      setIsConnected(true);
      setIsAuthenticated(true);
      setLoginPassword('');
      setShowLogin(false);
      Alert.alert('ログイン完了', 'PoiPoiに接続しました');
    } catch (error) {
      Alert.alert('ログインエラー', error instanceof Error ? error.message : '認証失敗');
    } finally {
      setLoginBusy(false);
    }
  };
  const [registerName, setRegisterName] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerBusy, setRegisterBusy] = useState(false);

  const handleRegister = async () => {
    if (registerBusy) return;
    if (registerUsername.trim().length < 3 || registerPassword.length < 6) {
      Alert.alert('入力確認', 'ユーザー名3文字以上、パスワード6文字以上、表示名を入力してください');
      return;
    }
    setRegisterBusy(true);
    try {
      const baseURL = (await AsyncStorage.getItem('POIPOI_PC_URL')) || Constants.expoConfig?.extra?.apiBaseUrl;
      if (typeof baseURL !== 'string' || !baseURL.trim()) throw new Error('API URLが未設定です');
      const response = await fetch(`${baseURL.replace(/\/$/, '')}/api/trpc/auth.register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: {
            username: registerUsername.trim(),
            password: registerPassword,
            name: registerUsername.trim(),
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || result?.error) {
        throw new Error(result?.error?.message || '登録に失敗しました');
      }
      Alert.alert('登録完了', '続けて「ログイン実行」を押してください');
    } catch (error) {
      Alert.alert('登録エラー', error instanceof Error ? error.message : '登録に失敗しました');
    } finally {
      setRegisterBusy(false);
    }
  };
  // POIPOI_UPDATE_COMPLETED_NOTICE_V1
  useEffect(() => {
    const notifyCompletedUpdate = async () => {
      try {
        const currentCode = Number(Constants.expoConfig?.android?.versionCode ?? 0);
        if (currentCode <= 0) return;

        const key = 'POIPOI_INSTALLED_VERSION_CODE';
        const previous = await AsyncStorage.getItem(key);

        await AsyncStorage.setItem(key, String(currentCode));

        if (previous !== null && currentCode > Number(previous)) {
          Alert.alert(
            'PoiPoiアップデート完了',
            'PoiPoiを更新しました'
          );
        }
      } catch (error) {
        console.warn('[PoiPoi] 更新完了通知:', error);
      }
    };

    void notifyCompletedUpdate();
  }, []);
  // POIPOI_MOBILE_UPDATE_CHECK_V1
  const updatePromptedRef = React.useRef<string | null>(null);

  const checkMobileUpdate = async (baseURL: string) => {
    try {
      const response = await fetch(`${baseURL.replace(/\/$/, '')}/api/mobile-update`);
      if (!response.ok) return;

      const update = await response.json();
      const currentVersionCode = Number(
        Constants.expoConfig?.android?.versionCode ?? 1
      );

      if (
        update.available !== true ||
        !Number.isInteger(update.versionCode) ||
        update.versionCode <= currentVersionCode ||
        typeof update.apkUrl !== 'string' ||
        !/^https:\/\//.test(update.apkUrl)
      ) return;

      const key = `${update.versionCode}:${update.apkUrl}`;
      if (updatePromptedRef.current === key) return;
      updatePromptedRef.current = key;

      Alert.alert(
        'PoiPoiアップデート',
        `新しいバージョン ${update.version} があります。更新しますか？`,
        [
          { text: 'あとで', style: 'cancel' },
          {
            text: '更新する',
            onPress: () => {
              void Linking.openURL(update.apkUrl).catch(error => {
                Alert.alert('更新エラー', String(error));
              });
            },
          },
        ]
      );
    } catch (error) {
      console.warn('[PoiPoi] 更新確認失敗:', error);
    }
  };
  // POIPOI_AUTO_PC_RECONNECT_V1
  useEffect(() => {
    let active = true;
    let checking = false;
    let previouslyReachable = false;
    let lastSyncAt = 0;

    const checkPC = async () => {
      if (!active || checking) return;
      checking = true;
      try {
        if (await AsyncStorage.getItem('POIPOI_PC_DISCONNECTED') === '1') return;

        const url = (await AsyncStorage.getItem('POIPOI_PC_URL'))
          || Constants.expoConfig?.extra?.apiBaseUrl;

        if (typeof url !== 'string' || !url.trim()) return;

        const reachable = await Promise.race([
          fetch(`${url.replace(/\/$/, '')}/api/health`)
            .then(response => response.ok)
            .catch(() => false),
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), 4000)),
        ]);

        if (!active) return;

        if (!reachable) {
          previouslyReachable = false;
          setIsConnected(false);
          return;
        }

        const connector = new MobileAPIConnector(url);
        await connector.initialize();

        if (!active) return;
        if (await AsyncStorage.getItem('POIPOI_PC_DISCONNECTED') === '1') return;

        setApiConnector(connector);
        setIsAuthenticated(await connector.checkAuthentication());
        setSessionId(connector.getSessionId() || undefined);
        setIsConnected(true);
        const justReconnected = !previouslyReachable;
        previouslyReachable = true;
        if (justReconnected) void checkMobileUpdate(url);
        if (!justReconnected && Date.now() - lastSyncAt < 60000) return;
        lastSyncAt = Date.now();
        void synchronizeMobilePoiPoiState(url)
          .then(async () => {
            await MobileSelfEvolution.restoreEvolutionFromUnifiedState();
            await MobileSelfEvolution.applyPcEvolutionResults();
            const pcResults = await MobileSelfEvolution.getPcEvolutionHistory(20);
            if (__DEV__) {
              console.log('[PoiPoi] PC自己進化履歴取得:', pcResults.length);
            }
          })
          .catch(error => {
            lastSyncAt = 0;
            console.warn('[PoiPoi] PC・Android自己進化同期失敗:', error);
          });
      } catch (error) {
        if (active) setIsConnected(false);
      } finally {
        checking = false;
      }
    };

    void checkPC();
    const timer = setInterval(() => { void checkPC(); }, 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  const handleVoiceData = async (uri: string) => {
    if (!apiConnector || !uri) return Alert.alert('音声入力', 'API接続後に録音してください');
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const response = await apiConnector.sendVoiceMessage({ audioUrl: `data:audio/mp4;base64,${base64}`, language: 'ja' });
      if (!response.success || !response.data) throw new Error(response.error || '文字起こしに失敗しました');
      const transcript = typeof response.data.message === 'string' ? response.data.message : response.data.message.content;
      setInput(transcript);
      Alert.alert('文字起こし完了', '内容を確認して送信してください。');
    } catch (error) {
      Alert.alert('音声入力エラー', error instanceof Error ? error.message : '音声を処理できませんでした');
    }
  };

  const pickDocument = async () => {
    if (isAnalyzingImage || isLoading) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      if (result.assets.length > 6) throw new Error('一度に選択できる資料は6件までです');
      if (!apiConnector || !isAuthenticated || !(isConnected || await apiConnector.checkConnectivity())) {
        throw new Error('資料解析にはPC版への接続とログインが必要です');
      }
      setIsAnalyzingImage(true);
      // Reset old selection before a new upload; partial failures must not reuse old evidence.
      analyzedDocumentsRef.current = [];
      lastDocumentAnalysisRef.current = '';
      const uploadedFiles: Array<{ file: string; type: 'pdf' | 'xlsx'; name: string }> = [];
      for (const item of result.assets) {
        const type: 'pdf' | 'xlsx' | null = item.name.toLowerCase().endsWith('.xlsx') ? 'xlsx'
          : item.name.toLowerCase().endsWith('.pdf') ? 'pdf' : null;
        if (!type) throw new Error('PDFまたはXLSXファイルを選択してください');
        if (typeof item.size === 'number' && item.size > 10 * 1024 * 1024) {
          throw new Error(item.name + ' は10MBを超えています');
        }
        const base64 = await FileSystem.readAsStringAsync(item.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const uploaded = await apiConnector.executeUnifiedTool('uploadDocument', {
          fileName: item.name, type, base64,
        });
        if (!uploaded.success || !uploaded.data || typeof uploaded.data !== 'object') {
          throw new Error(uploaded.error || 'アップロードに失敗しました: ' + item.name);
        }
        const file = (uploaded.data as { file?: unknown }).file;
        if (typeof file !== 'string' || !file) throw new Error('資料の保存先を取得できませんでした');
        uploadedFiles.push({ file, type, name: item.name });
      }
      const question = '各資料の重要数値と根拠を比較・分析し、結論と改善方針を日本語で示してください。推測値を作らないでください。';
      const analyzed = uploadedFiles.length === 1
        ? await apiConnector.executeUnifiedTool('analyzeDocument', {
            file: uploadedFiles[0].file, type: uploadedFiles[0].type, question,
          })
        : await apiConnector.executeUnifiedTool('analyzeMultipleDocuments', {
            files: uploadedFiles.map(({ file, type }) => ({ file, type })), question,
          });
      if (!analyzed.success || !analyzed.data || typeof analyzed.data !== 'object') {
        throw new Error(analyzed.error || '資料解析に失敗しました');
      }
      const answer = (analyzed.data as { answer?: unknown }).answer;
      if (typeof answer !== 'string' || !answer.trim()) throw new Error('解析結果が空です');
      analyzedDocumentsRef.current = uploadedFiles;
      lastDocumentAnalysisRef.current = answer;
      await saveOfficeSession().catch(error => console.warn('Office作業状態を保存できませんでした:', error));
      const now = Date.now();
      setMessages(prev => [...prev,
        { id: 'file-' + now, text: '📎 ' + uploadedFiles.map(x => x.name).join('、'), isUser: true, timestamp: now },
        { id: 'analysis-' + now, text: answer + '\n\n追加質問は「/資料質問 質問内容」で送信できます。', isUser: false, timestamp: now },
      ]);
    } catch (error) {
      Alert.alert('資料解析エラー', error instanceof Error ? error.message : '資料を解析できませんでした');
    } finally {
      setIsAnalyzingImage(false);
    }
  };
  const pickAttachment = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.65
      });
      if (result.canceled) return;
      if (!apiConnector) {
        Alert.alert('接続が必要です', '画像の解析にはPC接続が必要です');
        return;
      }
      const image = result.assets[0];
      const base64 = image.base64 ||
        await FileSystem.readAsStringAsync(image.uri, {
          encoding: FileSystem.EncodingType.Base64
        });
      setIsAnalyzingImage(true);
      const response = await apiConnector.analyzeImage(
        `data:${image.mimeType || 'image/jpeg'};base64,${base64}`
      );
      if (!response.success || !response.data)
        throw new Error(response.error || '画像解析に失敗しました');
      setMessages(prev => [...prev, {
        id: `attachment-${Date.now()}`,
        text: response.data!.analysis,
        isUser: false,
        timestamp: Date.now()
      }]);
    } catch (error) {
      Alert.alert('添付エラー',
        error instanceof Error ? error.message : '画像を処理できませんでした');
    } finally {
      setIsAnalyzingImage(false);
    }
  };
  const handleOpenCamera = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) return Alert.alert('カメラ権限', '画像読み取りにはカメラ権限が必要です。');
    }
    setCameraOpen(true);
  };

  const handleCaptureAndAnalyze = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.65 });
      if (!photo?.base64 || !apiConnector) throw new Error('画像を取得できませんでした');
      setCameraOpen(false);
      setIsAnalyzingImage(true);
      const response = await apiConnector.analyzeImage(`data:image/jpeg;base64,${photo.base64}`);
      if (!response.success || !response.data) throw new Error(response.error || '画像分析に失敗しました');
      setMessages(prev => [...prev, { id: `ocr-${Date.now()}`, text: response.data!.analysis, isUser: false, timestamp: Date.now() }]);
    } catch (error) {
      Alert.alert('画像読み取りエラー', error instanceof Error ? error.message : '画像を処理できませんでした');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  useEffect(() => {
    if (!showHistory || !isConnected || !apiConnector) return;
    const historyRefreshTimer = setInterval(() => {
      void apiConnector.getChatSessions().then(result => { if (result.success && result.data) setChatSessions(result.data); }).catch(console.error);
    }, 10000);
    return () => clearInterval(historyRefreshTimer);
  }, [showHistory, isConnected, apiConnector]);
  // API コネクタの初期化
  useEffect(() => {
    const initializeAPI = async () => {
      if (localHistoryLoad.current) {
        await localHistoryLoad.current;
      }
      try {
        // app.config.js から apiBaseUrl を取得
        if (await AsyncStorage.getItem('POIPOI_PC_DISCONNECTED') === '1') return;
        const apiBaseUrl = (await AsyncStorage.getItem('POIPOI_PC_URL')) || Constants.expoConfig?.extra?.apiBaseUrl;
        if (typeof apiBaseUrl !== "string" || !apiBaseUrl.trim()) {
          return;
        }
        if (__DEV__) console.log("[ChatScreen] API Base URL:", apiBaseUrl);

      const connector = new MobileAPIConnector(apiBaseUrl);
      setApiConnector(connector);
      const hasSavedSession = await connector.initialize();
      
      // Initialize session
      const savedSessionId = hasSavedSession ? connector.getSessionId() : null;
      setSessionId(savedSessionId || undefined);
        // 接続確認
        const connected = await connector.checkConnectivity();
        let authenticated = false;
        if (connected && hasSavedSession) {
          try {
            const authResponse = await connector.checkAuthentication();
            authenticated = authResponse;
          } catch {
            authenticated = false;
          }
        }
        setIsAuthenticated(authenticated);
        if (connected && savedSessionId) {
          const sessions = await connector.getChatSessions();
          if (sessions.success && sessions.data?.some(s => s.id === savedSessionId)) {

            const history = await connector.getChatHistory(savedSessionId);
            if (history.success && history.data?.length) {
              setMessages(history.data.map((message) => ({
                id: message.id,
                text: message.content,
                isUser: message.role === 'user',
                timestamp: message.timestamp,
              })));
            }
      
          } else {
            // 端末内の会話履歴を保持
          }
        }
        setIsConnected(connected);
        if (__DEV__) console.log("[ChatScreen] Backend connectivity:", connected);

        if (!connected) {
          console.info("[PoiPoi] オフラインAIモード");
        }
      } catch (error) {
        console.error("[ChatScreen] API initialization error:", error);
        console.info("[PoiPoi] ローカルAIに切り替えました");
      }
    };

    initializeAPI();
  }, []);

  const pcConnectionBusyRef = React.useRef(false);
  const analyzedDocumentsRef = React.useRef<Array<{ file: string; type: 'pdf' | 'xlsx'; name: string }>>([]);
  const lastDocumentAnalysisRef = React.useRef('');
  const documentOwnerRef = React.useRef('');
  const officeSessionKeyRef = React.useRef('');
  const officeCommand = (value: string) => /^\/資料質問\s|^\/資料PPT(?:\s|$)/.test(value);
  const saveOfficeSession = async () => {
    if (!officeSessionKeyRef.current) return;
    await AsyncStorage.setItem(officeSessionKeyRef.current, JSON.stringify({
      files: analyzedDocumentsRef.current,
      analysis: lastDocumentAnalysisRef.current,
    }));
  };

  const handleSend = async () => {
    const command = input.trim();
    // POIPOI_PC_EVOLUTION_INTEGRATION_V1
    // POIPOI_PC_EVOLUTION_RESULT_COMMAND_V2
    if (command === '/PC進化結果') {
      if (isLoading || pcConnectionBusyRef.current) return;

      pcConnectionBusyRef.current = true;
      setIsLoading(true);
      setInput('');

      try {
        const url =
          (await AsyncStorage.getItem('POIPOI_PC_URL')) ||
          Constants.expoConfig?.extra?.apiBaseUrl;

        const disconnected =
          await AsyncStorage.getItem('POIPOI_PC_DISCONNECTED');

        if (
          disconnected !== '1' &&
          typeof url === 'string' &&
          url.trim()
        ) {
          await synchronizeMobilePoiPoiState(url);
          await MobileSelfEvolution.restoreEvolutionFromUnifiedState();
          await MobileSelfEvolution.applyPcEvolutionResults();
        }

        const latest = await MobileSelfEvolution.getLatestPcEvolutionResult();

        const resultText = latest
          ? JSON.stringify(latest, null, 2)
          : 'PC自己進化結果はありません。';

        setMessages(prev => [...prev, {
          id: `pc-evolution-result-${Date.now()}`,
          text: resultText,
          isUser: false,
          timestamp: Date.now(),
        }]);
      } catch (error) {
        setMessages(prev => [...prev, {
          id: `pc-evolution-error-${Date.now()}`,
          text: 'PC自己進化結果の取得失敗: ' +
            (error instanceof Error ? error.message : String(error)),
          isUser: false,
          timestamp: Date.now(),
        }]);
      } finally {
        pcConnectionBusyRef.current = false;
        setIsLoading(false);
      }

      return;
    }
    if (command === '/PC進化履歴' || command === '/PC進化状態') {
      if (isLoading || pcConnectionBusyRef.current) return;

      pcConnectionBusyRef.current = true;
      setIsLoading(true);
      setInput('');

      const appendEvolutionMessage = (text: string) => {
        setMessages(prev => [...prev, {
          id: `pc-evolution-${Date.now()}`,
          text,
          isUser: false,
          timestamp: Date.now(),
        }]);
      };

      try {
        const disconnected =
          await AsyncStorage.getItem('POIPOI_PC_DISCONNECTED');

        const url =
          (await AsyncStorage.getItem('POIPOI_PC_URL')) ||
          Constants.expoConfig?.extra?.apiBaseUrl;

        if (
          disconnected !== '1' &&
          typeof url === 'string' &&
          url.trim()
        ) {
          try {
            await synchronizeMobilePoiPoiState(url);
            await MobileSelfEvolution.restoreEvolutionFromUnifiedState();
            await MobileSelfEvolution.applyPcEvolutionResults();
          } catch (error) {
            console.warn('[PoiPoi] PC進化同期:', error);
          }
        }

        const history =
          await MobileSelfEvolution.getPcEvolutionHistory(100);

        const runs = history.filter((item): item is {
          runId: string;
          outcome: string;
          completedAt: number;
          changesApplied: number;
          rollbacks: number;
          error?: string;
        } => {
          if (!item || typeof item !== 'object') return false;
          const value = item as Record<string, unknown>;
          return (
            typeof value.runId === 'string' &&
            typeof value.outcome === 'string' &&
            typeof value.completedAt === 'number' &&
            typeof value.changesApplied === 'number' &&
            typeof value.rollbacks === 'number'
          );
        });

        if (command === '/PC進化状態') {
          const executed = runs.filter(
            run => run.outcome === 'executed'
          ).length;

          const errors = runs.filter(
            run => run.outcome === 'error'
          ).length;

          const applied = runs.reduce(
            (total, run) => total + run.changesApplied, 0
          );

          const rollbacks = runs.reduce(
            (total, run) => total + run.rollbacks, 0
          );

          appendEvolutionMessage([
            'PC自己進化状態',
            `取得履歴: ${runs.length}件`,
            `実行: ${executed}件`,
            `エラー: ${errors}件`,
            `適用変更: ${applied}件`,
            `ロールバック: ${rollbacks}件`,
            `PC接続: ${isConnected ? '接続中' : '未接続'}`,
            '※PCでの変更をAndroidへ自動適用したことは意味しません。',
          ].join('\n'));
        } else {
          appendEvolutionMessage(
            runs.length === 0
              ? 'PC自己進化履歴はありません。'
              : runs.slice(0, 20).map((run, index) => [
                  `${index + 1}. ${new Date(run.completedAt).toLocaleString()}`,
                  `結果: ${run.outcome}`,
                  `変更: ${run.changesApplied}件`,
                  `ロールバック: ${run.rollbacks}件`,
                  run.error ? `エラー: ${run.error}` : '',
                ].filter(Boolean).join('\n')).join('\n\n')
          );
        }
      } catch (error) {
        appendEvolutionMessage(
          'PC自己進化情報の取得に失敗しました: ' +
          (error instanceof Error ? error.message : String(error))
        );
      } finally {
        pcConnectionBusyRef.current = false;
        setIsLoading(false);
      }

      return;
    }


    if (isLoading || pcConnectionBusyRef.current) return;

    if (
      command === '/PC状態' ||
      command === '/PC切断' ||
      command === '/PC再接続' ||
      command === '/PCヘルプ' ||
      command.startsWith('/PC接続 ')
    ) {
      if (pcConnectionBusyRef.current || isLoading) return;

      pcConnectionBusyRef.current = true;
      setIsLoading(true);

      try {
        if (command === '/PCヘルプ') {
          Alert.alert(
            'PoiPoi PC接続',
            '/PC接続 http://192.168.1.6:3000\n' +
            '/PC再接続\n' +
            '/PC状態\n' +
            '/PC切断\n\n' +
            '同一Wi-Fiまたはインターネット経由で接続できます。'
          );
          setInput('');
          return;
        }

        if (command === '/PC再接続') {
          const savedURL = await AsyncStorage.getItem('POIPOI_PC_URL');

          if (!savedURL) {
            throw new Error(
              'PC接続先が未設定です。/PC接続 URL で設定してください。'
            );
          }

          const reconnectURL = savedURL.trim();

          if (
            reconnectURL.length > 2048 ||
            /[?#@\s]/.test(reconnectURL) ||
            !/^https?:\/\/[a-zA-Z0-9.-]+(?::\d{1,5})?(?:\/[^\s]*)?$/.test(reconnectURL)
          ) {
            throw new Error('保存されたPC接続先が不正です。');
          }

          if (
            /^http:\/\//i.test(reconnectURL) &&
            !/^http:\/\/(?:localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?::\d{1,5})?(?:\/|$)/i.test(reconnectURL)
          ) {
            throw new Error('インターネット経由のPC接続にはHTTPSが必要です。');
          }

          const reconnectPort = reconnectURL.match(
            /^https?:\/\/[^/]+:(\d+)(?:\/|$)/i
          );

          if (
            reconnectPort &&
            (Number(reconnectPort[1]) < 1 ||
              Number(reconnectPort[1]) > 65535)
          ) {
            throw new Error('保存されたPC接続先のポート番号が不正です。');
          }

          const connector = new MobileAPIConnector(reconnectURL);
          await connector.initialize();

          const connected = await connector.checkConnectivity();

          if (!connected) {
            throw new Error(
              'PCに再接続できません。スマホ単独動作は継続できます。'
            );
          }

          await AsyncStorage.setItem('POIPOI_PC_URL', reconnectURL);
          await AsyncStorage.removeItem('POIPOI_PC_DISCONNECTED');
          setApiConnector(connector);
          setIsAuthenticated(await connector.checkAuthentication());
          setIsConnected(true);
          setSessionId(connector.getSessionId() || undefined);
          setInput('');

          Alert.alert('PoiPoi', 'PCへの再接続が完了しました。');
          return;
        }
        if (command === '/PC切断') {
          await AsyncStorage.setItem('POIPOI_PC_DISCONNECTED', '1');
          await AsyncStorage.removeItem('POIPOI_PC_URL');
          setApiConnector(null);
          setIsConnected(false);
          setIsAuthenticated(false);
          documentOwnerRef.current = '';
          officeSessionKeyRef.current = '';
          analyzedDocumentsRef.current = [];
          lastDocumentAnalysisRef.current = '';
          setSessionId(undefined);
          setChatSessions([]);
          setShowHistory(false);
          setShowLogin(false);
          setInput('');

          Alert.alert(
            'PoiPoi',
            'PCとの接続を解除しました。スマホ単独で利用できます。'
          );
          return;
        }

        if (command === '/PC状態') {
          const savedURL = await AsyncStorage.getItem('POIPOI_PC_URL');

          Alert.alert(
            'PC接続状態',
            '状態: ' + (isConnected ? '接続中' : '未接続') +
            '\n接続先: ' + (savedURL || '未設定')
          );

          setInput('');
          return;
        }

        const rawURL = command.slice('/PC接続 '.length).trim();
        const url = rawURL.replace(/\/+$/, '');

        if (
          /[?#@]/.test(url) ||
          /[\u0000-\u001f\u007f]/.test(url)
        ) {
          throw new Error(
            'PC接続先には認証情報・クエリ・制御文字を含めないでください。'
          );
        }

        const portMatch = url.match(/^https?:\/\/[^/]+:(\d+)(?:\/|$)/i);

        if (
          portMatch &&
          (Number(portMatch[1]) < 1 || Number(portMatch[1]) > 65535)
        ) {
          throw new Error('ポート番号は1～65535で指定してください。');
        }

        if (
          /^http:\/\//i.test(url) &&
          !/^http:\/\/(?:localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?::\d{1,5})?(?:\/|$)/i.test(url)
        ) {
          throw new Error(
            'インターネット経由の接続にはHTTPSを使用してください。'
          );
        }

        if (
          !/^https?:\/\/[a-zA-Z0-9.-]+(?::\d{1,5})?(?:\/[^\s]*)?$/.test(url) ||
          url.length > 2048
        ) {
          throw new Error(
            '接続先を指定してください。例: /PC接続 http://192.168.1.6:3000'
          );
        }

        const connector = new MobileAPIConnector(url);
        await connector.initialize();

        const connected = await connector.checkConnectivity();

        if (!connected) {
          throw new Error(
            'PCに接続できません。PC版の起動とネットワークを確認してください。'
          );
        }

        await AsyncStorage.setItem('POIPOI_PC_URL', url);
        await AsyncStorage.removeItem('POIPOI_PC_DISCONNECTED');

        setApiConnector(connector);
        setIsAuthenticated(await connector.checkAuthentication());
        setIsConnected(true);
        setSessionId(connector.getSessionId() || undefined);
        setInput('');

        Alert.alert(
          'PoiPoi',
          'PCに接続しました。\n' + url
        );
      } catch (error) {

        if (command === '/PC再接続') {
          setInput(command);
        }

        Alert.alert(
          'PC接続エラー',
          error instanceof Error ? error.message : String(error)
        );
      } finally {
        pcConnectionBusyRef.current = false;
        setIsLoading(false);
      }

      return;
    }
      const numberedEvolutionCommands = [
        '/進化登録 ',
        '/進化無効 ',
        '/進化設計確認 ',
        '/進化設計 ',
        '/進化承認 ',
        '/進化実行 ',
        '/進化状態 ',
      ];

      const matchedEvolutionCommand = numberedEvolutionCommands.find(
        command => input.startsWith(command)
      );

      if (matchedEvolutionCommand) {
        const argument = input.slice(matchedEvolutionCommand.length).trim();
        const numberPart = argument.split(/\s+/)[0];

        if (
          !/^[1-9]\d*$/.test(numberPart) ||
          !Number.isSafeInteger(Number(numberPart))
        ) {
          Alert.alert('入力エラー', '有効な機能番号を指定してください');
          return;
        }

        if (
          matchedEvolutionCommand === '/進化実行 ' &&
          !/^[1-9]\d*\s+\S[\s\S]*$/.test(argument)
        ) {
          Alert.alert(
            '入力エラー',
            '使い方: /進化実行 1 依頼内容'
          );
          return;
        }
      }

    if (!input.trim() || isLoading) return;

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isUser: true,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {

      // API にメッセージを送信
      let response: any;

      if (
        apiConnector &&
        !input.trim().startsWith('/進化') &&
        isAuthenticated &&
        (isConnected || await apiConnector.checkConnectivity())
      ) {
        if (!isConnected) setIsConnected(true);
        try {
          const costMatch = input.trim().match(/^\/原価\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)$/);
          if (costMatch) {
            const cost = await apiConnector.executeUnifiedTool('analyzeCost', {
              estimated: Number(costMatch[1]), actual: Number(costMatch[2]), quantity: Number(costMatch[3]),
            });
            response = cost.success
              ? { success: true, data: { message: JSON.stringify(cost.data, null, 2) } }
              : cost;
          } else if (input.trim().startsWith('/資料質問 ')) {
            const question = input.trim().slice('/資料質問 '.length).trim();
            const docs = analyzedDocumentsRef.current;
            if (!question || !docs.length) throw new Error('先にPDF・Excel資料を添付してください');
            const analyzed = docs.length === 1
              ? await apiConnector.executeUnifiedTool('analyzeDocument', {
                  file: docs[0].file, type: docs[0].type, question,
                })
              : await apiConnector.executeUnifiedTool('analyzeMultipleDocuments', {
                  files: docs.map(({ file, type }) => ({ file, type })), question,
                });
            if (!analyzed.success || !analyzed.data || typeof analyzed.data !== 'object') {
              throw new Error(analyzed.error || '追加質問の解析に失敗しました');
            }
            const answer = (analyzed.data as { answer?: unknown }).answer;
            if (typeof answer !== 'string' || !answer.trim()) throw new Error('回答がありません');
            lastDocumentAnalysisRef.current = answer;
            await saveOfficeSession().catch(error => console.warn('Office作業状態を保存できませんでした:', error));
            response = { success: true, data: { message: answer } };
          } else if (input.trim().startsWith('/資料PPT ')) {
            const request = input.trim().slice('/資料PPT '.length).trim();
            const split = request.indexOf('｜');
            const title = (split >= 0 ? request.slice(0, split) : request).trim();
            const analysis = (split >= 0 ? request.slice(split + 1) : lastDocumentAnalysisRef.current).trim();
            if (!title || !analysis) {
              throw new Error('先にPDF・Excel資料を解析するか「/資料PPT タイトル｜分析結果」を入力してください');
            }
            const created = await apiConnector.executeUnifiedTool('createPresentationFromAnalysis', {
              title, analysis,
            });
            if (!created.success || !created.data || typeof created.data !== 'object') {
              throw new Error(created.error || 'PowerPoint作成に失敗しました');
            }
            const presentationId = (created.data as { id?: unknown }).id;
            if (typeof presentationId !== 'string' || !presentationId) {
              throw new Error('PowerPointの作成IDが取得できませんでした');
            }
            const exported = await apiConnector.executeUnifiedTool('exportPresentation', { id: presentationId });
            if (!exported.success || !exported.data || typeof exported.data !== 'object') {
              throw new Error(exported.error || 'PowerPointの出力に失敗しました');
            }
            const fileBase64 = (exported.data as { base64?: unknown }).base64;
            if (typeof fileBase64 !== 'string' || !fileBase64 || fileBase64.length > 28_000_000) {
              throw new Error('PowerPointファイルが空、または保存上限を超えています');
            }
            if (!FileSystem.documentDirectory) {
              throw new Error('端末のファイル保存領域が利用できません');
            }
            const safeTitle = title.replace(/[\\/:*?"<>|\\x00-\\x1f]/g, '_').slice(0, 60) || 'PoiPoi';
            const destination = FileSystem.documentDirectory + safeTitle + '-' + Date.now() + '.pptx';
            await FileSystem.writeAsStringAsync(destination, fileBase64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            if (await Sharing.isAvailableAsync()) {
              try {
                await Sharing.shareAsync(destination, {
                  mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  dialogTitle: 'PoiPoi PowerPointを共有',
                  UTI: 'org.openxmlformats.presentationml.presentation',
                });
              } catch (shareError) {
                console.warn('PowerPoint共有を開けませんでした。ファイルは保存済みです:', shareError);
              }
            }
            response = {
              success: true,
              data: { message: 'PowerPointを端末内に保存しました。\n' + destination },
            };
          } else if (input.trim().startsWith('/計画 ')) {
            const planned = await apiConnector.planAndExecute(input.trim().slice('/計画 '.length));
            response = planned.success
              ? { success: true, data: { message: JSON.stringify(planned.data, null, 2) } }
              : planned;
          } else {
          response = await apiConnector.sendChatMessage({
            message: input,
            sessionId: sessionId,
            context: {
              poipoiConversation: messages
                .filter(m => m.id !== '0')
                .slice(-12)
                .map(m => ({
                  role: m.isUser ? 'user' : 'assistant',
                  content: m.text,
                })),
              source: 'poipoi-mobile',
            },
          });
          }

          if (!response.success) {
            throw new Error(response.error || 'API エラー');
          }
        } catch (error) {
          console.warn('サーバー通信失敗:', error);
          if (officeCommand(input.trim())) {
            response = { success: true, data: { message: error instanceof Error ? error.message : '資料処理に失敗しました' } };
          } else {
            setIsConnected(false);
            response = undefined;
          }
        }
      }

      if (!response?.success && officeCommand(input.trim())) {
        response = {
          success: true,
          data: { message: '資料の解析・PowerPoint作成にはPC版PoiPoiへの接続とログインが必要です。PC接続を確認して再実行してください。' },
        };
      }

      if (!response?.success) {
        response = {
          success: true,
          data: {
            message: await (input.trim() === '/進化復旧'
  ? MobileSelfEvolution.restorePreviousEvolutionData()
  : input.trim() === '/進化復旧バックアップ'
    ? MobileSelfEvolution.getPreviousEvolutionBackup().then(async json => {
        await Share.share({
          title: 'PoiPoi 復元前バックアップ',
          message: json,
        });
        return '復元前バックアップの共有画面を開きました';
      })
    : input.trim() === '/進化バックアップ'
  ? MobileSelfEvolution.exportEvolutionData().then(async json => {
        const result = await Share.share({
          title: 'PoiPoi 自己進化バックアップ',
          message: json,
        });
        return result.action === Share.dismissedAction
          ? 'バックアップの共有をキャンセルしました'
          : 'バックアップの共有先を選択しました';
      })
  : input.startsWith('/進化復元 ')
    ? MobileSelfEvolution.importEvolutionDataExclusive(
        input.slice('/進化復元 '.length).trim()
      ).then(() => '自己進化データを復元しました')
    : input.trim() === '/進化ヘルプ' ? Promise.resolve([
  '/進化 機能名：提案作成',
  '/進化一覧：提案一覧',
  '/進化承認 1：承認',
  '/進化設計 1：設計生成',
  '/進化設計確認 1：設計表示',
  '/進化登録 1：登録',
  '/進化登録一覧：登録一覧',
  '/進化状態 1：状態確認',
  '/進化実行 1 内容：ローカルAI応答',
  '/進化無効 1：登録解除',
  '/進化バックアップ：自己進化データを書き出す',
  '/進化復元 JSON：バックアップから復元'
].join('\n')) : input.startsWith('/進化実行 ') ? (() => {
  const args = input.slice('/進化実行 '.length).trim();
  const match = args.match(/^(\d+)\s+([\s\S]+)$/);
  if (!match) return Promise.reject(new Error('使い方: /進化実行 1 内容'));
  return MobileSelfEvolution.executeFeature(Number(match[1]) - 1, match[2]);
})() : input.startsWith('/進化状態 ') ? MobileSelfEvolution.getFeatureStatus(Number(input.slice('/進化状態 '.length).trim()) - 1) : input.startsWith('/進化無効 ') ? MobileSelfEvolution.deactivateFeatureExclusive(Number(input.slice('/進化無効 '.length).trim()) - 1) : input.trim() === '/進化登録一覧' ? MobileSelfEvolution.getActiveFeatures() : input.startsWith('/進化登録 ') ? MobileSelfEvolution.activateFeatureExclusive(Number(input.slice('/進化登録 '.length).trim()) - 1) : input.startsWith('/進化設計確認 ') ? MobileSelfEvolution.getFeatureDesign(Number(input.slice('/進化設計確認 '.length).trim()) - 1) : input.startsWith('/進化設計 ') ? MobileSelfEvolution.generateFeatureDesignExclusive(Number(input.slice('/進化設計 '.length).trim()) - 1) : input.startsWith('/進化承認 ') ? MobileSelfEvolution.approveAndSaveExclusive(Number(input.slice(6).trim()) - 1).then(f => '承認しました: ' + f.request) : input.trim() === '/進化一覧' ? MobileSelfEvolution.getProposals().then(list => list.length ? list.map((f,i) => (i+1) + '. [' + f.status + '] ' + f.request).join('\n') : '提案はありません') : input.startsWith('/進化 ') ? MobileSelfEvolution.proposeExclusive(input.slice(4)).then(r => r.proposal) : replyWithLocalIdentity(input, () => AndroidLocalAI.sendMessage(input))),
          },
        };
      }

      if (response.success && response.data) {
        // Extract message content from ChatMessage object
        // response.data structure: { message: ChatMessage, session: ChatSession, ... }
        const messageContent = typeof response.data.message === 'string'
          ? response.data.message
          : response.data.message?.content || "応答がありません";
        const assistantMessage: Message = {
          id: typeof response.data.message === 'object' && response.data.message?.id
            ? response.data.message.id
            : (Date.now() + 1).toString(),
          text: extractAIMessage(messageContent),
          isUser: false,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Update session ID if provided
        if (response.data.session?.id || apiConnector?.getSessionId()) {
          setSessionId(response.data.session?.id || apiConnector?.getSessionId() || undefined);
        }
      } else {
        throw new Error(response.error || "API エラー");
      }
    } catch (error) {
      if (apiConnector && isConnected) {
        try {
          const localAnswer = await replyWithLocalIdentity(input, () => AndroidLocalAI.sendMessage(input));
          setIsConnected(false);
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            text: localAnswer,
            isUser: false,
            timestamp: Date.now()
          }]);
          return;
        } catch (localError) {
          console.error("[ChatScreen] Local AI fallback error:", localError);
          const reason = localError instanceof Error ? localError.message : String(localError);
          setMessages(prev => [...prev, {
            id: (Date.now() + 2).toString(),
            text: `スマホAIの起動に失敗しました: ${reason}`,
            isUser: false,
            timestamp: Date.now()
          }]);
          return;
        }
      }
      console.error("[ChatScreen] Send message error:", error);
      const errorText = error instanceof Error ? error.message : "不明なエラー";
      console.error("[ChatScreen] Full error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: `エラーが発生しました: ${errorText}`,
        isUser: false,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View>{modelDownloadProgress !== null && <Text>{modelDownloadProgress === 100 ? 'AIモデルのダウンロード完了' : `AIモデル取得中：${modelDownloadProgress}%`}</Text>}</View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🦝 PoiPoi</Text>
        <Text onPress={() => { void openChatHistory(); }}>履歴</Text>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? "#4CAF50" : "#FF9800" }]} />
          <Text style={styles.statusText}>{isConnected ? "PC接続済み" : "スマホAI（PC未接続）"}</Text>
        </View>
      </View>


      {showHistory && (
        <View style={{ padding: 12 }}>
          <Text onPress={() => setShowHistory(false)}>閉じる</Text>
          {!isConnected && (
            <Text>端末に保存された現在の会話を表示中です</Text>
          )}
          {chatSessions.map(s => (
            <Text key={s.id} onPress={() => { void openChatSession(s.id); }} style={{ padding: 10 }}>
              {s.title || s.id}
            </Text>
          ))}
        </View>
      )}
      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={1}
            disabled={item.isUser}
            onLongPress={() => rateAssistantAnswer(item)}
            style={[styles.messageContainer, item.isUser && styles.userMessage]}>
            <Text
              style={[styles.messageText, item.isUser && styles.userMessageText]}
              onLongPress={() => rateAssistantAnswer(item)}
            >
              {item.text}
            </Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.messagesList}
      />

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text style={styles.loadingText}>応答中...</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.mediaActions}>
        
      </View>
      <View style={styles.inputArea}>
        <TouchableOpacity
          style={{ justifyContent: 'center', paddingHorizontal: 8 }}
          onPress={() => { void pickAttachment(); }}
        >
          <Text style={{ fontSize: 32, color: '#06b6d4' }}>＋</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="メッセージを入力"
          placeholderTextColor="#999"
          editable={!isLoading}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isLoading || !input.trim()}
        >
          <Text style={styles.sendButtonText}>送信</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={styles.cameraActions}>
            <TouchableOpacity style={styles.mediaButton} onPress={() => setCameraOpen(false)}><Text style={styles.mediaButtonText}>閉じる</Text></TouchableOpacity>
            <TouchableOpacity style={styles.sendButton} onPress={handleCaptureAndAnalyze}><Text style={styles.sendButtonText}>撮影して文字を読む</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000"
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusText: {
    fontSize: 12,
    color: "#666"
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  messageContainer: {
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    maxWidth: "80%"
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#06b6d4"
  },
  messageText: {
    fontSize: 16,
    color: "#000"
  },
  userMessageText: {
    color: "#fff"
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginTop: 4
  },
  loadingContainer: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666"
  },
  inputArea: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    gap: 8
  },
  mediaActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 12, paddingTop: 8 },
  mediaButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: '#eef2ff' },
  mediaButtonText: { color: '#1e3a8a', fontWeight: '600' },
  cameraContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  camera: { flex: 1 },
  cameraActions: { padding: 16, flexDirection: 'row', justifyContent: 'space-around' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100
  },
  sendButton: {
    backgroundColor: "#06b6d4",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: "center"
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14
  }
});

/* POIPOI_UNIFIED_STATE_EFFECT_V1 */