
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Table, MenuItem, Group, Tax, Waiter, Order, BusinessSettings, FoodType } from './types';

interface AppState {
  tables: Table[];
  menu: MenuItem[];
  groups: Group[];
  taxes: Tax[];
  waiters: Waiter[];
  orders: Order[];
  settings: BusinessSettings;
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  setTaxes: React.Dispatch<React.SetStateAction<Tax[]>>;
  setWaiters: React.Dispatch<React.SetStateAction<Waiter[]>>;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setSettings: React.Dispatch<React.SetStateAction<BusinessSettings>>;
  activeTable: string | null;
  setActiveTable: (id: string | null) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tables, setTables] = useState<Table[]>(() => {
    const saved = localStorage.getItem('zp_tables');
    return saved ? JSON.parse(saved) : Array.from({ length: 12 }, (_, i) => ({
      id: `T${i + 1}`,
      number: `${i + 1}`,
      status: 'Available'
    }));
  });

  const [menu, setMenu] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('zp_menu');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Paneer Butter Masala', price: 250, groupId: 'main', taxId: 'gst5', foodType: FoodType.VEG },
      { id: '2', name: 'Chicken Biryani', price: 320, groupId: 'main', taxId: 'gst5', foodType: FoodType.NON_VEG },
      { id: '3', name: 'Masala Dosa', price: 90, groupId: 'bfast', taxId: 'gst5', foodType: FoodType.VEG },
      { id: '4', name: 'Veg Manchurian', price: 180, groupId: 'starter', taxId: 'gst5', foodType: FoodType.VEG },
    ];
  });

  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem('zp_groups');
    return saved ? JSON.parse(saved) : [
      { id: 'bfast', name: 'Breakfast' },
      { id: 'starter', name: 'Starters' },
      { id: 'main', name: 'Main Course' },
      { id: 'dessert', name: 'Desserts' },
    ];
  });

  const [taxes, setTaxes] = useState<Tax[]>(() => {
    const saved = localStorage.getItem('zp_taxes');
    return saved ? JSON.parse(saved) : [
      { id: 'gst5', name: 'GST 5%', rate: 5 },
      { id: 'gst12', name: 'GST 12%', rate: 12 },
      { id: 'exempt', name: 'Exempt', rate: 0 },
    ];
  });

  const [waiters, setWaiters] = useState<Waiter[]>(() => {
    const saved = localStorage.getItem('zp_waiters');
    return saved ? JSON.parse(saved) : [
      { id: 'w1', name: 'Rahul' },
      { id: 'w2', name: 'Suresh' },
    ];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('zp_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<BusinessSettings>(() => {
    const saved = localStorage.getItem('zp_settings');
    return saved ? JSON.parse(saved) : {
      name: 'Zesta Garden Restaurant',
      address: '123 Food Street, MG Road, Pune',
      phone: '+91 9876543210',
      gstin: '27AAAZS0000A1Z5',
      thankYouMessage: 'Visit Us Again!'
    };
  });

  const [activeTable, setActiveTable] = useState<string | null>(null);

  useEffect(() => localStorage.setItem('zp_tables', JSON.stringify(tables)), [tables]);
  useEffect(() => localStorage.setItem('zp_menu', JSON.stringify(menu)), [menu]);
  useEffect(() => localStorage.setItem('zp_groups', JSON.stringify(groups)), [groups]);
  useEffect(() => localStorage.setItem('zp_taxes', JSON.stringify(taxes)), [taxes]);
  useEffect(() => localStorage.setItem('zp_waiters', JSON.stringify(waiters)), [waiters]);
  useEffect(() => localStorage.setItem('zp_orders', JSON.stringify(orders)), [orders]);
  useEffect(() => localStorage.setItem('zp_settings', JSON.stringify(settings)), [settings]);

  return (
    <AppContext.Provider value={{
      tables, setTables, menu, setMenu, groups, setGroups,
      taxes, setTaxes, waiters, setWaiters, orders, setOrders,
      settings, setSettings, activeTable, setActiveTable
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
