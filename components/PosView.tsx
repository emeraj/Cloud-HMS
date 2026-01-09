
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { MenuItem, OrderItem, Order, FoodType } from '../types';

interface PosViewProps {
  onBack: () => void;
  onPrint: (type: 'BILL' | 'KOT', order: Order) => void;
}

const PosView: React.FC<PosViewProps> = ({ onBack, onPrint }) => {
  const { 
    activeTable, tables, setTables, menu, groups, waiters, 
    orders, setOrders, taxes 
  } = useApp();
  
  const currentTable = tables.find(t => t.id === activeTable);
  const existingOrder = orders.find(o => o.id === currentTable?.currentOrderId);
  
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWaiter, setSelectedWaiter] = useState(existingOrder?.waiterId || (waiters[0]?.id || ''));
  const [cartItems, setCartItems] = useState<OrderItem[]>(existingOrder?.items || []);

  const filteredMenu = useMemo(() => {
    return menu.filter(item => {
      const matchGroup = selectedGroupId === 'all' || item.groupId === selectedGroupId;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGroup && matchSearch;
    });
  }, [menu, selectedGroupId, searchQuery]);

  const addToCart = (item: MenuItem) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      if (existing) {
        return prev.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      const taxRate = taxes.find(t => t.id === item.taxId)?.rate || 0;
      return [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        taxRate
      }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(i => i.quantity > 0));
  };

  const totals = useMemo(() => {
    const subTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const taxAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity * item.taxRate / 100), 0);
    return { subTotal, taxAmount, totalAmount: subTotal + taxAmount };
  }, [cartItems]);

  const handleSaveOrder = (status: 'Pending' | 'Billed' = 'Pending') => {
    if (!activeTable) return;
    
    const newOrder: Order = {
      id: existingOrder?.id || `ORD-${Date.now()}`,
      tableId: activeTable,
      waiterId: selectedWaiter,
      items: cartItems,
      status: status,
      timestamp: existingOrder?.timestamp || new Date().toISOString(),
      ...totals,
      kotCount: existingOrder?.kotCount || 0
    };

    setOrders(prev => {
      const other = prev.filter(o => o.id !== newOrder.id);
      return [...other, newOrder];
    });

    setTables(prev => prev.map(t => 
      t.id === activeTable 
        ? { ...t, status: status === 'Billed' ? 'Billing' : 'Occupied', currentOrderId: newOrder.id } 
        : t
    ));

    return newOrder;
  };

  const handleKOT = () => {
    const order = handleSaveOrder('Pending');
    if (order) {
      onPrint('KOT', order);
    }
  };

  const handleBill = () => {
    const order = handleSaveOrder('Billed');
    if (order) onPrint('BILL', order);
  };

  const handleSettle = () => {
    if (!existingOrder) return;
    setOrders(prev => prev.map(o => o.id === existingOrder.id ? { ...o, status: 'Settled' } : o));
    setTables(prev => prev.map(t => t.id === activeTable ? { ...t, status: 'Available', currentOrderId: undefined } : t));
    onBack();
  };

  return (
    <div className="flex flex-col h-screen md:flex-row bg-[#0f172a] text-slate-100">
      {/* Menu Side */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 border-r border-slate-700">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="p-3 bg-[#1e293b] rounded-2xl shadow-sm text-slate-400 hover:text-white transition-colors border border-slate-700">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="flex-1 relative">
            <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
            <input 
              type="text" 
              placeholder="Search products by name or barcode..." 
              className="w-full pr-12 pl-6 py-4 rounded-2xl border-2 border-transparent bg-[#fdf9d1] text-slate-900 font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => setSelectedGroupId('all')}
            className={`px-6 py-3 rounded-2xl whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all border ${selectedGroupId === 'all' ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl' : 'bg-[#1e293b] border-slate-700 text-slate-400'}`}
          >
            Voucher Entry
          </button>
          {groups.map(g => (
            <button 
              key={g.id}
              onClick={() => setSelectedGroupId(g.id)}
              className={`px-6 py-3 rounded-2xl whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all border ${selectedGroupId === g.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl' : 'bg-[#1e293b] border-slate-700 text-slate-400'}`}
            >
              {g.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-10">
          {filteredMenu.map(item => (
            <div 
              key={item.id} 
              onClick={() => addToCart(item)}
              className="bg-[#1e293b] p-5 rounded-[2rem] shadow-sm hover:border-indigo-500 transition-all cursor-pointer flex flex-col justify-between border border-slate-800 group active:scale-95"
            >
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                   <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${item.foodType === FoodType.VEG ? 'border-emerald-500/50 text-emerald-400 bg-emerald-400/5' : 'border-rose-500/50 text-rose-400 bg-rose-400/5'}`}>
                    {item.foodType.toUpperCase()}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <i className="fa-solid fa-plus text-indigo-400"></i>
                  </div>
                </div>
                <h3 className="font-bold text-slate-200 leading-snug text-sm uppercase tracking-tight">{item.name}</h3>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800">
                <span className="text-indigo-400 font-black text-lg">₹{item.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Side */}
      <div className="w-full md:w-[420px] bg-[#1a2135] flex flex-col shadow-2xl border-l border-slate-800 relative z-20">
        <div className="p-6 border-b border-slate-800 bg-[#1e293b]/50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-white uppercase tracking-tighter">Payment & Order Summary</h2>
            <div className="bg-[#0f172a] px-4 py-1.5 rounded-full border border-indigo-500/30">
               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">TABLE {currentTable?.number}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="bg-indigo-600 p-5 rounded-3xl flex flex-col items-center justify-center border-2 border-indigo-500 shadow-xl shadow-indigo-900/40 cursor-pointer active:scale-95 transition-all">
                <i className="fa-solid fa-money-bill-transfer text-2xl mb-2 text-white"></i>
                <span className="text-[11px] font-black text-white uppercase tracking-widest">CASH</span>
             </div>
             <div className="bg-[#1e293b] p-5 rounded-3xl flex flex-col items-center justify-center border border-slate-800 text-slate-600 cursor-pointer active:scale-95 transition-all">
                <i className="fa-solid fa-credit-card text-2xl mb-2 opacity-30"></i>
                <span className="text-[11px] font-black opacity-30 uppercase tracking-widest">CREDIT</span>
             </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Salesman / Waiter</label>
            <select 
              className="w-full p-4 bg-[#fdf9d1] border-2 border-transparent rounded-2xl text-sm font-bold text-slate-900 focus:border-indigo-500 outline-none shadow-inner"
              value={selectedWaiter}
              onChange={(e) => setSelectedWaiter(e.target.value)}
            >
              <option value="">-- NO SALESMAN --</option>
              {waiters.map(w => <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] flex items-center gap-2">
               <i className="fa-solid fa-list-check text-indigo-400"></i> CART ITEMS
             </h4>
             <span className="bg-[#1e293b] px-3 py-1 rounded-full text-[10px] font-black text-slate-400 border border-slate-800">{cartItems.length} ITEMS</span>
          </div>
          
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-20">
              <i className="fa-solid fa-bag-shopping text-6xl mb-4"></i>
              <p className="text-xs font-black uppercase tracking-widest">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-[#0f172a] p-4 rounded-3xl border border-slate-800 group hover:border-slate-700 transition-all shadow-sm">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-200 text-xs uppercase tracking-tight">{item.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">₹{item.price} <span className="text-indigo-500 mx-1">x</span> <span className="text-white">{item.quantity}</span></p>
                  </div>
                  <div className="flex items-center gap-2 bg-[#1e293b] p-1 rounded-2xl border border-slate-700">
                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-xl bg-[#0f172a] flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-800 active:scale-90">-</button>
                    <span className="font-black w-5 text-center text-indigo-400 text-xs tabular-nums">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded-xl bg-[#0f172a] flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-800 active:scale-90">+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-[#0f172a] border-t-2 border-slate-800 m-4 rounded-[2.5rem] border-dashed shadow-2xl">
          <div className="space-y-2 mb-6 px-2">
            <div className="flex justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subtotal</span>
              <span className="font-black text-slate-300 text-sm tabular-nums">₹{totals.subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total GST</span>
              <span className="font-black text-slate-300 text-sm tabular-nums">₹{totals.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline mt-4 border-t border-slate-800 pt-4">
              <span className="text-xs font-black text-slate-400 uppercase tracking-[2px]">GRAND TOTAL</span>
              <span className="text-4xl font-black text-indigo-400 tabular-nums tracking-tighter">₹{totals.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
             <button 
              onClick={handleBill}
              disabled={cartItems.length === 0}
              className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black flex items-center justify-center gap-4 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_10px_30px_rgba(5,150,105,0.3)] active:scale-[0.98] uppercase tracking-[3px] text-sm"
            >
              <i className="fa-solid fa-print text-xl"></i> SAVE & PRINT
            </button>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleKOT}
                disabled={cartItems.length === 0}
                className="py-4 bg-[#1e293b] text-slate-400 rounded-[2rem] font-black flex items-center justify-center gap-2 hover:bg-[#2d3a4f] border border-slate-800 transition-all uppercase text-[10px] tracking-widest active:scale-95 shadow-lg"
              >
                <i className="fa-solid fa-fire-burner text-sm"></i> KOT
              </button>
              <button 
                onClick={handleSettle}
                disabled={existingOrder?.status !== 'Billed'}
                className="py-4 bg-orange-600 text-white rounded-[2rem] font-black flex items-center justify-center gap-2 hover:bg-orange-500 disabled:opacity-20 transition-all uppercase text-[10px] tracking-widest active:scale-95 shadow-[0_10px_20px_rgba(234,88,12,0.3)]"
              >
                <i className="fa-solid fa-check-double text-sm"></i> SETTLE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PosView;
