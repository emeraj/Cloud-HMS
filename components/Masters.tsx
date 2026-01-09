
import React, { useState, useRef } from 'react';
import { useApp } from '../store';
import { FoodType, MenuItem, Waiter, Group, Tax, Table } from '../types';

type MasterTab = 'Items' | 'Waiters' | 'Groups' | 'Taxes' | 'Tables';

const Masters: React.FC = () => {
  const { 
    menu, setMenu, 
    groups, setGroups, 
    waiters, setWaiters, 
    taxes, setTaxes,
    tables, setTables
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<MasterTab>('Items');
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({ foodType: FoodType.VEG });
  const [newWaiter, setNewWaiter] = useState<Partial<Waiter>>({});
  const [newGroup, setNewGroup] = useState<Partial<Group>>({});
  const [newTax, setNewTax] = useState<Partial<Tax>>({});
  const [newTable, setNewTable] = useState<Partial<Table>>({ status: 'Available' });

  // Image Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for LocalStorage safety
        alert("Image too large! Please select an image under 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem({ ...newItem, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedImage = () => {
    setNewItem({ ...newItem, imageUrl: undefined });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save Item Handler
  const handleSaveItem = () => {
    if (!newItem.name || !newItem.price) return;
    
    if (editingId) {
      setMenu(prev => prev.map(item => 
        item.id === editingId 
          ? { 
              ...item, 
              name: newItem.name || '', 
              price: Number(newItem.price),
              groupId: newItem.groupId || (groups[0]?.id || ''),
              taxId: newItem.taxId || (taxes[0]?.id || ''),
              foodType: newItem.foodType || FoodType.VEG,
              imageUrl: newItem.imageUrl
            } 
          : item
      ));
      setEditingId(null);
    } else {
      const item: MenuItem = {
        id: `item-${Date.now()}`,
        name: newItem.name || '',
        price: Number(newItem.price),
        groupId: newItem.groupId || (groups[0]?.id || ''),
        taxId: newItem.taxId || (taxes[0]?.id || ''),
        foodType: newItem.foodType || FoodType.VEG,
        imageUrl: newItem.imageUrl
      };
      setMenu([...menu, item]);
    }
    setNewItem({ foodType: FoodType.VEG });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEditItem = (item: MenuItem) => {
    setNewItem(item);
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewItem({ foodType: FoodType.VEG });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddWaiter = () => {
    if (!newWaiter.name) return;
    const waiter: Waiter = { id: `w-${Date.now()}`, name: newWaiter.name, phone: newWaiter.phone };
    setWaiters([...waiters, waiter]);
    setNewWaiter({});
  };

  const handleAddGroup = () => {
    if (!newGroup.name) return;
    const group: Group = { id: `g-${Date.now()}`, name: newGroup.name };
    setGroups([...groups, group]);
    setNewGroup({});
  };

  const handleAddTax = () => {
    if (!newTax.name || newTax.rate === undefined) return;
    const tax: Tax = { id: `t-${Date.now()}`, name: newTax.name, rate: Number(newTax.rate) };
    setTaxes([...taxes, tax]);
    setNewTax({});
  };

  const handleAddTable = () => {
    if (!newTable.number) return;
    const table: Table = { id: `T${newTable.number}`, number: newTable.number, status: 'Available' };
    if (tables.some(t => t.number === table.number)) { alert("Table number already exists"); return; }
    setTables([...tables, table].sort((a, b) => Number(a.number) - Number(b.number)));
    setNewTable({ status: 'Available' });
  };

  const removeItem = (id: string) => { 
    if (confirm("Are you sure you want to delete this item?")) { 
      setMenu(menu.filter(m => m.id !== id)); 
      if (editingId === id) cancelEdit(); 
    } 
  };
  
  const removeWaiter = (id: string) => {
    if (confirm("Are you sure you want to delete this waiter?")) {
      setWaiters(waiters.filter(w => w.id !== id));
    }
  };

  const removeGroup = (id: string) => {
    if (confirm("Are you sure you want to delete this group? Items associated with this group will remain, but the category will be removed.")) {
      setGroups(groups.filter(g => g.id !== id));
    }
  };

  const removeTax = (id: string) => {
    if (confirm("Are you sure you want to delete this tax setting?")) {
      setTaxes(taxes.filter(t => t.id !== id));
    }
  };

  const removeTable = (id: string) => {
    const table = tables.find(t => t.id === id);
    if (confirm(`Are you sure you want to delete Table ${table?.number}?`)) {
      setTables(tables.filter(t => t.id !== id));
    }
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
              onClick={() => {
                setActiveTab(tab);
                setEditingId(null);
                setNewItem({ foodType: FoodType.VEG });
              }}
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
                
                {/* Image Upload Area */}
                <div className="md:col-span-3 flex flex-col items-center gap-2">
                  <InputLabel label="Food Image" />
                  <div 
                    onClick={triggerFileInput}
                    className="relative w-full aspect-square bg-[#1e293b] rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden group"
                  >
                    {newItem.imageUrl ? (
                      <>
                        <img src={newItem.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <span className="text-white text-[10px] font-black uppercase">Change Image</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeSelectedImage(); }}
                          className="absolute top-2 right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <i className="fa-solid fa-cloud-arrow-up text-2xl text-slate-600 mb-2"></i>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Click to upload photo</p>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageChange} 
                  />
                </div>

                <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="col-span-full lg:col-span-2">
                    <InputLabel label="Item Name" />
                    <input 
                      placeholder="Paneer Tikka Masala" 
                      className="w-full p-3.5 border-2 border-transparent rounded-2xl outline-none bg-[#fdf9d1] text-slate-800 font-bold focus:border-indigo-500 transition-all text-sm" 
                      value={newItem.name || ''}
                      onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <InputLabel label="Price (₹)" />
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      className="w-full p-3.5 border-2 border-transparent rounded-2xl outline-none bg-[#fdf9d1] text-slate-800 font-bold focus:border-indigo-500 transition-all text-sm"
                      value={newItem.price || ''}
                      onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <InputLabel label="Group" />
                    <select 
                      className="w-full p-3.5 border-2 border-transparent rounded-2xl outline-none bg-[#fdf9d1] text-slate-800 font-bold focus:border-indigo-500 transition-all text-sm appearance-none"
                      value={newItem.groupId}
                      onChange={e => setNewItem({ ...newItem, groupId: e.target.value })}
                    >
                      <option value="">-- Group --</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <InputLabel label="Type" />
                    <select 
                      className="w-full p-3.5 border-2 border-transparent rounded-2xl outline-none bg-[#fdf9d1] text-slate-800 font-bold focus:border-indigo-500 transition-all text-sm appearance-none"
                      value={newItem.foodType}
                      onChange={e => setNewItem({ ...newItem, foodType: e.target.value as FoodType })}
                    >
                      <option value={FoodType.VEG}>VEG</option>
                      <option value={FoodType.NON_VEG}>NON-VEG</option>
                    </select>
                  </div>
                  <div>
                    <InputLabel label="GST Tax" />
                    <select 
                      className="w-full p-3.5 border-2 border-transparent rounded-2xl outline-none bg-[#fdf9d1] text-slate-800 font-bold focus:border-indigo-500 transition-all text-sm appearance-none"
                      value={newItem.taxId}
                      onChange={e => setNewItem({ ...newItem, taxId: e.target.value })}
                    >
                      <option value="">-- GST --</option>
                      {taxes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                    </select>
                  </div>
                  <div className="col-span-full flex items-end gap-2 mt-2">
                    <button onClick={handleSaveItem} className={`flex-1 h-[52px] text-white font-black rounded-2xl shadow-xl transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 ${editingId ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30'}`}>
                      <i className={`fa-solid ${editingId ? 'fa-floppy-disk' : 'fa-circle-plus'} text-sm`}></i> 
                      {editingId ? 'Update' : 'Save'} Item
                    </button>
                    {editingId && (
                      <button onClick={cancelEdit} className="w-12 h-[52px] bg-slate-700 text-white rounded-2xl hover:bg-slate-600 flex items-center justify-center transition-all">
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-slate-800 shadow-xl">
                <table className="w-full text-left">
                  <thead className="bg-[#0f172a] border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="p-5">Photo</th>
                      <th className="p-5">Item Name</th>
                      <th className="p-5">Price</th>
                      <th className="p-5">Category</th>
                      <th className="p-5">Group</th>
                      <th className="p-5">Tax (GST)</th>
                      <th className="p-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#1e293b]/30">
                    {menu.map(item => (
                      <tr key={item.id} className={`border-b border-slate-800 hover:bg-slate-700/50 transition-colors ${editingId === item.id ? 'bg-indigo-600/10' : ''}`}>
                        <td className="p-5">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                            ) : (
                              <i className="fa-solid fa-utensils text-slate-700 text-xs"></i>
                            )}
                          </div>
                        </td>
                        <td className="p-5 font-bold text-slate-200 uppercase text-xs">{item.name}</td>
                        <td className="p-5 text-indigo-400 font-black">₹{item.price}</td>
                        <td className="p-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${item.foodType === FoodType.VEG ? 'border-emerald-500/30 text-emerald-400 bg-emerald-400/10' : 'border-rose-500/30 text-rose-400 bg-rose-400/10'}`}>
                            {item.foodType}
                          </span>
                        </td>
                        <td className="p-5 text-slate-400 text-xs font-bold uppercase">{groups.find(g => g.id === item.groupId)?.name}</td>
                        <td className="p-5 text-slate-400 text-xs font-bold uppercase">
                          {taxes.find(t => t.id === item.taxId)?.name || '0%'}
                        </td>
                        <td className="p-5 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => startEditItem(item)} className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all border border-amber-500/20">
                              <i className="fa-solid fa-pencil text-sm"></i>
                            </button>
                            <button onClick={() => removeItem(item.id)} className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20">
                              <i className="fa-solid fa-trash-can text-sm"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Waiters' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0f172a] p-6 rounded-3xl border border-slate-800">
                <div>
                  <InputLabel label="Waiter Name" />
                  <input placeholder="Enter Name" className="w-full p-3.5 border-2 border-transparent rounded-2xl outline-none bg-[#fdf9d1] text-slate-800 font-bold focus:border-indigo-500 transition-all text-sm" value={newWaiter.name || ''} onChange={e => setNewWaiter({ ...newWaiter, name: e.target.value })} />
                </div>
                <div>
                  <InputLabel label="Phone Number" />
                  <input placeholder="Enter Phone" className="w-full p-3.5 border-2 border-transparent rounded-2xl outline-none bg-[#fdf9d1] text-slate-800 font-bold focus:border-indigo-500 transition-all text-sm" value={newWaiter.phone || ''} onChange={e => setNewWaiter({ ...newWaiter, phone: e.target.value })} />
                </div>
                <div className="flex items-end"><button onClick={handleAddWaiter} className="w-full h-[52px] bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 shadow-xl transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-2"><i className="fa-solid fa-user-plus text-sm"></i> Save Waiter</button></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {waiters.map(waiter => (
                  <div key={waiter.id} className="bg-[#0f172a] p-5 rounded-3xl border border-slate-800 flex justify-between items-center group hover:border-indigo-500 transition-all">
                    <div><h4 className="text-white font-black text-sm uppercase">{waiter.name}</h4><p className="text-slate-500 text-xs font-bold">{waiter.phone || 'No Phone'}</p></div>
                    <button onClick={() => removeWaiter(waiter.id)} className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><i className="fa-solid fa-trash-can"></i></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Groups' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0f172a] p-6 rounded-3xl border border-slate-800">
                <div>
                  <InputLabel label="Group/Category Name" />
                  <input placeholder="E.g. Main Course" className="w-full p-3.5 border-2 border-transparent rounded-2xl outline-none bg-[#fdf9d1] text-slate-800 font-bold focus:border-indigo-500 transition-all text-sm" value={newGroup.name || ''} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} />
                </div>
                <div className="flex items-end"><button onClick={handleAddGroup} className="w-full h-[52px] bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 shadow-xl transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-2"><i className="fa-solid fa-folder-plus text-sm"></i> Save Group</button></div>
              </div>
              <div className="flex flex-wrap gap-4">
                {groups.map(group => (
                  <div key={group.id} className="bg-[#1e293b]/50 px-6 py-4 rounded-3xl border border-slate-800 flex items-center gap-4 group hover:border-indigo-500 transition-all shadow-lg">
                    <span className="text-white font-black text-xs uppercase tracking-widest">{group.name}</span>
                    <button onClick={() => removeGroup(group.id)} className="text-slate-500 hover:text-rose-500 transition-colors"><i className="fa-solid fa-circle-xmark"></i></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Taxes' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0f172a] p-6 rounded-3xl border border-slate-800">
                <div>
                  <InputLabel label="Tax Name" />
                  <input placeholder="E.g. GST 5%" className="w-full p-3.5 border-2 border-transparent rounded-2xl outline-none bg-[#fdf9d1] text-slate-800 font-bold focus:border-indigo-500 transition-all text-sm" value={newTax.name || ''} onChange={e => setNewTax({ ...newTax, name: e.target.value })} />
                </div>
                <div>
                  <InputLabel label="Rate (%)" />
                  <input type="number" placeholder="5" className="w-full p-3.5 border-2 border-transparent rounded-2xl outline-none bg-[#fdf9d1] text-slate-800 font-bold focus:border-indigo-500 transition-all text-sm" value={newTax.rate || ''} onChange={e => setNewTax({ ...newTax, rate: Number(e.target.value) })} />
                </div>
                <div className="flex items-end"><button onClick={handleAddTax} className="w-full h-[52px] bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 shadow-xl transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-2"><i className="fa-solid fa-percent text-sm"></i> Save Tax</button></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {taxes.map(tax => (
                  <div key={tax.id} className="bg-indigo-900/10 border border-indigo-500/20 p-6 rounded-3xl flex flex-col items-center group hover:bg-indigo-900/20 transition-all relative">
                    <h4 className="text-indigo-400 font-black text-2xl mb-1">{tax.rate}%</h4>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4">{tax.name}</p>
                    <button onClick={() => removeTax(tax.id)} className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all border border-rose-500/20"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Tables' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0f172a] p-6 rounded-3xl border border-slate-800">
                <div>
                  <InputLabel label="Table Number/ID" />
                  <input placeholder="E.g. 15" className="w-full p-3.5 border-2 border-transparent rounded-2xl outline-none bg-[#fdf9d1] text-slate-800 font-bold focus:border-indigo-500 transition-all text-sm" value={newTable.number || ''} onChange={e => setNewTable({ ...newTable, number: e.target.value })} />
                </div>
                <div className="flex items-end"><button onClick={handleAddTable} className="w-full h-[52px] bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 shadow-xl transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-2"><i className="fa-solid fa-chair text-sm"></i> Add Table</button></div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-5">
                {tables.map(table => (
                  <div key={table.id} className="relative group aspect-square">
                    <div className="w-full h-full bg-[#0f172a] rounded-[2rem] border border-slate-800 flex flex-col items-center justify-center group-hover:border-indigo-500 transition-all shadow-xl"><span className="text-white font-black text-xl tracking-tighter">T-{table.number}</span></div>
                    <button onClick={() => removeTable(table.id)} className="absolute -top-1 -right-1 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"><i className="fa-solid fa-xmark text-[11px]"></i></button>
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
