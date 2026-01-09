
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
    <div className="flex flex-col h-screen md:flex-row bg-[#0f172a] text-slate-100 overflow-hidden">
      {/* Menu Side */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 border-r border-slate-700">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="p-2.5 bg-[#1e293b] rounded-lg shadow-sm text-slate-400 hover:text-white transition-colors border border-slate-700">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="flex-1 relative">
            <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
            <input 
              type="text" 
              placeholder="Search dishes..." 
              className="w-full pr-12 pl-6 py-2.5 rounded-xl border border-slate-700 bg-[#1e293b] text-slate-200 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => setSelectedGroupId('all')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap text-xs font-bold uppercase tracking-wider transition-all border ${selectedGroupId === 'all' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#1e293b] border-slate-700 text-slate-400'}`}
          >
            All Items
          </button>
          {groups.map(g => (
            <button 
              key={g.id}
              onClick={() => setSelectedGroupId(g.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap text-xs font-bold uppercase tracking-wider transition-all border ${selectedGroupId === g.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#1e293b] border-slate-700 text-slate-400'}`}
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
              className="bg-[#1e293b] rounded-xl shadow-sm hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col overflow-hidden border border-slate-800 active:scale-[0.98]"
            >
              <div className="relative aspect-video w-full bg-[#0f172a] overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i className="fa-solid fa-bowl-food text-2xl text-slate-800"></i>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${item.foodType === FoodType.VEG ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' : 'border-rose-500/30 text-rose-500 bg-rose-500/10'}`}>
                    {item.foodType}
                  </span>
                </div>
              </div>
              
              <div className="p-3">
                <h3 className="font-bold text-slate-200 text-xs leading-snug mb-2 line-clamp-1">{item.name}</h3>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-400 font-bold text-sm">₹{item.price}</span>
                  <div className="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <i className="fa-solid fa-plus text-[10px]"></i>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Side - Normal Sizing */}
      <div className="w-full md:w-[400px] bg-[#1a2135] flex flex-col shadow-2xl border-l border-slate-800 relative z-20 overflow-hidden">
        {/* Header section */}
        <div className="p-4 border-b border-slate-800 bg-[#1e293b]/30">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-receipt text-indigo-500"></i>
              Order Summary
            </h2>
            <div className="bg-[#0f172a] px-3 py-1 rounded-full border border-indigo-500/20">
               <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Table {currentTable?.number}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Assigned Waiter</label>
            <div className="relative">
              <i className="fa-solid fa-user-tie absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
              <select 
                className="w-full pl-9 pr-8 py-2 bg-[#fdf9d1] border border-transparent rounded-lg text-sm font-semibold text-slate-900 focus:border-indigo-500 outline-none appearance-none"
                value={selectedWaiter}
                onChange={(e) => setSelectedWaiter(e.target.value)}
              >
                <option value="">Select Waiter</option>
                {waiters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
            </div>
          </div>
        </div>

        {/* Item Details Area - Normal font and display */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/50">
             <div className="flex items-center gap-2">
               <i className="fa-solid fa-cart-shopping text-indigo-500 text-xs"></i>
               <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Item Details</h4>
             </div>
             <span className="text-[10px] font-bold text-slate-600 bg-[#0f172a] px-2 py-0.5 rounded border border-slate-800">
               {cartItems.length} {cartItems.length === 1 ? 'ITEM' : 'ITEMS'}
             </span>
          </div>
          
          {cartItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-700">
              <i className="fa-solid fa-basket-shopping text-4xl mb-3 opacity-20"></i>
              <p className="text-xs font-semibold opacity-40 uppercase tracking-widest">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cartItems.map(item => (
                <div key={item.id} className="bg-[#0f172a] p-3 rounded-xl border border-slate-800 flex flex-col">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-tight leading-tight">{item.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold">₹{item.price.toFixed(2)} × {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-indigo-400">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/50">
                    <div className="flex items-center gap-1.5">
                       <button 
                        onClick={() => updateQty(item.id, -1)} 
                        className="w-7 h-7 rounded bg-[#1e293b] border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-500/20"
                      >
                        <i className="fa-solid fa-minus text-[8px]"></i>
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-300">{item.quantity}</span>
                      <button 
                        onClick={() => updateQty(item.id, 1)} 
                        className="w-7 h-7 rounded bg-[#1e293b] border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-emerald-500/20"
                      >
                        <i className="fa-solid fa-plus text-[8px]"></i>
                      </button>
                    </div>
                    <button 
                      onClick={() => { if (confirm(`Remove ${item.name} from cart?`)) updateQty(item.id, -item.quantity); }}
                      className="text-slate-600 hover:text-rose-500 transition-colors p-1"
                    >
                       <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer section - Compact & Professional */}
        <div className="p-4 bg-[#0f172a] border-t border-slate-800">
          <div className="space-y-2 mb-4 px-1">
            <div className="flex justify-between text-[11px] font-semibold">
              <span className="text-slate-500 uppercase tracking-wider">Subtotal</span>
              <span className="text-slate-300">₹{totals.subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] font-semibold">
              <span className="text-slate-500 uppercase tracking-wider">Tax (GST)</span>
              <span className="text-slate-300">₹{totals.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-800/50">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Payable Amount</span>
              <span className="text-2xl font-black text-white">₹{totals.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
             <button 
              onClick={handleBill}
              disabled={cartItems.length === 0}
              className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 disabled:opacity-30 transition-all shadow-md uppercase text-xs tracking-wider"
            >
              <i className="fa-solid fa-print"></i> Generate & Print Bill
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleKOT}
                disabled={cartItems.length === 0}
                className="py-2.5 bg-[#1e293b] text-slate-300 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#2d3a4f] border border-slate-800 transition-all uppercase text-[10px] tracking-widest"
              >
                <i className="fa-solid fa-fire-burner text-orange-500"></i> Print KOT
              </button>
              <button 
                onClick={handleSettle}
                disabled={existingOrder?.status !== 'Billed'}
                className="py-2.5 bg-orange-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-orange-500 disabled:opacity-30 transition-all uppercase text-[10px] tracking-widest"
              >
                <i className="fa-solid fa-check-double"></i> Settle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PosView;
