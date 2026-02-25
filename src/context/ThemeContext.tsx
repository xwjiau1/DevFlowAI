import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 从localStorage获取主题，默认为浅色主题
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    // 如果保存的是system，则转换为light
    if (savedTheme === 'system') {
      return 'light';
    }
    return savedTheme || 'light';
  });

  // 根据当前主题确定是否为暗色模式
  const isDark = theme === 'dark';

  // 当主题变化时，更新localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // 将主题应用到HTML根元素
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 自定义hook，用于在组件中访问主题上下文
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};