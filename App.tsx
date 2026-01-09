
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
  const { logout, user } = useApp();
  const menuItems = [
    { id: 'Dashboard', icon: 'fa-solid fa-chart-line', label: 'Dashboard' },
    { id: 'Masters', icon: 'fa-solid fa-database', label: 'Master Data' },
    { id: 'Reports', icon: 'fa-solid fa-file-invoice-dollar', label: 'Reports' },
    { id: 'Settings', icon: 'fa-solid fa-gears', label: 'Settings' },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-[#1e293b] border-r border-slate-700 h-full fixed top-0 left-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-900/50">
          <i className="fa-solid fa-cloud"></i>
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight leading-none">Zesta-<span className="text-indigo-400">POS</span></h1>
          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Pro Edition</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
              activeView === item.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' 
                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <i className={item.icon}></i>
            {item.label}
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-700 space-y-3">
        <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Current Session</p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center">
               <i className="fa-solid fa-user text-xs"></i>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-slate-300 truncate">{user?.displayName?.toUpperCase() || 'ADMIN'}</p>
              <p className="text-[8px] font-bold text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-rose-500/20"
        >
          <i className="fa-solid fa-right-from-bracket"></i>
          Logout
        </button>
      </div>
    </div>
  );
};

const MobileNav: React.FC<{ activeView: View; setView: (v: View) => void }> = ({ activeView, setView }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-slate-700 flex justify-around p-2 z-50">
      <button onClick={() => setView('Dashboard')} className={`flex flex-col items-center p-2 ${activeView === 'Dashboard' ? 'text-indigo-400' : 'text-slate-500'}`}>
        <i className="fa-solid fa-house"></i>
        <span className="text-[10px] mt-1">Home</span>
      </button>
      <button onClick={() => setView('Masters')} className={`flex flex-col items-center p-2 ${activeView === 'Masters' ? 'text-indigo-400' : 'text-slate-500'}`}>
        <i className="fa-solid fa-database"></i>
        <span className="text-[10px] mt-1">Masters</span>
      </button>
      <button onClick={() => setView('Reports')} className={`flex flex-col items-center p-2 ${activeView === 'Reports' ? 'text-indigo-400' : 'text-slate-500'}`}>
        <i className="fa-solid fa-chart-pie"></i>
        <span className="text-[10px] mt-1">Reports</span>
      </button>
      <button onClick={() => setView('Settings')} className={`flex flex-col items-center p-2 ${activeView === 'Settings' ? 'text-indigo-400' : 'text-slate-500'}`}>
        <i className="fa-solid fa-gear"></i>
        <span className="text-[10px] mt-1">Config</span>
      </button>
    </div>
  );
};

const MainContent: React.FC = () => {
  const { activeTable, setActiveTable, settings, setSettings, isLoading, user, logout } = useApp();
  const [activeView, setView] = useState<View>('Dashboard');
  const [printData, setPrintData] = useState<{ type: 'BILL' | 'KOT', order: Order } | null>(null);

  const handlePrint = (type: 'BILL' | 'KOT', order: Order) => {
    setPrintData({ type, order });
    setTimeout(() => {
      window.print();
    }, 400);
  };

  if (!user) {
    return <Auth />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-black uppercase tracking-widest animate-pulse">Synchronizing Cloud Database...</h2>
        <p className="text-slate-500 text-xs mt-2 uppercase tracking-tighter">Your professional POS is coming online</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 overflow-x-hidden">
      <div className="no-print">
        {activeTable ? (
          <PosView 
            onBack={() => setActiveTable(null)} 
            onPrint={handlePrint}
          />
        ) : (
          <div className="md:pl-64 pb-20 md:pb-0">
            <Sidebar activeView={activeView} setView={setView} />
            
            <header className="bg-[#1e293b] border-b border-slate-700 p-4 sticky top-0 z-10 flex justify-between items-center md:hidden">
              <h1 className="text-lg font-black text-white tracking-tight">Zesta-<span className="text-indigo-400">POS</span></h1>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold text-slate-400">ONLINE</span>
                 </div>
                 <button onClick={logout} className="text-rose-500 text-sm">
                   <i className="fa-solid fa-right-from-bracket"></i>
                 </button>
              </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8">
              {activeView === 'Dashboard' && <Dashboard />}
              {activeView === 'Masters' && <Masters />}
              {activeView === 'Reports' && <Reports onPrint={handlePrint} />}
              {activeView === 'Settings' && (
                <div className="py-6">
                  <div className="bg-[#1e293b] rounded-2xl shadow-xl p-8 max-w-2xl mx-auto border border-slate-700">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                       <i className="fa-solid fa-gears text-indigo-400"></i> Business Settings
                    </h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Hotel/Restaurant Name</label>
                        <input 
                          className="w-full p-4 border-2 border-transparent rounded-xl bg-[#fdf9d1] text-slate-900 font-bold focus:border-indigo-500 outline-none transition-all"
                          value={settings.name}
                          onChange={e => setSettings({...settings, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Address</label>
                        <textarea 
                          className="w-full p-4 border-2 border-transparent rounded-xl bg-[#fdf9d1] text-slate-900 font-bold focus:border-indigo-500 outline-none transition-all"
                          rows={2}
                          value={settings.address}
                          onChange={e => setSettings({...settings, address: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Phone Number</label>
                          <input 
                            className="w-full p-4 border-2 border-transparent rounded-xl bg-[#fdf9d1] text-slate-900 font-bold focus:border-indigo-500 outline-none transition-all"
                            value={settings.phone}
                            onChange={e => setSettings({...settings, phone: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">GSTIN</label>
                          <input 
                            className="w-full p-4 border-2 border-transparent rounded-xl bg-[#fdf9d1] text-slate-900 font-bold focus:border-indigo-500 outline-none transition-all"
                            value={settings.gstin}
                            onChange={e => setSettings({...settings, gstin: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="p-6 bg-[#0f172a] rounded-2xl border border-slate-700 space-y-4">
                        <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Printer & QR Settings</h3>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">UPI ID (For Scan-to-Pay)</label>
                          <input 
                            className="w-full p-4 border-2 border-transparent rounded-xl bg-[#fdf9d1] text-slate-900 font-bold focus:border-indigo-500 outline-none transition-all"
                            value={settings.upiId || ''}
                            placeholder="e.g., yourname@upi"
                            onChange={e => setSettings({...settings, upiId: e.target.value})}
                          />
                        </div>
                        <div className="flex flex-col gap-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={settings.printQrCode}
                              onChange={e => setSettings({...settings, printQrCode: e.target.checked})}
                              className="w-5 h-5 accent-indigo-500"
                            />
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Print UPI QR Code on Bill</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={settings.printGstSummary}
                              onChange={e => setSettings({...settings, printGstSummary: e.target.checked})}
                              className="w-5 h-5 accent-indigo-500"
                            />
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Print GST Breakdown Summary</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Bill Footer Message</label>
                        <input 
                          className="w-full p-4 border-2 border-transparent rounded-xl bg-[#fdf9d1] text-slate-900 font-bold focus:border-indigo-500 outline-none transition-all"
                          value={settings.thankYouMessage}
                          onChange={e => setSettings({...settings, thankYouMessage: e.target.value})}
                        />
                      </div>
                      <button 
                        onClick={() => alert('Configuration Saved!')}
                        className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black mt-4 shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                      >
                        <i className="fa-solid fa-floppy-disk"></i> Save Configuration
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
      <PrintSection order={printData?.order || null} type={printData?.type || 'BILL'} />
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
