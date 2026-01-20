
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { Order, KOTRecord } from '../types';

interface ReportsProps {
  onPrint?: (type: 'BILL' | 'KOT', order: Order) => void;
  onPrintDayBook?: (orders: Order[], date: string) => void;
}

const Reports: React.FC<ReportsProps> = ({ onPrint, onPrintDayBook }) => {
  const { orders, captains, kots, setActiveTable, tables, upsert, remove } = useApp();
  const [reportType, setReportType] = useState<'DayBook' | 'KOTReport' | 'ItemSummary' | 'CaptainWise'>('DayBook');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isClosing, setIsClosing] = useState(false);
  const [expandedKotId, setExpandedKotId] = useState<string | null>(null);

  const finalizedOrders = useMemo(() => {
    return orders.filter(o => {
      const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
      return orderDate === selectedDate && o.dailyBillNo && o.dailyBillNo !== '';
    }).sort((a, b) => parseInt(b.dailyBillNo) - parseInt(a.dailyBillNo));
  }, [orders, selectedDate]);

  const dailyKots = useMemo(() => {
    return kots.filter(k => k.timestamp && k.timestamp.split('T')[0] === selectedDate)
      .sort((a, b) => b.kotNo - a.kotNo);
  }, [kots, selectedDate]);

  const settledOrders = useMemo(() => finalizedOrders.filter(o => o.status === 'Settled' || o.status === 'Billed'), [finalizedOrders]);
  
  const stats = useMemo(() => {
    const total = settledOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const count = settledOrders.length;
    const items: Record<string, { name: string, quantity: number, revenue: number }> = {};
    settledOrders.forEach(order => {
      order.items.forEach(item => {
        if (!items[item.menuItemId]) items[item.menuItemId] = { name: item.name, quantity: 0, revenue: 0 };
        items[item.menuItemId].quantity += item.quantity;
        items[item.menuItemId].revenue += item.price * item.quantity;
      });
    });
    // Updated sorting: now sorting by quantity descending
    const sortedItems = Object.values(items).sort((a, b) => b.quantity - a.quantity);
    return { total, count, topRevenue: sortedItems[0]?.revenue || 0, itemSummary: sortedItems };
  }, [settledOrders]);

  const captainStats = useMemo(() => {
    return captains.map(w => {
      const captainOrders = settledOrders.filter(o => o.captainId === w.id);
      return { name: w.name, count: captainOrders.length, sales: captainOrders.reduce((sum, o) => sum + o.totalAmount, 0) };
    }).sort((a, b) => b.sales - a.sales);
  }, [captains, settledOrders]);

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm("Delete this order record permanently?")) await remove("orders", orderId);
  };

  const handleEditOrder = async (order: Order) => {
    const table = tables.find(t => t.id === order.tableId);
    if (table && table.status !== 'Available') { alert("Table is currently occupied."); return; }
    if (confirm("Re-open this order? It will return to 'Billing' status.")) {
      await upsert("orders", { ...order, status: 'Billed' });
      await upsert("tables", { ...table, status: 'Billing', currentOrderId: order.id });
      setActiveTable(order.tableId);
    }
  };

  const handleDayClose = async () => {
    if (finalizedOrders.length === 0) { alert("No bills found for this date to close."); return; }
    if (confirm("Do You Realy want to close day!")) {
      setIsClosing(true);
      try {
        for (const order of finalizedOrders) await remove("orders", order.id);
        alert("Day closed successfully.");
      } catch (err) { alert("An error occurred."); } finally { setIsClosing(false); }
    }
  };

  const handleReprintKOT = (kot: KOTRecord) => {
    // Create a complete order structure for the print engine to consume
    const mockOrder: Order = {
      id: kot.orderId,
      dailyBillNo: '',
      tableId: kot.tableId,
      captainId: '', // Print engine will use captainName if lookup fails
      items: kot.items,
      status: 'Pending',
      timestamp: kot.timestamp,
      subTotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      kotCount: kot.kotNo,
      customerName: '',
      paymentMode: 'Cash',
      cashierName: ''
    };
    
    // Attach captain name as a custom property for the printer
    (mockOrder as any).captainName = kot.captainName;
    
    onPrint?.('KOT', mockOrder);
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
            <input type="date" className="w-full bg-slate-50 theme-dark:bg-slate-700 text-[11px] font-bold py-1.5 px-3 rounded-lg outline-none border border-slate-200 theme-dark:border-slate-600" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => onPrintDayBook?.(settledOrders, selectedDate)} disabled={settledOrders.length === 0} className="bg-emerald-600 hover:bg-emerald-500 transition-all text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase shadow-md flex-1 md:flex-none">
              <i className="fa-solid fa-print"></i> Print
            </button>
            <button onClick={handleDayClose} disabled={finalizedOrders.length === 0 || isClosing} className="bg-rose-600 hover:bg-rose-500 transition-all text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase shadow-md flex-1 md:flex-none">
              {isClosing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-calendar-check"></i>} Day Close
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white theme-dark:bg-slate-800 rounded-xl shadow-lg border border-main overflow-hidden">
        <div className="flex border-b border-main bg-slate-50/50 theme-dark:bg-slate-900/50 overflow-x-auto no-scrollbar">
          {(['DayBook', 'KOTReport', 'ItemSummary', 'CaptainWise'] as const).map(tab => (
            <button key={tab} onClick={() => setReportType(tab)} className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap transition-all ${reportType === tab ? 'border-indigo-600 bg-indigo-50 theme-dark:bg-indigo-900/20 text-indigo-600' : 'border-transparent text-slate-500'}`}>
              {tab === 'KOTReport' ? 'KOT Report' : tab === 'ItemSummary' ? 'Item Sales' : tab === 'CaptainWise' ? 'Captains' : tab}
            </button>
          ))}
        </div>

        <div className="p-3">
          {reportType === 'DayBook' && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 theme-dark:border-slate-700">
              <table className="w-full text-left">
                <thead className="bg-slate-50 theme-dark:bg-slate-900 text-[9px] font-black text-slate-500 uppercase">
                  <tr><th className="p-3">Bill #</th><th className="p-3">Time</th><th className="p-3">Staff</th><th className="p-3 text-right">Amount</th><th className="p-3 text-center">Actions</th></tr>
                </thead>
                <tbody className="bg-white theme-dark:bg-slate-800 text-[11px]">
                  {finalizedOrders.map(order => (
                    <tr key={order.id} className="border-b border-slate-100 theme-dark:border-slate-700 hover:bg-slate-50">
                      <td className="p-3 font-mono font-black text-indigo-600">#{order.dailyBillNo}</td>
                      <td className="p-3 text-slate-500">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                      <td className="p-3 uppercase font-black">{order.cashierName || 'Admin'}</td>
                      <td className="p-3 text-right font-black">₹{order.totalAmount.toFixed(2)}</td>
                      <td className="p-3 flex justify-center gap-1">
                        <button onClick={() => onPrint?.('BILL', order)} className="w-8 h-8 rounded-lg bg-slate-50 border border-main flex items-center justify-center text-slate-400 hover:text-indigo-600"><i className="fa-solid fa-print text-[10px]"></i></button>
                        <button onClick={() => handleEditOrder(order)} className="w-8 h-8 rounded-lg bg-slate-50 border border-main flex items-center justify-center text-amber-500"><i className="fa-solid fa-rotate-left text-[10px]"></i></button>
                        <button onClick={() => handleDeleteOrder(order.id)} className="w-8 h-8 rounded-lg bg-slate-50 border border-main flex items-center justify-center text-rose-500"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'KOTReport' && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 theme-dark:border-slate-700">
              <table className="w-full text-left">
                <thead className="bg-slate-50 theme-dark:bg-slate-900 text-[9px] font-black text-slate-500 uppercase">
                  <tr><th className="p-3">KOT #</th><th className="p-3">Table</th><th className="p-3">Time</th><th className="p-3 text-center">Qty</th><th className="p-3 text-center">Actions</th></tr>
                </thead>
                <tbody className="bg-white theme-dark:bg-slate-800 text-[11px]">
                  {dailyKots.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold italic">No KOTs generated today</td></tr>
                  ) : (
                    dailyKots.map(kot => (
                      <React.Fragment key={kot.id}>
                        <tr className={`border-b border-slate-100 theme-dark:border-slate-700 hover:bg-slate-50 cursor-pointer ${expandedKotId === kot.id ? 'bg-indigo-50/30' : ''}`} onClick={() => setExpandedKotId(expandedKotId === kot.id ? null : kot.id)}>
                          <td className="p-3 font-mono font-black text-orange-600">KOT-{kot.kotNo}</td>
                          <td className="p-3 font-bold">TBL: {kot.tableNumber}</td>
                          <td className="p-3 text-slate-500">{new Date(kot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                          <td className="p-3 text-center font-black">{kot.items.reduce((s, i) => s + i.quantity, 0)}</td>
                          <td className="p-3 flex justify-center gap-2">
                            <button className="text-indigo-600 font-black text-[10px] uppercase">{expandedKotId === kot.id ? 'Hide Details' : 'View Details'}</button>
                            <button onClick={(e) => { e.stopPropagation(); handleReprintKOT(kot); }} className="px-3 py-1.5 rounded-lg bg-orange-600 text-white font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 shadow-md hover:bg-orange-500"><i className="fa-solid fa-print mr-2"></i>Re-print</button>
                          </td>
                        </tr>
                        {expandedKotId === kot.id && (
                          <tr>
                            <td colSpan={5} className="bg-slate-50 theme-dark:bg-slate-900/50 p-4 border-b border-slate-200 shadow-inner">
                              <div className="max-w-md mx-auto space-y-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-main pb-1">Items in this Ticket</h4>
                                {kot.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-[12px] bg-white theme-dark:bg-slate-800 p-2 rounded-lg border border-main shadow-sm">
                                    <span className="font-bold uppercase text-slate-700 theme-dark:text-slate-200">{item.name}</span>
                                    <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">x{item.quantity}</span>
                                  </div>
                                ))}
                                <div className="pt-2 text-[10px] font-bold text-slate-400 italic">Issued by: {kot.captainName}</div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
                  <tr><th className="p-3">Dish Name</th><th className="p-3 text-center">Qty Sold</th><th className="p-3 text-right">Revenue</th></tr>
                </thead>
                <tbody className="bg-white theme-dark:bg-slate-800 text-[11px]">
                  {stats.itemSummary.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 theme-dark:border-slate-700 last:border-0 hover:bg-slate-50">
                      <td className="p-3 uppercase font-black">{item.name}</td>
                      <td className="p-3 text-center text-indigo-600 font-black">{item.quantity}</td>
                      <td className="p-3 text-right text-emerald-600 font-black">₹{item.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'CaptainWise' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {captainStats.map((stat, idx) => (
                <div key={idx} className="bg-white theme-dark:bg-slate-700/30 p-3 rounded-xl border border-main flex justify-between items-center shadow-sm">
                  <div><h4 className="text-xs font-black uppercase">{stat.name}</h4><p className="text-[10px] text-slate-500 font-bold uppercase">{stat.count} Bills Served</p></div>
                  <div className="text-right"><p className="text-sm font-black text-emerald-600">₹{stat.sales.toFixed(2)}</p></div>
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
