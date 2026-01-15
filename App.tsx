
import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './store';
import Dashboard from './components/Dashboard';
import PosView from './components/PosView';
import Masters from './components/Masters';
import Reports from './components/Reports';
import PrintSection from './components/PrintSection';
import Auth from './components/Auth';
import { Order } from './types';

type View = 'Dashboard' | 'Masters' | 'Reports' | 'Settings';

const ScrollingFooter: React.FC = () => {
  const content = "Developed by: M. Soft India | Contact: 9890072651 | Visit: msoftindia.com";
  const spacer = "\u00A0".repeat(24);
  const repeatedText = `${content}${spacer}${content}${spacer}`;

  return (
    <div className="no-print fixed bottom-0 left-0 right-0 md:left-64 bg-red-600 border-t border-red-700 h-7 flex items-center z-[45] overflow-hidden select-none transition-colors duration-300 shadow-[0_-2px_10px_rgba(0,0,0,0.15)]">
      <div className="animate-marquee-ltr text-[10px] md:text-[11px] font-black text-white uppercase tracking-[0.2em] whitespace-nowrap">
        {repeatedText}
      </div>
    </div>
  );
};

const Sidebar: React.FC<{ activeView: View; setView: (v: View) => void }> = ({ activeView, setView }) => {
  const { logout, user, isSyncing } = useApp();
  const menuItems = [
    { id: 'Dashboard', icon: 'fa-solid fa-chart-line', label: 'Dashboard' },
    { id: 'Masters', icon: 'fa-solid fa-database', label: 'Master Data' },
    { id: 'Reports', icon: 'fa-solid fa-file-invoice-dollar', label: 'Reports' },
    { id: 'Settings', icon: 'fa-solid fa-gears', label: 'Settings' }
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-sidebar border-r border-main h-full fixed top-0 left-0 transition-colors duration-300 z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
          <i className="fa-solid fa-cloud"></i>
        </div>
        <div>
          <h1 className="text-xl font-black text-main tracking-tight leading-none">Cloud-<span className="text-indigo-600">HMS</span></h1>
          <div className="flex items-center gap-1.5 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
            <span className="text-[8px] font-black text-muted uppercase tracking-widest">{isSyncing ? 'Syncing...' : 'Cloud Live'}</span>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
              activeView === item.id 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-muted hover:bg-slate-700/10 hover:text-main'
            }`}
          >
            <i className={`${item.icon} text-xs`}></i>
            {item.label}
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-main space-y-3 mb-6">
        <div className="bg-app/50 p-3 rounded-xl border border-main">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600/20 text-indigo-600 rounded-lg flex items-center justify-center">
               <i className="fa-solid fa-user text-[10px]"></i>
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-black text-main truncate leading-none uppercase">{user?.displayName || 'Admin'}</p>
              <p className="text-[8px] font-bold text-muted truncate">{user?.email}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 theme-dark:bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl transition-all font-black text-[9px] uppercase tracking-widest border border-rose-200 theme-dark:border-rose-500/30"
        >
          <i className="fa-solid fa-power-off text-[10px]"></i> Logout
        </button>
      </div>
    </div>
  );
};

const MobileNav: React.FC<{ activeView: View; setView: (v: View) => void }> = ({ activeView, setView }) => {
  const tabs = [
    { id: 'Dashboard', icon: 'fa-house', label: 'Home' },
    { id: 'Masters', icon: 'fa-database', label: 'Data' },
    { id: 'Reports', icon: 'fa-chart-pie', label: 'Bills' },
    { id: 'Settings', icon: 'fa-gear', label: 'Config' }
  ];

  return (
    <div className="md:hidden fixed bottom-[22px] left-0 right-0 bg-sidebar border-t border-main flex justify-around p-1.5 z-50 transition-colors duration-300 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => setView(tab.id as View)} className={`flex flex-col items-center p-2 flex-1 ${activeView === tab.id ? 'text-indigo-600' : 'text-muted'}`}>
          <i className={`fa-solid fa-${tab.icon} text-sm`}></i>
          <span className="text-[8px] mt-1 font-bold uppercase">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

const MainContent: React.FC = () => {
  const { activeTable, setActiveTable, settings, setSettings, isLoading, user, logout, upsert, isSyncing } = useApp();
  const [activeView, setView] = useState<View>('Dashboard');
  const [printData, setPrintData] = useState<{ type: 'BILL' | 'KOT' | 'DAYBOOK', order?: Order | null, reportOrders?: Order[], reportDate?: string } | null>(null);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
    }
  }, [settings.theme]);

  const handlePrint = (type: 'BILL' | 'KOT', order: Order) => {
    setPrintData({ type, order });
    setTimeout(() => { window.print(); }, 1500);
  };

  const handlePrintDayBook = (orders: Order[], date: string) => {
    setPrintData({ type: 'DAYBOOK', reportOrders: orders, reportDate: date });
    setTimeout(() => { window.print(); }, 1500);
  };

  const saveSettings = async () => {
    await upsert("config", settings);
    alert('Cloud Settings Updated Successfully!');
  };

  if (!user) return <Auth />;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app flex flex-col items-center justify-center text-main p-6 text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-sm font-black uppercase tracking-widest">Connecting to Cloud...</h2>
        <p className="text-muted text-[10px] mt-2 uppercase tracking-widest opacity-50">Initializing real-time data stream</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app text-main overflow-x-hidden transition-colors duration-300">
      <div className="no-print">
        {activeTable ? (
          <PosView onBack={() => setActiveTable(null)} onPrint={handlePrint} />
        ) : (
          <div className="md:pl-64 pb-24 md:pb-12">
            <Sidebar activeView={activeView} setView={setView} />
            
            <header className="bg-sidebar border-b border-main p-3 sticky top-0 z-10 flex justify-between items-center md:hidden transition-colors duration-300">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm"><i className="fa-solid fa-cloud"></i></div>
                <h1 className="text-sm font-black text-main tracking-tight uppercase">Cloud-HMS</h1>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1.5 bg-app px-2 py-1 rounded-full border border-main">
                    <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                    <span className="text-[8px] font-black text-muted uppercase">{isSyncing ? 'SYNC' : 'LIVE'}</span>
                 </div>
                 <button onClick={logout} className="text-rose-500 text-sm p-1"><i className="fa-solid fa-power-off"></i></button>
              </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8">
              {activeView === 'Dashboard' && <Dashboard />}
              {activeView === 'Masters' && <Masters />}
              {activeView === 'Reports' && <Reports onPrint={handlePrint} onPrintDayBook={handlePrintDayBook} />}
              {activeView === 'Settings' && (
                <div className="py-4 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                  <div className="bg-[#1e293b] theme-dark:bg-[#111827] rounded-[2.5rem] shadow-2xl p-6 md:p-10 max-w-3xl mx-auto border border-white/5">
                    <h2 className="text-base md:text-xl font-black mb-8 flex items-center gap-3 text-white uppercase tracking-wider">
                       <i className="fa-solid fa-gears text-indigo-400"></i> BUSINESS CONFIGURATION
                    </h2>
                    
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">RESTAURANT NAME (LOCKED)</label>
                        <div className="relative">
                          <input className="w-full p-4 bg-slate-100 theme-dark:bg-slate-800/50 border-none rounded-2xl text-slate-500 font-black text-sm outline-none shadow-inner cursor-not-allowed" value={settings.name} readOnly />
                          <i className="fa-solid fa-lock absolute right-4 top-1/2 -translate-y-1/2 text-slate-400/50"></i>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">ADDRESS</label>
                        <textarea className="w-full p-4 bg-[#fefce8] border-none rounded-2xl text-slate-900 font-black text-sm outline-none shadow-inner resize-none" rows={2} value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">PHONE</label>
                          <input className="w-full p-4 bg-[#fefce8] border-none rounded-2xl text-slate-900 font-black text-sm outline-none shadow-inner" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">GSTIN</label>
                          <input className="w-full p-4 bg-[#fefce8] border-none rounded-2xl text-slate-900 font-black text-sm outline-none shadow-inner" value={settings.gstin || ''} onChange={e => setSettings({...settings, gstin: e.target.value})} />
                        </div>
                      </div>

                      <div className="bg-[#111827] theme-dark:bg-[#0b1120] p-6 rounded-[2rem] border border-white/5 space-y-5">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Master Role Passwords</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1">Master Admin Password</label>
                            <input type="password" className="w-full p-4 bg-[#fefce8] border-none rounded-2xl text-slate-900 font-black text-sm outline-none shadow-inner" placeholder="e.g., 123" value={settings.adminPassword || ''} onChange={e => setSettings({...settings, adminPassword: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1">Master Operator Password</label>
                            <input type="password" className="w-full p-4 bg-[#fefce8] border-none rounded-2xl text-slate-900 font-black text-sm outline-none shadow-inner" placeholder="e.g., 000" value={settings.operatorPassword || ''} onChange={e => setSettings({...settings, operatorPassword: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#111827] theme-dark:bg-[#0b1120] p-6 rounded-[2rem] border border-white/5 space-y-4">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">UI & PRINT CONFIG</label>
                        <input className="w-full p-4 bg-[#fefce8] border-none rounded-2xl text-slate-900 font-black text-sm outline-none shadow-inner" placeholder="merchant@upi" value={settings.upiId || ''} onChange={e => setSettings({...settings, upiId: e.target.value})} />
                        <div className="space-y-3 pt-2">
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                              <input type="checkbox" className="sr-only" checked={settings.printQrCode} onChange={e => setSettings({...settings, printQrCode: e.target.checked})} />
                              <div className={`w-5 h-5 rounded border transition-all ${settings.printQrCode ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-700 border-slate-600'}`}>
                                {settings.printQrCode && <i className="fa-solid fa-check text-[10px] text-white absolute inset-0 flex items-center justify-center"></i>}
                              </div>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">PRINT SCAN-TO-PAY QR ON BILL</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                              <input type="checkbox" className="sr-only" checked={settings.printGstSummary} onChange={e => setSettings({...settings, printGstSummary: e.target.checked})} />
                              <div className={`w-5 h-5 rounded border transition-all ${settings.printGstSummary ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-700 border-slate-600'}`}>
                                {settings.printGstSummary && <i className="fa-solid fa-check text-[10px] text-white absolute inset-0 flex items-center justify-center"></i>}
                              </div>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">PRINT GST TAX SUMMARY</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                              <input type="checkbox" className="sr-only" checked={settings.showImages} onChange={e => setSettings({...settings, showImages: e.target.checked})} />
                              <div className={`w-5 h-5 rounded border transition-all ${settings.showImages ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-700 border-slate-600'}`}>
                                {settings.showImages && <i className="fa-solid fa-check text-[10px] text-white absolute inset-0 flex items-center justify-center"></i>}
                              </div>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">SHOW IMAGES IN MENU</span>
                          </label>
                        </div>
                      </div>

                      <button onClick={saveSettings} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black shadow-2xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[11px] hover:scale-[1.01] active:scale-[0.98]">
                        <i className="fa-solid fa-cloud-arrow-up"></i> SAVE & SYNC SETTINGS
                      </button>
                    </div>
                  </div>

                  <div className="max-w-3xl mx-auto mt-8 grid grid-cols-2 gap-4 px-4 md:px-0">
                    <button onClick={() => setSettings({...settings, theme: 'light'})} className={`py-4 rounded-[2rem] border-2 font-black uppercase text-[10px] tracking-widest transition-all ${settings.theme === 'light' ? 'bg-white border-indigo-500 text-indigo-600 shadow-xl' : 'bg-white/5 border-white/10 text-slate-500'}`}><i className="fa-solid fa-sun mr-2"></i> Light Theme</button>
                    <button onClick={() => setSettings({...settings, theme: 'dark'})} className={`py-4 rounded-[2rem] border-2 font-black uppercase text-[10px] tracking-widest transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-indigo-500 text-indigo-400 shadow-xl' : 'bg-white/5 border-white/10 text-slate-500'}`}><i className="fa-solid fa-moon mr-2"></i> Dark Theme</button>
                  </div>
                </div>
              )}
            </main>
            <MobileNav activeView={activeView} setView={setView} />
            <ScrollingFooter />
          </div>
        )}
      </div>
      <PrintSection order={printData?.order || null} type={printData?.type || 'BILL'} reportOrders={printData?.reportOrders} reportDate={printData?.reportDate} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
};

export default App;
