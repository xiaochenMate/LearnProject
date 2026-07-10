
import React, { useState, useEffect } from 'react';
import { 
  User, Bell, Palette, Info, ExternalLink, LogOut, ChevronRight, 
  Sparkles, Moon, Sun, X, Mail, ShieldCheck, Database, RefreshCw, 
  Camera, BellRing, MessageSquare, Zap, Monitor, Swords, 
  Heart, Github, Globe, HelpCircle, MessageCircle, FileText, ChevronDown
} from 'lucide-react';
import { motion as motionBase, AnimatePresence } from 'framer-motion';
const motion = motionBase as any;
import { UserInfo } from '../App';
import { useTranslation } from '../i18n';

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
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#111] rounded-t-3xl z-[101] px-8 pt-4 pb-12 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar border border-black/5 dark:border-white/10"
    >
      <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8" />
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={24} /></button>
      </div>
      {children}
    </motion.div>
  </>
);

const SettingItem = ({ icon, label, value, onClick }: { icon: React.ReactNode, label: string, value?: string, onClick?: () => void }) => (
  <button onClick={onClick} className="w-full px-6 py-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors group text-left">
    <div className="flex items-center gap-4">
      <div className="text-gray-400 group-hover:text-brand-accent transition-colors">{icon}</div>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-xs text-gray-500">{value}</span>}
      <ChevronRight size={16} className="text-gray-300 dark:text-gray-700" />
    </div>
  </button>
);

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <button 
    onClick={onChange}
    className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${checked ? 'bg-brand-accent' : 'bg-gray-200 dark:bg-gray-800'}`}
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
      <div className="text-gray-400 mt-1">{icon}</div>
      <div>
        <h6 className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</h6>
        <p className="text-xs text-gray-500">{sub}</p>
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
        <span className="text-sm font-medium text-gray-900 dark:text-gray-200 text-left">{question}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pb-6 pr-4">
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
     <div className="absolute -left-8 top-1 w-3 h-3 bg-gray-900 dark:bg-white rounded-full border-2 border-white dark:border-black z-10" />
     <div className="text-xs font-semibold text-brand-accent uppercase mb-1">{date}</div>
     <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{title}</div>
     <div className="text-xs text-gray-500">{desc}</div>
  </div>
);

const Divider = () => <div className="h-px bg-black/5 dark:bg-white/5 mx-6" />;

interface SettingsViewProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  user: UserInfo | null;
  onUpdateUser: (user: UserInfo | null) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ theme, onToggleTheme, user, onUpdateUser }) => {
  const { t, lang, setLang } = useTranslation();
  
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
    if (true) {
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
        new Notification("OptPad Ready", {
          body: "Notifications are now active.",
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
      className="flex-1 flex flex-col pt-10 overflow-y-auto no-scrollbar pb-24 max-w-2xl w-full mx-auto"
    >
      <div className="flex flex-col items-center mb-12">
        <div className="relative mb-4 group">
          <button 
            onClick={() => setIsAccountOpen(true)}
            className="w-24 h-24 rounded-full border border-black/10 dark:border-white/10 p-1 overflow-hidden transition-transform active:scale-95"
          >
            <div className="w-full h-full rounded-full bg-[#FAFAFA] dark:bg-[#111] flex items-center justify-center relative overflow-hidden transition-colors">
               {user?.avatarUrl ? (
                 <img src={user.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
               ) : (
                 <User size={32} className="text-gray-400" />
               )}
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                 <Camera size={24} className="text-white" />
               </div>
            </div>
          </button>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {user ? user.email.split('@')[0] : 'Guest'}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {user ? 'Account Synced' : 'Local Mode'}
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <SettingItem 
            icon={<User size={18} />} 
            label={t('account')} 
            value={user ? t('bound') : t('signIn')}
            onClick={() => setIsAccountOpen(true)}
          />
          <Divider />
          <SettingItem 
            icon={<Bell size={18} />} 
            label={t('notifications')} 
            value={notifPrefs.enabled ? t('on') : t('off')}
            onClick={() => setIsNotifyOpen(true)}
          />
          <Divider />
          <SettingItem 
            icon={theme === 'light' ? <Sun size={18} /> : <Moon size={18} />} 
            label={t('appearance')} 
            value={theme === 'light' ? t('light') : t('dark')} 
            onClick={onToggleTheme}
          />
          <Divider />
          <SettingItem 
            icon={<Globe size={18} />} 
            label={t('language')} 
            value={lang === 'zh' ? '中文' : 'English'} 
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          />
        </div>

        <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <SettingItem 
            icon={<Info size={18} />} 
            label={t('about')} 
            onClick={() => setIsAboutOpen(true)}
          />
          <Divider />
          <SettingItem 
            icon={<ExternalLink size={18} />} 
            label={t('support')} 
            onClick={() => setIsSupportOpen(true)}
          />
        </div>

        <div className="flex flex-col items-center pt-8">
          {user && (
            <button 
              onClick={handleReset}
              className="text-red-500 font-medium text-sm flex items-center gap-2 hover:opacity-70 transition-opacity"
            >
              <LogOut size={16} />
              <span>{t('signOut')}</span>
            </button>
          )}
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-6">
            OptPad — Ver 2.8.5
          </p>
        </div>
      </div>

      <AnimatePresence>
        {isAccountOpen && (
          <SettingsDrawer onClose={() => setIsAccountOpen(false)} title={t('accountSettings')}>
            <div className="space-y-8">
              <section>
                 <label className="block text-xs font-medium text-gray-500 mb-4 flex items-center gap-2">
                   <Palette size={16} /> {t('chooseAvatar')}
                 </label>
                 <div className="grid grid-cols-4 gap-4">
                    {PRESET_AVATARS.map((url, i) => (
                      <button 
                        key={i}
                        onClick={() => setSelectedAvatar(url)}
                        className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all transform active:scale-95 ${selectedAvatar === url ? 'border-brand-accent ring-2 ring-brand-accent/20 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <img src={url} className="w-full h-full object-cover" alt={`Avatar ${i}`} />
                      </button>
                    ))}
                 </div>
              </section>

              <div className="bg-[#FAFAFA] dark:bg-black/50 p-6 rounded-2xl border border-black/5 dark:border-white/5">
                <label className="block text-xs font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Mail size={16} /> {t('emailAddress')}
                </label>
                <div className="flex gap-3">
                  <input 
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    className="flex-1 bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-brand-accent outline-none transition-all dark:text-white"
                  />
                  <button 
                    onClick={handleUpdateIdentity}
                    className="bg-black dark:bg-white text-white dark:text-black px-6 rounded-xl font-medium text-sm hover:scale-105 active:scale-95 transition-all"
                  >
                    {t('save')}
                  </button>
                </div>
              </div>
            </div>
          </SettingsDrawer>
        )}

        {isNotifyOpen && (
          <SettingsDrawer onClose={() => setIsNotifyOpen(false)} title={t('notificationPrefs')}>
            <div className="space-y-6">
               <div className="bg-[#0070F3]/10 dark:bg-[#0070F3]/20 p-6 rounded-2xl">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-white dark:bg-[#111] rounded-xl shadow-sm text-brand-accent">
                           <BellRing size={20} />
                        </div>
                        <div>
                           <h4 className="text-sm font-medium text-gray-900 dark:text-white">{t('enableNotifications')}</h4>
                           <p className="text-xs text-gray-500 mt-1">{t('requiresPermission')}</p>
                        </div>
                     </div>
                     <Toggle checked={notifPrefs.enabled} onChange={requestNotificationPermission} />
                  </div>
               </div>
               
               {notifPrefs.enabled && (
                 <section className="bg-[#FAFAFA] dark:bg-[#111] rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
                    <div className="px-2">
                       <SwitchItem 
                          icon={<MessageSquare size={18}/>} 
                          label={t('studyReminders')} 
                          sub={t('studyRemindersDesc')}
                          checked={notifPrefs.dailyStudy}
                          onChange={(v) => setNotifPrefs({...notifPrefs, dailyStudy: v})}
                       />
                       <SwitchItem 
                          icon={<Swords size={18}/>} 
                          label={t('gameInvites')} 
                          sub={t('gameInvitesDesc')}
                          checked={notifPrefs.gameInvite}
                          onChange={(v) => setNotifPrefs({...notifPrefs, gameInvite: v})}
                       />
                    </div>
                 </section>
               )}
            </div>
          </SettingsDrawer>
        )}

        {isAboutOpen && (
          <SettingsDrawer onClose={() => setIsAboutOpen(false)} title={t('about')}>
            <div className="space-y-10">
               <div className="flex flex-col items-center text-center px-4">
                  <div className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                    <span className="material-icons-outlined text-3xl">widgets</span>
                  </div>
                  <h4 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight mb-2">OptPad</h4>
                  <p className="text-sm text-gray-500 max-w-xs">
                    {t('optPadDesc')}
                  </p>
               </div>

               <section className="px-2">
                 <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-6 ml-4">{t('versionHistory')}</h5>
                 <div className="space-y-6 border-l border-gray-200 dark:border-gray-800 ml-6 pl-6 relative">
                    <VersionStep date="2025.02" title={t('v285')} desc={t('v285Desc')} />
                    <VersionStep date="2025.01" title={t('v20')} desc={t('v20Desc')} />
                    <VersionStep date="2024.12" title={t('v10')} desc={t('v10Desc')} />
                 </div>
               </section>

               <div className="flex justify-center gap-8 pt-4">
                  <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><Github size={24} /></button>
                  <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><Globe size={24} /></button>
               </div>
            </div>
          </SettingsDrawer>
        )}

        {isSupportOpen && (
          <SettingsDrawer onClose={() => setIsSupportOpen(false)} title={t('support')}>
            <div className="space-y-8">
               <div className="grid grid-cols-2 gap-4">
                  <button className="bg-[#FAFAFA] dark:bg-[#111] border border-black/5 dark:border-white/5 p-6 rounded-2xl flex flex-col items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                    <HelpCircle size={24} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t('faq')}</span>
                  </button>
                  <button className="bg-[#FAFAFA] dark:bg-[#111] border border-black/5 dark:border-white/5 p-6 rounded-2xl flex flex-col items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                    <MessageCircle size={24} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t('feedback')}</span>
                  </button>
               </div>

               <div className="space-y-2 px-2">
                  <SettingItem icon={<FileText size={18}/>} label={t('terms')} />
                  <Divider />
                  <SettingItem icon={<ShieldCheck size={18}/>} label={t('privacy')} />
               </div>
            </div>
          </SettingsDrawer>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SettingsView;
