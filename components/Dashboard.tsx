
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../store';
import { Table, Order } from '../types';

const Dashboard: React.FC = () => {
  const { tables, setActiveTable, orders } = useApp();
  const [now, setNow] = useState(Date.now());

  // Update "now" every minute to keep the "Min" labels accurate
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = useMemo(() => orders.filter(o => 
    (o.timestamp || '').split('T')[0] === todayStr
  ), [orders, todayStr]);
  
  const settledOrders = useMemo(() => todayOrders.filter(o => o.status === 'Settled' || o.status === 'Billed'), [todayOrders]);
  
  const grossSales = useMemo(() => settledOrders.reduce((acc, curr) => acc + curr.totalAmount, 0), [settledOrders]);
  const totalTax = useMemo(() => settledOrders.reduce((acc, curr) => acc + (curr.taxAmount || 0), 0), [settledOrders]);
  const netRevenue = useMemo(() => grossSales - totalTax, [grossSales, totalTax]);
  const totalInvoices = settledOrders.length;

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

  const getTableOrder = (table: Table): Order | undefined => {
    return orders.find(o => o.id === table.currentOrderId);
  };

  const getTimeElapsed = (timestamp: string): string => {
    const start = new Date(timestamp).getTime();
    const diff = Math.floor((now - start) / 60000);
    return diff > 0 ? `${diff} MIN` : 'NEW';
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      {/* Super Compact Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="bg-white theme-dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-main flex items-center justify-between transition-all hover:shadow-md">
          <div className="text-left">
            <p className="text-slate-500 theme-dark:text-slate-400 text-[8px] font-black uppercase tracking-wider">Today Sale (Gross)</p>
            <p className="text-slate-400 text-[7px] font-bold">Incl. GST</p>
          </div>
          <p className="text-lg font-black text-emerald-600 tracking-tight">₹{grossSales.toFixed(2)}</p>
        </div>

        <div className="bg-white theme-dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-main flex items-center justify-between transition-all hover:shadow-md">
          <p className="text-slate-500 theme-dark:text-slate-400 text-[8px] font-black uppercase tracking-wider">Total Bills</p>
          <p className="text-xl font-black text-slate-800 theme-dark:text-slate-100 tracking-tighter">{totalInvoices}</p>
        </div>

        <div className="bg-white theme-dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-main flex items-center justify-between transition-all hover:shadow-md">
          <p className="text-slate-500 theme-dark:text-slate-400 text-[8px] font-black uppercase tracking-wider">GST Collected</p>
          <p className="text-lg font-black text-amber-600 tracking-tight">₹{totalTax.toFixed(2)}</p>
        </div>

        <div className="bg-white theme-dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-main flex items-center justify-between transition-all hover:shadow-md">
          <p className="text-slate-500 theme-dark:text-slate-400 text-[8px] font-black uppercase tracking-wider">Net Revenue</p>
          <p className="text-lg font-black text-indigo-600 theme-dark:text-indigo-400 tracking-tight">₹{netRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Table Management Section */}
      <div className="bg-card rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] theme-dark:shadow-none border border-main p-5 md:p-6 transition-all duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-sm md:text-base font-black text-slate-800 theme-dark:text-white uppercase tracking-tighter">Floor Management</h2>
            <p className="text-[9px] font-black uppercase tracking-[2px] text-indigo-600 theme-dark:text-indigo-400">Live Table Occupancy</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 theme-dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 theme-dark:border-slate-700 shadow-sm">
              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Available</span>
            </div>
            <div className="flex items-center gap-1.5 bg-rose-50 theme-dark:bg-rose-950/20 px-3 py-1.5 rounded-full border border-rose-200 theme-dark:border-rose-900 shadow-sm">
              <div className="w-2 h-2 bg-rose-600 rounded-full animate-pulse"></div>
              <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest">Occupied</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-50 theme-dark:bg-amber-950/20 px-3 py-1.5 rounded-full border border-amber-200 theme-dark:border-amber-900 shadow-sm">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Billing</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-11 gap-4 md:gap-5">
          {sortedTables.map(table => {
            const order = getTableOrder(table);
            const isBusy = (table.status === 'Occupied' || table.status === 'Billing') && order;

            return (
              <div 
                key={table.id}
                onClick={() => setActiveTable(table.id)}
                className={`
                  relative aspect-square rounded-[1.75rem] md:rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 border group
                  ${table.status === 'Available' ? 'bg-slate-50 theme-dark:bg-slate-800/40 border-slate-200 theme-dark:border-slate-700 hover:border-indigo-400 hover:bg-white hover:shadow-xl' : ''}
                  ${table.status === 'Occupied' ? 'bg-rose-600 border-rose-700 text-white shadow-lg shadow-rose-600/20 scale-[1.02] z-10' : ''}
                  ${table.status === 'Billing' ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/20 scale-[1.02] z-10' : ''}
                `}
              >
                {isBusy && (
                  <div className="absolute top-4 inset-x-0 text-center">
                    <span className="text-[9px] md:text-[8px] font-black uppercase tracking-widest opacity-90">
                      {getTimeElapsed(order.timestamp)}
                    </span>
                  </div>
                )}

                {!isBusy && (
                  <div className={`mb-1.5 md:mb-1 w-9 h-9 md:w-8 md:h-8 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                    table.status === 'Available' ? 'bg-white theme-dark:bg-slate-700 text-slate-400 group-hover:text-indigo-600 border border-slate-100 theme-dark:border-slate-600' :
                    'bg-white/20 text-white border border-white/10'
                  }`}>
                    <i className="fa-solid fa-chair text-xs md:text-[13px]"></i>
                  </div>
                )}
                
                <div className="text-center">
                  <span className={`font-black text-xl md:text-base tracking-tighter block leading-none ${
                    table.status === 'Available' ? 'text-slate-700 theme-dark:text-slate-300' : 'text-white'
                  }`}>
                    {table.number}
                  </span>
                </div>

                {isBusy && (
                  <div className="absolute bottom-5 inset-x-0 text-center">
                    <span className="text-[12px] md:text-[10px] font-black tracking-tight bg-white/10 px-2 py-0.5 rounded-full">
                      ₹{order.totalAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                
                <div className="absolute top-3 right-3 md:top-2.5 md:right-2.5">
                  <div className={`w-2 h-2 md:w-1.5 md:h-1.5 rounded-full border border-white/10 ${
                    table.status === 'Available' ? 'bg-slate-200 theme-dark:bg-slate-600' :
                    table.status === 'Occupied' ? 'bg-white animate-pulse' :
                    'bg-white'
                  }`}></div>
                </div>

                {table.status !== 'Available' && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded-lg shadow-xl border border-main z-20 flex items-center justify-center">
                    <i className="fa-solid fa-eye text-[9px] md:text-[8px] text-indigo-600"></i>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
