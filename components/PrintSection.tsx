
import React from 'react';
import { useApp } from '../store';
import { Order } from '../types';

interface PrintSectionProps {
  order: Order | null;
  reportOrders?: Order[];
  reportDate?: string;
  type: 'BILL' | 'KOT' | 'DAYBOOK';
}

const PrintSection: React.FC<PrintSectionProps> = ({ order, type, reportOrders, reportDate }) => {
  const { settings, tables, captains } = useApp();
  
  if (type === 'DAYBOOK') {
    if (!reportOrders) return null;
    const total = reportOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    return (
      <div id="print-section" className="text-black bg-white font-mono text-[10px] uppercase leading-tight print-view selection:bg-transparent">
        <div className="flex flex-col items-stretch">
          <div className="text-center mb-1">
            <h1 className="text-[13px] font-black tracking-tight mb-0.5">{settings.name}</h1>
            <p className="text-[11px] font-black border-y border-black border-dashed py-1 my-1">DAYBOOK REPORT</p>
            <p className="text-[9px] font-bold">DATE: {reportDate}</p>
          </div>

          <div className="border-t border-black border-dashed my-1"></div>

          <table className="w-full text-left text-[9px]">
            <thead>
              <tr className="border-b border-black border-dashed">
                <th className="py-1 font-black">Bill #</th>
                <th className="py-1 font-black">Time</th>
                <th className="py-1 font-black">Cashier</th>
                <th className="py-1 text-right font-black">Amount</th>
              </tr>
            </thead>
            <tbody>
              {reportOrders.map((o) => (
                <tr key={o.id} className="border-b border-black border-dotted">
                  <td className="py-1">#{o.id.slice(-6).toUpperCase()}</td>
                  <td className="py-1">{new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                  <td className="py-1 truncate max-w-[40px]">{o.cashierName || 'Adm'}</td>
                  <td className="py-1 text-right font-bold">{o.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-black border-dashed mt-2 pt-2 flex justify-between font-black text-[12px]">
            <span>TOTAL SALES:</span>
            <span>₹{total.toFixed(2)}</span>
          </div>

          <div className="text-center mt-6">
            <p className="text-[8px] opacity-40 italic">*** End of Report ***</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const table = tables.find(t => t.id === order.tableId);
  const captain = captains.find(w => w.id === order.captainId);
  const formattedDate = new Date(order.timestamp).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const formattedTime = new Date(order.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });

  const upiUrl = settings.upiId 
    ? `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.name)}&am=${order.totalAmount.toFixed(2)}&cu=INR&tn=BILL_${order.id.slice(-4)}`
    : '';

  const qrCodeImg = upiUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`
    : '';

  const gstBreakdown = order.items.reduce((acc: any, item) => {
    const rate = item.taxRate;
    const taxable = (item.price * item.quantity);
    const taxVal = (taxable * rate) / 100;
    
    if (!acc[rate]) {
      acc[rate] = { taxable: 0, cgst: 0, sgst: 0 };
    }
    
    acc[rate].taxable += taxable;
    acc[rate].cgst += (taxVal / 2);
    acc[rate].sgst += (taxVal / 2);
    return acc;
  }, {});

  return (
    <div id="print-section" className="text-black bg-white font-mono text-[10px] uppercase leading-tight print-view selection:bg-transparent">
      {type === 'BILL' ? (
        <div className="flex flex-col items-stretch">
          <div className="text-center mb-1">
            <h1 className="text-[13px] font-black tracking-tight mb-0.5">{settings.name}</h1>
            <p className="text-[8px] whitespace-pre-line leading-none px-2">{settings.address}</p>
            {settings.fssai && <p className="text-[8px] font-bold mt-0.5">FSSAI: {settings.fssai}</p>}
            {settings.gstin && <p className="text-[8px] font-bold">GSTIN: {settings.gstin}</p>}
          </div>

          <div className="border-t border-black border-dashed my-1"></div>
          <div className="text-center font-black text-[11px] py-0.5">TAX INVOICE</div>
          <div className="border-t border-black border-dashed my-1"></div>

          <div className="space-y-0.5 mb-1.5 px-0.5">
            <div className="flex justify-between">
              <span>Bill No: INV-{order.id.slice(-6).toUpperCase()}</span>
              <span>Date: {formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Cust: {order.customerName || 'Walk-in'}</span>
              <span>Time: {formattedTime}</span>
            </div>
            <div className="flex justify-between">
              <span>Table: {table?.number || 'N/A'}</span>
              <span>Capt: {captain?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier: {order.cashierName || 'Admin'}</span>
              <span>Mode: {order.paymentMode || 'Cash'}</span>
            </div>
          </div>

          <div className="border-t border-black border-dashed mb-1"></div>

          <table className="w-full text-left mb-1.5">
            <thead>
              <tr className="border-b border-black border-dashed">
                <th className="py-1 font-black text-left w-[45%]">Item</th>
                <th className="py-1 text-center font-black w-[15%]">Qty</th>
                <th className="py-1 text-right font-black w-[20%]">Rate</th>
                <th className="py-1 text-right font-black w-[20%]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-black border-dotted last:border-0">
                  <td className="py-1 align-top pr-1 leading-[1.1]">{idx + 1}. {item.name}</td>
                  <td className="py-1 text-center align-top">{item.quantity}</td>
                  <td className="py-1 text-right align-top">{item.price.toFixed(2)}</td>
                  <td className="py-1 text-right align-top">{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-black border-dashed mb-1"></div>

          <div className="space-y-0.5 mb-2 px-1 text-[9px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{order.subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total GST:</span>
              <span>{order.taxAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-y border-black border-dashed py-2 mb-3 flex justify-between items-center px-1">
            <span className="text-[12px] font-black">GRAND TOTAL:</span>
            <span className="text-[14px] font-black">₹{order.totalAmount.toFixed(2)}</span>
          </div>

          {settings.printGstSummary && Object.keys(gstBreakdown).length > 0 && (
            <div className="mb-4">
              <div className="text-center font-black text-[8px] mb-1">GST Summary</div>
              <table className="w-full text-[8px] border-collapse border-y border-black border-dashed">
                <thead>
                  <tr className="border-b border-black border-dashed">
                    <th className="text-left py-0.5">Rate</th>
                    <th className="text-right py-0.5">Taxable</th>
                    <th className="text-right py-0.5">CGST</th>
                    <th className="text-right py-0.5">SGST</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(gstBreakdown).map(([rate, vals]: [string, any]) => (
                    <tr key={rate}>
                      <td className="py-0.5">{Number(rate).toFixed(2)}%</td>
                      <td className="text-right py-0.5">{vals.taxable.toFixed(2)}</td>
                      <td className="text-right py-0.5">{vals.cgst.toFixed(2)}</td>
                      <td className="text-right py-0.5">{vals.sgst.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {settings.printQrCode && qrCodeImg && order.paymentMode === 'UPI' && (
            <div className="text-center mb-4">
              <p className="text-[8px] font-black mb-2">Scan to Pay using UPI</p>
              <img src={qrCodeImg} alt="Payment QR" className="mx-auto w-28 h-28 mb-1" />
              <p className="text-[8px] font-bold">{settings.upiId}</p>
            </div>
          )}

          <div className="text-center space-y-1 mt-4">
            <p className="font-bold text-[9px]">{settings.thankYouMessage}</p>
            <p className="text-[8px]">Contact: {settings.phone}</p>
            <div className="mt-4 opacity-40 text-[6px] italic">*** End of Invoice ***</div>
          </div>
        </div>
      ) : (
        <div className="text-center flex flex-col items-stretch">
          <div className="border-b border-black border-dashed pb-2 mb-2">
            <h1 className="text-[12px] font-black">KITCHEN ORDER TICKET</h1>
            <h2 className="text-[16px] font-black mt-1">KOT #{order.kotCount + 1}</h2>
          </div>
          <div className="flex justify-between font-bold text-[10px] mb-2 px-1">
            <span>TABLE: {table?.number || 'N/A'}</span>
            <span>{formattedTime}</span>
          </div>
          <div className="text-left text-[8px] mb-2 px-1">
             <span>Capt: {captain?.name || 'N/A'}</span>
          </div>
          <table className="w-full text-left">
             <thead>
                <tr className="border-y border-black border-dashed">
                  <th className="py-1">Item Name</th>
                  <th className="py-1 text-center">Qty</th>
                </tr>
             </thead>
             <tbody>
               {order.items.map((item, idx) => (
                 <tr key={idx} className="border-b border-black border-dotted">
                    <td className="py-2 font-bold">{item.name}</td>
                    <td className="py-2 text-center font-black text-[14px]">{item.quantity}</td>
                 </tr>
               ))}
             </tbody>
          </table>
          <p className="text-[8px] mt-4 opacity-75">--- End of KOT ---</p>
        </div>
      )}
    </div>
  );
};

export default PrintSection;
