
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

  const getTableAmount = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table || table.status === 'Available') return 0;
    const order = orders.find(o => o.id === table.currentOrderId);
    return order ? order.totalAmount : 0;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Visual Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white theme-dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-main flex items-center justify-between transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 theme-dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <i className="fa-solid fa-indian-rupee-sign text-sm"></i>
            </div>
            <div>
              <p className="text-slate-500 theme-dark:text-slate-400 text-[8px] font-black uppercase tracking-wider">Today Sale</p>
              <p className="text-lg font-black text-slate-800 theme-dark:text-slate-100 tracking-tight">₹{dailySales.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white theme-dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-main flex items-center justify-between transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 theme-dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <i className="fa-solid fa-receipt text-sm"></i>
            </div>
            <div>
              <p className="text-slate-500 theme-dark:text-slate-400 text-[8px] font-black uppercase tracking-wider">Final Bills</p>
              <p className="text-lg font-black text-slate-800 theme-dark:text-slate-100 tracking-tight">{totalInvoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white theme-dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-main flex items-center justify-between transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 theme-dark:bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <i className="fa-solid fa-utensils text-sm"></i>
            </div>
            <div>
              <p className="text-slate-500 theme-dark:text-slate-400 text-[8px] font-black uppercase tracking-wider">Top Order</p>
              <p className="text-lg font-black text-slate-800 theme-dark:text-slate-100 tracking-tight">₹{topItemRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Floor Management Grid */}
      <div className="bg-card rounded-2xl shadow-lg border border-main p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <h2 className="text-base md:text-lg font-black text-main uppercase tracking-tighter">Floor Management</h2>
            <p className="text-[8px] font-black uppercase tracking-[2px] text-indigo-500">Live Status Overview</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-app/50 px-3 py-1.5 rounded-full border border-main">
              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
              <span className="text-[8px] font-black text-muted uppercase tracking-widest">Free</span>
            </div>
            <div className="flex items-center gap-1.5 bg-app/50 px-3 py-1.5 rounded-full border border-main">
              <div className="w-2 h-2 bg-rose-600 rounded-full animate-pulse"></div>
              <span className="text-[8px] font-black text-muted uppercase tracking-widest">Occupied</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-4">
          {sortedTables.map(table => {
            const amount = getTableAmount(table.id);
            return (
              <div 
                key={table.id}
                onClick={() => setActiveTable(table.id)}
                className={`
                  relative aspect-[1/1.1] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 border-2 group
                  ${table.status === 'Available' ? 'bg-white theme-dark:bg-slate-800 border-slate-100 theme-dark:border-slate-700 hover:border-indigo-500/50' : ''}
                  ${table.status === 'Occupied' ? 'bg-rose-50 theme-dark:bg-rose-900/10 border-rose-500/30 text-rose-700 shadow-lg shadow-rose-500/10' : ''}
                  ${table.status === 'Billing' ? 'bg-amber-50 theme-dark:bg-amber-900/10 border-amber-400 text-amber-600 shadow-lg shadow-amber-500/10' : ''}
                `}
              >
                <div className={`mb-1.5 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${
                  table.status === 'Available' ? 'bg-slate-50 theme-dark:bg-slate-700 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white' :
                  table.status === 'Occupied' ? 'bg-rose-600 text-white' :
                  'bg-amber-500 text-white'
                }`}>
                  <i className="fa-solid fa-chair text-xs md:text-sm"></i>
                </div>
                
                <div className="text-center">
                  <span className={`font-black text-sm md:text-lg tracking-tighter block leading-none ${table.status === 'Available' ? 'text-slate-600 theme-dark:text-slate-300' : 'text-slate-900 theme-dark:text-white'}`}>
                    {table.number}
                  </span>
                  {amount > 0 && (
                    <span className="text-[9px] md:text-[10px] font-black text-indigo-600 theme-dark:text-indigo-400 mt-1 block">
                      ₹{amount.toFixed(0)}
                    </span>
                  )}
                </div>
                
                <div className="absolute top-2 right-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    table.status === 'Available' ? 'bg-slate-200' :
                    table.status === 'Occupied' ? 'bg-rose-600 animate-pulse' :
                    'bg-amber-500'
                  }`}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
