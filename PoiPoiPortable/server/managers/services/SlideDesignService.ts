/**
 * PoiPoi SlideDesignService
 * スライドデザイン・テーマ管理
 */

export interface SlideDesignTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  fonts: {
    title: string;
    body: string;
  };
}

export class SlideDesignService {
  private themes: Map<string, SlideDesignTheme> = new Map();

  constructor() {
    this.initializeDefaultThemes();
  }

  private initializeDefaultThemes(): void {
    const defaultThemes: SlideDesignTheme[] = [
      {
        id: 'professional',
        name: 'Professional',
        colors: {
          primary: '#1F4788',
          secondary: '#4A90E2',
          background: '#FFFFFF',
          text: '#333333',
        },
        fonts: {
          title: 'Arial, sans-serif',
          body: 'Calibri, sans-serif',
        },
      },
      {
        id: 'creative',
        name: 'Creative',
        colors: {
          primary: '#FF6B6B',
          secondary: '#FFE66D',
          background: '#FAFAFA',
          text: '#2C3E50',
        },
        fonts: {
          title: 'Georgia, serif',
          body: 'Verdana, sans-serif',
        },
      },
      {
        id: 'minimal',
        name: 'Minimal',
        colors: {
          primary: '#000000',
          secondary: '#808080',
          background: '#FFFFFF',
          text: '#000000',
        },
        fonts: {
          title: 'Helvetica, sans-serif',
          body: 'Helvetica, sans-serif',
        },
      },
      {
        id: 'corporate',
        name: 'Corporate',
        colors: {
          primary: '#003366',
          secondary: '#0066CC',
          background: '#F5F5F5',
          text: '#333333',
        },
        fonts: {
          title: 'Arial, sans-serif',
          body: 'Arial, sans-serif',
        },
      },
      {
        id: 'dark',
        name: 'Dark',
        colors: {
          primary: '#1A1A1A',
          secondary: '#404040',
          background: '#0D0D0D',
          text: '#FFFFFF',
        },
        fonts: {
          title: 'Arial, sans-serif',
          body: 'Arial, sans-serif',
        },
      },
    ];

    defaultThemes.forEach(theme => {
      this.themes.set(theme.id, theme);
    });
  }

  createTheme(name: string, colors: Record<string, string>, fonts: Record<string, string>): SlideDesignTheme {
    const id = `theme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const theme: SlideDesignTheme = {
      id,
      name,
      colors: {
        primary: colors.primary || '#000000',
        secondary: colors.secondary || '#666666',
        background: colors.background || '#FFFFFF',
        text: colors.text || '#000000',
      },
      fonts: {
        title: fonts.title || 'Arial, sans-serif',
        body: fonts.body || 'Arial, sans-serif',
      },
    };
    this.themes.set(id, theme);
    return theme;
  }

  getTheme(themeId: string): SlideDesignTheme | undefined {
    return this.themes.get(themeId);
  }

  getAllThemes(): SlideDesignTheme[] {
    return Array.from(this.themes.values());
  }

  applyDesignToSlide(slide: Record<string, any>, themeId: string): Record<string, any> {
    const theme = this.getTheme(themeId);
    if (!theme) return slide;

    return {
      ...slide,
      design: {
        themeId,
        colors: theme.colors,
        fonts: theme.fonts,
      },
      metadata: {
        ...slide.metadata,
        designApplied: true,
        appliedTheme: themeId,
      },
    };
  }

  createCustomTheme(
    name: string,
    primaryColor: string,
    secondaryColor: string,
    titleFont: string,
    bodyFont: string
  ): SlideDesignTheme {
    return this.createTheme(
      name,
      {
        primary: primaryColor,
        secondary: secondaryColor,
        background: '#FFFFFF',
        text: '#000000',
      },
      {
        title: titleFont,
        body: bodyFont,
      }
    );
  }

  updateTheme(themeId: string, updates: Partial<SlideDesignTheme>): SlideDesignTheme | null {
    const theme = this.themes.get(themeId);
    if (!theme) return null;

    const updated: SlideDesignTheme = {
      ...theme,
      ...updates,
      id: theme.id,
    };
    this.themes.set(themeId, updated);
    return updated;
  }

  duplicateTheme(themeId: string, newName: string): SlideDesignTheme | null {
    const original = this.themes.get(themeId);
    if (!original) return null;

    return this.createTheme(newName, original.colors, original.fonts);
  }

  validateColorScheme(colors: Record<string, string>): boolean {
    const requiredColors = ['primary', 'secondary', 'background', 'text'];
    return requiredColors.every(color => color in colors && typeof colors[color] === 'string');
  }

  deleteTheme(themeId: string): boolean {
    const defaultThemeIds = ['professional', 'creative', 'minimal', 'corporate', 'dark'];
    if (defaultThemeIds.includes(themeId)) {
      return false;
    }
    return this.themes.delete(themeId);
  }

  getStats(): Record<string, unknown> {
    return {
      totalThemes: this.themes.size,
      customThemes: this.themes.size - 5,
      themes: Array.from(this.themes.values()).map(t => ({
        id: t.id,
        name: t.name,
      })),
    };
  }
}

let serviceInstance: SlideDesignService | null = null;

export function getSlideDesignService(): SlideDesignService {
  if (!serviceInstance) {
    serviceInstance = new SlideDesignService();
  }
  return serviceInstance;
}

export function resetSlideDesignService(): void {
  serviceInstance = null;
}
