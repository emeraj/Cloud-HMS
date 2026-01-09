
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { Order } from '../types';

interface ReportsProps {
  onPrint?: (type: 'BILL' | 'KOT', order: Order) => void;
}

const Reports: React.FC<ReportsProps> = ({ onPrint }) => {
  const { orders, waiters, setActiveTable, tables, upsert, remove } = useApp();
  const [reportType, setReportType] = useState<'DayBook' | 'WaiterWise' | 'ItemSummary'>('DayBook');

  // Include both Billed and Settled orders to ensure live visibility as soon as a bill is generated
  const completedOrders = useMemo(() => 
    orders.filter(o => o.status === 'Settled' || o.status === 'Billed')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), 
    [orders]
  );

  const totalSales = useMemo(() => completedOrders.reduce((acc, curr) => acc + curr.totalAmount, 0), [completedOrders]);

  const waiterStats = useMemo(() => {
    return waiters.map(w => {
      const waiterOrders = completedOrders.filter(o => o.waiterId === w.id);
      const sales = waiterOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      return { name: w.name, count: waiterOrders.length, sales };
    }).sort((a, b) => b.sales - a.sales);
  }, [waiters, completedOrders]);

  const itemSummary = useMemo(() => {
    const summary: Record<string, { name: string, quantity: number, revenue: number }> = {};
    completedOrders.forEach(order => {
      order.items.forEach(item => {
        if (!summary[item.menuItemId]) {
          summary[item.menuItemId] = { name: item.name, quantity: 0, revenue: 0 };
        }
        summary[item.menuItemId].quantity += item.quantity;
        summary[item.menuItemId].revenue += item.price * item.quantity;
      });
    });
    return Object.values(summary).sort((a, b) => b.revenue - a.revenue);
  }, [completedOrders]);

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm("Delete this order record permanently?")) {
      await remove("orders", orderId);
    }
  };

  const handleEditOrder = async (order: Order) => {
    const table = tables.find(t => t.id === order.tableId);
    if (table && table.status !== 'Available') {
      alert("Table is currently occupied.");
      return;
    }
    if (confirm("Re-open this order? It will return to 'Billing' status.")) {
      await upsert("orders", { ...order, status: 'Billed' });
      await upsert("tables", { ...table, status: 'Billing', currentOrderId: order.id });
      setActiveTable(order.tableId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards - Normal font and tighter padding */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#1e293b] p-3.5 rounded-xl border border-slate-700">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Total Sales (Billed+Settled)</p>
          <p className="text-lg font-bold text-emerald-400">₹{totalSales.toFixed(2)}</p>
        </div>
        <div className="bg-[#1e293b] p-3.5 rounded-xl border border-slate-700">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Completed Orders</p>
          <p className="text-lg font-bold text-white">{completedOrders.length}</p>
        </div>
        <div className="bg-[#1e293b] p-3.5 rounded-xl border border-slate-700">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Unique Items Sold</p>
          <p className="text-lg font-bold text-indigo-400">{itemSummary.length}</p>
        </div>
      </div>

      <div className="bg-[#1a2135] rounded-xl shadow-lg overflow-hidden border border-slate-800">
        <div className="flex border-b border-slate-800 bg-[#1e293b]/20 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setReportType('DayBook')} 
            className={`px-5 py-3 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${reportType === 'DayBook' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Order Log
          </button>
          <button 
            onClick={() => setReportType('ItemSummary')} 
            className={`px-5 py-3 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${reportType === 'ItemSummary' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Item Summary
          </button>
          <button 
            onClick={() => setReportType('WaiterWise')} 
            className={`px-5 py-3 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${reportType === 'WaiterWise' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Waiters
          </button>
        </div>

        <div className="p-3">
          {reportType === 'DayBook' && (
            <div className="overflow-x-auto rounded-lg border border-slate-800/50">
              <table className="w-full text-left">
                <thead className="bg-[#0f172a] text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-2.5">ID/Time</th>
                    <th className="p-2.5">Table</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Amount</th>
                    <th className="p-2.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-[#1e293b]/10 text-xs">
                  {completedOrders.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-slate-600 font-bold uppercase italic tracking-wider">No completed orders today</td></tr>
                  ) : (
                    completedOrders.map(order => (
                      <tr key={order.id} className="border-b border-slate-800/50 hover:bg-slate-700/20 transition-colors">
                        <td className="p-2.5">
                          <div className="font-mono font-bold text-indigo-400">#{order.id.slice(-6).toUpperCase()}</div>
                          <div className="text-[9px] text-slate-500">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="p-2.5 text-slate-300 font-bold">T-{tables.find(t => t.id === order.tableId)?.number}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${order.status === 'Settled' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' : 'border-orange-500/30 text-orange-500 bg-orange-500/5'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-right text-slate-200">₹{order.totalAmount.toFixed(2)}</td>
                        <td className="p-2.5">
                          <div className="flex justify-center gap-1.5">
                            <button onClick={() => onPrint?.('BILL', order)} className="w-7 h-7 rounded bg-slate-800 text-slate-400 hover:text-white transition-all flex items-center justify-center border border-slate-700">
                              <i className="fa-solid fa-print text-[10px]"></i>
                            </button>
                            <button onClick={() => handleEditOrder(order)} className="w-7 h-7 rounded bg-slate-800 text-amber-500 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center border border-slate-700">
                              <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                            </button>
                            <button onClick={() => handleDeleteOrder(order.id)} className="w-7 h-7 rounded bg-slate-800 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center border border-slate-700">
                              <i className="fa-solid fa-trash-can text-[10px]"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'ItemSummary' && (
            <div className="overflow-x-auto rounded-lg border border-slate-800/50">
              <table className="w-full text-left">
                <thead className="bg-[#0f172a] text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-2.5">Dish Name</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-[#1e293b]/10 text-xs">
                  {itemSummary.length === 0 ? (
                    <tr><td colSpan={3} className="p-10 text-center text-slate-600 font-bold uppercase italic tracking-wider">No items sold yet</td></tr>
                  ) : (
                    itemSummary.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-700/20">
                        <td className="p-2.5 text-slate-300 font-bold uppercase">{item.name}</td>
                        <td className="p-2.5 text-center text-indigo-400 font-bold">{item.quantity}</td>
                        <td className="p-2.5 text-right text-emerald-400 font-bold">₹{item.revenue.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'WaiterWise' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {waiterStats.length === 0 ? (
                <div className="col-span-full p-10 text-center text-slate-600 font-bold uppercase italic tracking-wider">No waiter stats available</div>
              ) : (
                waiterStats.map((stat, idx) => (
                  <div key={idx} className="bg-[#0f172a] p-3 rounded-xl border border-slate-800 flex justify-between items-center hover:border-indigo-500/50 transition-all group">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase group-hover:text-indigo-400 transition-colors">{stat.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{stat.count} Orders</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">₹{stat.sales.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Total Generated</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
