
import React, { useState, useEffect } from 'react';
import { 
  User, Bell, Palette, Info, ExternalLink, LogOut, ChevronRight, 
  Sparkles, Moon, Sun, X, Mail, ShieldCheck, Database, RefreshCw, 
  Camera, BellRing, MessageSquare, Zap, Monitor, Swords, 
  Heart, Github, Globe, HelpCircle, MessageCircle, FileText, ChevronDown
} from 'lucide-react';
// Fix: Bypassing broken framer-motion types in this environment
import { motion as motionBase, AnimatePresence } from 'framer-motion';
const motion = motionBase as any;
import { UserInfo } from '../App';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=100&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=100&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=100&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=100&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop',
];

interface NotificationPrefs {
  enabled: boolean;
  dailyStudy: boolean;
  gameInvite: boolean;
  systemUpdate: boolean;
}

// --- 内部辅助组件 (Moved above usage to ensure correct hoisting and typing) ---

// Fix: Explicitly allowed optional children to resolve property 'children' missing errors
const SettingsDrawer = ({ children, onClose, title }: { children?: React.ReactNode, onClose: () => void, title: string }) => (
  <>
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
    />
    <motion.div 
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed bottom-0 left-0 right-0 bg-morandi-oatmeal dark:bg-dark-bg border-t border-morandi-border dark:border-white/10 rounded-t-[2.5rem] z-[101] px-8 pt-4 pb-12 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar"
    >
      <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-8" />
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-morandi-charcoal dark:text-slate-100 serif-font">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-rose-500"><X size={24} /></button>
      </div>
      {children}
    </motion.div>
  </>
);

const SettingItem = ({ icon, label, value, onClick }: { icon: React.ReactNode, label: string, value?: string, onClick?: () => void }) => (
  <button onClick={onClick} className="w-full px-6 py-4 flex items-center justify-between hover:bg-white dark:hover:bg-white/5 transition-colors group text-left">
    <div className="flex items-center gap-4">
      <div className="text-morandi-taupe dark:text-slate-500 group-hover:text-morandi-charcoal dark:group-hover:text-slate-200 transition-colors">{icon}</div>
      <span className="text-sm font-bold text-morandi-charcoal dark:text-slate-200">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-xs text-morandi-taupe dark:text-slate-500 font-medium">{value}</span>}
      <ChevronRight size={16} className="text-morandi-border dark:text-slate-800" />
    </div>
  </button>
);

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <button 
    onClick={onChange}
    className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${checked ? 'bg-morandi-sage' : 'bg-slate-200 dark:bg-slate-800'}`}
  >
    <motion.div 
      animate={{ x: checked ? 20 : 2 }}
      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
    />
  </button>
);

const SwitchItem = ({ icon, label, sub, checked, onChange }: { icon: React.ReactNode, label: string, sub: string, checked: boolean, onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between px-4 py-4">
    <div className="flex items-start gap-4">
      <div className="text-morandi-taupe mt-1">{icon}</div>
      <div>
        <h6 className="text-xs font-bold text-morandi-charcoal dark:text-slate-100">{label}</h6>
        <p className="text-[10px] text-morandi-taupe font-medium">{sub}</p>
      </div>
    </div>
    <Toggle checked={checked} onChange={() => onChange(!checked)} />
  </div>
);

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="px-4">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full py-5 flex items-center justify-between group">
        <span className="text-xs font-bold text-morandi-charcoal dark:text-slate-200 group-hover:text-morandi-blue transition-colors text-left">{question}</span>
        <ChevronDown size={14} className={`text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="text-[10px] text-morandi-taupe dark:text-slate-500 leading-relaxed pb-6 pr-4 italic">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const VersionStep = ({ date, title, desc }: { date: string, title: string, desc: string }) => (
  <div className="relative mb-8">
     <div className="absolute -left-8 top-1 w-3 h-3 bg-morandi-charcoal dark:bg-slate-200 rounded-full border-2 border-white dark:border-dark-bg z-10" />
     <div className="text-[8px] font-black text-morandi-rose uppercase mb-1 tracking-widest">{date}</div>
     <div className="text-xs font-bold text-morandi-charcoal dark:text-slate-100 mb-1">{title}</div>
     <div className="text-[10px] text-slate-400 font-medium">{desc}</div>
  </div>
);

const StatusCard = ({ icon, label, sub, color }: { icon: React.ReactNode, label: string, sub: string, color: 'emerald' | 'blue' }) => (
  <div className={`bg-${color}-500/5 border border-${color}-500/20 p-4 rounded-2xl flex flex-col items-center gap-2 text-center`}>
    <div className={`text-${color}-500`}>{icon}</div>
    <span className={`text-[10px] font-bold text-${color}-600 dark:text-${color}-400 uppercase`}>{label}</span>
    <span className={`text-[9px] text-${color}-600/60 dark:text-${color}-400/60 leading-tight`}>{sub}</span>
  </div>
);

const Divider = () => <div className="h-px bg-morandi-border/30 dark:bg-white/5 mx-6" />;

interface SettingsViewProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  user: UserInfo | null;
  onUpdateUser: (user: UserInfo | null) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ theme, onToggleTheme, user, onUpdateUser }) => {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || PRESET_AVATARS[0]);
  
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() => {
    const saved = localStorage.getItem('zst_notifications_v1');
    return saved ? JSON.parse(saved) : {
      enabled: false,
      dailyStudy: true,
      gameInvite: true,
      systemUpdate: false
    };
  });

  useEffect(() => {
    localStorage.setItem('zst_notifications_v1', JSON.stringify(notifPrefs));
  }, [notifPrefs]);

  const handleUpdateIdentity = () => {
    if (emailInput.trim()) {
      onUpdateUser({ 
        email: emailInput.trim(), 
        avatarUrl: selectedAvatar 
      });
      setIsAccountOpen(false);
    }
  };

  const handleReset = () => {
    if (confirm("确定要重置当前节点的同步身份吗？这将退出登录并清除本地关联。")) {
      onUpdateUser(null);
      setEmailInput('');
      setSelectedAvatar(PRESET_AVATARS[0]);
      setIsAccountOpen(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotifPrefs({ ...notifPrefs, enabled: true });
        new Notification("知识通 - 节点激活", {
          body: "您的推送通知服务已就绪，智慧之旅即刻开启。",
          icon: user?.avatarUrl || PRESET_AVATARS[0]
        });
      }
    } else {
      setNotifPrefs({ ...notifPrefs, enabled: !notifPrefs.enabled });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col px-6 pt-10 overflow-y-auto no-scrollbar pb-24"
    >
      {/* 个人资料预览 */}
      <div className="flex flex-col items-center mb-12">
        <div className="relative mb-4 group">
          <button 
            onClick={() => setIsAccountOpen(true)}
            className="w-28 h-28 rounded-full border-2 border-morandi-taupe/30 dark:border-slate-800 p-1.5 overflow-hidden transition-transform active:scale-95"
          >
            <div className="w-full h-full rounded-full bg-morandi-blue/20 dark:bg-slate-800/50 flex items-center justify-center relative overflow-hidden transition-colors">
               {user?.avatarUrl ? (
                 <img src={user.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
               ) : (
                 <User size={48} className="text-morandi-blue dark:text-slate-400" />
               )}
               <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                 <Camera size={24} className="text-white" />
               </div>
            </div>
          </button>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white dark:bg-dark-card border border-morandi-border dark:border-white/5 rounded-full flex items-center justify-center text-amber-500 shadow-sm transition-colors">
            <Sparkles size={16} />
          </div>
        </div>
        <h2 className="text-xl font-bold text-morandi-charcoal dark:text-slate-100 serif-font">
          {user ? user.email.split('@')[0] : '访客节点'}
        </h2>
        <p className="text-xs text-morandi-taupe dark:text-slate-500 font-medium mt-1">
          {user ? '身份链路已激活' : '本地离线模式'}
        </p>
      </div>

      {/* 设置菜单 */}
      <div className="space-y-4">
        <div className="bg-white/60 dark:bg-dark-card/60 border border-morandi-border dark:border-white/5 rounded-[2.5rem] overflow-hidden soft-shadow px-2 transition-colors">
          <SettingItem 
            icon={<User size={18} />} 
            label="账号管理" 
            value={user ? '已绑定' : '去激活'}
            onClick={() => setIsAccountOpen(true)}
          />
          <Divider />
          <SettingItem 
            icon={<Bell size={18} />} 
            label="推送通知" 
            value={notifPrefs.enabled ? '已开启' : '未授权'}
            onClick={() => setIsNotifyOpen(true)}
          />
          <Divider />
          <SettingItem 
            icon={theme === 'light' ? <Sun size={18} /> : <Moon size={18} />} 
            label="视觉主题" 
            value={theme === 'light' ? '莫兰迪燕麦' : '黑曜石深邃'} 
            onClick={onToggleTheme}
          />
          <Divider />
          <SettingItem 
            icon={<Info size={18} />} 
            label="关于我们" 
            onClick={() => setIsAboutOpen(true)}
          />
        </div>

        <div className="bg-white/60 dark:bg-dark-card/60 border border-morandi-border dark:border-white/5 rounded-[2.5rem] p-2 soft-shadow transition-colors">
          <SettingItem 
            icon={<ExternalLink size={18} />} 
            label="支持中心" 
            onClick={() => setIsSupportOpen(true)}
          />
        </div>

        <div className="flex flex-col items-center pt-8">
          <button 
            onClick={handleReset}
            className="text-morandi-rose dark:text-rose-400 font-bold text-sm flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <LogOut size={16} />
            <span>彻底退出当前节点</span>
          </button>
          <p className="text-[9px] text-morandi-border dark:text-slate-800 font-black uppercase tracking-[0.3em] mt-6">
            Cloud Sync Ready — Ver 2.8.5
          </p>
        </div>
      </div>

      {/* 弹窗抽屉集 */}
      <AnimatePresence>
        {isAccountOpen && (
          <SettingsDrawer onClose={() => setIsAccountOpen(false)} title="节点身份管理">
            <div className="space-y-8">
              <section>
                 <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                   <Palette size={12} /> 选择虚拟形象
                 </label>
                 <div className="grid grid-cols-4 gap-4">
                    {PRESET_AVATARS.map((url, i) => (
                      <button 
                        key={i}
                        onClick={() => setSelectedAvatar(url)}
                        className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all transform active:scale-90 ${selectedAvatar === url ? 'border-morandi-blue ring-4 ring-morandi-blue/10 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <img src={url} className="w-full h-full object-cover" alt={`Avatar ${i}`} />
                      </button>
                    ))}
                 </div>
              </section>

              <div className="bg-white/50 dark:bg-white/5 p-6 rounded-3xl border border-white/40 dark:border-white/5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  <Mail size={12} /> 关联 Email 地址
                </label>
                <div className="flex gap-3">
                  <input 
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="example@portal.com"
                    className="flex-1 bg-white dark:bg-dark-card border border-morandi-border dark:border-white/5 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-morandi-blue outline-none transition-all dark:text-slate-100"
                  />
                  <button 
                    onClick={handleUpdateIdentity}
                    className="bg-morandi-charcoal dark:bg-slate-200 text-white dark:text-dark-bg px-6 rounded-2xl font-bold text-xs hover:scale-105 active:scale-95 transition-all"
                  >
                    保存
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StatusCard icon={<Database size={20}/>} label="云端同步" sub="Syncing to Neon" color="emerald" />
                <StatusCard icon={<ShieldCheck size={20}/>} label="数据安全" sub="End-to-End Hash" color="blue" />
              </div>
            </div>
          </SettingsDrawer>
        )}

        {isNotifyOpen && (
          <SettingsDrawer onClose={() => setIsNotifyOpen(false)} title="推送服务偏好">
            <div className="space-y-6">
               <div className="bg-morandi-blue/10 dark:bg-morandi-blue/5 p-6 rounded-[2rem] border border-morandi-blue/10">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-3 bg-white dark:bg-dark-card rounded-2xl shadow-sm text-morandi-blue">
                           <BellRing size={20} />
                        </div>
                        <div>
                           <h4 className="text-sm font-bold text-morandi-charcoal dark:text-slate-100">核心通知服务</h4>
                           <p className="text-[10px] text-morandi-taupe font-medium">需要浏览器授予系统权限</p>
                        </div>
                     </div>
                     <Toggle checked={notifPrefs.enabled} onChange={requestNotificationPermission} />
                  </div>
               </div>
               <section className="bg-white/40 dark:bg-white/5 rounded-[2rem] border border-morandi-border dark:border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-morandi-border dark:border-white/5">
                     <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">消息类型订阅</h5>
                  </div>
                  <div className="px-2">
                     <SwitchItem 
                        icon={<MessageSquare size={16}/>} 
                        label="学习进度提醒" 
                        sub="基于记忆曲线的每日复习建议"
                        checked={notifPrefs.dailyStudy}
                        onChange={(v) => setNotifPrefs({...notifPrefs, dailyStudy: v})}
                     />
                     <SwitchItem 
                        icon={<Swords size={16}/>} 
                        label="对战挑战邀请" 
                        sub="来自好友或其他选手的棋局申请"
                        checked={notifPrefs.gameInvite}
                        onChange={(v) => setNotifPrefs({...notifPrefs, gameInvite: v})}
                     />
                     <SwitchItem 
                        icon={<Zap size={16}/>} 
                        label="系统实时公告" 
                        sub="版本更新、活动通报及维护信息"
                        checked={notifPrefs.systemUpdate}
                        onChange={(v) => setNotifPrefs({...notifPrefs, systemUpdate: v})}
                     />
                  </div>
               </section>
            </div>
          </SettingsDrawer>
        )}

        {isAboutOpen && (
          <SettingsDrawer onClose={() => setIsAboutOpen(false)} title="关于知识通">
            <div className="space-y-10">
               {/* 品牌简介 */}
               <div className="flex flex-col items-center text-center px-4">
                  <div className="w-20 h-20 bg-morandi-charcoal dark:bg-slate-200 text-white dark:text-dark-bg rounded-[1.8rem] flex items-center justify-center mb-6 shadow-xl">
                    <span className="material-icons-outlined text-4xl">auto_awesome_motion</span>
                  </div>
                  <h4 className="text-2xl font-black text-morandi-charcoal dark:text-slate-100 serif-font mb-4 italic tracking-tight">知识通 · 极简生活馆</h4>
                  <p className="text-xs text-morandi-taupe dark:text-slate-500 leading-relaxed font-medium">
                    “在这信息爆炸的时代，我们试图为你保留一块精神的净土。<br/>将科学、人文与工具，重塑于莫兰迪的静谧色彩之中。”
                  </p>
               </div>

               {/* 核心致敬 */}
               <div className="bg-white/50 dark:bg-white/5 rounded-[2rem] border border-morandi-border dark:border-white/5 p-8">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                    <Heart size={12} className="text-morandi-rose" /> 技术支撑
                  </h5>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-morandi-charcoal dark:text-slate-300">Google Gemini</div>
                      <div className="text-[10px] text-slate-400">智能推理核心</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-morandi-charcoal dark:text-slate-300">Neon DB</div>
                      <div className="text-[10px] text-slate-400">Serverless 存储</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-morandi-charcoal dark:text-slate-300">React 19</div>
                      <div className="text-[10px] text-slate-400">极速 UI 响应</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-morandi-charcoal dark:text-slate-300">Three.js</div>
                      <div className="text-[10px] text-slate-400">3D 数据渲染</div>
                    </div>
                  </div>
               </div>

               {/* 版本历史 */}
               <section className="px-2">
                 <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 ml-4">版本进化史</h5>
                 <div className="space-y-6 border-l border-morandi-taupe/20 ml-6 pl-6 relative">
                    <VersionStep date="2025.02" title="v2.8.5 发布" desc="新增推送系统与关于我们模块。" />
                    <VersionStep date="2025.01" title="v2.0 飞跃" desc="全线接入 Google Gemini 3 系列模型。" />
                    <VersionStep date="2024.12" title="初声 v1.0" desc="知识通正式上线，开启莫兰迪之旅。" />
                 </div>
               </section>

               <div className="flex justify-center gap-8 pt-4">
                  <button className="text-morandi-taupe hover:text-morandi-charcoal dark:hover:text-white transition-colors"><Github size={20} /></button>
                  <button className="text-morandi-taupe hover:text-morandi-charcoal dark:hover:text-white transition-colors"><Globe size={20} /></button>
               </div>
            </div>
          </SettingsDrawer>
        )}

        {isSupportOpen && (
          <SettingsDrawer onClose={() => setIsSupportOpen(false)} title="支持与帮助">
            <div className="space-y-8">
               {/* 帮助分类 */}
               <div className="grid grid-cols-2 gap-4">
                  <button className="bg-morandi-blue/10 dark:bg-morandi-blue/5 p-6 rounded-3xl flex flex-col items-center gap-3 transition-transform active:scale-95 text-center">
                    <HelpCircle size={24} className="text-morandi-blue" />
                    <span className="text-xs font-black text-morandi-charcoal dark:text-slate-200">常见问题</span>
                  </button>
                  <button className="bg-morandi-sage/10 dark:bg-morandi-sage/5 p-6 rounded-3xl flex flex-col items-center gap-3 transition-transform active:scale-95 text-center">
                    <MessageCircle size={24} className="text-morandi-sage" />
                    <span className="text-xs font-black text-morandi-charcoal dark:text-slate-200">在线反馈</span>
                  </button>
               </div>

               {/* FAQ 手风琴 */}
               <section className="bg-white/40 dark:bg-white/5 rounded-[2.5rem] border border-morandi-border dark:border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-morandi-border dark:border-white/5">
                     <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">疑难解答 (FAQ)</h5>
                  </div>
                  <div className="px-2">
                    <FAQItem question="如何备份我的学习数据？" answer="目前应用采用自动同步技术。只需在账号管理中关联您的 Email，所有进度均会实时同步至云端 Neon 数据库。" />
                    <Divider />
                    <FAQItem question="应用支持离线模式吗？" answer="是的。绝大部分模块（如五子棋、地球仪、速算王）均支持离线运行。只有涉及 AI 对话或云端检索的功能需要网络连接。" />
                    <Divider />
                    <FAQItem question="为什么无法开启推送通知？" answer="请检查浏览器地址栏左侧的权限设置。由于系统限制，通知功能需要您在手动点击开启后在系统弹窗中点击“允许”。" />
                  </div>
               </section>

               {/* 法律条款 */}
               <div className="space-y-2 px-2">
                  <SettingItem icon={<FileText size={18}/>} label="服务协议" />
                  <Divider />
                  <SettingItem icon={<ShieldCheck size={18}/>} label="隐私政策" />
               </div>

               <div className="bg-slate-900 dark:bg-slate-200 text-white dark:text-dark-bg p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={100} /></div>
                  <h4 className="text-lg font-black italic mb-2">遇到特殊技术问题？</h4>
                  <p className="text-[10px] opacity-60 mb-6">我们的技术官将随时为您提供节点维护支持。</p>
                  <button className="px-8 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-full font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform">发送工单</button>
               </div>
            </div>
          </SettingsDrawer>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SettingsView;
