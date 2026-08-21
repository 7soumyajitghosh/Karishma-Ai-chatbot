import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Add Theme State
theme_state = """  const [showModelSwitcher, setShowModelSwitcher] = useState(false);
  
  // Theme state
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [themeConfig, setThemeConfig] = useState(() => {
    const saved = localStorage.getItem("app_theme_config");
    return saved ? JSON.parse(saved) : {
      appearance: "light",
      accentColor: "orange",
      chatStyle: "rounded",
      background: "solid",
      customBgUrl: "",
      font: "default",
      effects: "smooth"
    };
  });

  useEffect(() => {
    localStorage.setItem("app_theme_config", JSON.stringify(themeConfig));
    
    const fontMap: Record<string, string> = {
      default: 'inherit',
      inter: '"Inter", sans-serif',
      poppins: '"Poppins", sans-serif',
      roboto: '"Roboto", sans-serif',
      nunito: '"Nunito", sans-serif',
    };
    document.body.style.fontFamily = fontMap[themeConfig.font] || 'inherit';

    let vars: Record<string, string> = {};
    const isDark = themeConfig.appearance === 'dark' || themeConfig.appearance === 'amoled' || (themeConfig.appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const isAmoled = themeConfig.appearance === 'amoled';

    if (isAmoled) {
      vars['--bg-main'] = '#000000';
      vars['--bg-panel'] = '#09090B';
      vars['--border-main'] = '#27272A';
      vars['--text-main'] = '#FFFFFF';
      vars['--text-muted'] = '#A1A1AA';
      vars['--text-light'] = '#71717A';
      vars['--border-dark'] = '#3F3F46';
      vars['--bg-hover'] = '#18181B';
    } else if (isDark) {
      vars['--bg-main'] = '#18181B';
      vars['--bg-panel'] = '#27272A';
      vars['--border-main'] = '#3F3F46';
      vars['--text-main'] = '#F4F4F5';
      vars['--text-muted'] = '#A1A1AA';
      vars['--text-light'] = '#71717A';
      vars['--border-dark'] = '#52525B';
      vars['--bg-hover'] = '#3F3F46';
    } else {
      vars['--bg-main'] = '#FCFAF7';
      vars['--bg-panel'] = '#FAF8F5';
      vars['--border-main'] = '#EBE6DD';
      vars['--text-main'] = '#2C2A29';
      vars['--text-muted'] = '#5C5753';
      vars['--text-light'] = '#8C857E';
      vars['--border-dark'] = '#DFD9D0';
      vars['--bg-hover'] = '#E2DCD3';
    }

    const accentColors: Record<string, any> = {
      orange: { main: '#D96B43', hover: '#C85C34', bg: '#FAF0E6', border: '#F3D9C9' },
      blue: { main: '#3B82F6', hover: '#2563EB', bg: '#EFF6FF', border: '#DBEAFE' },
      green: { main: '#10B981', hover: '#059669', bg: '#ECFDF5', border: '#D1FAE5' },
      purple: { main: '#8B5CF6', hover: '#7C3AED', bg: '#F5F3FF', border: '#EDE9FE' },
      red: { main: '#EF4444', hover: '#DC2626', bg: '#FEF2F2', border: '#FEE2E2' },
      pink: { main: '#EC4899', hover: '#DB2777', bg: '#FDF2F8', border: '#FCE7F3' },
      teal: { main: '#14B8A6', hover: '#0D9488', bg: '#F0FDFA', border: '#CCFBF1' }
    };
    
    let ac = accentColors[themeConfig.accentColor] || accentColors.orange;
    if (isDark || isAmoled) {
      ac.bg = ac.main + '20';
      ac.border = ac.main + '40';
    }

    vars['--accent-main'] = ac.main;
    vars['--accent-hover'] = ac.hover;
    vars['--accent-bg'] = ac.bg;
    vars['--accent-border'] = ac.border;

    if (themeConfig.background === 'gradient') {
      vars['--bg-image'] = `linear-gradient(to bottom right, var(--bg-main), var(--bg-panel))`;
    } else if (themeConfig.background === 'blur') {
      vars['--bg-image'] = `url('https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=2000&auto=format&fit=crop')`;
    } else if (themeConfig.background === 'abstract') {
      vars['--bg-image'] = `url('https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=2000&auto=format&fit=crop')`;
    } else if (themeConfig.background === 'custom' && themeConfig.customBgUrl) {
      vars['--bg-image'] = `url('${themeConfig.customBgUrl}')`;
    } else {
      vars['--bg-image'] = 'none';
    }

    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
  }, [themeConfig]);"""

content = content.replace("  const [showModelSwitcher, setShowModelSwitcher] = useState(false);", theme_state)

with open('src/App.tsx', 'w') as f:
    f.write(content)
