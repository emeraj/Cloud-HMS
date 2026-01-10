
import React, { useMemo } from 'react';
import { useApp } from '../store';

const Dashboard: React.FC = () => {
  const { tables, setActiveTable, orders } = useApp();

  const todayOrders = orders.filter(o => 
    new Date(o.timestamp).toLocaleDateString() === new Date().toLocaleDateString()
  );
  
  const dailySales = todayOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalInvoices = todayOrders.length;
  const activeTablesCount = tables.filter(t => t.status !== 'Available').length;

  // Sort tables numerically by their number property
  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) => {
      const numA = parseInt(a.number, 10);
      const numB = parseInt(b.number, 10);
      if (isNaN(numA) || isNaN(numB)) {
        return a.number.localeCompare(b.number);
      }
      return numA - numB;
    });
  }, [tables]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-2xl shadow-sm border border-main group hover:border-indigo-500/50 transition-all duration-300">
          <div className="flex justify-between items-start mb-3">
             <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner">
                <i className="fa-solid fa-indian-rupee-sign text-lg"></i>
             </div>
             <span className="text-[8px] font-black text-indigo-500/80 uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded-md">Daily Stats</span>
          </div>
          <p className="text-muted text-[9px] font-black uppercase tracking-widest mb-0.5">Today's Sales</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-main tracking-tight">₹{dailySales.toLocaleString()}</span>
            <span className="text-[9px] text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md">+12.5%</span>
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl shadow-sm border border-main group hover:border-emerald-500/50 transition-all duration-300">
          <div className="flex justify-between items-start mb-3">
             <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 shadow-inner">
                <i className="fa-solid fa-file-invoice text-lg"></i>
             </div>
             <span className="text-[8px] font-black text-emerald-400/80 uppercase tracking-widest bg-emerald-500/5 px-2 py-0.5 rounded-md">Invoicing</span>
          </div>
          <p className="text-muted text-[9px] font-black uppercase tracking-widest mb-0.5">Total Invoices</p>
          <p className="text-xl font-black text-main tracking-tight">{totalInvoices}</p>
        </div>

        <div className="bg-card p-4 rounded-2xl shadow-sm border border-main group hover:border-orange-500/50 transition-all duration-300">
          <div className="flex justify-between items-start mb-3">
             <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-600 shadow-inner">
                <i className="fa-solid fa-chair text-lg"></i>
             </div>
             <span className="text-[8px] font-black text-orange-400/80 uppercase tracking-widest bg-orange-500/5 px-2 py-0.5 rounded-md">Floor Status</span>
          </div>
          <p className="text-muted text-[9px] font-black uppercase tracking-widest mb-0.5">Active Tables</p>
          <p className="text-xl font-black text-main tracking-tight">{activeTablesCount}</p>
        </div>
      </div>

      {/* Table Management Section */}
      <div className="bg-card rounded-3xl shadow-md border border-main p-5 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-xl font-black text-main uppercase tracking-tighter mb-0.5">Table Overview</h2>
            <p className="text-[9px] font-black uppercase tracking-[2px] bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">
              Live Floor Management
            </p>
          </div>
          
          {/* Status Pills - Legend */}
          <div className="flex flex-wrap gap-2.5">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 group cursor-default">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full group-hover:scale-125 transition-transform"></div>
              <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Available</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 group cursor-default">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.3)]"></div>
              <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Occupied</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 group cursor-default">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div>
              <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Billing</span>
            </div>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 pb-2">
          {sortedTables.map(table => (
            <div 
              key={table.id}
              onClick={() => setActiveTable(table.id)}
              className={`
                relative aspect-square rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 border-2 group
                ${table.status === 'Available' ? 'bg-slate-50 border-slate-200 hover:border-cyan-500/50 hover:bg-cyan-50' : ''}
                ${table.status === 'Occupied' ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm border-rose-500' : ''}
                ${table.status === 'Billing' ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm border-amber-500' : ''}
              `}
            >
              <div className={`mb-1.5 w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${
                table.status === 'Available' ? 'bg-slate-100 text-slate-400 group-hover:text-cyan-500' :
                table.status === 'Occupied' ? 'bg-rose-100 text-rose-500' :
                'bg-amber-100 text-amber-500'
              }`}>
                <i className="fa-solid fa-chair text-xl"></i>
              </div>
              
              <div className="text-center">
                <span className={`font-black text-lg tracking-tight ${table.status === 'Available' ? 'text-slate-400 group-hover:text-main' : 'text-main'}`}>T-{table.number}</span>
                <div className={`text-[7px] uppercase font-black tracking-widest opacity-60 ${
                  table.status === 'Available' ? 'text-slate-400' : 
                  table.status === 'Occupied' ? 'text-rose-600' : 
                  'text-amber-600'
                }`}>
                  {table.status}
                </div>
              </div>
              
              {/* Status Light Overlay */}
              <div className="absolute top-4 right-4">
                <div className={`w-2 h-2 rounded-full ${
                  table.status === 'Available' ? 'bg-slate-300' :
                  table.status === 'Occupied' ? 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.4)]' :
                  'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                }`}></div>
              </div>

              {/* Hover Glow Effect */}
              {table.status === 'Available' && (
                <div className="absolute inset-0 rounded-2xl bg-cyan-500/0 group-hover:bg-cyan-500/5 transition-colors pointer-events-none"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
