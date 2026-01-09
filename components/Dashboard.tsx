
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
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] p-8 rounded-3xl shadow-xl border border-slate-700 group hover:border-indigo-500 transition-all">
          <div className="flex justify-between items-start mb-4">
             <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                <i className="fa-solid fa-indian-rupee-sign text-2xl"></i>
             </div>
             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Daily Stats</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Today's Sales</p>
          <p className="text-4xl font-black text-white">₹{dailySales.toLocaleString()}</p>
        </div>

        <div className="bg-[#1e293b] p-8 rounded-3xl shadow-xl border border-slate-700 group hover:border-emerald-500 transition-all">
          <div className="flex justify-between items-start mb-4">
             <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400">
                <i className="fa-solid fa-file-invoice text-2xl"></i>
             </div>
             <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Invoicing</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Invoices</p>
          <p className="text-4xl font-black text-white">{totalInvoices}</p>
        </div>

        <div className="bg-[#1e293b] p-8 rounded-3xl shadow-xl border border-slate-700 group hover:border-orange-500 transition-all">
          <div className="flex justify-between items-start mb-4">
             <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-400">
                <i className="fa-solid fa-chair text-2xl"></i>
             </div>
             <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Floor Status</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Active Tables</p>
          <p className="text-4xl font-black text-white">{activeTablesCount}</p>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-3xl shadow-2xl border border-slate-700 p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Table Overview</h2>
          <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-2 bg-[#0f172a] px-3 py-1.5 rounded-full border border-slate-700"><div className="w-2.5 h-2.5 bg-slate-600 rounded-full"></div> Available</div>
            <div className="flex items-center gap-2 bg-[#0f172a] px-3 py-1.5 rounded-full border border-slate-700"><div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></div> Occupied</div>
            <div className="flex items-center gap-2 bg-[#0f172a] px-3 py-1.5 rounded-full border border-slate-700"><div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div> Billing</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
          {tables.map(table => (
            <div 
              key={table.id}
              onClick={() => setActiveTable(table.id)}
              className={`
                aspect-square rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all border-2 group
                ${table.status === 'Available' ? 'bg-[#0f172a]/50 border-slate-700 hover:border-indigo-500 hover:scale-105 shadow-lg' : ''}
                ${table.status === 'Occupied' ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]' : ''}
                ${table.status === 'Billing' ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.2)]' : ''}
              `}
            >
              <i className={`fa-solid fa-chair text-3xl mb-2 transition-transform group-hover:scale-110 ${table.status === 'Available' ? 'text-slate-700' : ''}`}></i>
              <span className="font-black text-xl tracking-tighter">T-{table.number}</span>
              <span className="text-[10px] uppercase font-bold tracking-tighter opacity-50">
                {table.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
