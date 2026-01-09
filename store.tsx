
import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs,
  query,
  limit
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
  getAuth, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { Table, MenuItem, Group, Tax, Waiter, Order, BusinessSettings, FoodType } from './types';

// Firebase configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyC6FGS4MYHqYBGa_LGq9yfNrbzp-gKrhn8",
  authDomain: "cloud-hms-c9424.firebaseapp.com",
  projectId: "cloud-hms-c9424",
  storageBucket: "cloud-hms-c9424.firebasestorage.app",
  messagingSenderId: "760530870938",
  appId: "1:760530870938:web:3f981d2556f5167a357523"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * Firestore does not allow 'undefined' values in documents.
 * This helper recursively traverses an object and removes any keys that have undefined values.
 */
const sanitizeData = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeData(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeData(v)])
    );
  }
  return obj;
};

interface AppState {
  user: User | null;
  logout: () => Promise<void>;
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
  isLoading: boolean;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tables, setTables] = useState<Table[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({
    name: 'Zesta Garden Restaurant',
    address: '123 Food Street, MG Road, Pune',
    phone: '+91 9876543210',
    gstin: '27AAAZS0000A1Z5',
    upiId: 'merchant@upi',
    thankYouMessage: 'Visit Us Again!',
    printQrCode: true,
    printGstSummary: true
  });

  const [activeTable, setActiveTable] = useState<string | null>(null);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  // Initial Data Load from Firestore (only when user is authenticated)
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load Settings
        const settingsDoc = await getDoc(doc(db, "config", "business_settings"));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as BusinessSettings);
        }

        // Load Collections
        const fetchCol = async (name: string) => {
          const snap = await getDocs(collection(db, name));
          return snap.docs.map(d => d.data());
        };

        const tData = await fetchCol("tables");
        const mData = await fetchCol("menu");
        const gData = await fetchCol("groups");
        const txData = await fetchCol("taxes");
        const wData = await fetchCol("waiters");
        const oData = await fetchCol("orders");

        if (tData.length) setTables(tData as Table[]);
        else setTables(Array.from({ length: 12 }, (_, i) => ({ id: `T${i + 1}`, number: `${i + 1}`, status: 'Available' })));
        
        if (mData.length) setMenu(mData as MenuItem[]);
        if (gData.length) setGroups(gData as Group[]);
        if (txData.length) setTaxes(txData as Tax[]);
        if (wData.length) setWaiters(wData as Waiter[]);
        if (oData.length) setOrders(oData as Order[]);

      } catch (error) {
        console.error("Firestore loading error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  // Sync Data to Firestore on changes
  useEffect(() => {
    if (!isLoading && user) {
      setDoc(doc(db, "config", "business_settings"), sanitizeData(settings));
    }
  }, [settings, isLoading, user]);

  const syncCollection = async (colName: string, data: any[]) => {
    if (isLoading || !user) return;
    for (const item of data) {
      await setDoc(doc(db, colName, item.id), sanitizeData(item));
    }
  };

  useEffect(() => { syncCollection("tables", tables); }, [tables, isLoading, user]);
  useEffect(() => { syncCollection("menu", menu); }, [menu, isLoading, user]);
  useEffect(() => { syncCollection("groups", groups); }, [groups, isLoading, user]);
  useEffect(() => { syncCollection("taxes", taxes); }, [taxes, isLoading, user]);
  useEffect(() => { syncCollection("waiters", waiters); }, [waiters, isLoading, user]);
  useEffect(() => { syncCollection("orders", orders); }, [orders, isLoading, user]);

  return (
    <AppContext.Provider value={{
      user, logout,
      tables, setTables, menu, setMenu, groups, setGroups,
      taxes, setTaxes, waiters, setWaiters, orders, setOrders,
      settings, setSettings, activeTable, setActiveTable, isLoading
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
