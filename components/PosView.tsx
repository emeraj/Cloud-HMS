
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../store';
import { MenuItem, OrderItem, Order, FoodType } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface PosViewProps {
  onBack: () => void;
  onPrint: (type: 'BILL' | 'KOT', order: Order) => void;
}

const PosView: React.FC<PosViewProps> = ({ onBack, onPrint }) => {
  const { 
    activeTable, tables, menu, groups, captains, 
    orders, taxes, upsert, remove, user, settings 
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

  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  const isSettledRef = useRef(false);
  const recognitionRef = useRef<any>(null);

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
        // Ensure printedQty is never undefined when loading from DB
        const itemsWithDefaults = existingOrder.items.map(it => ({
          ...it,
          printedQty: it.printedQty || 0
        }));
        setCartItems(itemsWithDefaults);
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
      const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
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
      updatedItems = cartItems.map((i, idx) => idx === existingIndex ? { 
        ...i, 
        quantity: i.quantity + qty,
        printedQty: i.printedQty || 0 // Preserve existing printed count
      } : i);
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
    const updatedItems = cartItems.map(item => item.id === id ? { 
      ...item, 
      quantity: Math.max(0, item.quantity + delta) 
    } : item).filter(i => i.quantity > 0);
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
    if (isSettledRef.current || !activeTable || !currentTable) return;
    
    // 1. DELTA CALCULATION: Strictly find only unprinted quantities
    const itemsToPrint: OrderItem[] = cartItems
      .map(item => {
        const alreadyPrinted = item.printedQty || 0;
        const newDeltaQty = item.quantity - alreadyPrinted;
        return { ...item, quantity: newDeltaQty };
      })
      .filter(item => item.quantity > 0);

    if (itemsToPrint.length === 0) {
      alert("All items are already sent to the kitchen.");
      return;
    }

    // 2. Prepare full order update: Mark all current items as printed
    const updatedCart = cartItems.map(item => ({
      ...item,
      printedQty: item.quantity
    }));

    const billNo = existingOrder?.dailyBillNo || getNextBillNo();
    const nextKOTCount = (existingOrder?.kotCount || 0) + 1;
    const orderId = existingOrder?.id || `ORD-${Date.now()}`;

    const fullOrder: Order = { 
      id: orderId, 
      dailyBillNo: billNo, 
      tableId: activeTable, 
      captainId: selectedCaptain, 
      items: updatedCart, 
      status: 'Pending', 
      timestamp: existingOrder?.timestamp || new Date().toISOString(), 
      ...totals, 
      kotCount: nextKOTCount, 
      customerName, 
      paymentMode, 
      cashierName: user?.displayName || 'Admin' 
    };

    // Update local state and DB
    setCartItems(updatedCart);
    await upsert("orders", fullOrder);
    await upsert("tables", { ...currentTable, status: 'Occupied', currentOrderId: orderId });
    
    // 3. TRIGGER PRINT: pass an order object that contains ONLY the new items
    const printOrder: Order = {
      ...fullOrder,
      items: itemsToPrint
    };

    onPrint('KOT', printOrder);
  };

  const handleBillAndSettle = async () => {
    if (!currentTable || isMobile || isSettledRef.current) return;
    let orderId = existingOrder?.id || `ORD-${Date.now()}`;
    let dailyBillNo = existingOrder?.dailyBillNo || getNextBillNo();
    const newOrder: Order = { id: orderId, dailyBillNo, tableId: activeTable!, captainId: selectedCaptain, items: cartItems, status: 'Settled', timestamp: existingOrder?.timestamp || new Date().toISOString(), ...totals, kotCount: existingOrder?.kotCount || 0, customerName, paymentMode, cashierName: user?.displayName || 'Admin' };
    isSettledRef.current = true;
    await upsert("orders", newOrder);
    await upsert("tables", { ...currentTable, status: 'Available', currentOrderId: undefined });
    onPrint('BILL', newOrder);
    onBack();
  };

  const parseVoiceCommandWithAI = async (transcript: string) => {
    setIsProcessingVoice(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const menuContext = menu.map(m => ({ id: m.id, name: m.name })).slice(0, 100);

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Given the spoken order: "${transcript}" and the following menu: ${JSON.stringify(menuContext)}, identify items and quantities. Return ONLY a JSON array like [{"id": "item-id", "qty": 2}]. If an item is not found, skip it. Do not include extra text.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                qty: { type: Type.NUMBER }
              },
              required: ["id", "qty"]
            }
          }
        }
      });

      const parsedItems = JSON.parse(response.text || '[]');
      for (const voiceItem of parsedItems) {
        const menuItem = menu.find(m => m.id === voiceItem.id);
        if (menuItem) {
          addToCart(menuItem, voiceItem.qty);
        }
      }
    } catch (err) {
      console.error("AI Voice Parse Error:", err);
    } finally {
      setIsProcessingVoice(false);
      setVoiceTranscript('');
    }
  };

  const startVoiceControl = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (recognitionRef.current) recognitionRef.current.stop();

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      setVoiceTranscript(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (voiceTranscript) {
        parseVoiceCommandWithAI(voiceTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error", event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="flex flex-col h-screen md:flex-row bg-app text-main overflow-hidden animate-in zoom-in-95 duration-300 relative">
      {isListening && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="relative mb-12">
              <div className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(79,70,229,0.4)] animate-pulse">
                <i className="fa-solid fa-microphone text-white text-5xl"></i>
              </div>
              <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-indigo-500/30 animate-ping"></div>
           </div>
           <h3 className="text-white text-2xl font-black uppercase tracking-widest mb-4">Listening for order...</h3>
           <div className="max-w-md w-full bg-white/10 p-6 rounded-3xl border border-white/20 text-center">
              <p className="text-indigo-200 text-lg font-black italic">"{voiceTranscript || 'Say something like: 2 Paneer Tikka...'}"</p>
           </div>
           <button onClick={() => recognitionRef.current?.stop()} className="mt-12 px-10 py-4 bg-rose-600 text-white font-black rounded-full uppercase tracking-widest text-sm shadow-xl hover:bg-rose-500 transition-all">Stop Listening</button>
        </div>
      )}

      {isProcessingVoice && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10">
          <i className="fa-solid fa-brain animate-bounce"></i>
          <span className="text-xs font-black uppercase tracking-widest">AI processing order...</span>
        </div>
      )}

      {showKOTModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-main overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-main bg-slate-50/50 theme-dark:bg-slate-800/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg md:text-sm font-black text-main uppercase tracking-widest">Confirm KOT</h3>
                <p className="text-xs md:text-[10px] font-bold text-muted uppercase">Table {currentTable?.number} • {cartItems.length} Items</p>
              </div>
              <button onClick={() => setShowKOTModal(false)} className="w-10 h-10 rounded-full hover:bg-slate-200 theme-dark:hover:bg-slate-700 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-muted"></i></button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {cartItems.map((item, idx) => {
                const isNew = item.quantity > (item.printedQty || 0);
                return (
                  <div key={idx} className={`flex justify-between items-center p-3 rounded-xl border border-main ${isNew ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-app/40 opacity-50 grayscale'}`}>
                    <div className="flex flex-col">
                      <span className="text-sm md:text-[11px] font-black text-main uppercase truncate pr-4">{item.name}</span>
                      {isNew ? (
                         <span className="text-[8px] font-black text-indigo-600 uppercase tracking-tighter">New: {item.quantity - (item.printedQty || 0)} Unit(s)</span>
                      ) : (
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Previously Sent</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-indigo-600 font-black text-sm md:text-xs bg-white theme-dark:bg-slate-700 px-2 py-1 rounded-lg border border-main shadow-sm">x{item.quantity}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-5 bg-slate-50 theme-dark:bg-slate-800/50 border-t border-main grid grid-cols-2 gap-3">
              <button onClick={() => setShowKOTModal(false)} className="py-4 rounded-2xl bg-white border border-main text-muted font-black uppercase text-xs md:text-[10px] tracking-widest hover:text-rose-500 transition-all active:scale-95 shadow-sm">Go Back</button>
              <button onClick={processKOT} className="py-4 rounded-2xl bg-orange-600 text-white font-black uppercase text-xs md:text-[10px] tracking-widest shadow-lg hover:bg-orange-500 active:scale-95 transition-all flex items-center justify-center gap-2"><i className="fa-solid fa-print"></i>Confirm Print</button>
            </div>
          </div>
        </div>
      )}

      <div className={`flex-1 flex flex-col overflow-hidden p-2 md:p-3 border-r border-main ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
        <div className="mb-2 px-1 mt-1 md:mt-2 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-black text-main tracking-tight uppercase opacity-90 leading-none">Cloud-HMS</h1>
          <button onClick={startVoiceControl} className="md:hidden w-12 h-12 bg-indigo-600 rounded-2xl text-white shadow-lg active:scale-90 flex items-center justify-center border-2 border-indigo-500/50"><i className="fa-solid fa-microphone text-xl"></i></button>
        </div>

        <div className="flex items-center gap-3 mb-3 md:mb-4">
          <button onClick={onBack} className="flex-shrink-0 w-16 h-16 md:w-10 md:h-10 bg-card rounded-2xl md:rounded-xl text-indigo-600 md:text-muted hover:text-indigo-600 border-2 md:border border-indigo-500 md:border-main hover:border-indigo-500 transition-all shadow-md md:shadow-sm active:scale-95 flex items-center justify-center">
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
          <button onClick={startVoiceControl} className="hidden md:flex w-[70px] bg-card border border-main rounded-2xl items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-all shadow-md group active:scale-95">
            <div className="relative">
               <i className="fa-solid fa-microphone text-xl group-hover:scale-110 transition-transform"></i>
               <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
            </div>
          </button>
        </div>

        <div className={`${settings.showImages ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4' : 'flex flex-col gap-2'} overflow-y-auto pr-1 pb-24 md:pb-20 custom-scrollbar`}>
          {filteredMenu.map(item => (
            <div key={item.id} onClick={() => addToCart(item)} className="bg-card rounded-xl border border-main overflow-hidden active:scale-95 cursor-pointer hover:border-indigo-500/50 transition-all group shadow-sm">
              <div className="relative aspect-[4/3] w-full flex flex-col items-stretch justify-between p-3.5 md:p-4 text-center bg-[#1e293b]">
                <div className="flex justify-start gap-1">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${item.foodType === FoodType.VEG ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-rose-500/30 text-rose-400 bg-rose-500/10'}`}>
                    {item.foodType}
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <h3 className="font-black text-white text-[15px] uppercase leading-tight">{item.name}</h3>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-400 font-black">₹{item.price}</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg"><i className="fa-solid fa-plus"></i></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`w-full md:w-[320px] bg-sidebar flex flex-col border-l border-main overflow-hidden shadow-sm ${mobileView === 'menu' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3 border-b border-main bg-card-alt space-y-2.5">
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-black text-main uppercase tracking-widest">Live Cart</h2>
            <div className="bg-indigo-50 px-3 py-1 rounded-lg text-[11px] font-black uppercase">Table {currentTable?.number}</div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <select className="w-full p-2 bg-card rounded-xl text-[10px] font-bold text-main border border-main outline-none appearance-none" value={selectedCaptain} onChange={(e) => { setSelectedCaptain(e.target.value); syncCartToCloud(cartItems, e.target.value, customerName, paymentMode); }}>
              <option value="">Captain</option>
              {captains.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2.5 bg-app/20 custom-scrollbar">
          {isSettledRef.current ? (
            <div className="h-full flex flex-col items-center justify-center opacity-60 text-center p-4">
              <i className="fa-solid fa-check-double text-5xl mb-4 text-emerald-500"></i>
              <p className="text-sm font-black uppercase tracking-widest text-emerald-600">Order Settled</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20"><i className="fa-solid fa-cart-shopping text-3xl mb-3"></i><p className="text-[11px] font-black uppercase">Empty Cart</p></div>
          ) : (
            cartItems.map(item => (
              <div key={item.id} className="bg-card p-3 rounded-2xl border border-main shadow-sm">
                <div className="flex justify-between items-start text-[13px] font-bold text-main uppercase mb-2">
                  <span className="flex-1 pr-2 leading-tight">{item.name}</span>
                  <span className="text-indigo-600 font-black">₹{(item.price * item.quantity).toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 bg-app p-1 rounded-xl border border-main">
                    <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 bg-card rounded-md border border-main flex items-center justify-center text-[12px] font-black">-</button>
                    <span className="w-5 text-center text-[12px] font-bold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 bg-card rounded-md border border-main flex items-center justify-center text-[12px] font-black">+</button>
                  </div>
                  <button onClick={() => updateQty(item.id, -item.quantity)} className="text-muted hover:text-rose-500 p-2"><i className="fa-solid fa-trash-can text-sm"></i></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-card border-t border-main">
          <div className="space-y-1.5 mb-4 text-[10px] font-bold uppercase text-muted">
            <div className="flex justify-between"><span>Subtotal</span><span className="text-main">₹{totals.subTotal.toFixed(2)}</span></div>
            <div className="flex justify-between items-baseline pt-2 mt-2 border-t border-main">
              <span className="text-indigo-600 font-black">Payable</span>
              <span className="text-xl font-black text-main">₹{totals.totalAmount.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => setShowKOTModal(true)} disabled={cartItems.length === 0 || isSettledRef.current} className="w-full py-4 bg-orange-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg disabled:opacity-30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-orange-500"><i className="fa-solid fa-fire"></i> SEND KOT</button>
            <button onClick={handleBillAndSettle} disabled={cartItems.length === 0 || isMobile || isSettledRef.current} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg disabled:opacity-30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-emerald-500"><i className="fa-solid fa-receipt"></i> {isMobile ? 'PC Billing Only' : 'PRINT BILL'}</button>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-10 right-8 flex flex-col gap-3 z-50">
        <button onClick={() => setMobileView(mobileView === 'menu' ? 'cart' : 'menu')} className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 relative transition-transform">
          {mobileView === 'menu' ? <i className="fa-solid fa-cart-shopping text-xl"></i> : <i className="fa-solid fa-utensils text-xl"></i>}
        </button>
      </div>
    </div>
  );
};

export default PosView;
