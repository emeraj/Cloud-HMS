
import React, { useState } from 'react';
import { AppProvider, useApp } from './store';
import Dashboard from './components/Dashboard';
import PosView from './components/PosView';
import Masters from './components/Masters';
import Reports from './components/Reports';
import PrintSection from './components/PrintSection';
import Auth from './components/Auth';
import { Order } from './types';

type View = 'Dashboard' | 'Masters' | 'Reports' | 'Settings';

const Sidebar: React.FC<{ activeView: View; setView: (v: View) => void }> = ({ activeView, setView }) => {
  const { logout, user, isSyncing } = useApp();
  const menuItems = [
    { id: 'Dashboard', icon: 'fa-solid fa-chart-line', label: 'Dashboard' },
    { id: 'Masters', icon: 'fa-solid fa-database', label: 'Master Data' },
    { id: 'Reports', icon: 'fa-solid fa-file-invoice-dollar', label: 'Reports' },
    { id: 'Settings', icon: 'fa-solid fa-gears', label: 'Settings' },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-[#1e293b] border-r border-slate-700 h-full fixed top-0 left-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
          <i className="fa-solid fa-cloud"></i>
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight leading-none">Zesta-<span className="text-indigo-400">POS</span></h1>
          <div className="flex items-center gap-1.5 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{isSyncing ? 'Syncing...' : 'Cloud Live'}</span>
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
                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <i className={`${item.icon} text-xs`}></i>
            {item.label}
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-700 space-y-3">
        <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600/20 text-indigo-400 rounded-lg flex items-center justify-center">
               <i className="fa-solid fa-user text-[10px]"></i>
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-black text-slate-300 truncate leading-none uppercase">{user?.displayName || 'Admin'}</p>
              <p className="text-[8px] font-bold text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all font-black text-[9px] uppercase tracking-widest border border-rose-500/20"
        >
          <i className="fa-solid fa-power-off text-[10px]"></i> Logout
        </button>
      </div>
    </div>
  );
};

const MobileNav: React.FC<{ activeView: View; setView: (v: View) => void }> = ({ activeView, setView }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-slate-700 flex justify-around p-1.5 z-50">
      {[
        { id: 'Dashboard', icon: 'fa-house', label: 'Home' },
        { id: 'Masters', icon: 'fa-database', label: 'Data' },
        { id: 'Reports', icon: 'fa-chart-pie', label: 'Bills' },
        { id: 'Settings', icon: 'fa-gear', label: 'Config' }
      ].map(tab => (
        <button key={tab.id} onClick={() => setView(tab.id as View)} className={`flex flex-col items-center p-2 flex-1 ${activeView === tab.id ? 'text-indigo-400' : 'text-slate-500'}`}>
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
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-sm font-black uppercase tracking-widest">Connecting to Cloud...</h2>
        <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-widest opacity-50">Initializing real-time data stream</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 overflow-x-hidden">
      <div className="no-print">
        {activeTable ? (
          <PosView onBack={() => setActiveTable(null)} onPrint={handlePrint} />
        ) : (
          <div className="md:pl-64 pb-20 md:pb-0">
            <Sidebar activeView={activeView} setView={setView} />
            
            <header className="bg-[#1e293b] border-b border-slate-700 p-3 sticky top-0 z-10 flex justify-between items-center md:hidden">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm"><i className="fa-solid fa-cloud"></i></div>
                <h1 className="text-sm font-black text-white tracking-tight uppercase">Zesta-POS</h1>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1.5 bg-[#0f172a] px-2 py-1 rounded-full border border-slate-700">
                    <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                    <span className="text-[8px] font-black text-slate-400 uppercase">{isSyncing ? 'SYNC' : 'LIVE'}</span>
                 </div>
                 <button onClick={logout} className="text-rose-500 text-sm p-1"><i className="fa-solid fa-power-off"></i></button>
              </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8">
              {activeView === 'Dashboard' && <Dashboard />}
              {activeView === 'Masters' && <Masters />}
              {activeView === 'Reports' && <Reports onPrint={handlePrint} onPrintDayBook={handlePrintDayBook} />}
              {activeView === 'Settings' && (
                <div className="py-4">
                  <div className="bg-[#1e293b] rounded-2xl shadow-xl p-6 md:p-8 max-w-2xl mx-auto border border-slate-700">
                    <h2 className="text-lg font-black mb-6 flex items-center gap-3 text-white uppercase tracking-wider">
                       <i className="fa-solid fa-gears text-indigo-400"></i> Business Configuration
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Restaurant Name</label>
                        <input className="w-full p-3 bg-[#fdf9d1] rounded-xl text-slate-900 font-bold text-sm border-none outline-none focus:ring-2 ring-indigo-500" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Address</label>
                        <textarea className="w-full p-3 bg-[#fdf9d1] rounded-xl text-slate-900 font-bold text-sm border-none outline-none focus:ring-2 ring-indigo-500" rows={2} value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Phone</label>
                          <input className="w-full p-3 bg-[#fdf9d1] rounded-xl text-slate-900 font-bold text-sm border-none outline-none focus:ring-2 ring-indigo-500" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">GSTIN</label>
                          <input className="w-full p-3 bg-[#fdf9d1] rounded-xl text-slate-900 font-bold text-sm border-none outline-none focus:ring-2 ring-indigo-500" value={settings.gstin || ''} onChange={e => setSettings({...settings, gstin: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">FSSAI License No.</label>
                        <input className="w-full p-3 bg-[#fdf9d1] rounded-xl text-slate-900 font-bold text-sm border-none outline-none focus:ring-2 ring-indigo-500" value={settings.fssai || ''} onChange={e => setSettings({...settings, fssai: e.target.value})} />
                      </div>

                      <div className="p-4 bg-[#0f172a] rounded-xl border border-slate-700 space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payment QR Config (UPI)</label>
                        <input className="w-full p-3 bg-[#fdf9d1] rounded-xl text-slate-900 font-bold text-sm border-none outline-none focus:ring-2 ring-indigo-500" value={settings.upiId || ''} placeholder="e.g., store@upi" onChange={e => setSettings({...settings, upiId: e.target.value})} />
                        <div className="flex flex-col gap-2 pt-1">
                          {[
                            { key: 'printQrCode', label: 'Print Scan-to-Pay QR on Bill' },
                            { key: 'printGstSummary', label: 'Print GST HSN/Tax Summary' }
                          ].map(opt => (
                            <label key={opt.key} className="flex items-center gap-3 cursor-pointer group">
                              <input type="checkbox" checked={settings[opt.key as keyof typeof settings] as boolean} onChange={e => setSettings({...settings, [opt.key]: e.target.checked})} className="w-4 h-4 accent-indigo-500" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <button onClick={saveSettings} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[11px]">
                        <i className="fa-solid fa-cloud-arrow-up"></i> Save & Sync Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>
            <MobileNav activeView={activeView} setView={setView} />
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
