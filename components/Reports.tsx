
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { Order } from '../types';

interface ReportsProps {
  onPrint?: (type: 'BILL' | 'KOT', order: Order) => void;
}

const Reports: React.FC<ReportsProps> = ({ onPrint }) => {
  const { orders, waiters, setActiveTable, tables, upsert, remove } = useApp();
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
        if (!summary[item.menuItemId]) summary[item.menuItemId] = { name: item.name, quantity: 0, revenue: 0 };
        summary[item.menuItemId].quantity += item.quantity;
        summary[item.menuItemId].revenue += item.price * item.quantity;
      });
    });
    return Object.values(summary).sort((a, b) => b.revenue - a.revenue);
  }, [settledOrders]);

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm("Permanently delete this order from database?")) {
      await remove("orders", orderId);
    }
  };

  const handleEditOrder = async (order: Order) => {
    const table = tables.find(t => t.id === order.tableId);
    if (table && table.status !== 'Available') {
      alert("Table is currently occupied.");
      return;
    }
    if (confirm("Re-open this order for editing? Table will be occupied.")) {
      await upsert("orders", { ...order, status: 'Billed' });
      await upsert("tables", { ...table, status: 'Billing', currentOrderId: order.id });
      setActiveTable(order.tableId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1e293b] rounded-3xl shadow-xl overflow-hidden border border-slate-700">
        <div className="flex border-b border-slate-700 bg-slate-800/50">
          <button onClick={() => setReportType('DayBook')} className={`px-8 py-5 font-black text-xs uppercase tracking-widest ${reportType === 'DayBook' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Day Book</button>
          <button onClick={() => setReportType('ItemSummary')} className={`px-8 py-5 font-black text-xs uppercase tracking-widest ${reportType === 'ItemSummary' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Items</button>
          <button onClick={() => setReportType('WaiterWise')} className={`px-8 py-5 font-black text-xs uppercase tracking-widest ${reportType === 'WaiterWise' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Waiters</button>
        </div>

        <div className="p-8">
          {reportType === 'DayBook' && (
            <div className="overflow-x-auto rounded-2xl border border-slate-700">
              <table className="w-full text-left">
                <thead className="bg-[#0f172a] border-b border-slate-700">
                  <tr><th className="p-4 text-[10px] font-black text-slate-500 uppercase">ID</th><th className="p-4 text-[10px] font-black text-slate-500 uppercase">Amount</th><th className="p-4 text-[10px] font-black text-slate-500 uppercase text-center">Actions</th></tr>
                </thead>
                <tbody className="bg-[#1e293b]">
                  {settledOrders.map(order => (
                    <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                      <td className="p-4 font-mono text-xs text-indigo-400 font-bold">#{order.id.slice(-6).toUpperCase()}</td>
                      <td className="p-4 font-black text-indigo-400 text-right">₹{order.totalAmount.toFixed(2)}</td>
                      <td className="p-4 flex justify-center gap-3">
                        <button onClick={() => onPrint?.('BILL', order)} className="p-2 text-slate-400 hover:text-white"><i className="fa-solid fa-print"></i></button>
                        <button onClick={() => handleEditOrder(order)} className="p-2 text-slate-400 hover:text-amber-500"><i className="fa-solid fa-pen-to-square"></i></button>
                        <button onClick={() => handleDeleteOrder(order.id)} className="p-2 text-slate-400 hover:text-rose-500"><i className="fa-solid fa-trash-can"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* ... Other report types UI remains similar but uses the real-time data from orders state ... */}
        </div>
      </div>
    </div>
  );
};

export default Reports;
