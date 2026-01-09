
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
    if (!newItem.name || !newItem.price) return;
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
    if (confirm("Are you sure?")) await remove("menu", id); 
  };
  
  const removeWaiter = async (id: string) => {
    if (confirm("Are you sure?")) await remove("waiters", id);
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

        <div className="p-8">
          {activeTab === 'Items' && (
            <div className="space-y-8">
              <div className={`grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-3xl border transition-all duration-300 ${editingId ? 'bg-indigo-900/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-[#0f172a] border-slate-800'}`}>
                <div className="md:col-span-3 flex flex-col items-center gap-2">
                  <InputLabel label="Food Image" />
                  <div onClick={() => fileInputRef.current?.click()} className="relative w-full aspect-square bg-[#1e293b] rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 cursor-pointer flex flex-col items-center justify-center overflow-hidden">
                    {newItem.imageUrl ? <img src={newItem.imageUrl} className="w-full h-full object-cover" /> : <div className="text-center p-4"><i className="fa-solid fa-cloud-arrow-up text-2xl text-slate-600 mb-2"></i><p className="text-[9px] font-bold text-slate-500 uppercase">Upload</p></div>}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>
                <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="col-span-full lg:col-span-2"><InputLabel label="Item Name" /><input className="w-full p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold" value={newItem.name || ''} onChange={e => setNewItem({ ...newItem, name: e.target.value })} /></div>
                  <div><InputLabel label="Price" /><input type="number" className="w-full p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold" value={newItem.price || ''} onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })} /></div>
                  <div><InputLabel label="Group" /><select className="w-full p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold" value={newItem.groupId} onChange={e => setNewItem({ ...newItem, groupId: e.target.value })}><option value="">-- Group --</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                  <div><InputLabel label="Type" /><select className="w-full p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold" value={newItem.foodType} onChange={e => setNewItem({ ...newItem, foodType: e.target.value as FoodType })}><option value={FoodType.VEG}>VEG</option><option value={FoodType.NON_VEG}>NON-VEG</option></select></div>
                  <div><InputLabel label="Tax" /><select className="w-full p-3.5 rounded-2xl bg-[#fdf9d1] text-slate-800 font-bold" value={newItem.taxId} onChange={e => setNewItem({ ...newItem, taxId: e.target.value })}><option value="">-- GST --</option>{taxes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}</select></div>
                  <div className="col-span-full flex gap-2"><button onClick={handleSaveItem} className="flex-1 h-[52px] bg-indigo-600 text-white font-black rounded-2xl uppercase text-[11px]">{editingId ? 'Update' : 'Save'}</button></div>
                </div>
              </div>
              <div className="overflow-x-auto rounded-3xl border border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-[#0f172a] text-[10px] font-black text-slate-500 uppercase"><tr><th className="p-5">Name</th><th className="p-5">Price</th><th className="p-5">Action</th></tr></thead>
                  <tbody>
                    {menu.map(item => (
                      <tr key={item.id} className="border-b border-slate-800"><td className="p-5 font-bold uppercase text-xs">{item.name}</td><td className="p-5 text-indigo-400 font-black">₹{item.price}</td><td className="p-5 text-center"><div className="flex gap-2"><button onClick={() => { setNewItem(item); setEditingId(item.id); }} className="p-2 text-amber-500"><i className="fa-solid fa-pencil"></i></button><button onClick={() => removeItem(item.id)} className="p-2 text-rose-500"><i className="fa-solid fa-trash-can"></i></button></div></td></tr>
                    ))}
                  </tbody>
                </table>
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
