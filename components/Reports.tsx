
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
  const [isClosing, setIsClosing] = useState(false);

  // Filtered orders specifically for the DayBook (Accounting view)
  const finalizedOrders = useMemo(() => {
    return orders.filter(o => {
      const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
      // EXCLUDE DRAFTS: Only show orders that have been assigned a Bill Number
      return orderDate === selectedDate && o.dailyBillNo && o.dailyBillNo !== '';
    }).sort((a, b) => {
      // Numerical sort by Bill Number (Descending)
      const numA = parseInt(a.dailyBillNo);
      const numB = parseInt(b.dailyBillNo);
      return numB - numA;
    });
  }, [orders, selectedDate]);

  const settledOrders = useMemo(() => finalizedOrders.filter(o => o.status === 'Settled' || o.status === 'Billed'), [finalizedOrders]);
  
  // Real-time stats recalculation based on finalized/billed orders
  const stats = useMemo(() => {
    const total = settledOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const count = settledOrders.length;
    
    const items: Record<string, { name: string, quantity: number, revenue: number }> = {};
    settledOrders.forEach(order => {
      order.items.forEach(item => {
        if (!items[item.menuItemId]) {
          items[item.menuItemId] = { name: item.name, quantity: 0, revenue: 0 };
        }
        items[item.menuItemId].quantity += item.quantity;
        items[item.menuItemId].revenue += item.price * item.quantity;
      });
    });
    
    const sortedItems = Object.values(items).sort((a, b) => b.revenue - a.revenue);
    const topRevenue = sortedItems[0]?.revenue || 0;
    
    return { total, count, topRevenue, itemSummary: sortedItems };
  }, [settledOrders]);

  const captainStats = useMemo(() => {
    return captains.map(w => {
      const captainOrders = settledOrders.filter(o => o.captainId === w.id);
      const sales = captainOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      return { name: w.name, count: captainOrders.length, sales };
    }).sort((a, b) => b.sales - a.sales);
  }, [captains, settledOrders]);

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

  const handleDayClose = async () => {
    if (finalizedOrders.length === 0) {
      alert("No bills found for this date to close.");
      return;
    }

    if (confirm("Do You Realy want to close day!")) {
      setIsClosing(true);
      try {
        for (const order of finalizedOrders) {
          await remove("orders", order.id);
        }
        alert("Day closed successfully. All finalized bills cleared for " + selectedDate);
      } catch (err) {
        console.error(err);
        alert("An error occurred while closing the day.");
      } finally {
        setIsClosing(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end mb-2">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white theme-dark:bg-slate-800 p-3 rounded-xl border border-main shadow-sm">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Finalized Sales</p>
            <p className="text-lg font-black text-emerald-600">₹{stats.total.toFixed(2)}</p>
          </div>
          <div className="bg-white theme-dark:bg-slate-800 p-3 rounded-xl border border-main shadow-sm">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Bills Count</p>
            <p className="text-lg font-black text-slate-800 theme-dark:text-slate-200">{stats.count}</p>
          </div>
          <div className="bg-white theme-dark:bg-slate-800 p-3 rounded-xl border border-main shadow-sm">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Top Dish Sales</p>
            <p className="text-lg font-black text-indigo-600 theme-dark:text-indigo-400">₹{stats.topRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="bg-white theme-dark:bg-slate-800 p-2 rounded-xl border border-main min-w-[180px] shadow-sm">
            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 pl-1">Report Date</label>
            <div className="relative">
              <input 
                type="date" 
                className="w-full bg-slate-50 theme-dark:bg-slate-700 text-slate-900 theme-dark:text-white text-[11px] font-bold py-1.5 px-3 rounded-lg outline-none border border-slate-200 theme-dark:border-slate-600 appearance-none"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => onPrintDayBook?.(settledOrders, selectedDate)}
              disabled={settledOrders.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 transition-all text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-md flex-1 md:flex-none"
            >
              <i className="fa-solid fa-print"></i>
              Print
            </button>
            
            <button 
              onClick={handleDayClose}
              disabled={finalizedOrders.length === 0 || isClosing}
              className="bg-rose-600 hover:bg-rose-500 disabled:opacity-30 transition-all text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-md flex-1 md:flex-none"
            >
              {isClosing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-calendar-check"></i>}
              Day Close
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white theme-dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-main">
        <div className="flex border-b border-main bg-slate-50/50 theme-dark:bg-slate-900/50 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setReportType('DayBook')} 
            className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${reportType === 'DayBook' ? 'border-indigo-600 bg-indigo-50 theme-dark:bg-indigo-900/20 text-indigo-600 theme-dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
          >
            DayBook (Final Bills)
          </button>
          <button 
            onClick={() => setReportType('ItemSummary')} 
            className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${reportType === 'ItemSummary' ? 'border-indigo-600 bg-indigo-50 theme-dark:bg-indigo-900/20 text-indigo-600 theme-dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
          >
            Item Wise Sales
          </button>
          <button 
            onClick={() => setReportType('CaptainWise')} 
            className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${reportType === 'CaptainWise' ? 'border-indigo-600 bg-indigo-50 theme-dark:bg-indigo-900/20 text-indigo-600 theme-dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
          >
            Captains Reports
          </button>
        </div>

        <div className="p-3">
          {reportType === 'DayBook' && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 theme-dark:border-slate-700">
              <table className="w-full text-left">
                <thead className="bg-slate-50 theme-dark:bg-slate-900 text-[9px] font-black text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Bill #</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">STAFF</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white theme-dark:bg-slate-800 text-[11px]">
                  {finalizedOrders.length === 0 ? (
                    <tr><td colSpan={7} className="p-10 text-center text-slate-400 font-bold uppercase italic tracking-wider">No finalized bills for {selectedDate}</td></tr>
                  ) : (
                    finalizedOrders.map(order => (
                      <tr key={order.id} className="border-b border-slate-100 theme-dark:border-slate-700 last:border-0 hover:bg-slate-50 theme-dark:hover:bg-slate-700/50 transition-colors">
                        <td className="p-3">
                          <div className="font-mono font-black text-indigo-600 theme-dark:text-indigo-400">#{order.dailyBillNo}</div>
                          <div className={`text-[8px] font-bold uppercase mt-0.5 ${
                            order.status === 'Settled' ? 'text-emerald-600' : 'text-indigo-500'}`}>{order.status}</div>
                        </td>
                        <td className="p-3 text-slate-500 font-medium">
                          {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </td>
                        <td className="p-3 text-slate-700 theme-dark:text-slate-300 font-black uppercase">{order.cashierName || 'Admin'}</td>
                        <td className="p-3 text-slate-700 theme-dark:text-slate-300 font-bold uppercase truncate max-w-[120px]">{order.customerName || 'Walk-in'}</td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            order.paymentMode === 'UPI' ? 'bg-indigo-50 theme-dark:bg-indigo-900/30 text-indigo-600' : 
                            order.paymentMode === 'Card' ? 'bg-amber-50 theme-dark:bg-amber-900/30 text-amber-600' : 
                            'bg-emerald-50 theme-dark:bg-emerald-900/30 text-emerald-600'
                          }`}>
                            {order.paymentMode || 'Cash'}
                          </span>
                        </td>
                        <td className="p-3 font-black text-right text-slate-900 theme-dark:text-white">₹{order.totalAmount.toFixed(2)}</td>
                        <td className="p-3">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => onPrint?.('BILL', order)} className="w-8 h-8 rounded-lg bg-white theme-dark:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-all flex items-center justify-center border border-slate-200 theme-dark:border-slate-600 shadow-sm" title="Print Bill">
                              <i className="fa-solid fa-print text-[10px]"></i>
                            </button>
                            <button onClick={() => handleEditOrder(order)} className="w-8 h-8 rounded-lg bg-white theme-dark:bg-slate-700 text-amber-500 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center border border-slate-200 theme-dark:border-slate-600 shadow-sm" title="Re-open Order">
                              <i className="fa-solid fa-rotate-left text-[10px]"></i>
                            </button>
                            <button onClick={() => handleDeleteOrder(order.id)} className="w-8 h-8 rounded-lg bg-white theme-dark:bg-slate-700 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center border border-slate-200 theme-dark:border-slate-600 shadow-sm" title="Delete Record">
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
            <div className="overflow-x-auto rounded-lg border border-slate-200 theme-dark:border-slate-700">
              <table className="w-full text-left">
                <thead className="bg-slate-50 theme-dark:bg-slate-900 text-[10px] font-black text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Dish Name</th>
                    <th className="p-3 text-center">Qty Sold</th>
                    <th className="p-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-white theme-dark:bg-slate-800 text-[11px]">
                  {stats.itemSummary.length === 0 ? (
                    <tr><td colSpan={3} className="p-10 text-center text-slate-400 font-bold uppercase italic tracking-wider">No sales recorded for {selectedDate}</td></tr>
                  ) : (
                    stats.itemSummary.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 theme-dark:border-slate-700 last:border-0 hover:bg-slate-50 theme-dark:hover:bg-slate-700/50 transition-colors">
                        <td className="p-3 text-slate-700 theme-dark:text-slate-300 font-black uppercase">{item.name}</td>
                        <td className="p-3 text-center text-indigo-600 theme-dark:text-indigo-400 font-black">{item.quantity}</td>
                        <td className="p-3 text-right text-emerald-600 theme-dark:text-emerald-400 font-black">₹{item.revenue.toFixed(2)}</td>
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
                <div className="col-span-full p-10 text-center text-slate-400 font-bold uppercase italic tracking-wider">No performance data for {selectedDate}</div>
              ) : (
                captainStats.map((stat, idx) => (
                  <div key={idx} className="bg-white theme-dark:bg-slate-700/30 p-3 rounded-xl border border-main flex justify-between items-center hover:border-indigo-500/50 transition-all group shadow-sm">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 theme-dark:text-slate-200 uppercase group-hover:text-indigo-600 transition-colors">{stat.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{stat.count} Bills Served</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-600 theme-dark:text-emerald-400">₹{stat.sales.toFixed(2)}</p>
                      <p className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">Total Sales</p>
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
