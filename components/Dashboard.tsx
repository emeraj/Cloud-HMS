import React, { useMemo } from 'react';
import { useApp } from '../store';

const Dashboard: React.FC = () => {
  const { tables, setActiveTable, orders } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = useMemo(() => orders.filter(o => 
    new Date(o.timestamp).toISOString().split('T')[0] === todayStr
  ), [orders, todayStr]);
  
  const settledOrders = useMemo(() => todayOrders.filter(o => o.status === 'Settled' || o.status === 'Billed'), [todayOrders]);
  
  const dailySales = useMemo(() => settledOrders.reduce((acc, curr) => acc + curr.totalAmount, 0), [settledOrders]);
  const totalInvoices = settledOrders.length;
  
  const topItemRevenue = useMemo(() => {
    const itemSales: Record<string, number> = {};
    settledOrders.forEach(order => {
      order.items.forEach(item => {
        itemSales[item.name] = (itemSales[item.name] || 0) + (item.price * item.quantity);
      });
    });
    const revenues = Object.values(itemSales);
    return revenues.length > 0 ? Math.max(...revenues) : 0;
  }, [settledOrders]);

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
      {/* Super Compact Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Settled Sales Card */}
        <div className="bg-white theme-dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-main flex items-center justify-between transition-all hover:shadow-md">
          <div className="text-left">
            <p className="text-slate-500 theme-dark:text-slate-400 text-[8px] font-black uppercase tracking-wider">
              Today Sale
            </p>
            <p className="text-slate-400 text-[7px] font-bold">({todayStr})</p>
          </div>
          <p className="text-lg font-black text-emerald-600 tracking-tight">₹{dailySales.toFixed(2)}</p>
        </div>

        {/* Orders Count Card */}
        <div className="bg-white theme-dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-main flex items-center justify-between transition-all hover:shadow-md">
          <p className="text-slate-500 theme-dark:text-slate-400 text-[8px] font-black uppercase tracking-wider">
            Orders
          </p>
          <p className="text-xl font-black text-slate-800 theme-dark:text-slate-100 tracking-tighter">{totalInvoices}</p>
        </div>

        {/* Top Item Revenue Card */}
        <div className="bg-white theme-dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-main flex items-center justify-between transition-all hover:shadow-md">
          <p className="text-slate-500 theme-dark:text-slate-400 text-[8px] font-black uppercase tracking-wider">
            Revenue
          </p>
          <p className="text-lg font-black text-indigo-600 theme-dark:text-indigo-400 tracking-tight">₹{topItemRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Table Management Section - Maintaining clear structure */}
      <div className="bg-card rounded-2xl shadow-lg border border-main p-4 md:p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div>
            <h2 className="text-sm md:text-base font-black text-main uppercase tracking-tighter">Floor Management</h2>
            <p className="text-[7px] font-black uppercase tracking-[2px] text-indigo-500">Live Table Occupancy</p>
          </div>
          
          <div className="flex flex-wrap gap-1.5">
            <div className="flex items-center gap-1 bg-app/50 px-2 py-1 rounded-full border border-main">
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
              <span className="text-[7px] font-black text-muted uppercase tracking-widest">Available</span>
            </div>
            <div className="flex items-center gap-1 bg-app/50 px-2 py-1 rounded-full border border-main">
              <div className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-pulse"></div>
              <span className="text-[7px] font-black text-muted uppercase tracking-widest">Occupied</span>
            </div>
            <div className="flex items-center gap-1 bg-app/50 px-2 py-1 rounded-full border border-main">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              <span className="text-[7px] font-black text-muted uppercase tracking-widest">Billing</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 md:gap-3">
          {sortedTables.map(table => (
            <div 
              key={table.id}
              onClick={() => setActiveTable(table.id)}
              className={`
                relative aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 border group
                ${table.status === 'Available' ? 'bg-white theme-dark:bg-slate-800 border-slate-200 hover:border-indigo-500' : ''}
                ${table.status === 'Occupied' ? 'bg-rose-50 theme-dark:bg-rose-950/20 border-rose-500 text-rose-700 shadow-sm' : ''}
                ${table.status === 'Billing' ? 'bg-amber-50 theme-dark:bg-amber-950/20 border-amber-400 text-amber-600 shadow-sm' : ''}
              `}
            >
              <div className={`mb-1 w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-105 ${
                table.status === 'Available' ? 'bg-slate-50 theme-dark:bg-slate-700 text-slate-400 group-hover:text-indigo-600' :
                table.status === 'Occupied' ? 'bg-rose-600 text-white' :
                'bg-amber-500 text-white'
              }`}>
                <i className="fa-solid fa-chair text-[9px] md:text-xs"></i>
              </div>
              
              <div className="text-center">
                <span className={`font-black text-xs md:text-base tracking-tighter block leading-none ${table.status === 'Available' ? 'text-slate-600 theme-dark:text-slate-300' : 'text-slate-900 theme-dark:text-white'}`}>
                  {table.number}
                </span>
              </div>
              
              <div className="absolute top-1.5 right-1.5">
                <div className={`w-1 h-1 rounded-full ${
                  table.status === 'Available' ? 'bg-slate-200' :
                  table.status === 'Occupied' ? 'bg-rose-600 animate-pulse' :
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
