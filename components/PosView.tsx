
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { MenuItem, OrderItem, Order, FoodType } from '../types';

interface PosViewProps {
  onBack: () => void;
  onPrint: (type: 'BILL' | 'KOT', order: Order) => void;
}

const PosView: React.FC<PosViewProps> = ({ onBack, onPrint }) => {
  const { 
    activeTable, tables, menu, groups, waiters, 
    orders, taxes, upsert 
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

  const handleSaveOrder = async (status: 'Pending' | 'Billed' = 'Pending') => {
    if (!activeTable || !currentTable) return;
    
    const newOrder: Order = {
      id: existingOrder?.id || `ORD-${Date.now()}`,
      tableId: activeTable,
      waiterId: selectedWaiter,
      items: cartItems,
      status: status,
      timestamp: existingOrder?.timestamp || new Date().toISOString(),
      ...totals,
      kotCount: status === 'Pending' ? (existingOrder?.kotCount || 0) + 1 : (existingOrder?.kotCount || 0)
    };

    await upsert("orders", newOrder);
    await upsert("tables", { 
      ...currentTable, 
      status: status === 'Billed' ? 'Billing' : 'Occupied', 
      currentOrderId: newOrder.id 
    });

    return newOrder;
  };

  const handleKOT = async () => {
    const order = await handleSaveOrder('Pending');
    if (order) onPrint('KOT', order);
  };

  const handleBill = async () => {
    const order = await handleSaveOrder('Billed');
    if (order) onPrint('BILL', order);
  };

  const handleSettle = async () => {
    if (!existingOrder || !currentTable) return;
    await upsert("orders", { ...existingOrder, status: 'Settled' });
    await upsert("tables", { ...currentTable, status: 'Available', currentOrderId: undefined });
    onBack();
  };

  return (
    <div className="flex flex-col h-screen md:flex-row bg-[#0f172a] text-slate-100 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden p-4 border-r border-slate-700">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="p-2.5 bg-[#1e293b] rounded-lg shadow-sm text-slate-400 hover:text-white border border-slate-700">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="flex-1 relative">
            <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
            <input type="text" placeholder="Dishes..." className="w-full pr-12 pl-6 py-2.5 rounded-xl bg-[#1e293b] text-slate-200 focus:border-indigo-500 outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
          <button onClick={() => setSelectedGroupId('all')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase border ${selectedGroupId === 'all' ? 'bg-indigo-600 text-white' : 'bg-[#1e293b] text-slate-400'}`}>All</button>
          {groups.map(g => (
            <button key={g.id} onClick={() => setSelectedGroupId(g.id)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase border ${selectedGroupId === g.id ? 'bg-indigo-600 text-white' : 'bg-[#1e293b] text-slate-400'}`}>{g.name}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-10">
          {filteredMenu.map(item => (
            <div key={item.id} onClick={() => addToCart(item)} className="bg-[#1e293b] rounded-xl border border-slate-800 flex flex-col overflow-hidden active:scale-95 cursor-pointer">
              <div className="relative aspect-video w-full bg-[#0f172a]">
                {item.imageUrl && <img src={item.imageUrl} className="w-full h-full object-cover" />}
                <div className="absolute top-2 left-2"><span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${item.foodType === FoodType.VEG ? 'border-emerald-500 text-emerald-500' : 'border-rose-500 text-rose-500'}`}>{item.foodType}</span></div>
              </div>
              <div className="p-3"><h3 className="font-bold text-slate-200 text-xs truncate">{item.name}</h3><span className="text-indigo-400 font-bold text-sm">₹{item.price}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full md:w-[400px] bg-[#1a2135] flex flex-col border-l border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-white">Order Summary</h2>
            <span className="text-[10px] font-bold text-indigo-400 uppercase">Table {currentTable?.number}</span>
          </div>
          <select className="w-full p-2 bg-[#fdf9d1] rounded-lg text-sm font-semibold text-slate-900" value={selectedWaiter} onChange={(e) => setSelectedWaiter(e.target.value)}>
            <option value="">Select Waiter</option>
            {waiters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.map(item => (
            <div key={item.id} className="bg-[#0f172a] p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs font-bold text-slate-200 uppercase"><span>{item.name}</span><span>₹{(item.price * item.quantity).toFixed(2)}</span></div>
              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2">
                  <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center text-slate-400">-</button>
                  <span className="text-xs font-bold">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center text-slate-400">+</button>
                </div>
                <button onClick={() => { if(confirm("Remove?")) updateQty(item.id, -item.quantity); }} className="text-rose-500 text-xs"><i className="fa-solid fa-trash-can"></i></button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-[#0f172a] border-t border-slate-800 space-y-4">
          <div className="flex justify-between text-2xl font-black text-white"><span>Total</span><span>₹{totals.totalAmount.toFixed(2)}</span></div>
          <button onClick={handleBill} disabled={cartItems.length === 0} className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold uppercase text-xs">Print Bill</button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleKOT} disabled={cartItems.length === 0} className="py-2.5 bg-[#1e293b] text-slate-300 rounded-lg text-[10px] uppercase border border-slate-800">KOT</button>
            <button onClick={handleSettle} disabled={existingOrder?.status !== 'Billed'} className="py-2.5 bg-orange-600 text-white rounded-lg text-[10px] uppercase">Settle</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PosView;
