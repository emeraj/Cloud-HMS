
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
    <div className="flex flex-col h-screen md:flex-row bg-app text-main overflow-hidden animate-in zoom-in-95 duration-300">
      <div className="flex-1 flex flex-col overflow-hidden p-2 md:p-3 border-r border-main">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-2.5 bg-card rounded-xl text-muted hover:text-indigo-600 border border-main hover:border-indigo-500 transition-all shadow-sm active:scale-95">
            <i className="fa-solid fa-arrow-left text-xs"></i>
          </button>
          <div className="flex-1 relative group">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-indigo-600 transition-colors text-xs"></i>
            <input 
              type="text" 
              placeholder="Search dishes..." 
              className="w-full pr-10 pl-10 py-2.5 rounded-xl bg-card text-main focus:border-indigo-500 outline-none border border-main text-xs font-bold shadow-sm" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1.5 no-scrollbar">
          <button 
            onClick={() => setSelectedGroupId('all')} 
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border whitespace-nowrap transition-all ${selectedGroupId === 'all' ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' : 'bg-card border-main text-muted hover:text-indigo-600'}`}
          >
            All Items
          </button>
          {groups.map(g => (
            <button 
              key={g.id} 
              onClick={() => setSelectedGroupId(g.id)} 
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border whitespace-nowrap transition-all ${selectedGroupId === g.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' : 'bg-card border-main text-muted hover:text-indigo-600'}`}
            >
              {g.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-1 pb-20 custom-scrollbar">
          {filteredMenu.map(item => (
            <div 
              key={item.id} 
              onClick={() => addToCart(item)} 
              className="bg-card rounded-2xl border border-main flex flex-col overflow-hidden active:scale-95 cursor-pointer hover:border-indigo-500/50 transition-all group shadow-sm hover:shadow-md"
            >
              <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={item.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <i className="fa-solid fa-utensils text-2xl"></i>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md border shadow-sm backdrop-blur-md ${item.foodType === FoodType.VEG ? 'border-emerald-500/50 text-emerald-600 bg-emerald-50' : 'border-rose-500/50 text-rose-600 bg-rose-50'}`}>
                    {item.foodType}
                  </span>
                </div>
              </div>
              <div className="p-3 flex flex-col flex-1 gap-1">
                <h3 className="font-bold text-main text-[11px] leading-tight uppercase line-clamp-2">
                  {item.name}
                </h3>
                <div className="flex justify-between items-center mt-auto">
                  <span className="text-indigo-600 font-black text-[12px]">₹{item.price}</span>
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <i className="fa-solid fa-plus text-[8px]"></i>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full md:w-[320px] bg-sidebar flex flex-col border-l border-main overflow-hidden shadow-sm">
        <div className="p-3 border-b border-main bg-slate-50 space-y-2.5">
          <div className="flex justify-between items-center">
            <h2 className="text-[9px] font-black text-main uppercase tracking-widest">Live Cart</h2>
            <div className="bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">
              Table {currentTable?.number}
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-1.5">
            <div className="relative group">
              <select 
                className="w-full pl-8 pr-4 py-2 bg-card rounded-xl text-[10px] font-bold text-main border border-main outline-none appearance-none cursor-pointer focus:border-indigo-500" 
                value={selectedCaptain} 
                onChange={(e) => {
                  setSelectedCaptain(e.target.value);
                  syncCartToCloud(cartItems, e.target.value, customerName, paymentMode);
                }}
              >
                <option value="">Captain</option>
                {captains.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <i className="fa-solid fa-user-tie absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[10px]"></i>
            </div>
            
            <div className="relative group">
              <input 
                type="text"
                placeholder="Cust. Name"
                className="w-full pl-8 pr-4 py-2 bg-card rounded-xl text-[10px] font-bold text-main border border-main outline-none placeholder:text-muted focus:border-indigo-500"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  syncCartToCloud(cartItems, selectedCaptain, e.target.value, paymentMode);
                }}
              />
              <i className="fa-solid fa-user absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[10px]"></i>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-slate-50/50">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <i className="fa-solid fa-cart-shopping text-2xl mb-2"></i>
              <p className="text-[9px] font-black uppercase tracking-widest">Empty</p>
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item.id} className="bg-card p-2.5 rounded-2xl border border-main shadow-sm">
                <div className="flex justify-between text-[11px] font-bold text-main uppercase mb-1.5">
                  <span className="flex-1 pr-2 truncate">{item.name}</span>
                  <span className="text-indigo-600 whitespace-nowrap">₹{(item.price * item.quantity).toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 bg-slate-50 p-0.5 rounded-lg border border-main">
                    <button onClick={() => updateQty(item.id, -1)} className="w-5 h-5 bg-card rounded-md border border-main flex items-center justify-center text-[10px] font-black text-main">-</button>
                    <span className="w-4 text-center text-[10px] font-bold text-main">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-5 h-5 bg-card rounded-md border border-main flex items-center justify-center text-[10px] font-black text-main">+</button>
                  </div>
                  <button onClick={() => updateQty(item.id, -item.quantity)} className="text-muted hover:text-rose-500 transition-all p-1">
                    <i className="fa-solid fa-trash-can text-[10px]"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-card border-t border-main">
          <div className="grid grid-cols-3 gap-2 mb-4">
             {(['Cash', 'UPI', 'Card'] as const).map(mode => (
               <button 
                key={mode} 
                onClick={() => {
                  setPaymentMode(mode);
                  syncCartToCloud(cartItems, selectedCaptain, customerName, mode);
                }}
                className={`py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${paymentMode === mode ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' : 'bg-slate-50 border-main text-muted'}`}
               >
                 {mode}
               </button>
             ))}
          </div>

          <div className="space-y-1 mb-4 text-[10px] font-bold uppercase text-muted">
            <div className="flex justify-between"><span>Base Amount</span><span className="text-main">₹{totals.subTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Total Taxes</span><span className="text-main">₹{totals.taxAmount.toFixed(2)}</span></div>
            <div className="flex justify-between items-baseline pt-2 mt-2 border-t border-main">
              <span className="text-indigo-600 font-black text-[10px]">Net Payable</span>
              <span className="text-xl font-black text-main tracking-tight">₹{totals.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={handleBill} 
              disabled={cartItems.length === 0} 
              className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md disabled:opacity-30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-emerald-500"
            >
              <i className="fa-solid fa-receipt text-xs"></i> Print Bill
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleKOT} 
                disabled={cartItems.length === 0} 
                className="py-2.5 bg-slate-100 text-main rounded-xl text-[9px] font-black uppercase border border-main flex items-center justify-center gap-1.5 hover:border-orange-500/50 hover:text-orange-600 active:scale-[0.98]"
              >
                <i className="fa-solid fa-fire text-orange-500 text-[10px]"></i> KOT
              </button>
              <button 
                onClick={handleSettle} 
                disabled={existingOrder?.status !== 'Billed'} 
                className="py-2.5 bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 shadow-md hover:bg-amber-500 active:scale-[0.98] disabled:opacity-30"
              >
                <i className="fa-solid fa-circle-check text-[10px]"></i> Settle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PosView;
