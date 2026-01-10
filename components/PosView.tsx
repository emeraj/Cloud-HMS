
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../store';
import { MenuItem, OrderItem, Order, FoodType } from '../types';

interface PosViewProps {
  onBack: () => void;
  onPrint: (type: 'BILL' | 'KOT', order: Order) => void;
}

const PosView: React.FC<PosViewProps> = ({ onBack, onPrint }) => {
  const { 
    activeTable, tables, menu, groups, captains, 
    orders, taxes, upsert, user 
  } = useApp();
  
  const currentTable = tables.find(t => t.id === activeTable);
  const existingOrder = orders.find(o => o.id === currentTable?.currentOrderId);
  
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaptain, setSelectedCaptain] = useState(existingOrder?.captainId || (captains[0]?.id || ''));
  const [cartItems, setCartItems] = useState<OrderItem[]>(existingOrder?.items || []);
  
  // New billing fields
  const [customerName, setCustomerName] = useState(existingOrder?.customerName || '');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card'>(existingOrder?.paymentMode || 'Cash');

  useEffect(() => {
    if (existingOrder) {
      setCartItems(existingOrder.items);
      setSelectedCaptain(existingOrder.captainId);
      setCustomerName(existingOrder.customerName || '');
      setPaymentMode(existingOrder.paymentMode || 'Cash');
    }
  }, [existingOrder?.id]);

  const filteredMenu = useMemo(() => {
    return menu.filter(item => {
      const matchGroup = selectedGroupId === 'all' || item.groupId === selectedGroupId;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGroup && matchSearch;
    });
  }, [menu, selectedGroupId, searchQuery]);

  const totals = useMemo(() => {
    const subTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const taxAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity * item.taxRate / 100), 0);
    return { subTotal, taxAmount, totalAmount: subTotal + taxAmount };
  }, [cartItems]);

  const syncCartToCloud = useCallback(async (
    updatedItems: OrderItem[], 
    captainId: string, 
    custName: string, 
    payMode: 'Cash' | 'UPI' | 'Card',
    currentStatus: 'Pending' | 'Billed' | 'Settled' = 'Pending'
  ) => {
    if (!activeTable || !currentTable) return;

    const subTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const taxAmount = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity * item.taxRate / 100), 0);
    const totalAmount = subTotal + taxAmount;

    let orderId = existingOrder?.id;
    let dailyBillNo = existingOrder?.dailyBillNo;

    if (!orderId) {
      orderId = `ORD-${Date.now()}`;
      const todayStr = new Date().toISOString().split('T')[0];
      const todayOrders = orders.filter(o => o.timestamp.startsWith(todayStr));
      const maxNum = todayOrders.reduce((max, o) => {
        const num = parseInt(o.dailyBillNo || '0');
        return num > max ? num : max;
      }, 0);
      dailyBillNo = (maxNum + 1).toString().padStart(5, '0');
    }

    const newOrder: Order = {
      id: orderId,
      dailyBillNo: dailyBillNo!,
      tableId: activeTable,
      captainId: captainId,
      items: updatedItems,
      status: currentStatus,
      timestamp: existingOrder?.timestamp || new Date().toISOString(),
      subTotal,
      taxAmount,
      totalAmount,
      kotCount: existingOrder?.kotCount || 0,
      customerName: custName,
      paymentMode: payMode,
      cashierName: user?.displayName || user?.email?.split('@')[0] || 'Admin'
    };

    await upsert("orders", newOrder);
    
    if (currentTable.currentOrderId !== orderId || currentTable.status === 'Available') {
      await upsert("tables", { 
        ...currentTable, 
        status: currentStatus === 'Billed' ? 'Billing' : 'Occupied', 
        currentOrderId: orderId 
      });
    }
  }, [activeTable, currentTable, existingOrder, upsert, user, orders]);

  const addToCart = async (item: MenuItem) => {
    let updatedItems: OrderItem[] = [];
    const existing = cartItems.find(i => i.menuItemId === item.id);
    if (existing) {
      updatedItems = cartItems.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
    } else {
      const taxRate = taxes.find(t => t.id === item.taxId)?.rate || 0;
      updatedItems = [...cartItems, {
        id: Math.random().toString(36).substr(2, 9),
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        taxRate
      }];
    }
    setCartItems(updatedItems);
    syncCartToCloud(updatedItems, selectedCaptain, customerName, paymentMode);
  };

  const updateQty = (id: string, delta: number) => {
    const updatedItems = cartItems.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(i => i.quantity > 0);
    setCartItems(updatedItems);
    syncCartToCloud(updatedItems, selectedCaptain, customerName, paymentMode);
  };

  const handleKOT = async () => {
    if (existingOrder) {
      const updatedOrder = { ...existingOrder, kotCount: existingOrder.kotCount + 1 };
      await upsert("orders", updatedOrder);
      onPrint('KOT', updatedOrder);
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayOrders = orders.filter(o => o.timestamp.startsWith(todayStr));
      const maxNum = todayOrders.reduce((max, o) => {
        const num = parseInt(o.dailyBillNo || '0');
        return num > max ? num : max;
      }, 0);
      const dailyBillNo = (maxNum + 1).toString().padStart(5, '0');
      
      const orderId = `ORD-${Date.now()}`;
      const newOrder: Order = {
        id: orderId,
        dailyBillNo: dailyBillNo,
        tableId: activeTable!,
        captainId: selectedCaptain,
        items: cartItems,
        status: 'Pending',
        timestamp: new Date().toISOString(),
        ...totals,
        kotCount: 1,
        customerName,
        paymentMode,
        cashierName: user?.displayName || 'Admin'
      };
      await upsert("orders", newOrder);
      await upsert("tables", { ...currentTable!, status: 'Occupied', currentOrderId: orderId });
      onPrint('KOT', newOrder);
    }
  };

  const handleBill = async () => {
    let orderId = existingOrder?.id;
    let dailyBillNo = existingOrder?.dailyBillNo;

    if (!orderId) {
      orderId = `ORD-${Date.now()}`;
      const todayStr = new Date().toISOString().split('T')[0];
      const todayOrders = orders.filter(o => o.timestamp.startsWith(todayStr));
      const maxNum = todayOrders.reduce((max, o) => {
        const num = parseInt(o.dailyBillNo || '0');
        return num > max ? num : max;
      }, 0);
      dailyBillNo = (maxNum + 1).toString().padStart(5, '0');
    }

    const newOrder: Order = {
      id: orderId,
      dailyBillNo: dailyBillNo!,
      tableId: activeTable!,
      captainId: selectedCaptain,
      items: cartItems,
      status: 'Billed',
      timestamp: existingOrder?.timestamp || new Date().toISOString(),
      ...totals,
      kotCount: existingOrder?.kotCount || 0,
      customerName,
      paymentMode,
      cashierName: user?.displayName || 'Admin'
    };
    await upsert("orders", newOrder);
    await upsert("tables", { ...currentTable!, status: 'Billing', currentOrderId: orderId });
    onPrint('BILL', newOrder);
  };

  const handleSettle = async () => {
    if (!existingOrder || !currentTable) return;
    await upsert("orders", { ...existingOrder, status: 'Settled', paymentMode, customerName });
    await upsert("tables", { ...currentTable, status: 'Available', currentOrderId: undefined });
    onBack();
  };

  return (
    <div className="flex flex-col h-screen md:flex-row bg-[#0f172a] text-slate-100 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden p-3 md:p-4 border-r border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-2.5 bg-[#1e293b] rounded-xl text-slate-400 hover:text-white border border-slate-700 transition-colors">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="flex-1 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
            <input 
              type="text" 
              placeholder="Search dishes..." 
              className="w-full pr-12 pl-10 py-3 rounded-xl bg-[#1e293b] text-slate-200 focus:border-indigo-500 outline-none border border-slate-700 text-sm font-medium" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => setSelectedGroupId('all')} 
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition-all ${selectedGroupId === 'all' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-[#1e293b] border-slate-700 text-slate-400'}`}
          >
            All Items
          </button>
          {groups.map(g => (
            <button 
              key={g.id} 
              onClick={() => setSelectedGroupId(g.id)} 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition-all ${selectedGroupId === g.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-[#1e293b] border-slate-700 text-slate-400'}`}
            >
              {g.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-20 custom-scrollbar">
          {filteredMenu.map(item => (
            <div 
              key={item.id} 
              onClick={() => addToCart(item)} 
              className="bg-[#1e293b] rounded-2xl border border-slate-800 flex flex-col overflow-hidden active:scale-95 cursor-pointer hover:border-indigo-500 transition-all shadow-md group"
            >
              <div className="relative aspect-square w-full bg-[#0f172a] overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={item.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-10">
                    <i className="fa-solid fa-utensils text-3xl"></i>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border shadow-sm ${item.foodType === FoodType.VEG ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-rose-500/50 text-rose-400 bg-rose-500/10'}`}>
                    {item.foodType}
                  </span>
                </div>
              </div>
              <div className="p-3 flex flex-col flex-1 gap-1">
                <h3 className="font-bold text-slate-100 text-[12px] leading-tight uppercase tracking-tight min-h-[2.4rem] line-clamp-2">
                  {item.name}
                </h3>
                <div className="flex justify-between items-center mt-auto">
                  <span className="text-indigo-400 font-black text-sm">₹{item.price}</span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-plus text-[10px]"></i>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full md:w-[350px] bg-[#1a2135] flex flex-col border-l border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 bg-[#1e293b]/30 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-[11px] font-black text-white uppercase tracking-widest">Live Order</h2>
            <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg">
              Table {currentTable?.number}
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <div className="relative">
              <select 
                className="w-full pl-8 pr-4 py-2.5 bg-[#fdf9d1] rounded-xl text-xs font-bold text-slate-900 border-none outline-none appearance-none cursor-pointer" 
                value={selectedCaptain} 
                onChange={(e) => {
                  setSelectedCaptain(e.target.value);
                  syncCartToCloud(cartItems, e.target.value, customerName, paymentMode);
                }}
              >
                <option value="">Captain</option>
                {captains.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <i className="fa-solid fa-user-tie absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]"></i>
              <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[8px]"></i>
            </div>
            
            <div className="relative">
              <input 
                type="text"
                placeholder="Customer Name"
                className="w-full pl-8 pr-4 py-2.5 bg-[#fdf9d1] rounded-xl text-xs font-bold text-slate-900 border-none outline-none placeholder:text-slate-400"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  syncCartToCloud(cartItems, selectedCaptain, e.target.value, paymentMode);
                }}
              />
              <i className="fa-solid fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]"></i>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <div className="w-16 h-16 bg-slate-700/50 rounded-3xl flex items-center justify-center mb-4">
                <i className="fa-solid fa-cart-shopping text-3xl"></i>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest">Cart is Empty</p>
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item.id} className="bg-[#0f172a] p-3 rounded-2xl border border-slate-800/50 shadow-sm">
                <div className="flex justify-between text-[11px] font-black text-slate-200 uppercase mb-2">
                  <span className="flex-1 pr-2 leading-tight">{item.name}</span>
                  <span className="text-indigo-400">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 bg-[#1e293b] p-1 rounded-lg">
                    <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 bg-slate-800 rounded-md border border-slate-700 flex items-center justify-center text-slate-200 font-black">-</button>
                    <span className="w-8 text-center text-xs font-black text-white">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 bg-slate-800 rounded-md border border-slate-700 flex items-center justify-center text-slate-200 font-black">+</button>
                  </div>
                  <button onClick={() => updateQty(item.id, -item.quantity)} className="text-slate-600 hover:text-rose-500 transition-colors p-2">
                    <i className="fa-solid fa-trash-can text-[11px]"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-[#0f172a] border-t border-slate-800">
          <div className="grid grid-cols-3 gap-2 mb-4">
             {(['Cash', 'UPI', 'Card'] as const).map(mode => (
               <button 
                key={mode} 
                onClick={() => {
                  setPaymentMode(mode);
                  syncCartToCloud(cartItems, selectedCaptain, customerName, mode);
                }}
                className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${paymentMode === mode ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-[#1e293b] border-slate-700 text-slate-500'}`}
               >
                 {mode}
               </button>
             ))}
          </div>

          <div className="space-y-1.5 mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <div className="flex justify-between"><span>Base Amount</span><span className="text-slate-200">₹{totals.subTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Total Taxes</span><span className="text-slate-200">₹{totals.taxAmount.toFixed(2)}</span></div>
            <div className="flex justify-between items-baseline pt-2 mt-2 border-t border-slate-800">
              <span className="text-indigo-400 font-black">Net Payable</span>
              <span className="text-xl font-black text-white tracking-tighter">₹{totals.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={handleBill} 
              disabled={cartItems.length === 0} 
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg disabled:opacity-30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-receipt"></i> Print Bill
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleKOT} 
                disabled={cartItems.length === 0} 
                className="py-3.5 bg-slate-800 text-slate-200 rounded-2xl text-[10px] font-black uppercase border border-slate-700 flex items-center justify-center gap-2 tracking-widest hover:bg-slate-700 transition-colors"
              >
                <i className="fa-solid fa-fire text-orange-500"></i> KOT
              </button>
              <button 
                onClick={handleSettle} 
                disabled={existingOrder?.status !== 'Billed'} 
                className="py-3.5 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 tracking-widest hover:bg-orange-500 transition-colors"
              >
                <i className="fa-solid fa-circle-check"></i> Settle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PosView;
