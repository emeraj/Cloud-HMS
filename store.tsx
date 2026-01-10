
import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc,
  onSnapshot,
  collection
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
  getAuth, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { Table, MenuItem, Group, Tax, Captain, Order, BusinessSettings } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyC6FGS4MYHqYBGa_LGq9yfNrbzp-gKrhn8",
  authDomain: "cloud-hms-c9424.firebaseapp.com",
  projectId: "cloud-hms-c9424",
  storageBucket: "cloud-hms-c9424.firebasestorage.app",
  messagingSenderId: "760530870938",
  appId: "1:760530870938:web:3f981d2556f5167a357523"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export const auth = getAuth(app);

const sanitizeData = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(v => sanitizeData(v));
  if (obj !== null && typeof obj === 'object') {
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
  captains: Captain[];
  orders: Order[];
  settings: BusinessSettings;
  setSettings: React.Dispatch<React.SetStateAction<BusinessSettings>>;
  activeTable: string | null;
  setActiveTable: (id: string | null) => void;
  isLoading: boolean;
  isSyncing: boolean;
  upsert: (col: string, item: any) => Promise<void>;
  remove: (col: string, id: string) => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({
    name: 'Zesta Garden Restaurant',
    address: '123 Food Street, Pune',
    phone: '+91 9876543210',
    gstin: '',
    thankYouMessage: 'Visit Us Again!',
    printQrCode: true,
    printGstSummary: true
  });

  const [activeTable, setActiveTable] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribes: (() => void)[] = [];

    const createListener = (colName: string, setter: (data: any[]) => void) => {
      return onSnapshot(collection(db, colName), 
        (snapshot) => {
          const data = snapshot.docs.map(doc => doc.data());
          setter(data as any[]);
        },
        (error) => console.error(`Error in ${colName} listener:`, error)
      );
    };

    unsubscribes.push(createListener("tables", setTables));
    unsubscribes.push(createListener("menu", setMenu));
    unsubscribes.push(createListener("groups", setGroups));
    unsubscribes.push(createListener("taxes", setTaxes));
    unsubscribes.push(createListener("waiters", setCaptains)); // Use existing collection but new setter
    unsubscribes.push(createListener("orders", setOrders));

    const settingsUnsub = onSnapshot(doc(db, "config", "business_settings"), 
      (snapshot) => {
        if (snapshot.exists()) setSettings(snapshot.data() as BusinessSettings);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error in settings listener:", error);
        setIsLoading(false);
      }
    );
    unsubscribes.push(settingsUnsub);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  const upsert = async (col: string, item: any) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const docRef = col === "config" ? doc(db, col, "business_settings") : doc(db, col, item.id);
      await setDoc(docRef, sanitizeData(item));
    } finally {
      setIsSyncing(false);
    }
  };

  const remove = async (col: string, id: string) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await deleteDoc(doc(db, col, id));
    } finally {
      setIsSyncing(false);
    }
  };

  const logout = async () => await signOut(auth);

  return (
    <AppContext.Provider value={{
      user, logout, tables, menu, groups, taxes, captains, orders, settings, setSettings,
      activeTable, setActiveTable, isLoading, isSyncing, upsert, remove
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
