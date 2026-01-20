
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../store';
import { MenuItem, OrderItem, Order, FoodType, KOTRecord } from '../types';

interface PosViewProps {
  onBack: () => void;
  onPrint: (type: 'BILL' | 'KOT', order: Order) => void;
}

const PosView: React.FC<PosViewProps> = ({ onBack, onPrint }) => {
  const { 
    activeTable, tables, menu, groups, captains, 
    orders, kots, taxes, upsert, remove, user, settings 
  } = useApp();
  
  const currentTable = tables.find(t => t.id === activeTable);
  const existingOrder = orders.find(o => o.id === currentTable?.currentOrderId);
  
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaptain, setSelectedCaptain] = useState('');
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  
  const [mobileView, setMobileView] = useState<'menu' | 'cart'>('menu');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showKOTModal, setShowKOTModal] = useState(false);

  const isSettledRef = useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const lastCloudOrderRef = useRef<string | null>(null);

  const getMatchingCaptainId = useCallback(() => {
    if (!user?.displayName || captains.length === 0) return '';
    const match = captains.find(c => 
      c.name.trim().toLowerCase() === user.displayName?.trim().toLowerCase()
    );
    return match ? match.id : '';
  }, [user, captains]);

  useEffect(() => {
    if (existingOrder) {
      isSettledRef.current = existingOrder.status === 'Settled';
      const cloudSignature = JSON.stringify({
        items: existingOrder.items,
        captain: existingOrder.captainId,
        customer: existingOrder.customerName,
        payment: existingOrder.paymentMode,
        status: existingOrder.status
      });

      if (lastCloudOrderRef.current !== cloudSignature) {
        setCartItems(existingOrder.items);
        setSelectedCaptain(existingOrder.captainId);
        setCustomerName(existingOrder.customerName || '');
        setPaymentMode(existingOrder.paymentMode || 'Cash');
        lastCloudOrderRef.current = cloudSignature;
      }
    } else if (!existingOrder && currentTable?.status === 'Available') {
      setCartItems([]);
      setSelectedCaptain(getMatchingCaptainId());
      setCustomerName('');
      lastCloudOrderRef.current = null;
      isSettledRef.current = false;
    }
  }, [existingOrder, currentTable?.status, getMatchingCaptainId]);

  useEffect(() => {
    if (!existingOrder && !selectedCaptain && user?.displayName && captains.length > 0) {
      const matchId = getMatchingCaptainId();
      if (matchId) setSelectedCaptain(matchId);
    }
  }, [captains, user, existingOrder, selectedCaptain, getMatchingCaptainId]);

  const filteredMenu = useMemo(() => {
    return menu.filter(item => {
      if (selectedGroupId === 'favorites') return !!item.isFavorite;
      const matchGroup = selectedGroupId === 'all' || item.groupId === selectedGroupId;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGroup && matchSearch;
    }).sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [menu, selectedGroupId, searchQuery]);

  const totals = useMemo(() => {
    const subTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const taxAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity * item.taxRate / 100), 0);
    return { subTotal, taxAmount, totalAmount: subTotal + taxAmount };
  }, [cartItems]);

  const getNextBillNo = useCallback(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => {
      const orderDate = (o.timestamp || '').split('T')[0];
      return orderDate === todayStr && o.dailyBillNo && o.dailyBillNo !== '';
    });
    const maxNum = todayOrders.reduce((max, o) => {
      const num = parseInt(o.dailyBillNo || '0');
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    return (maxNum + 1).toString().padStart(5, '0');
  }, [orders]);

  const syncCartToCloud = useCallback(async (
    updatedItems: OrderItem[], 
    captainId: string, 
    custName: string, 
    payMode: 'Cash' | 'UPI' | 'Card',
    currentStatus: 'Pending' | 'Billed' | 'Settled' = 'Pending'
  ) => {
    if (!activeTable || !currentTable || isSettledRef.current) return;
    const isCartEmpty = updatedItems.length === 0;
    if (isCartEmpty) {
      await upsert("tables", { ...currentTable, status: 'Available', currentOrderId: undefined });
      if (existingOrder && existingOrder.status === 'Pending' && (!existingOrder.dailyBillNo || existingOrder.dailyBillNo === '')) {
        await remove("orders", existingOrder.id);
      }
      lastCloudOrderRef.current = null;
      return;
    }
    const subTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const taxAmount = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity * item.taxRate / 100), 0);
    const totalAmount = subTotal + taxAmount;
    let orderId = existingOrder?.id || `ORD-${Date.now()}`;
    const newOrder: Order = {
      id: orderId,
      dailyBillNo: existingOrder?.dailyBillNo || '',
      tableId: activeTable,
      captainId: captainId,
      items: updatedItems,
      status: currentStatus,
      timestamp: existingOrder?.timestamp || new Date().toISOString(),
      subTotal, taxAmount, totalAmount,
      kotCount: existingOrder?.kotCount || 0,
      customerName: custName,
      paymentMode: payMode,
      cashierName: user?.displayName || 'Admin'
    };
    lastCloudOrderRef.current = JSON.stringify({ items: updatedItems, captain: captainId, customer: custName, payment: payMode, status: currentStatus });
    await upsert("orders", newOrder);
    await upsert("tables", { ...currentTable, status: currentStatus === 'Settled' ? 'Available' : 'Occupied', currentOrderId: currentStatus === 'Settled' ? undefined : orderId });
  }, [activeTable, currentTable, existingOrder, upsert, remove, user]);

  const addToCart = async (item: MenuItem, qty: number = 1) => {
    if (isSettledRef.current) return;
    let updatedItems: OrderItem[] = [];
    const existingIndex = cartItems.findIndex(i => i.menuItemId === item.id);
    if (existingIndex > -1) {
      updatedItems = cartItems.map((i, idx) => idx === existingIndex ? { ...i, quantity: i.quantity + qty } : i);
    } else {
      const taxRate = taxes.find(t => t.id === item.taxId)?.rate || 0;
      updatedItems = [...cartItems, { 
        id: Math.random().toString(36).substr(2, 9), 
        menuItemId: item.id, 
        name: item.name, 
        price: item.price, 
        quantity: qty, 
        taxRate,
        printedQty: 0
      }];
    }
    setCartItems(updatedItems);
    syncCartToCloud(updatedItems, selectedCaptain, customerName, paymentMode);
  };

  const updateQty = (id: string, delta: number) => {
    if (isSettledRef.current) return;
    const updatedItems = cartItems.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(i => i.quantity > 0);
    setCartItems(updatedItems);
    syncCartToCloud(updatedItems, selectedCaptain, customerName, paymentMode);
  };

  const updatePrice = (id: string, newPrice: number) => {
    if (isSettledRef.current) return;
    const updatedItems = cartItems.map(item => item.id === id ? { ...item, price: newPrice } : item);
    setCartItems(updatedItems);
    syncCartToCloud(updatedItems, selectedCaptain, customerName, paymentMode);
  };

  const processKOT = async () => {
    setShowKOTModal(false);
    if (isSettledRef.current) return;
    
    const itemsToPrint = cartItems.map(item => {
      const previouslyPrinted = item.printedQty || 0;
      const diff = item.quantity - previouslyPrinted;
      return diff > 0 ? { ...item, quantity: diff } : null;
    }).filter(Boolean) as OrderItem[];

    if (itemsToPrint.length === 0) {
      alert("No new items to send to Kitchen.");
      return;
    }

    // Harden the incremental numbering logic to avoid NaN
    const todayStr = new Date().toISOString().split('T')[0];
    const todayKots = kots.filter(k => k.timestamp && k.timestamp.split('T')[0] === todayStr);
    
    // Safely find maximum KOT number today across all tables
    const maxKotNo = todayKots.reduce((max, k) => {
      const val = Number(k.kotNo);
      return isNaN(val) ? max : Math.max(max, val);
    }, 0);
    const newKotNo = maxKotNo + 1;
    
    const orderId = existingOrder?.id || `ORD-${Date.now()}`;
    const captainName = captains.find(c => c.id === selectedCaptain)?.name || 'Guest';

    // 1. Create a detailed KOT record
    const kotRecord: KOTRecord = {
      id: `kot-${Date.now()}`,
      kotNo: newKotNo,
      orderId,
      tableId: activeTable!,
      tableNumber: currentTable?.number || 'N/A',
      captainName,
      items: itemsToPrint,
      timestamp: new Date().toISOString()
    };
    await upsert("kots", kotRecord);

    // 2. Update order state
    const updatedCartItems = cartItems.map(item => ({
      ...item,
      printedQty: item.quantity
    }));

    const finalOrderData: Order = {
      id: orderId,
      dailyBillNo: existingOrder?.dailyBillNo || '',
      tableId: activeTable!,
      captainId: selectedCaptain,
      items: updatedCartItems,
      status: 'Pending',
      timestamp: existingOrder?.timestamp || new Date().toISOString(),
      ...totals,
      kotCount: newKotNo,
      customerName,
      paymentMode,
      cashierName: user?.displayName || 'Admin'
    };

    await upsert("orders", finalOrderData);
    await upsert("tables", { ...currentTable!, status: 'Occupied', currentOrderId: orderId });
    
    setCartItems(updatedCartItems);
    onPrint('KOT', { ...finalOrderData, items: itemsToPrint });
  };

  const handleBillAndSettle = async () => {
    if (!currentTable || isMobile || isSettledRef.current) return;
    let orderId = existingOrder?.id || `ORD-${Date.now()}`;
    let dailyBillNo = existingOrder?.dailyBillNo || getNextBillNo();
    const newOrder: Order = { 
      id: orderId, 
      dailyBillNo, 
      tableId: activeTable!, 
      captainId: selectedCaptain, 
      items: cartItems, 
      status: 'Settled', 
      timestamp: existingOrder?.timestamp || new Date().toISOString(), 
      ...totals, 
      kotCount: existingOrder?.kotCount || 0, 
      customerName, 
      paymentMode, 
      cashierName: user?.displayName || 'Admin' 
    };
    isSettledRef.current = true;
    await upsert("orders", newOrder);
    await upsert("tables", { ...currentTable, status: 'Available', currentOrderId: undefined });
    onPrint('BILL', newOrder);
    onBack();
  };

  const newItemsForKOTPreview = useMemo(() => {
    return cartItems.map(item => {
      const diff = item.quantity - (item.printedQty || 0);
      return diff > 0 ? { ...item, quantity: diff } : null;
    }).filter(Boolean) as OrderItem[];
  }, [cartItems]);

  return (
    <div className="flex flex-col h-screen md:flex-row bg-app text-main overflow-hidden animate-in zoom-in-95 duration-300 relative">
      {showKOTModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-main overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-main bg-slate-50/50 theme-dark:bg-slate-800/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg md:text-sm font-black text-main uppercase tracking-widest">Confirm KOT</h3>
                <p className="text-xs md:text-[10px] font-bold text-muted uppercase">Table {currentTable?.number} • {newItemsForKOTPreview.length} New Items</p>
              </div>
              <button onClick={() => setShowKOTModal(false)} className="w-10 h-10 rounded-full hover:bg-slate-200 theme-dark:hover:bg-slate-700 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-muted"></i></button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {newItemsForKOTPreview.length > 0 ? newItemsForKOTPreview.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-app/40 p-3 rounded-xl border border-main">
                  <span className="text-sm md:text-[11px] font-black text-main uppercase truncate pr-4">{item.name}</span>
                  <span className="text-indigo-600 font-black text-sm md:text-xs bg-white theme-dark:bg-slate-700 px-2 py-1 rounded-lg border border-main shadow-sm">x{item.quantity}</span>
                </div>
              )) : (
                <p className="text-center text-xs font-black text-rose-500 uppercase p-6">No new items added to cart!</p>
              )}
            </div>
            <div className="p-5 bg-slate-50 theme-dark:bg-slate-800/50 border-t border-main grid grid-cols-2 gap-3">
              <button onClick={() => setShowKOTModal(false)} className="py-4 rounded-2xl bg-white border border-main text-muted font-black uppercase text-xs md:text-[10px] tracking-widest hover:text-rose-500 transition-all active:scale-95 shadow-sm">Go Back</button>
              <button onClick={processKOT} disabled={newItemsForKOTPreview.length === 0} className="py-4 rounded-2xl bg-orange-600 text-white font-black uppercase text-xs md:text-[10px] tracking-widest shadow-lg hover:bg-orange-500 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"><i className="fa-solid fa-print"></i>Confirm Print</button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Side */}
      <div className={`flex-1 flex flex-col overflow-hidden p-2 md:p-3 border-r border-main ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
        <div className="mb-2 px-1 mt-1 md:mt-2 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-black text-main tracking-tight uppercase opacity-90 leading-none">Cloud-HMS</h1>
        </div>

        <div className="flex items-center gap-3 mb-3 md:mb-4">
          <button 
            onClick={onBack} 
            className="flex-shrink-0 w-16 h-16 md:w-10 md:h-10 bg-card rounded-2xl md:rounded-xl text-indigo-600 md:text-muted hover:text-indigo-600 border-2 md:border border-indigo-500 md:border-main hover:border-indigo-500 transition-all shadow-md md:shadow-sm active:scale-95 flex items-center justify-center"
          >
            <i className="fa-solid fa-arrow-left text-2xl md:text-xs"></i>
          </button>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1 items-center pb-0.5 h-16 md:h-auto">
            <button onClick={() => setSelectedGroupId('all')} className={`px-5 md:px-4 py-3 md:py-2.5 rounded-xl text-xs md:text-[9px] font-black uppercase tracking-widest border whitespace-nowrap transition-all ${selectedGroupId === 'all' ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' : 'bg-card border-main text-muted hover:text-indigo-600'}`}>All Items</button>
            <button onClick={() => setSelectedGroupId('favorites')} className={`px-5 md:px-4 py-3 md:py-2.5 rounded-xl text-xs md:text-[9px] font-black uppercase tracking-widest border whitespace-nowrap transition-all flex items-center gap-2 ${selectedGroupId === 'favorites' ? 'bg-amber-500 border-amber-600 text-white shadow-sm' : 'bg-card border-main text-amber-500 hover:bg-amber-50'}`}><i className="fa-solid fa-star"></i> Favorites</button>
            {groups.map(g => (<button key={g.id} onClick={() => setSelectedGroupId(g.id)} className={`px-5 md:px-4 py-3 md:py-2.5 rounded-xl text-xs md:text-[9px] font-black uppercase tracking-widest border whitespace-nowrap transition-all ${selectedGroupId === g.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' : 'bg-card border-main text-muted hover:text-indigo-600'}`}>{g.name}</button>))}
          </div>
        </div>

        <div className="mb-4 md:mb-6 flex gap-2">
          <div className="relative group flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-indigo-600 transition-colors text-sm md:text-base"></i>
            <input type="text" placeholder="Search dishes..." className="w-full pr-10 pl-11 md:pr-12 md:pl-16 py-4.5 md:py-5 rounded-2xl bg-card text-main focus:border-indigo-500 outline-none border border-main text-sm md:text-sm font-black shadow-md transition-all placeholder:text-muted/50 ring-indigo-500/5 focus:ring-4" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className={`${settings.showImages ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4' : 'flex flex-col gap-2'} overflow-y-auto pr-1 pb-24 md:pb-20 custom-scrollbar`}>
          {filteredMenu.map(item => {
            if (settings.showImages) {
              return (
                <div key={item.id} onClick={() => addToCart(item)} className="bg-card rounded-xl md:rounded-2xl border border-main flex flex-col overflow-hidden active:scale-95 cursor-pointer hover:border-indigo-500/50 transition-all group shadow-sm hover:shadow-md">
                  {item.imageUrl ? (
                    <div className="relative aspect-[4/3] w-full bg-slate-100 theme-dark:bg-slate-800 overflow-hidden">
                      <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={item.name} />
                      <div className="absolute top-2 left-2 flex gap-1">
                        <span className={`text-[8px] md:text-[8px] font-black px-2 py-0.5 rounded-md border shadow-sm backdrop-blur-md ${item.foodType === FoodType.VEG ? 'border-emerald-500/50 text-emerald-600 bg-emerald-50 theme-dark:bg-emerald-500/10 theme-dark:text-emerald-400' : 'border-rose-500/50 text-rose-600 bg-rose-50 theme-dark:bg-rose-500/10 theme-dark:text-rose-400'}`}>{item.foodType}</span>
                        {item.isFavorite && <div className="bg-amber-500 text-white w-5 h-5 rounded-md flex items-center justify-center shadow-md border border-amber-600"><i className="fa-solid fa-star text-[8px]"></i></div>}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                         <h3 className="font-bold text-white text-[11px] md:text-[11px] leading-tight uppercase line-clamp-1">{item.name}</h3>
                         <div className="flex justify-between items-center mt-1">
                            <span className="text-white font-black text-[13px] md:text-[12px]">₹{item.price}</span>
                            <div className="w-7 h-7 md:w-6 md:h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm"><i className="fa-solid fa-plus text-[10px] md:text-8px]"></i></div>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative aspect-[4/3] w-full flex flex-col items-stretch justify-between p-3.5 md:p-4 text-center bg-[#1e293b] theme-dark:bg-[#1a2135]">
                      <div className="flex justify-start gap-1">
                        <span className={`text-[9px] md:text-[8px] font-black px-2 py-0.5 rounded-md border shadow-sm ${item.foodType === FoodType.VEG ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-rose-500/30 text-rose-400 bg-rose-500/10'}`}>
                          {item.foodType}
                        </span>
                        {item.isFavorite && <div className="bg-amber-500 text-white w-5 h-5 rounded-md flex items-center justify-center shadow-md border border-amber-600"><i className="fa-solid fa-star text-[8px]"></i></div>}
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <h3 className="font-black text-white text-[15px] md:text-[14px] leading-[1.2] uppercase tracking-wide">
                          {item.name}
                        </h3>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-indigo-400 font-black text-[14px] md:text-[14px]">₹{item.price}</span>
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <i className="fa-solid fa-plus text-[12px]"></i>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            } else {
              return (
                <div 
                  key={item.id} 
                  onClick={() => addToCart(item)}
                  className="bg-card p-4 md:p-3 rounded-xl border border-main flex items-center justify-between active:scale-95 cursor-pointer hover:border-indigo-500/50 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 md:w-2.5 md:h-2.5 rounded-full flex-shrink-0 border ${item.foodType === FoodType.VEG ? 'bg-emerald-500 border-emerald-600' : 'bg-rose-500 border-rose-600'}`}></div>
                    <span className="font-black text-main text-[14px] md:text-[13px] uppercase tracking-tight truncate max-w-[200px]">{item.name}</span>
                    {item.isFavorite && <i className="fa-solid fa-star text-amber-500 text-[10px]"></i>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-indigo-600 theme-dark:text-indigo-400 font-black text-[15px] md:text-[12px]">₹{item.price}</span>
                    <div className="w-9 h-9 md:w-7 md:h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm"><i className="fa-solid fa-plus text-[12px] md:text-[10px]"></i></div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>

      {/* Cart Side */}
      <div className={`w-full md:w-[320px] bg-sidebar flex flex-col border-l border-main overflow-hidden shadow-sm ${mobileView === 'menu' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3 border-b border-main bg-card-alt space-y-2.5">
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-black text-main uppercase tracking-widest">Live Cart</h2>
            <div className="bg-indigo-50 theme-dark:bg-indigo-500/10 border border-indigo-100 theme-dark:border-indigo-500/30 text-indigo-600 theme-dark:text-indigo-400 px-3 py-1 rounded-lg text-[11px] font-black uppercase">Table {currentTable?.number}</div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div className="relative group">
              <select className="w-full pl-9 pr-4 py-3 md:py-2 bg-card rounded-xl text-xs md:text-[10px] font-bold text-main border border-main outline-none appearance-none cursor-pointer focus:border-indigo-500" value={selectedCaptain} onChange={(e) => { setSelectedCaptain(e.target.value); syncCartToCloud(cartItems, e.target.value, customerName, paymentMode); }}>
                <option value="">Captain</option>
                {captains.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <i className="fa-solid fa-user-tie absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-xs md:text-[10px]"></i>
            </div>
            <div className="relative group">
              <input type="text" placeholder="Cust. Name" className="w-full pl-9 pr-4 py-3 md:py-2 bg-card rounded-xl text-xs md:text-[10px] font-bold text-main border border-main outline-none placeholder:text-muted focus:border-indigo-500" value={customerName} onChange={(e) => { setCustomerName(e.target.value); syncCartToCloud(cartItems, selectedCaptain, e.target.value, paymentMode); }} />
              <i className="fa-solid fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-xs md:text-[10px]"></i>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2.5 custom-scrollbar bg-app/20">
          {isSettledRef.current ? (
            <div className="h-full flex flex-col items-center justify-center opacity-60 text-center p-4">
              <i className="fa-solid fa-check-double text-5xl mb-4 text-emerald-500"></i>
              <p className="text-sm font-black uppercase tracking-widest text-emerald-600 mb-1">Order Settled</p>
              <p className="text-xs font-bold text-muted">Table cleared by another device.</p>
              <button onClick={onBack} className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest">Floor Plan</button>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <i className="fa-solid fa-cart-shopping text-3xl mb-3"></i>
              <p className="text-[11px] font-black uppercase tracking-widest">Empty Cart</p>
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item.id} className="bg-card p-3.5 rounded-2xl border border-main shadow-sm">
                <div className="flex justify-between items-start text-[14px] md:text-[11px] font-bold text-main uppercase mb-2">
                  <span className="flex-1 pr-2 leading-tight">{item.name}</span>
                  <span className="text-indigo-600 theme-dark:text-indigo-400 whitespace-nowrap font-black">₹{(item.price * item.quantity).toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-app p-1.5 rounded-xl border border-main shadow-inner">
                    <span className="text-[9px] md:text-[7px] font-black text-muted pl-1 uppercase tracking-tighter">Rate</span>
                    <input type="number" className="w-14 md:w-11 bg-transparent border-none text-[13px] md:text-[10px] font-black text-amber-600 theme-dark:text-yellow-400 outline-none p-0 focus:ring-0" value={item.price} onChange={(e) => updatePrice(item.id, Number(e.target.value))} />
                  </div>
                  <div className="flex items-center gap-1.5 bg-app p-1 rounded-xl border border-main ml-auto">
                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 md:w-5 md:h-5 bg-card rounded-md border border-main flex items-center justify-center text-[14px] md:text-[10px] font-black text-main">-</button>
                    <span className="w-6 text-center text-[14px] md:text-[10px] font-bold text-main">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 md:w-5 md:h-5 bg-card rounded-md border border-main flex items-center justify-center text-[14px] md:text-[10px] font-black text-main">+</button>
                  </div>
                  <button onClick={() => updateQty(item.id, -item.quantity)} className="text-muted hover:text-rose-500 transition-all p-2"><i className="fa-solid fa-trash-can text-sm md:text-[10px]"></i></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 md:p-4 bg-card border-t border-main">
          <div className="space-y-1.5 mb-4 md:mb-4 text-[11px] md:text-[10px] font-bold uppercase text-muted">
            <div className="flex justify-between"><span>Base Amount</span><span className="text-main">₹{totals.subTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Total Taxes</span><span className="text-main">₹{totals.taxAmount.toFixed(2)}</span></div>
            <div className="flex justify-between items-baseline pt-2.5 md:pt-2 mt-2.5 md:mt-2 border-t border-main">
              <span className="text-indigo-600 theme-dark:text-indigo-400 font-black text-[11px] md:text-[10px]">Net Payable</span>
              <span className="text-2xl md:text-xl font-black text-main tracking-tight">₹{totals.totalAmount.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => setShowKOTModal(true)} disabled={cartItems.length === 0 || isSettledRef.current} className="w-full py-4.5 md:py-4 bg-orange-600 text-white rounded-xl font-black uppercase text-xs md:text-[11px] tracking-widest shadow-lg disabled:opacity-30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-orange-500"><i className="fa-solid fa-fire text-sm"></i> SEND KOT</button>
            <div className="flex flex-col gap-2.5 pb-2 md:pb-0">
              <button onClick={handleBillAndSettle} disabled={cartItems.length === 0 || isMobile || isSettledRef.current} className="w-full py-4.5 md:py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs md:text-[11px] tracking-widest shadow-lg disabled:opacity-30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-emerald-500" title={isMobile ? "Billing Restricted on Mobile" : ""}><i className="fa-solid fa-receipt text-sm"></i> {isMobile ? 'PC Billing Only' : 'PRINT BILL & SETTLE'}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
        <button 
          onClick={() => setMobileView(mobileView === 'menu' ? 'cart' : 'menu')} 
          className="w-20 h-20 bg-indigo-600 text-white rounded-full shadow-[0_15px_30px_rgba(79,70,229,0.4)] border-4 border-white flex flex-col items-center justify-center relative active:scale-95 transition-all duration-300"
        >
          {mobileView === 'menu' ? (
            <>
              <i className="fa-solid fa-cart-shopping text-3xl mb-0.5"></i>
              <span className="text-[10px] font-black uppercase tracking-tighter">Cart</span>
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-8 h-8 bg-rose-500 text-white text-[14px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
                  {cartItems.reduce((acc, curr) => acc + curr.quantity, 0)}
                </span>
              )}
            </>
          ) : (
            <>
              <i className="fa-solid fa-utensils text-3xl mb-0.5"></i>
              <span className="text-[10px] font-black uppercase tracking-tighter">Menu</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PosView;
