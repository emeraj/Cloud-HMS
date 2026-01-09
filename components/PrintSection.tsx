
import React from 'react';
import { useApp } from '../store';
import { Order } from '../types';

interface PrintSectionProps {
  order: Order | null;
  type: 'BILL' | 'KOT';
}

const PrintSection: React.FC<PrintSectionProps> = ({ order, type }) => {
  const { settings, tables, waiters } = useApp();
  if (!order) return null;

  const table = tables.find(t => t.id === order.tableId);
  const waiter = waiters.find(w => w.id === order.waiterId);
  const formattedDate = new Date(order.timestamp).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const formattedTime = new Date(order.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const upiUrl = settings.upiId 
    ? `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.name)}&am=${order.totalAmount.toFixed(2)}&cu=INR&tn=BILL_${order.id.slice(-4)}`
    : '';

  const qrCodeImg = upiUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`
    : '';

  // Calculate GST summary (SGST/CGST breakdown)
  const gstBreakdown = order.items.reduce((acc: any, item) => {
    const rate = item.taxRate;
    if (rate <= 0) return acc;
    if (!acc[rate]) {
      acc[rate] = { taxable: 0, cgst: 0, sgst: 0 };
    }
    const taxable = item.price * item.quantity;
    const cgst = (taxable * (rate / 2)) / 100;
    const sgst = (taxable * (rate / 2)) / 100;
    acc[rate].taxable += taxable;
    acc[rate].cgst += cgst;
    acc[rate].sgst += sgst;
    return acc;
  }, {});

  return (
    <div id="print-section" className="text-black bg-white font-mono text-[10px] uppercase leading-tight selection:bg-transparent">
      {type === 'BILL' ? (
        <>
          <div className="text-center mb-2">
            <h1 className="text-[14px] font-black tracking-tighter mb-1">{settings.name}</h1>
            <p className="text-[8px] whitespace-pre-line leading-none">{settings.address}</p>
            {settings.phone && <p className="text-[8px] mt-1 font-bold">CONTACT: {settings.phone}</p>}
            {settings.gstin && <p className="text-[9px] mt-0.5 font-bold">GSTIN: {settings.gstin}</p>}
            {settings.fssai && <p className="text-[8px]">FSSAI: {settings.fssai}</p>}
          </div>

          <div className="text-center border-y border-black border-dashed py-1.5 my-2">
            <h2 className="text-[11px] font-black tracking-[2px]">TAX INVOICE</h2>
          </div>

          <div className="flex justify-between font-bold mb-1">
            <span>BILL No: INV-{order.id.slice(-6).toUpperCase()}</span>
            <span>Date: {formattedDate}</span>
          </div>
          <div className="flex justify-between font-bold mb-1">
            <span>Customer: Walk-in Customer</span>
            <span>Time: {formattedTime}</span>
          </div>
          <div className="flex justify-between font-bold border-b border-black border-dashed pb-1.5 mb-2">
            <span>Table: {table?.number}</span>
            <span>Waiter: {waiter?.name || 'N/A'}</span>
          </div>
        </>
      ) : (
        <div className="text-center border-b border-black border-dashed pb-3 mb-3">
          <h1 className="text-[16px] font-black underline">KITCHEN TICKET</h1>
          <h2 className="text-[18px] font-black mt-2">KOT #{order.kotCount + 1}</h2>
          <div className="flex justify-between mt-2 font-bold bg-black text-white px-2 py-1">
            <span>TABLE: {table?.number}</span>
            <span>{formattedTime}</span>
          </div>
        </div>
      )}

      <table className="w-full text-left mb-3">
        <thead>
          <tr className="border-b border-black border-dashed">
            <th className="py-1.5 font-black text-left w-1/2">Item</th>
            <th className="py-1.5 text-center font-black">Qty</th>
            {type === 'BILL' && (
              <>
                <th className="py-1.5 text-right font-black">Rate</th>
                <th className="py-1.5 text-right font-black">Amount</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => (
            <tr key={idx} className="border-b border-slate-50">
              <td className="py-2 align-top pr-1 leading-[1.1]">{idx + 1}. {item.name}</td>
              <td className="py-2 text-center align-top font-bold">{item.quantity}</td>
              {type === 'BILL' && (
                <>
                  <td className="py-2 text-right align-top">{item.price.toFixed(2)}</td>
                  <td className="py-2 text-right align-top font-bold">{(item.price * item.quantity).toFixed(2)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {type === 'BILL' && (
        <>
          <div className="border-t border-black border-dashed pt-2 space-y-1 mb-2">
            <div className="flex justify-between font-bold text-[9px]">
              <span>Subtotal:</span>
              <span>{order.subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span>Total GST:</span>
              <span>{order.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[14px] font-black mt-2 py-2 border-y border-black">
              <span>GRAND TOTAL:</span>
              <span>₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {settings.printGstSummary && Object.keys(gstBreakdown).length > 0 && (
            <div className="mb-4 mt-3">
              <div className="text-center font-black text-[9px] border-b border-black border-dashed pb-1 mb-1">GST Summary</div>
              <table className="w-full text-[8px] border-collapse">
                <thead>
                  <tr className="border-b border-black border-dashed">
                    <th className="text-left font-bold">Rate</th>
                    <th className="text-right font-bold">Taxable</th>
                    <th className="text-right font-bold">CGST</th>
                    <th className="text-right font-bold">SGST</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(gstBreakdown).map(([rate, vals]: [string, any]) => (
                    <tr key={rate}>
                      <td>{rate}.00%</td>
                      <td className="text-right">{vals.taxable.toFixed(2)}</td>
                      <td className="text-right">{vals.cgst.toFixed(2)}</td>
                      <td className="text-right">{vals.sgst.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {settings.printQrCode && qrCodeImg && (
            <div className="text-center mt-6 border-t border-black border-dashed pt-4">
              <p className="text-[9px] font-black mb-2 tracking-widest">Scan to Pay using UPI</p>
              <img src={qrCodeImg} alt="Payment QR" className="mx-auto w-32 h-32 mb-2" />
              <p className="text-[8px] font-bold opacity-75">{settings.upiId}</p>
            </div>
          )}

          <div className="text-center mt-8 space-y-1">
            <p className="font-black text-[11px] tracking-widest">{settings.thankYouMessage}</p>
            <p className="text-[8px] opacity-60">Contact: {settings.phone}</p>
            <p className="text-[7px] font-bold mt-4 opacity-40">BILLING POWERED BY CLOUD-TAG POS</p>
          </div>
        </>
      )}

      {type === 'KOT' && (
        <div className="mt-4 pt-4 border-t border-black border-dashed text-center">
          <p className="italic text-[10px] font-bold">WAITER: {waiter?.name || 'N/A'}</p>
          <p className="text-[9px] mt-4 opacity-75">--- End of Kitchen Receipt ---</p>
        </div>
      )}
    </div>
  );
};

export default PrintSection;
