
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
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Stats Overview - Compact Version */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Today's Sales */}
        <div className="bg-card p-3 rounded-xl shadow-sm border border-main group hover:border-indigo-500/50 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
             <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-600 shadow-inner">
                <i className="fa-solid fa-indian-rupee-sign text-sm"></i>
             </div>
             <span className="text-[7px] font-black text-indigo-500/80 uppercase tracking-widest bg-indigo-500/5 px-1.5 py-0.5 rounded">Daily Stats</span>
          </div>
          <p className="text-muted text-[8px] font-black uppercase tracking-widest mb-0.5">Today's Sales</p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-main tracking-tight">₹{dailySales.toLocaleString()}</span>
            <span className="text-[8px] text-emerald-600 font-bold bg-emerald-500/10 px-1 py-0.5 rounded">+12.5%</span>
          </div>
        </div>

        {/* Total Invoices */}
        <div className="bg-card p-3 rounded-xl shadow-sm border border-main group hover:border-emerald-500/50 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
             <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-600 shadow-inner">
                <i className="fa-solid fa-file-invoice text-sm"></i>
             </div>
             <span className="text-[7px] font-black text-emerald-400/80 uppercase tracking-widest bg-emerald-500/5 px-1.5 py-0.5 rounded">Invoicing</span>
          </div>
          <p className="text-muted text-[8px] font-black uppercase tracking-widest mb-0.5">Total Invoices</p>
          <p className="text-lg font-black text-main tracking-tight">{totalInvoices}</p>
        </div>

        {/* Active Tables */}
        <div className="bg-card p-3 rounded-xl shadow-sm border border-main group hover:border-orange-500/50 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
             <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-600 shadow-inner">
                <i className="fa-solid fa-chair text-sm"></i>
             </div>
             <span className="text-[7px] font-black text-orange-400/80 uppercase tracking-widest bg-orange-500/5 px-1.5 py-0.5 rounded">Floor Status</span>
          </div>
          <p className="text-muted text-[8px] font-black uppercase tracking-widest mb-0.5">Active Tables</p>
          <p className="text-lg font-black text-main tracking-tight">{activeTablesCount}</p>
        </div>
      </div>

      {/* Table Management Section - Compact Version */}
      <div className="bg-card rounded-2xl shadow-md border border-main p-4 md:p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <h2 className="text-lg font-black text-main uppercase tracking-tighter mb-0.5">Table Overview</h2>
            <p className="text-[8px] font-black uppercase tracking-[1.5px] bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">
              Live Floor Management
            </p>
          </div>
          
          {/* Status Pills - Legend */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-full shadow-sm border border-slate-200 group cursor-default">
              <div className="w-1 h-1 bg-slate-400 rounded-full group-hover:scale-125 transition-transform"></div>
              <span className="text-[8px] font-black text-slate-900 uppercase tracking-widest">Free</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-full shadow-sm border border-slate-200 group cursor-default">
              <div className="w-1 h-1 bg-rose-500 rounded-full animate-pulse"></div>
              <span className="text-[8px] font-black text-slate-900 uppercase tracking-widest">Busy</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-full shadow-sm border border-slate-200 group cursor-default">
              <div className="w-1 h-1 bg-amber-500 rounded-full"></div>
              <span className="text-[8px] font-black text-slate-900 uppercase tracking-widest">Bill</span>
            </div>
          </div>
        </div>

        {/* Tables Grid - Tighter Layout */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5 pb-2">
          {sortedTables.map(table => (
            <div 
              key={table.id}
              onClick={() => setActiveTable(table.id)}
              className={`
                relative aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 border group
                ${table.status === 'Available' ? 'bg-slate-50 border-slate-200 hover:border-cyan-500/50 hover:bg-cyan-50' : ''}
                ${table.status === 'Occupied' ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-sm' : ''}
                ${table.status === 'Billing' ? 'bg-amber-50 border-amber-300 text-amber-600 shadow-sm' : ''}
              `}
            >
              <div className={`mb-1 w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 group-hover:scale-105 ${
                table.status === 'Available' ? 'bg-slate-100 text-slate-400 group-hover:text-cyan-500' :
                table.status === 'Occupied' ? 'bg-rose-100 text-rose-500' :
                'bg-amber-100 text-amber-500'
              }`}>
                <i className="fa-solid fa-chair text-sm"></i>
              </div>
              
              <div className="text-center">
                <span className={`font-black text-sm tracking-tight ${table.status === 'Available' ? 'text-slate-400 group-hover:text-main' : 'text-main'}`}>{table.number}</span>
                <div className={`text-[6px] uppercase font-black tracking-widest opacity-60 ${
                  table.status === 'Available' ? 'text-slate-400' : 
                  table.status === 'Occupied' ? 'text-rose-600' : 
                  'text-amber-600'
                }`}>
                  {table.status.slice(0, 4)}
                </div>
              </div>
              
              {/* Status Light Overlay */}
              <div className="absolute top-2 right-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  table.status === 'Available' ? 'bg-slate-300' :
                  table.status === 'Occupied' ? 'bg-rose-500 animate-pulse' :
                  'bg-amber-500'
                }`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
