
export enum FoodType {
  VEG = 'Veg',
  NON_VEG = 'Non-Veg'
}

export interface Group {
  id: string;
  name: string;
}

export interface Tax {
  id: string;
  name: string;
  rate: number; // e.g., 5 for 5%
}

export interface Captain {
  id: string;
  name: string;
  phone?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  groupId: string;
  taxId: string;
  foodType: FoodType;
  imageUrl?: string;
  isFavorite?: boolean;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  taxRate: number;
  printedQty?: number; // Tracks how many have been KOT printed
}

export interface Table {
  id: string;
  number: string;
  status: 'Available' | 'Occupied' | 'Billing';
  currentOrderId?: string;
}

export interface Order {
  id: string;
  dailyBillNo: string; // e.g., 00001
  tableId: string;
  captainId: string;
  items: OrderItem[];
  status: 'Pending' | 'Billed' | 'Settled';
  timestamp: string;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  kotCount: number;
  customerName?: string;
  paymentMode?: 'Cash' | 'UPI' | 'Card';
  cashierName?: string;
}

export interface BusinessSettings {
  name: string;
  address: string;
  phone: string;
  gstin: string;
  upiId?: string; // For QR Payment
  fssai?: string;
  thankYouMessage: string;
  printQrCode: boolean;
  printGstSummary: boolean;
  showImages: boolean;
  invoiceFormat?: 1 | 2; // 1: Tax Invoice, 2: Estimate
  theme?: 'light' | 'dark';
  adminPassword?: string;
  operatorPassword?: string;
}
