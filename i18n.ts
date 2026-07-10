import { useState, useEffect } from 'react';

export type Lang = 'zh' | 'en';

const translations = {
  zh: {
    overview: '概览',
    explore: '探索',
    library: '资源库',
    settings: '设置',
    darkMode: '暗色模式',
    lightMode: '亮色模式',
    language: '语言',
    searchPlaceholder: '搜索模块、工具与体验...',
    featured: '精选推荐',
    modules: '全部模块',
    noModulesFound: '未找到匹配的模块。',
    home: '首页',
    
    // Feature Cards
    capybaraTitle: '卡皮巴拉日记',
    capybaraDesc: '一场温柔的自律之旅。',
    readNow: '立即阅读',
    chessTitle: 'AI 对弈',
    chessDesc: '挑战高级神经网络。',
    play: '开始游玩',
    
    // Explore
    curiosityEngine: '好奇心引擎',
    curiosityDesc: '探索跨学科的深度洞见。输入任何概念或问题。',
    curiosityPlaceholder: '例如：引力、乡愁、时间的本质...',
    random: '随机',
    exploreBtn: '探索',
    synthesizing: '正在重组维度',
    extracting: '提取跨学科洞见...',
    coreEssence: '核心本质',
    surprisingFact: '趣味冷知识',
    perspectives: '多维视角',
    foodForThought: '深度思考',
    recommendedModules: '推荐模块',
    thoughtExperiments: '思想实验',
    
    // Library
    libraryTitle: '资源库',
    libraryDesc: '你的个人知识收藏。',
    saved: '已收藏',
    history: '历史记录',
    noSaved: '暂无收藏的模块',
    noHistory: '暂无历史记录',
    exploreHome: '探索首页以发现新知识。',
    
    // Settings
    accountSettings: '账号设置',
    account: '账号',
    bound: '已绑定',
    signIn: '去登录',
    notifications: '通知',
    on: '开启',
    off: '关闭',
    appearance: '外观',
    light: '亮色',
    dark: '暗色',
    about: '关于',
    support: '支持',
    signOut: '退出登录',
    chooseAvatar: '选择头像',
    emailAddress: '邮箱地址',
    save: '保存',
    notificationPrefs: '通知偏好',
    enableNotifications: '启用通知',
    requiresPermission: '需要浏览器权限',
    studyReminders: '学习提醒',
    studyRemindersDesc: '保持学习节奏的每日提醒',
    gameInvites: '游戏邀请',
    gameInvitesDesc: '当好友向你发起挑战时',
    optPadDesc: '用于学习、探索和游玩的极简工具箱。',
    versionHistory: '版本历史',
    v285: 'v2.8.5 UI 更新',
    v285Desc: '全面重新设计，带来现代流畅体验。',
    v20: 'v2.0 AI 接入',
    v20Desc: '由 Google Gemini 提供支持。',
    v10: 'v1.0 创世纪',
    v10Desc: '最初的发布版本。',
    faq: '常见问题',
    feedback: '意见反馈',
    terms: '服务条款',
    privacy: '隐私政策',
    
    // Modal
    aboutModule: '关于此模块',
    launch: '启动',
    
    // Knowledge Banner
    neuralInsight: '灵感洞见',
  },
  en: {
    overview: 'Overview',
    explore: 'Explore',
    library: 'Library',
    settings: 'Settings',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    language: 'Language',
    searchPlaceholder: 'Search modules, tools, and experiences...',
    featured: 'Featured',
    modules: 'Modules',
    noModulesFound: 'No matching modules found.',
    home: 'Home',
    
    // Feature Cards
    capybaraTitle: 'Capybara Diaries',
    capybaraDesc: 'A gentle journey of self-discipline.',
    readNow: 'Read Now',
    chessTitle: 'AI Chess Engine',
    chessDesc: 'Challenge advanced neural networks.',
    play: 'Play',
    
    // Explore
    curiosityEngine: 'Curiosity Engine',
    curiosityDesc: 'Explore deep multidisciplinary insights. Enter any concept or question.',
    curiosityPlaceholder: 'e.g. Gravity, nostalgia, the nature of time...',
    random: 'Random',
    exploreBtn: 'Explore',
    synthesizing: 'Synthesizing dimensions',
    extracting: 'Extracting insights across disciplines...',
    coreEssence: 'Core Essence',
    surprisingFact: 'Surprising Fact',
    perspectives: 'Perspectives',
    foodForThought: 'Food for thought',
    recommendedModules: 'Recommended Modules',
    thoughtExperiments: 'Thought Experiments',
    
    // Library
    libraryTitle: 'Library',
    libraryDesc: 'Your personal collection of knowledge.',
    saved: 'Saved',
    history: 'History',
    noSaved: 'No saved modules',
    noHistory: 'No history yet',
    exploreHome: 'Explore the home page to discover new knowledge.',
    
    // Settings
    accountSettings: 'Account Settings',
    account: 'Account',
    bound: 'Bound',
    signIn: 'Sign in',
    notifications: 'Notifications',
    on: 'On',
    off: 'Off',
    appearance: 'Appearance',
    light: 'Light',
    dark: 'Dark',
    about: 'About',
    support: 'Support',
    signOut: 'Sign Out',
    chooseAvatar: 'Choose Avatar',
    emailAddress: 'Email Address',
    save: 'Save',
    notificationPrefs: 'Notification Preferences',
    enableNotifications: 'Enable Notifications',
    requiresPermission: 'Requires browser permission',
    studyReminders: 'Study Reminders',
    studyRemindersDesc: 'Daily nudges to keep up the pace',
    gameInvites: 'Game Invites',
    gameInvitesDesc: 'When friends challenge you',
    optPadDesc: 'Your minimalist toolkit for learning, exploring, and playing.',
    versionHistory: 'Version History',
    v285: 'v2.8.5 UI Refresh',
    v285Desc: 'Complete redesign for a sleek, modern experience.',
    v20: 'v2.0 AI Integration',
    v20Desc: 'Powered by Google Gemini.',
    v10: 'v1.0 Genesis',
    v10Desc: 'The original launch.',
    faq: 'FAQ',
    feedback: 'Feedback',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    
    // Modal
    aboutModule: 'About this module',
    launch: 'Launch',
    
    // Knowledge Banner
    neuralInsight: 'Neural Insight',
  }
};

let currentLang: Lang = 'zh';
let listeners: Array<() => void> = [];

export const setLanguage = (lang: Lang) => {
  currentLang = lang;
  listeners.forEach(l => l());
};

export const getLanguage = () => currentLang;

export const useTranslation = () => {
  const [, setTick] = useState(0);
  
  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);
  
  return {
    t: (key: keyof typeof translations.en) => translations[currentLang][key] || key,
    lang: currentLang,
    setLang: setLanguage
  };
};
