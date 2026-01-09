
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { Order } from '../types';

interface ReportsProps {
  onPrint?: (type: 'BILL' | 'KOT', order: Order) => void;
}

const Reports: React.FC<ReportsProps> = ({ onPrint }) => {
  const { orders, setOrders, waiters, menu, setActiveTable, setTables, tables } = useApp();
  const [reportType, setReportType] = useState<'DayBook' | 'WaiterWise' | 'ItemSummary'>('DayBook');

  const settledOrders = orders.filter(o => o.status === 'Settled');

  const waiterStats = waiters.map(w => {
    const waiterOrders = settledOrders.filter(o => o.waiterId === w.id);
    const totalSales = waiterOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    return { name: w.name, count: waiterOrders.length, sales: totalSales };
  });

  const itemSummary = useMemo(() => {
    const summary: Record<string, { name: string, quantity: number, revenue: number }> = {};
    
    settledOrders.forEach(order => {
      order.items.forEach(item => {
        if (!summary[item.menuItemId]) {
          summary[item.menuItemId] = { 
            name: item.name, 
            quantity: 0, 
            revenue: 0 
          };
        }
        summary[item.menuItemId].quantity += item.quantity;
        summary[item.menuItemId].revenue += item.price * item.quantity;
      });
    });

    return Object.values(summary).sort((a, b) => b.revenue - a.revenue);
  }, [settledOrders]);

  const handleExport = () => {
    let csvContent = "";
    let fileName = "";

    if (reportType === 'DayBook') {
      fileName = "DayBook_Report.csv";
      csvContent = "Order ID,Date,Time,Items Count,Total Amount\n";
      settledOrders.forEach(order => {
        const dateObj = new Date(order.timestamp);
        const row = [
          order.id.slice(-6),
          dateObj.toLocaleDateString(),
          dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          order.items.length,
          order.totalAmount.toFixed(2)
        ];
        csvContent += row.join(",") + "\n";
      });
    } else if (reportType === 'ItemSummary') {
      fileName = "Item_Summary_Report.csv";
      csvContent = "Item Name,Quantity Sold,Total Revenue\n";
      itemSummary.forEach(item => {
        const row = [item.name, item.quantity, item.revenue.toFixed(2)];
        csvContent += row.join(",") + "\n";
      });
    } else if (reportType === 'WaiterWise') {
      fileName = "Waiter_Performance_Report.csv";
      csvContent = "Waiter Name,Orders Served,Total Sales\n";
      waiterStats.forEach(stat => {
        const row = [stat.name, stat.count, stat.sales.toFixed(2)];
        csvContent += row.join(",") + "\n";
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteOrder = (orderId: string) => {
    if (confirm("Are you sure you want to delete this order?")) {
      setOrders(prev => prev.filter(o => o.id !== orderId));
    }
  };

  const handleEditOrder = (order: Order) => {
    const table = tables.find(t => t.id === order.tableId);
    if (table && table.status !== 'Available') {
      alert("Cannot edit this order because Table " + table.number + " is currently occupied.");
      return;
    }

    if (confirm("This will re-open the table for editing. Proceed?")) {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Billed' } : o));
      setTables(prev => prev.map(t => t.id === order.tableId ? { ...t, status: 'Billing', currentOrderId: order.id } : t));
      setActiveTable(order.tableId);
    }
  };

  const handleRePrint = (order: Order) => {
    if (onPrint) onPrint('BILL', order);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1e293b] rounded-3xl shadow-xl overflow-hidden border border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between border-b border-slate-700 bg-slate-800/50">
          <div className="flex overflow-x-auto no-scrollbar">
            <button
              onClick={() => setReportType('DayBook')}
              className={`px-8 py-5 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${reportType === 'DayBook' ? 'bg-indigo-600 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Day Book
            </button>
            <button
              onClick={() => setReportType('ItemSummary')}
              className={`px-8 py-5 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${reportType === 'ItemSummary' ? 'bg-indigo-600 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Item Summary
            </button>
            <button
              onClick={() => setReportType('WaiterWise')}
              className={`px-8 py-5 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${reportType === 'WaiterWise' ? 'bg-indigo-600 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Waiter Stats
            </button>
          </div>
          <div className="p-4 flex items-center justify-end bg-slate-800/30">
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20"
            >
              <i className="fa-solid fa-file-excel text-sm"></i> Export CSV
            </button>
          </div>
        </div>

        <div className="p-8">
          {reportType === 'DayBook' && (
            <div className="overflow-x-auto rounded-2xl border border-slate-700">
              <table className="w-full text-left">
                <thead className="bg-[#0f172a] border-b border-slate-700">
                  <tr>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Order ID</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date/Time</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Items</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Amount</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-[#1e293b]">
                  {settledOrders.length === 0 ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-500 uppercase font-black tracking-widest text-xs opacity-50">No orders found</td></tr>
                  ) : (
                    settledOrders.map(order => (
                      <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                        <td className="p-4 font-mono text-xs text-indigo-400 font-bold">#{order.id.slice(-6).toUpperCase()}</td>
                        <td className="p-4 text-xs font-bold text-slate-300">
                          {new Date(order.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-4 text-xs font-bold text-slate-400">
                          {order.items.length} Product(s)
                        </td>
                        <td className="p-4 text-right font-black text-indigo-400">
                          ₹{order.totalAmount.toFixed(2)}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-3">
                            <button 
                              onClick={() => handleRePrint(order)}
                              title="Re-print Bill"
                              className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all border border-slate-700"
                            >
                              <i className="fa-solid fa-print"></i>
                            </button>
                            <button 
                              onClick={() => handleEditOrder(order)}
                              title="Edit Order"
                              className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:bg-amber-600 hover:text-white flex items-center justify-center transition-all border border-slate-700"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button 
                              onClick={() => handleDeleteOrder(order.id)}
                              title="Delete Order"
                              className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all border border-slate-700"
                            >
                              <i className="fa-solid fa-trash-can"></i>
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
            <div className="overflow-x-auto rounded-2xl border border-slate-700">
              <table className="w-full text-left">
                <thead className="bg-[#0f172a] border-b border-slate-700">
                  <tr>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Name</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Qty Sold</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-[#1e293b]">
                  {itemSummary.length === 0 ? (
                    <tr><td colSpan={3} className="p-12 text-center text-slate-500 uppercase font-black tracking-widest text-xs opacity-50">No sales recorded</td></tr>
                  ) : (
                    itemSummary.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                        <td className="p-4 font-bold text-slate-200 uppercase text-xs">{item.name}</td>
                        <td className="p-4 text-center text-slate-400 font-black">{item.quantity}</td>
                        <td className="p-4 text-right font-black text-emerald-400">
                          ₹{item.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'WaiterWise' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {waiterStats.map((stat, idx) => (
                <div key={idx} className="bg-[#1e293b] p-8 rounded-[2rem] border border-slate-700 shadow-xl group hover:border-indigo-500 transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                       <i className="fa-solid fa-user-tie text-xl"></i>
                    </div>
                    <span className="bg-[#0f172a] px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Active</span>
                  </div>
                  <h4 className="text-xl font-black text-white mb-4 uppercase tracking-tighter">{stat.name}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold uppercase tracking-widest">Orders Served</span>
                      <span className="font-black text-white">{stat.count}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-700 mt-4">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Total Sales</span>
                      <span className="font-black text-indigo-400 text-xl">₹{stat.sales.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
