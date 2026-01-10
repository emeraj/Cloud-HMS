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
  return (
    <div className="no-print fixed bottom-0 left-0 right-0 md:left-64 bg-red-600 border-t border-red-700 h-6 flex items-center z-[45] overflow-hidden select-none transition-colors duration-300 shadow-[0_-2px_10px_rgba(0,0,0,0.15)]">
      <div className="animate-marquee-ltr text-[8px] font-bold text-white uppercase tracking-widest whitespace-nowrap">
        Developed by: M. Soft India | Contact: 9890072651 | Visit: msoftindia.com &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        Developed by: M. Soft India | Contact: 9890072651 | Visit: msoftindia.com &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        Developed by: M. Soft India | Contact: 9890072651 | Visit: msoftindia.com
      </div>
    </div>
  );
};

const Sidebar: React.FC<{ activeView: View; setView: (v: View) => void }> = ({ activeView, setView }) => {
  const { logout, user, isSyncing, settings } = useApp();
  const menuItems = [
    { id: 'Dashboard', icon: 'fa-solid fa-chart-line', label: 'Dashboard' },
    { id: 'Masters', icon: 'fa-solid fa-database', label: 'Master Data' },
    { id: 'Reports', icon: 'fa-solid fa-file-invoice-dollar', label: 'Reports' },
    { id: 'Settings', icon: 'fa-solid fa-gears', label: 'Settings' },
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
  return (
    <div className="md:hidden fixed bottom-[22px] left-0 right-0 bg-sidebar border-t border-main flex justify-around p-1.5 z-50 transition-colors duration-300 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      {[
        { id: 'Dashboard', icon: 'fa-house', label: 'Home' },
        { id: 'Masters', icon: 'fa-database', label: 'Data' },
        { id: 'Reports', icon: 'fa-chart-pie', label: 'Bills' },
        { id: 'Settings', icon: 'fa-gear', label: 'Config' }
      ].map(tab => (
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

  // Sync theme with body class
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
    }
  }, [settings.theme]);

  const handlePrint = (type: 'BILL' | 'KOT', order: Order) => {
    setPrintData({ type, order });
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handlePrintDayBook = (orders: Order[], date: string) => {
    setPrintData({ type: 'DAYBOOK', reportOrders: orders, reportDate: date });
    setTimeout(() => {
      window.print();
    }, 400);
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
                <div className="py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-card rounded-2xl shadow-xl p-6 md:p-8 max-w-2xl mx-auto border border-main">
                    <h2 className="text-lg font-black mb-6 flex items-center gap-3 text-main uppercase tracking-wider">
                       <i className="fa-solid fa-gears text-indigo-600"></i> Business Configuration
                    </h2>
                    
                    <div className="space-y-8">
                      {/* Theme Section */}
                      <div className="space-y-4">
                        <label className="block text-[10px] font-black text-muted uppercase tracking-widest pl-1">Appearance & Interface</label>
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => setSettings({...settings, theme: 'light'})}
                            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all group ${settings.theme === 'light' ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md' : 'border-main bg-app/30 text-muted hover:border-slate-400'}`}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${settings.theme === 'light' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-main text-slate-400 group-hover:text-indigo-600'}`}>
                              <i className="fa-solid fa-sun"></i>
                            </div>
                            <span className="font-black text-[10px] uppercase tracking-widest">Light Mode</span>
                          </button>
                          
                          <button 
                            onClick={() => setSettings({...settings, theme: 'dark'})}
                            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all group ${settings.theme === 'dark' ? 'border-indigo-600 bg-indigo-500/10 text-indigo-400 shadow-md' : 'border-main bg-app/30 text-muted hover:border-slate-400'}`}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${settings.theme === 'dark' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 border border-main text-slate-500 group-hover:text-indigo-400'}`}>
                              <i className="fa-solid fa-moon"></i>
                            </div>
                            <span className="font-black text-[10px] uppercase tracking-widest">Dark Mode</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-muted mb-1.5 uppercase tracking-widest pl-1">Restaurant Name</label>
                          <input className="w-full p-3.5 bg-app border border-main rounded-xl text-main font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-muted mb-1.5 uppercase tracking-widest pl-1">Address</label>
                          <textarea className="w-full p-3.5 bg-app border border-main rounded-xl text-main font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50" rows={2} value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-muted mb-1.5 uppercase tracking-widest pl-1">Phone</label>
                            <input className="w-full p-3.5 bg-app border border-main rounded-xl text-main font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-muted mb-1.5 uppercase tracking-widest pl-1">GSTIN</label>
                            <input className="w-full p-3.5 bg-app border border-main rounded-xl text-main font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50" value={settings.gstin || ''} onChange={e => setSettings({...settings, gstin: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      <button onClick={saveSettings} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[11px] hover:scale-[1.01] active:scale-[0.98]">
                        <i className="fa-solid fa-cloud-arrow-up"></i> Save & Sync All Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>
            <MobileNav activeView={activeView} setView={setView} />
            <ScrollingFooter />
          </div>
        )}
      </div>
      <PrintSection 
        order={printData?.order || null} 
        type={printData?.type || 'BILL'} 
        reportOrders={printData?.reportOrders}
        reportDate={printData?.reportDate}
      />
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