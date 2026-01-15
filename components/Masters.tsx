
import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../store';
import { FoodType, MenuItem, Captain, Group, Tax, Table } from '../types';

type MasterTab = 'Items' | 'Captains' | 'Groups' | 'Taxes' | 'Tables';

const Masters: React.FC = () => {
  const { 
    menu, groups, captains, taxes, tables, upsert, remove, settings 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<MasterTab>('Items');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState<Partial<MenuItem>>({ foodType: FoodType.VEG });
  const [newCaptain, setNewCaptain] = useState<Partial<Captain>>({});
  const [newGroup, setNewGroup] = useState<Partial<Group>>({});
  const [newTax, setNewTax] = useState<Partial<Tax>>({});
  const [newTable, setNewTable] = useState<Partial<Table>>({ status: 'Available' });

  const filteredMenu = useMemo(() => {
    return menu.filter(item => 
      item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [menu, itemSearchQuery]);

  const removeCaptain = async (id: string) => { if (confirm("Remove Captain?")) await remove("waiters", id); };
  const removeGroup = async (id: string) => { if (confirm("Delete group?")) await remove("groups", id); };
  const removeTax = async (id: string) => { if (confirm("Delete tax?")) await remove("taxes", id); };
  const removeTable = async (id: string) => { const table = tables.find(t => t.id === id); if (confirm(`Delete Table ${table?.number}?`)) await remove("tables", id); };

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
    if (!newItem.name || !newItem.price) { alert("Please enter Name and Price"); return; }
    const item: MenuItem = { id: editingId || `item-${Date.now()}`, name: newItem.name || '', price: Number(newItem.price), groupId: newItem.groupId || (groups[0]?.id || ''), taxId: newItem.taxId || (taxes[0]?.id || ''), foodType: newItem.foodType || FoodType.VEG, imageUrl: newItem.imageUrl };
    await upsert("menu", item);
    setEditingId(null);
    setNewItem({ foodType: FoodType.VEG });
  };

  const handleAddCaptain = async () => { if (!newCaptain.name) return; await upsert("waiters", { id: `w-${Date.now()}`, name: newCaptain.name, phone: newCaptain.phone }); setNewCaptain({}); };
  const handleAddGroup = async () => { if (!newGroup.name) return; await upsert("groups", { id: `g-${Date.now()}`, name: newGroup.name }); setNewGroup({}); };
  const handleAddTax = async () => { if (!newTax.name || newTax.rate === undefined) return; await upsert("taxes", { id: `t-${Date.now()}`, name: newTax.name, rate: Number(newTax.rate) }); setNewTax({}); };
  const handleAddTable = async () => { if (!newTable.number) return; if (tables.some(t => t.number === newTable.number)) { alert("Table number already exists"); return; } await upsert("tables", { id: `T${newTable.number}`, number: newTable.number, status: 'Available' }); setNewTable({ status: 'Available' }); };
  const removeItem = async (id: string) => { if (confirm("Delete this item?")) await remove("menu", id); };
  
  const exportToExcel = () => {
    const headers = ["Item Name", "Price (INR)", "Group", "Food Type", "Tax Rate (%)"];
    const rows = menu.map(item => [
      item.name.includes(',') ? `"${item.name}"` : item.name,
      item.price,
      groups.find(g => g.id === item.groupId)?.name || 'N/A',
      item.foodType,
      taxes.find(t => t.id === item.taxId)?.rate || 0
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `restaurant_menu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const InputLabel = ({ label }: { label: string }) => (<label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">{label}</label>);

  return (
    <div className="space-y-6">
      <div className="bg-white theme-dark:bg-[#1a2135] rounded-3xl shadow-xl overflow-hidden border border-main">
        <div className="flex border-b border-main bg-slate-50/50 theme-dark:bg-[#1e293b]/50 overflow-x-auto no-scrollbar">
          {(['Items', 'Captains', 'Groups', 'Taxes', 'Tables'] as MasterTab[]).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setEditingId(null); setNewItem({ foodType: FoodType.VEG }); }} className={`px-8 py-5 font-black text-[11px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-indigo-600'}`}>{tab} Master</button>
          ))}
        </div>
        <div className="p-4 md:p-8">
          {activeTab === 'Items' && (
            <div className="space-y-8">
              <div id="item-form" className={`grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-3xl border transition-all duration-300 ${editingId ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="md:col-span-3">
                  <InputLabel label="Dish Photo" />
                  <div onClick={() => fileInputRef.current?.click()} className="relative w-full aspect-video bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 cursor-pointer flex flex-col items-center justify-center overflow-hidden transition-all group">
                    {newItem.imageUrl ? (<img src={newItem.imageUrl} className="w-full h-full object-cover" />) : (<div className="text-center p-4"><i className="fa-solid fa-camera text-2xl text-slate-400 mb-2 group-hover:text-indigo-600 transition-colors"></i><p className="text-[9px] font-black text-slate-500 uppercase">Tap to Upload</p></div>)}
                    {newItem.imageUrl && (<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="text-[10px] font-black uppercase text-white">Change Photo</span></div>)}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>
                <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="col-span-full lg:col-span-2"><InputLabel label="Item Name" /><input className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold outline-none" placeholder="e.g., Paneer Butter Masala" value={newItem.name || ''} onChange={e => setNewItem({ ...newItem, name: e.target.value })} /></div>
                  <div><InputLabel label="Price (₹)" /><input type="number" className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold outline-none" value={newItem.price || ''} onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })} /></div>
                  <div><InputLabel label="Category Group" /><select className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold appearance-none outline-none" value={newItem.groupId} onChange={e => setNewItem({ ...newItem, groupId: e.target.value })}><option value="">-- Select --</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                  <div><InputLabel label="Veg / Non-Veg" /><select className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold appearance-none outline-none" value={newItem.foodType} onChange={e => setNewItem({ ...newItem, foodType: e.target.value as FoodType })}><option value={FoodType.VEG}>Pure Veg</option><option value={FoodType.NON_VEG}>Non-Veg</option></select></div>
                  <div><InputLabel label="GST Rate" /><select className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold appearance-none outline-none" value={newItem.taxId} onChange={e => setNewItem({ ...newItem, taxId: e.target.value })}><option value="">-- Select --</option>{taxes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}</select></div>
                  <div className="col-span-full flex gap-3 pt-2"><button onClick={handleSaveItem} className="flex-1 h-[52px] bg-indigo-600 text-white font-black rounded-2xl uppercase text-[11px] tracking-widest shadow-lg"> {editingId ? 'Update Item' : 'Add to Menu'}</button>{editingId && (<button onClick={() => { setEditingId(null); setNewItem({ foodType: FoodType.VEG }); }} className="px-6 bg-white border border-slate-200 text-slate-400 font-black rounded-2xl uppercase text-[11px] tracking-widest">Cancel</button>)}</div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="relative group w-full max-w-md">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"></i>
                    <input type="text" placeholder="Search dishes to edit..." className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm" value={itemSearchQuery} onChange={(e) => setItemSearchQuery(e.target.value)} />
                  </div>
                  <button 
                    onClick={exportToExcel}
                    className="flex-shrink-0 flex items-center gap-3 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg transition-all active:scale-95"
                  >
                    <i className="fa-solid fa-file-excel text-sm"></i>
                    Export to Excel
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredMenu.length === 0 ? (<div className="col-span-full py-20 text-center opacity-20"><i className="fa-solid fa-utensils text-6xl mb-4 text-slate-400"></i><p className="font-black uppercase tracking-widest text-slate-600">No Items Found</p></div>) : (
                    filteredMenu.map(item => {
                      const displayImage = settings.showImages && item.imageUrl;
                      return (
                        <div key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col group relative shadow-sm hover:shadow-md transition-shadow">
                          <div className="aspect-square bg-slate-50 relative overflow-hidden">
                            {displayImage ? (<img src={item.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={item.name} />) : (<div className="w-full h-full flex items-center justify-center p-3 text-center"><span className="text-[10px] font-black uppercase text-slate-400 leading-tight">{item.name}</span></div>)}
                            <div className="absolute top-2 left-2"><span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border shadow-sm ${item.foodType === FoodType.VEG ? 'border-emerald-500/50 text-emerald-600 bg-emerald-50' : 'border-rose-500/50 text-rose-600 bg-rose-50'}`}>{item.foodType}</span></div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                              <button onClick={() => { setNewItem(item); setEditingId(item.id); document.getElementById('item-form')?.scrollIntoView({ behavior: 'smooth' }); }} className="w-10 h-10 rounded-xl bg-white text-slate-900 flex items-center justify-center hover:scale-110 shadow-lg"><i className="fa-solid fa-pen-to-square text-indigo-600"></i></button>
                              <button onClick={() => removeItem(item.id)} className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center hover:scale-110 shadow-lg"><i className="fa-solid fa-trash"></i></button>
                            </div>
                          </div>
                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <h4 className="text-slate-800 font-bold text-xs uppercase leading-tight line-clamp-2 mb-2">{item.name}</h4>
                            <div className="flex justify-between items-center"><span className="text-indigo-600 font-black text-sm">₹{item.price}</span><span className="text-[9px] font-black text-slate-400 uppercase">{groups.find(g => g.id === item.groupId)?.name || 'Misc'}</span></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'Captains' && (<div className="space-y-8"><div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm"><input placeholder="Captain Name" className="p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-500" value={newCaptain.name || ''} onChange={e => setNewCaptain({ ...newCaptain, name: e.target.value })} /><input placeholder="Phone" className="p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-500" value={newCaptain.phone || ''} onChange={e => setNewCaptain({ ...newCaptain, phone: e.target.value })} /><button onClick={handleAddCaptain} className="h-[52px] bg-indigo-600 text-white font-black rounded-2xl uppercase text-[11px] shadow-md hover:bg-indigo-500 transition-all">Save Captain</button></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{captains.map(captain => (<div key={captain.id} className="bg-white p-5 rounded-3xl border border-slate-200 flex justify-between items-center shadow-sm"><div><h4 className="text-slate-800 font-black text-sm uppercase">{captain.name}</h4><p className="text-slate-500 text-xs font-bold">{captain.phone}</p></div><button onClick={() => removeCaptain(captain.id)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-xl transition-all"><i className="fa-solid fa-trash-can"></i></button></div>))}</div></div>)}
          {activeTab === 'Groups' && (<div className="space-y-8"><div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm"><input placeholder="Group Name" className="p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-500" value={newGroup.name || ''} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} /><button onClick={handleAddGroup} className="h-[52px] bg-indigo-600 text-white font-black rounded-2xl uppercase text-[11px] shadow-md hover:bg-indigo-500 transition-all">Save Group</button></div><div className="flex flex-wrap gap-4">{groups.map(group => (<div key={group.id} className="bg-white px-6 py-4 rounded-3xl border border-slate-200 flex items-center gap-4 shadow-sm group"><span className="text-slate-800 font-black text-xs uppercase">{group.name}</span><button onClick={() => removeGroup(group.id)} className="text-rose-400 hover:text-rose-600 transition-colors"><i className="fa-solid fa-circle-xmark"></i></button></div>))}</div></div>)}
          {activeTab === 'Taxes' && (<div className="space-y-8"><div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm"><input placeholder="Tax Name" className="p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-500" value={newTax.name || ''} onChange={e => setNewTax({ ...newTax, name: e.target.value })} /><input type="number" placeholder="Rate %" className="p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-500" value={newTax.rate || ''} onChange={e => setNewTax({ ...newTax, rate: Number(e.target.value) })} /><button onClick={handleAddTax} className="h-[52px] bg-indigo-600 text-white font-black rounded-2xl uppercase text-[11px] shadow-md hover:bg-indigo-500 transition-all">Save Tax</button></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{taxes.map(tax => (<div key={tax.id} className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col items-center shadow-sm"><h4 className="text-indigo-600 font-black text-2xl mb-1">{tax.rate}%</h4><p className="text-slate-500 text-[10px] font-black uppercase mb-4">{tax.name}</p><button onClick={() => removeTax(tax.id)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-xl transition-all"><i className="fa-solid fa-trash-can text-xs"></i></button></div>))}</div></div>)}
          {activeTab === 'Tables' && (<div className="space-y-8"><div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm"><input placeholder="Table Number" className="p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-500" value={newTable.number || ''} onChange={e => setNewTable({ ...newTable, number: e.target.value })} /><button onClick={handleAddTable} className="h-[52px] bg-indigo-600 text-white font-black rounded-2xl uppercase text-[11px] shadow-md hover:bg-indigo-500 transition-all">Add Table</button></div><div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-5">{tables.sort((a,b)=>Number(a.number)-Number(b.number)).map(table => (<div key={table.id} className="relative group aspect-square"><div className="w-full h-full bg-white rounded-[2rem] border border-slate-200 flex flex-col items-center justify-center group-hover:border-indigo-500 transition-all shadow-sm"><span className="text-slate-800 font-black text-xl tracking-tighter">T-{table.number}</span></div><button onClick={() => removeTable(table.id)} className="absolute -top-1 -right-1 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"><i className="fa-solid fa-xmark text-[11px]"></i></button></div>))}</div></div>)}
        </div>
      </div>
    </div>
  );
};

export default Masters;
