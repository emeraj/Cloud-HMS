
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { Order } from '../types';

interface ReportsProps {
  onPrint?: (type: 'BILL' | 'KOT', order: Order) => void;
  onPrintDayBook?: (orders: Order[], date: string) => void;
}

const Reports: React.FC<ReportsProps> = ({ onPrint, onPrintDayBook }) => {
  const { orders, captains, setActiveTable, tables, upsert, remove } = useApp();
  const [reportType, setReportType] = useState<'DayBook' | 'CaptainWise' | 'ItemSummary'>('DayBook');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
      const isStatusMatch = o.status === 'Settled' || o.status === 'Billed';
      return isStatusMatch && orderDate === selectedDate;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders, selectedDate]);

  const totalSales = useMemo(() => filteredOrders.reduce((acc, curr) => acc + curr.totalAmount, 0), [filteredOrders]);

  const captainStats = useMemo(() => {
    return captains.map(w => {
      const captainOrders = filteredOrders.filter(o => o.captainId === w.id);
      const sales = captainOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      return { name: w.name, count: captainOrders.length, sales };
    }).sort((a, b) => b.sales - a.sales);
  }, [captains, filteredOrders]);

  const itemSummary = useMemo(() => {
    const summary: Record<string, { name: string, quantity: number, revenue: number }> = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        if (!summary[item.menuItemId]) {
          summary[item.menuItemId] = { name: item.name, quantity: 0, revenue: 0 };
        }
        summary[item.menuItemId].quantity += item.quantity;
        summary[item.menuItemId].revenue += item.price * item.quantity;
      });
    });
    return Object.values(summary).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

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
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end mb-2">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#1e293b] p-3.5 rounded-xl border border-slate-700">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Total Sales ({selectedDate})</p>
            <p className="text-lg font-bold text-emerald-400">₹{totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-[#1e293b] p-3.5 rounded-xl border border-slate-700">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Orders Count</p>
            <p className="text-lg font-bold text-white">{filteredOrders.length}</p>
          </div>
          <div className="bg-[#1e293b] p-3.5 rounded-xl border border-slate-700">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Top Item Revenue</p>
            <p className="text-lg font-bold text-indigo-400">₹{itemSummary[0]?.revenue.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="bg-[#1e293b] p-3 rounded-xl border border-slate-700 min-w-[200px]">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Select Report Date</label>
            <div className="relative">
              <input 
                type="date" 
                className="w-full bg-[#fdf9d1] text-slate-900 text-xs font-bold py-2 px-3 rounded-lg outline-none focus:ring-2 ring-indigo-500 appearance-none"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <i className="fa-solid fa-calendar-days absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"></i>
            </div>
          </div>
          
          <button 
            onClick={() => onPrintDayBook?.(filteredOrders, selectedDate)}
            disabled={filteredOrders.length === 0}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 transition-all text-white p-4 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest self-stretch sm:self-end"
          >
            <i className="fa-solid fa-print"></i>
            Print Report
          </button>
        </div>
      </div>

      <div className="bg-[#1a2135] rounded-xl shadow-lg overflow-hidden border border-slate-800">
        <div className="flex border-b border-slate-800 bg-[#1e293b]/20 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setReportType('DayBook')} 
            className={`px-5 py-3 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${reportType === 'DayBook' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            DayBook (Orders)
          </button>
          <button 
            onClick={() => setReportType('ItemSummary')} 
            className={`px-5 py-3 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${reportType === 'ItemSummary' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Sales by Item
          </button>
          <button 
            onClick={() => setReportType('CaptainWise')} 
            className={`px-5 py-3 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${reportType === 'CaptainWise' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Captains Performance
          </button>
        </div>

        <div className="p-3">
          {reportType === 'DayBook' && (
            <div className="overflow-x-auto rounded-lg border border-slate-800/50">
              <table className="w-full text-left">
                <thead className="bg-[#0f172a] text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                  <tr>
                    <th className="p-3">Bill #</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Cashier</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-[#1e293b]/10 text-[11px]">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={7} className="p-10 text-center text-slate-600 font-bold uppercase italic tracking-wider">No transaction data for {selectedDate}</td></tr>
                  ) : (
                    filteredOrders.map(order => (
                      <tr key={order.id} className="border-b border-slate-800/50 hover:bg-slate-700/20 transition-colors">
                        <td className="p-3">
                          <div className="font-mono font-black text-indigo-400">#{order.id.slice(-6).toUpperCase()}</div>
                          <div className={`text-[8px] font-bold uppercase mt-0.5 ${order.status === 'Settled' ? 'text-emerald-500' : 'text-orange-500'}`}>{order.status}</div>
                        </td>
                        <td className="p-3 text-slate-400 font-medium">
                          {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </td>
                        <td className="p-3 text-slate-300 font-bold uppercase">{order.cashierName || 'Admin'}</td>
                        <td className="p-3 text-slate-300 font-bold uppercase truncate max-w-[120px]">{order.customerName || 'Walk-in'}</td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            order.paymentMode === 'UPI' ? 'bg-indigo-500/10 text-indigo-400' : 
                            order.paymentMode === 'Card' ? 'bg-amber-500/10 text-amber-400' : 
                            'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {order.paymentMode || 'Cash'}
                          </span>
                        </td>
                        <td className="p-3 font-black text-right text-white">₹{order.totalAmount.toFixed(2)}</td>
                        <td className="p-3">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => onPrint?.('BILL', order)} className="w-8 h-8 rounded-lg bg-[#0f172a] text-slate-400 hover:text-white transition-all flex items-center justify-center border border-slate-700 shadow-sm" title="Print Bill">
                              <i className="fa-solid fa-print text-[10px]"></i>
                            </button>
                            <button onClick={() => handleEditOrder(order)} className="w-8 h-8 rounded-lg bg-[#0f172a] text-amber-500 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center border border-slate-700 shadow-sm" title="Re-open Order">
                              <i className="fa-solid fa-rotate-left text-[10px]"></i>
                            </button>
                            <button onClick={() => handleDeleteOrder(order.id)} className="w-8 h-8 rounded-lg bg-[#0f172a] text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center border border-slate-700 shadow-sm" title="Delete Record">
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
                    <th className="p-3">Dish Name</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-[#1e293b]/10 text-[11px]">
                  {itemSummary.length === 0 ? (
                    <tr><td colSpan={3} className="p-10 text-center text-slate-600 font-bold uppercase italic tracking-wider">No sales records for {selectedDate}</td></tr>
                  ) : (
                    itemSummary.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-700/20">
                        <td className="p-3 text-slate-300 font-bold uppercase">{item.name}</td>
                        <td className="p-3 text-center text-indigo-400 font-black">{item.quantity}</td>
                        <td className="p-3 text-right text-emerald-400 font-black">₹{item.revenue.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'CaptainWise' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {captainStats.length === 0 ? (
                <div className="col-span-full p-10 text-center text-slate-600 font-bold uppercase italic tracking-wider">No staff performance data for {selectedDate}</div>
              ) : (
                captainStats.map((stat, idx) => (
                  <div key={idx} className="bg-[#0f172a] p-3 rounded-xl border border-slate-800 flex justify-between items-center hover:border-indigo-500/50 transition-all group">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase group-hover:text-indigo-400 transition-colors">{stat.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{stat.count} Orders Served</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">₹{stat.sales.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Sales Generated</p>
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
