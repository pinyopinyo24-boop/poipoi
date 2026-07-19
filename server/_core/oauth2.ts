import crypto from 'crypto';

interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  provider: 'google' | 'github' | 'microsoft';
}

interface OAuth2Token {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  idToken?: string;
}

interface OAuth2User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
}

export class OAuth2Manager {
  private configs: Map<string, OAuth2Config> = new Map();
  private tokens: Map<string, OAuth2Token> = new Map();

  registerProvider(provider: string, config: OAuth2Config) {
    this.configs.set(provider, config);
  }

  generateAuthorizationUrl(provider: string, state?: string): string {
    const config = this.configs.get(provider);
    if (!config) throw new Error(`Provider ${provider} not configured`);

    const stateParam = state || crypto.randomBytes(32).toString('hex');
    const scope = this.getProviderScope(provider);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope,
      state: stateParam,
    });

    const baseUrls: Record<string, string> = {
      google: 'https://accounts.google.com/o/oauth2/v2/auth',
      github: 'https://github.com/login/oauth/authorize',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    };

    return `${baseUrls[provider]}?${params.toString()}`;
  }

  async exchangeCodeForToken(provider: string, code: string): Promise<OAuth2Token> {
    const config = this.configs.get(provider);
    if (!config) throw new Error(`Provider ${provider} not configured`);

    const tokenEndpoints: Record<string, string> = {
      google: 'https://oauth2.googleapis.com/token',
      github: 'https://github.com/login/oauth/access_token',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    };

    const response = await fetch(tokenEndpoints[provider], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const data = await response.json() as any;

    const token: OAuth2Token = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      idToken: data.id_token,
    };

    return token;
  }

  async getUserInfo(provider: string, accessToken: string): Promise<OAuth2User> {
    const userEndpoints: Record<string, string> = {
      google: 'https://www.googleapis.com/oauth2/v2/userinfo',
      github: 'https://api.github.com/user',
      microsoft: 'https://graph.microsoft.com/v1.0/me',
    };

    const response = await fetch(userEndpoints[provider], {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json() as any;

    return {
      id: data.id || data.sub,
      email: data.email,
      name: data.name || data.login,
      avatar: data.picture || data.avatar_url,
      provider,
    };
  }

  async refreshAccessToken(provider: string, refreshToken: string): Promise<OAuth2Token> {
    const config = this.configs.get(provider);
    if (!config) throw new Error(`Provider ${provider} not configured`);

    const tokenEndpoints: Record<string, string> = {
      google: 'https://oauth2.googleapis.com/token',
      github: 'https://github.com/login/oauth/access_token',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    };

    const response = await fetch(tokenEndpoints[provider], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const data = await response.json() as any;

    const token: OAuth2Token = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };

    return token;
  }

  private getProviderScope(provider: string): string {
    const scopes: Record<string, string> = {
      google: 'openid email profile',
      github: 'user:email read:user',
      microsoft: 'openid profile email',
    };
    return scopes[provider] || '';
  }
}

export const oauth2Manager = new OAuth2Manager();
