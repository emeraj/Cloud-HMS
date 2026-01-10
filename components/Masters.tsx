
import React, { useState, useRef } from 'react';
import { useApp } from '../store';
import { FoodType, MenuItem, Captain, Group, Tax, Table } from '../types';

type MasterTab = 'Items' | 'Captains' | 'Groups' | 'Taxes' | 'Tables';

const Masters: React.FC = () => {
  const { 
    menu, groups, captains, taxes, tables, upsert, remove 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<MasterTab>('Items');
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState<Partial<MenuItem>>({ foodType: FoodType.VEG });
  const [newCaptain, setNewCaptain] = useState<Partial<Captain>>({});
  const [newGroup, setNewGroup] = useState<Partial<Group>>({});
  const [newTax, setNewTax] = useState<Partial<Tax>>({});
  const [newTable, setNewTable] = useState<Partial<Table>>({ status: 'Available' });

  const removeCaptain = async (id: string) => {
    if (confirm("Remove Captain?")) await remove("waiters", id);
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

  const handleAddCaptain = async () => {
    if (!newCaptain.name) return;
    await upsert("waiters", { id: `w-${Date.now()}`, name: newCaptain.name, phone: newCaptain.phone });
    setNewCaptain({});
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
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white theme-dark:bg-[#1a2135] rounded-2xl md:rounded-3xl shadow-xl overflow-hidden border border-main">
        <div className="flex border-b border-main bg-slate-50/50 theme-dark:bg-[#1e293b]/50 overflow-x-auto no-scrollbar">
          {(['Items', 'Captains', 'Groups', 'Taxes', 'Tables'] as MasterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setEditingId(null); setNewItem({ foodType: FoodType.VEG }); }}
              className={`px-6 md:px-8 py-4 md:py-5 font-black text-[10px] md:text-[11px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-indigo-600'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-8">
          {activeTab === 'Items' && (
            <div className="space-y-6 md:space-y-8">
              {/* Add/Edit Form */}
              <div id="item-form" className={`flex flex-col gap-6 p-4 md:p-6 rounded-2xl border transition-all duration-300 ${editingId ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-1/4">
                    <InputLabel label="Dish Photo" />
                    <div onClick={() => fileInputRef.current?.click()} className="relative w-full aspect-video md:aspect-square bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 cursor-pointer flex flex-col items-center justify-center overflow-hidden transition-all group">
                      {newItem.imageUrl ? (
                        <img src={newItem.imageUrl} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4">
                          <i className="fa-solid fa-camera text-xl text-slate-400 mb-1 group-hover:text-indigo-600 transition-colors"></i>
                          <p className="text-[8px] font-black text-slate-500 uppercase">Upload</p>
                        </div>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-full">
                      <InputLabel label="Item Name" />
                      <input className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold placeholder:text-slate-400 focus:border-indigo-500 outline-none text-xs" placeholder="e.g., Paneer Butter Masala" value={newItem.name || ''} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                    </div>
                    <div>
                      <InputLabel label="Price (₹)" />
                      <input type="number" className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold focus:border-indigo-500 outline-none text-xs" value={newItem.price || ''} onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })} />
                    </div>
                    <div>
                      <InputLabel label="Category Group" />
                      <select className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold appearance-none focus:border-indigo-500 outline-none text-xs" value={newItem.groupId} onChange={e => setNewItem({ ...newItem, groupId: e.target.value })}>
                        <option value="">-- Select --</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <InputLabel label="Veg / Non-Veg" />
                      <select className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold appearance-none focus:border-indigo-500 outline-none text-xs" value={newItem.foodType} onChange={e => setNewItem({ ...newItem, foodType: e.target.value as FoodType })}>
                        <option value={FoodType.VEG}>Pure Veg</option>
                        <option value={FoodType.NON_VEG}>Non-Veg</option>
                      </select>
                    </div>
                    <div>
                      <InputLabel label="GST Rate" />
                      <select className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold appearance-none focus:border-indigo-500 outline-none text-xs" value={newItem.taxId} onChange={e => setNewItem({ ...newItem, taxId: e.target.value })}>
                        <option value="">-- Select --</option>
                        {taxes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSaveItem} className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl uppercase text-[10px] tracking-widest shadow-lg hover:bg-indigo-500 transition-all">
                    {editingId ? 'Update Item' : 'Add to Menu'}
                  </button>
                  {editingId && (
                    <button onClick={() => { setEditingId(null); setNewItem({ foodType: FoodType.VEG }); }} className="px-5 bg-white border border-slate-200 text-slate-400 font-black rounded-xl uppercase text-[10px] tracking-widest">
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Items Gallery Display */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {menu.length === 0 ? (
                  <div className="col-span-full py-12 text-center opacity-20">
                     <i className="fa-solid fa-utensils text-4xl mb-3 text-slate-400"></i>
                     <p className="font-black uppercase tracking-widest text-slate-600 text-[10px]">No Items</p>
                  </div>
                ) : (
                  menu.map(item => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col group relative shadow-sm hover:shadow-md transition-shadow">
                      <div className="aspect-square bg-slate-50 relative overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={item.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                             <i className="fa-solid fa-image text-2xl"></i>
                          </div>
                        )}
                        <div className="absolute top-1.5 left-1.5">
                           <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase border shadow-sm ${item.foodType === FoodType.VEG ? 'border-emerald-500/50 text-emerald-600 bg-emerald-50' : 'border-rose-500/50 text-rose-600 bg-rose-50'}`}>
                              {item.foodType}
                           </span>
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                           <button onClick={() => { setNewItem(item); setEditingId(item.id); document.getElementById('item-form')?.scrollIntoView({ behavior: 'smooth' }); }} className="w-8 h-8 rounded-lg bg-white text-slate-900 flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                              <i className="fa-solid fa-pen-to-square text-indigo-600 text-xs"></i>
                           </button>
                           <button onClick={() => removeItem(item.id)} className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                              <i className="fa-solid fa-trash text-xs"></i>
                           </button>
                        </div>
                      </div>
                      <div className="p-2 flex-1 flex flex-col justify-between">
                         <h4 className="text-slate-800 font-bold text-[10px] uppercase leading-tight line-clamp-2 h-7">{item.name}</h4>
                         <div className="flex justify-between items-center mt-1">
                            <span className="text-indigo-600 font-black text-xs">₹{item.price}</span>
                            <span className="text-[7px] font-black text-slate-400 uppercase">{groups.find(g => g.id === item.groupId)?.name || 'Misc'}</span>
                         </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'Captains' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <input placeholder="Captain Name" className="p-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-500 text-xs" value={newCaptain.name || ''} onChange={e => setNewCaptain({ ...newCaptain, name: e.target.value })} />
                <input placeholder="Phone" className="p-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-500 text-xs" value={newCaptain.phone || ''} onChange={e => setNewCaptain({ ...newCaptain, phone: e.target.value })} />
                <button onClick={handleAddCaptain} className="py-3 bg-indigo-600 text-white font-black rounded-xl uppercase text-[10px] shadow-md hover:bg-indigo-500 transition-all">Save Captain</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {captains.map(captain => (
                  <div key={captain.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
                    <div><h4 className="text-slate-800 font-black text-xs uppercase">{captain.name}</h4><p className="text-slate-500 text-[10px] font-bold">{captain.phone}</p></div>
                    <button onClick={() => removeCaptain(captain.id)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-all"><i className="fa-solid fa-trash-can text-xs"></i></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Groups' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <input placeholder="Group Name" className="p-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-500 text-xs" value={newGroup.name || ''} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} />
                <button onClick={handleAddGroup} className="py-3 bg-indigo-600 text-white font-black rounded-xl uppercase text-[10px] shadow-md hover:bg-indigo-500 transition-all">Save Group</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {groups.map(group => (
                  <div key={group.id} className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm group">
                    <span className="text-slate-800 font-black text-[10px] uppercase">{group.name}</span>
                    <button onClick={() => removeGroup(group.id)} className="text-rose-400 hover:text-rose-600 transition-colors"><i className="fa-solid fa-circle-xmark text-xs"></i></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Taxes' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <input placeholder="Tax Name" className="p-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-500 text-xs" value={newTax.name || ''} onChange={e => setNewTax({ ...newTax, name: e.target.value })} />
                <input type="number" placeholder="Rate %" className="p-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-500 text-xs" value={newTax.rate || ''} onChange={e => setNewTax({ ...newTax, rate: Number(e.target.value) })} />
                <button onClick={handleAddTax} className="py-3 bg-indigo-600 text-white font-black rounded-xl uppercase text-[10px] shadow-md hover:bg-indigo-500 transition-all">Save Tax</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {taxes.map(tax => (
                  <div key={tax.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col items-center shadow-sm">
                    <h4 className="text-indigo-600 font-black text-xl mb-0.5">{tax.rate}%</h4>
                    <p className="text-slate-500 text-[8px] font-black uppercase mb-3">{tax.name}</p>
                    <button onClick={() => removeTax(tax.id)} className="text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg transition-all"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Tables' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <input placeholder="Table Number" className="p-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-500 text-xs" value={newTable.number || ''} onChange={e => setNewTable({ ...newTable, number: e.target.value })} />
                <button onClick={handleAddTable} className="py-3 bg-indigo-600 text-white font-black rounded-xl uppercase text-[10px] shadow-md hover:bg-indigo-500 transition-all">Add Table</button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {tables.sort((a,b)=>Number(a.number)-Number(b.number)).map(table => (
                  <div key={table.id} className="relative group aspect-square">
                    <div className="w-full h-full bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center group-hover:border-indigo-500 transition-all shadow-sm">
                      <span className="text-slate-800 font-black text-base md:text-xl tracking-tighter">T-{table.number}</span>
                    </div>
                    <button onClick={() => removeTable(table.id)} className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"><i className="fa-solid fa-xmark text-[10px]"></i></button>
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
