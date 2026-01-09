
import React, { useState, useRef } from 'react';
import { useApp } from '../store';
import { FoodType, MenuItem, Waiter, Group, Tax, Table } from '../types';

type MasterTab = 'Items' | 'Waiters' | 'Groups' | 'Taxes' | 'Tables';

const Masters: React.FC = () => {
  const { 
    menu, groups, waiters, taxes, tables, upsert, remove 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<MasterTab>('Items');
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState<Partial<MenuItem>>({ foodType: FoodType.VEG });
  const [newWaiter, setNewWaiter] = useState<Partial<Waiter>>({});
  const [newGroup, setNewGroup] = useState<Partial<Group>>({});
  const [newTax, setNewTax] = useState<Partial<Tax>>({});
  const [newTable, setNewTable] = useState<Partial<Table>>({ status: 'Available' });

  // Fix: Moved helper functions inside the component to correctly access 'remove' and 'tables' from useApp context
  const removeWaiter = async (id: string) => {
    if (confirm("Remove waiter?")) await remove("waiters", id);
  };

  const removeGroup = async (id: string) => {
    if (confirm("Delete group? Items will remain but category will be removed.")) await remove("groups", id);
  };

  const removeTax = async (id: string) => {
    if (confirm("Delete tax?")) await remove("taxes", id);
  };

  const removeTable = async (id: string) => {
    const table = tables.find(t => t.id === id);
    if (confirm(`Delete Table ${table?.number}?`)) await remove("tables", id);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { alert("Image too large! Please select an image under 1MB."); return; }
      const reader = new FileReader();
      reader.onloadend = () => setNewItem({ ...newItem, imageUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleSaveItem = async () => {
    if (!newItem.name || !newItem.price) {
      alert("Please enter Name and Price");
      return;
    }
    const item: MenuItem = {
      id: editingId || `item-${Date.now()}`,
      name: newItem.name || '',
      price: Number(newItem.price),
      groupId: newItem.groupId || (groups[0]?.id || ''),
      taxId: newItem.taxId || (taxes[0]?.id || ''),
      foodType: newItem.foodType || FoodType.VEG,
      imageUrl: newItem.imageUrl
    };
    await upsert("menu", item);
    setEditingId(null);
    setNewItem({ foodType: FoodType.VEG });
  };

  const handleAddWaiter = async () => {
    if (!newWaiter.name) return;
    await upsert("waiters", { id: `w-${Date.now()}`, name: newWaiter.name, phone: newWaiter.phone });
    setNewWaiter({});
  };

  const handleAddGroup = async () => {
    if (!newGroup.name) return;
    await upsert("groups", { id: `g-${Date.now()}`, name: newGroup.name });
    setNewGroup({});
  };

  const handleAddTax = async () => {
    if (!newTax.name || newTax.rate === undefined) return;
    await upsert("taxes", { id: `t-${Date.now()}`, name: newTax.name, rate: Number(newTax.rate) });
    setNewTax({});
  };

  const handleAddTable = async () => {
    if (!newTable.number) return;
    if (tables.some(t => t.number === newTable.number)) { alert("Table number already exists"); return; }
    await upsert("tables", { id: `T${newTable.number}`, number: newTable.number, status: 'Available' });
    setNewTable({ status: 'Available' });
  };

  const removeItem = async (id: string) => { 
    if (confirm("Delete this item? This will remove it from the menu gallery.")) await remove("menu", id); 
  };
  
  const InputLabel = ({ label }: { label: string }) => (
    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">{label}</label>
  );

  return (
    <div className="space-y-6">
      <div className="bg-[#1a2135] rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        <div className="flex border-b border-slate-800 bg-[#1e293b]/50 overflow-x-auto no-scrollbar">
          {(['Items', 'Waiters', 'Groups', 'Taxes', 'Tables'] as MasterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setEditingId(null); setNewItem({ foodType: FoodType.VEG }); }}
              className={`px-8 py-5 font-black text-[11px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {tab} Master
            </button>
          ))}
        </div>

        <div className="p-4 md:p-8">
          {activeTab === 'Items' && (
            <div className="space-y-8">
              {/* Add/Edit Form */}
              <div id="item-form" className={`grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-3xl border transition-all duration-300 ${editingId ? 'bg-indigo-900/10 border-indigo-500/50 shadow-lg' : 'bg-[#0f172a] border-slate-800'}`}>
                <div className="md:col-span-3">
                  <InputLabel label="Dish Photo" />
                  <div onClick={() => fileInputRef.current?.click()} className="relative w-full aspect-video bg-[#1e293b] rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 cursor-pointer flex flex-col items-center justify-center overflow-hidden transition-all group">
                    {newItem.imageUrl ? (
                      <img src={newItem.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <i className="fa-solid fa-camera text-2xl text-slate-600 mb-2 group-hover:text-indigo-400 transition-colors"></i>
                        <p className="text-[9px] font-black text-slate-500 uppercase">Tap to Upload</p>
                      </div>
                    )}
                    {newItem.imageUrl && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <span className="text-[10px] font-black uppercase text-white">Change Photo</span>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>
                
                <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="col-span-full lg:col-span-2">
                    <InputLabel label="Item Name" />
                    <input className="w-full p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold placeholder:text-slate-400" placeholder="e.g., Paneer Butter Masala" value={newItem.name || ''} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                  </div>
                  <div>
                    <InputLabel label="Price (₹)" />
                    <input type="number" className="w-full p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold" value={newItem.price || ''} onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })} />
                  </div>
                  <div>
                    <InputLabel label="Category Group" />
                    <select className="w-full p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold appearance-none" value={newItem.groupId} onChange={e => setNewItem({ ...newItem, groupId: e.target.value })}>
                      <option value="">-- Select --</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <InputLabel label="Veg / Non-Veg" />
                    <select className="w-full p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold appearance-none" value={newItem.foodType} onChange={e => setNewItem({ ...newItem, foodType: e.target.value as FoodType })}>
                      <option value={FoodType.VEG}>Pure Veg</option>
                      <option value={FoodType.NON_VEG}>Non-Veg</option>
                    </select>
                  </div>
                  <div>
                    <InputLabel label="GST Rate" />
                    <select className="w-full p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold appearance-none" value={newItem.taxId} onChange={e => setNewItem({ ...newItem, taxId: e.target.value })}>
                      <option value="">-- Select --</option>
                      {taxes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                    </select>
                  </div>
                  <div className="col-span-full flex gap-3 pt-2">
                    <button onClick={handleSaveItem} className="flex-1 h-[52px] bg-indigo-600 text-white font-black rounded-2xl uppercase text-[11px] tracking-widest shadow-lg hover:bg-indigo-500 transition-all">
                      {editingId ? 'Update Item' : 'Add to Menu'}
                    </button>
                    {editingId && (
                      <button onClick={() => { setEditingId(null); setNewItem({ foodType: FoodType.VEG }); }} className="px-6 bg-slate-800 text-slate-400 font-black rounded-2xl uppercase text-[11px] tracking-widest border border-slate-700">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Gallery Display */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {menu.length === 0 ? (
                  <div className="col-span-full py-20 text-center opacity-20">
                     <i className="fa-solid fa-utensils text-6xl mb-4"></i>
                     <p className="font-black uppercase tracking-widest">No Items Added Yet</p>
                  </div>
                ) : (
                  menu.map(item => (
                    <div key={item.id} className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden flex flex-col group relative">
                      <div className="aspect-square bg-[#1e293b] relative overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={item.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-700">
                             <i className="fa-solid fa-image text-3xl"></i>
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                           <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border shadow-sm ${item.foodType === FoodType.VEG ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-rose-500/50 text-rose-400 bg-rose-500/10'}`}>
                              {item.foodType}
                           </span>
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                           <button onClick={() => { setNewItem(item); setEditingId(item.id); document.getElementById('item-form')?.scrollIntoView({ behavior: 'smooth' }); }} className="w-10 h-10 rounded-xl bg-white text-slate-900 flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                              <i className="fa-solid fa-pen-to-square"></i>
                           </button>
                           <button onClick={() => removeItem(item.id)} className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                              <i className="fa-solid fa-trash"></i>
                           </button>
                        </div>
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between">
                         <h4 className="text-white font-bold text-xs uppercase leading-tight line-clamp-2 mb-2">{item.name}</h4>
                         <div className="flex justify-between items-center">
                            <span className="text-indigo-400 font-black text-sm">₹{item.price}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase">{groups.find(g => g.id === item.groupId)?.name || 'Misc'}</span>
                         </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'Waiters' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0f172a] p-6 rounded-3xl border border-slate-800">
                <input placeholder="Name" className="p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold" value={newWaiter.name || ''} onChange={e => setNewWaiter({ ...newWaiter, name: e.target.value })} />
                <input placeholder="Phone" className="p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold" value={newWaiter.phone || ''} onChange={e => setNewWaiter({ ...newWaiter, phone: e.target.value })} />
                <button onClick={handleAddWaiter} className="h-[52px] bg-indigo-600 text-white font-black rounded-2xl uppercase text-[11px]">Save Waiter</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {waiters.map(waiter => (
                  <div key={waiter.id} className="bg-[#0f172a] p-5 rounded-3xl border border-slate-800 flex justify-between items-center">
                    <div><h4 className="text-white font-black text-sm uppercase">{waiter.name}</h4><p className="text-slate-500 text-xs font-bold">{waiter.phone}</p></div>
                    <button onClick={() => removeWaiter(waiter.id)} className="text-rose-500"><i className="fa-solid fa-trash-can"></i></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Groups' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0f172a] p-6 rounded-3xl border border-slate-800">
                <input placeholder="Group Name" className="p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold" value={newGroup.name || ''} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} />
                <button onClick={handleAddGroup} className="h-[52px] bg-indigo-600 text-white font-black rounded-2xl uppercase text-[11px]">Save Group</button>
              </div>
              <div className="flex flex-wrap gap-4">
                {groups.map(group => (
                  <div key={group.id} className="bg-[#1e293b]/50 px-6 py-4 rounded-3xl border border-slate-800 flex items-center gap-4">
                    <span className="text-white font-black text-xs uppercase">{group.name}</span>
                    <button onClick={() => removeGroup(group.id)} className="text-rose-500"><i className="fa-solid fa-circle-xmark"></i></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Taxes' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0f172a] p-6 rounded-3xl border border-slate-800">
                <input placeholder="Tax Name" className="p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold" value={newTax.name || ''} onChange={e => setNewTax({ ...newTax, name: e.target.value })} />
                <input type="number" placeholder="Rate %" className="p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold" value={newTax.rate || ''} onChange={e => setNewTax({ ...newTax, rate: Number(e.target.value) })} />
                <button onClick={handleAddTax} className="h-[52px] bg-indigo-600 text-white font-black rounded-2xl uppercase text-[11px]">Save Tax</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {taxes.map(tax => (
                  <div key={tax.id} className="bg-indigo-900/10 border border-indigo-500/20 p-6 rounded-3xl flex flex-col items-center">
                    <h4 className="text-indigo-400 font-black text-2xl mb-1">{tax.rate}%</h4>
                    <p className="text-slate-500 text-[10px] font-black uppercase mb-4">{tax.name}</p>
                    <button onClick={() => removeTax(tax.id)} className="text-rose-500"><i className="fa-solid fa-trash-can text-xs"></i></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Tables' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0f172a] p-6 rounded-3xl border border-slate-800">
                <input placeholder="Table Number" className="p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold" value={newTable.number || ''} onChange={e => setNewTable({ ...newTable, number: e.target.value })} />
                <button onClick={handleAddTable} className="h-[52px] bg-indigo-600 text-white font-black rounded-2xl uppercase text-[11px]">Add Table</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-5">
                {tables.sort((a,b)=>Number(a.number)-Number(b.number)).map(table => (
                  <div key={table.id} className="relative group aspect-square">
                    <div className="w-full h-full bg-[#0f172a] rounded-[2rem] border border-slate-800 flex flex-col items-center justify-center group-hover:border-indigo-500 transition-all shadow-xl">
                      <span className="text-white font-black text-xl tracking-tighter">T-{table.number}</span>
                    </div>
                    <button onClick={() => removeTable(table.id)} className="absolute -top-1 -right-1 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"><i className="fa-solid fa-xmark text-[11px]"></i></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Masters;
