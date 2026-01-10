
import React from 'react';
import { useApp } from '../store';

const Dashboard: React.FC = () => {
  const { tables, setActiveTable, orders } = useApp();

  const todayOrders = orders.filter(o => 
    new Date(o.timestamp).toLocaleDateString() === new Date().toLocaleDateString()
  );
  
  const dailySales = todayOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalInvoices = todayOrders.length;
  const activeTablesCount = tables.filter(t => t.status !== 'Available').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-[2rem] shadow-xl border border-white/5 group hover:border-indigo-500/50 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
             <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner">
                <i className="fa-solid fa-indian-rupee-sign text-xl"></i>
             </div>
             <span className="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest bg-indigo-500/5 px-2 py-1 rounded-md">Daily Stats</span>
          </div>
          <p className="text-muted text-[10px] font-black uppercase tracking-widest mb-1">Today's Sales</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-main tracking-tighter">₹{dailySales.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md">+12.5%</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-[2rem] shadow-xl border border-white/5 group hover:border-emerald-500/50 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
             <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shadow-inner">
                <i className="fa-solid fa-file-invoice text-xl"></i>
             </div>
             <span className="text-[9px] font-black text-emerald-400/80 uppercase tracking-widest bg-emerald-500/5 px-2 py-1 rounded-md">Invoicing</span>
          </div>
          <p className="text-muted text-[10px] font-black uppercase tracking-widest mb-1">Total Invoices</p>
          <p className="text-3xl font-black text-main tracking-tighter">{totalInvoices}</p>
        </div>

        <div className="glass-card p-6 rounded-[2rem] shadow-xl border border-white/5 group hover:border-orange-500/50 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
             <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-400 shadow-inner">
                <i className="fa-solid fa-chair text-xl"></i>
             </div>
             <span className="text-[9px] font-black text-orange-400/80 uppercase tracking-widest bg-orange-500/5 px-2 py-1 rounded-md">Floor Status</span>
          </div>
          <p className="text-muted text-[10px] font-black uppercase tracking-widest mb-1">Active Tables</p>
          <p className="text-3xl font-black text-main tracking-tighter">{activeTablesCount}</p>
        </div>
      </div>

      {/* Table Management Section */}
      <div className="bg-[#111827] theme-light:bg-white rounded-[2.5rem] shadow-2xl border border-white/5 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h2 className="text-2xl font-black text-main uppercase tracking-tighter mb-1">Table Overview</h2>
            <p className="text-[10px] font-black uppercase tracking-[3px] bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              Live Floor Management
            </p>
          </div>
          
          {/* Status Pills - Legend */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-full shadow-lg border border-slate-200 group cursor-default">
              <div className="w-2 h-2 bg-slate-400 rounded-full group-hover:scale-125 transition-transform"></div>
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Available</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-full shadow-lg border border-slate-200 group cursor-default">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Occupied</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-full shadow-lg border border-slate-200 group cursor-default">
              <div className="w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Billing</span>
            </div>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-8 pb-4">
          {tables.map(table => (
            <div 
              key={table.id}
              onClick={() => setActiveTable(table.id)}
              className={`
                relative aspect-square rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-500 border-2 group
                ${table.status === 'Available' ? 'bg-[#1e293b]/20 border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/5 hover:-translate-y-2' : ''}
                ${table.status === 'Occupied' ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-[0_20px_40px_rgba(244,63,94,0.15)] scale-105 z-10 border-rose-500' : ''}
                ${table.status === 'Billing' ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_20px_40px_rgba(245,158,11,0.15)] border-amber-500' : ''}
              `}
            >
              <div className={`mb-3 w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110 ${
                table.status === 'Available' ? 'bg-slate-700/10 text-slate-600 group-hover:text-cyan-400' :
                table.status === 'Occupied' ? 'bg-rose-500/20 text-rose-500' :
                'bg-amber-500/20 text-amber-500'
              }`}>
                <i className="fa-solid fa-chair text-2xl"></i>
              </div>
              
              <div className="text-center">
                <span className={`font-black text-xl tracking-tighter ${table.status === 'Available' ? 'text-slate-500 group-hover:text-main' : 'text-main'}`}>T-{table.number}</span>
                <div className={`text-[8px] uppercase font-black tracking-widest opacity-60 mt-1 ${
                  table.status === 'Available' ? 'text-slate-600' : 
                  table.status === 'Occupied' ? 'text-rose-400' : 
                  'text-amber-400'
                }`}>
                  {table.status}
                </div>
              </div>
              
              {/* Status Light Overlay */}
              <div className="absolute top-6 right-6">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  table.status === 'Available' ? 'bg-slate-700/50' :
                  table.status === 'Occupied' ? 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]' :
                  'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                }`}></div>
              </div>

              {/* Hover Glow Effect */}
              {table.status === 'Available' && (
                <div className="absolute inset-0 rounded-[2.5rem] bg-cyan-500/0 group-hover:bg-cyan-500/5 transition-colors pointer-events-none"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
