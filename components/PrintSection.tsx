
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

  return (
    <div id="print-section" className="text-black bg-white font-mono text-[11px] uppercase leading-tight">
      {type === 'BILL' ? (
        <>
          <div className="text-center border-b border-black border-dashed pb-3 mb-3">
            <h1 className="text-[15px] font-black tracking-tighter mb-1">{settings.name}</h1>
            <p className="text-[9px] px-4">{settings.address}</p>
            <p className="text-[9px] font-bold mt-1">PHONE: {settings.phone}</p>
            {settings.gstin && <p className="text-[9px]">GSTIN: {settings.gstin}</p>}
          </div>

          <div className="flex justify-between font-bold mb-1">
            <span>BILL: #{order.id.slice(-5).toUpperCase()}</span>
            <span>DATE: {formattedDate}</span>
          </div>
          <div className="flex justify-between font-bold border-b border-black border-dashed pb-2 mb-3">
            <span>TABLE: {table?.number}</span>
            <span>TIME: {formattedTime}</span>
          </div>
        </>
      ) : (
        <div className="text-center border-b border-black border-dashed pb-3 mb-3">
          <h1 className="text-[16px] font-black underline decoration-double">KITCHEN ORDER TICKET</h1>
          <h2 className="text-[18px] font-black mt-2">KOT #{order.kotCount + 1}</h2>
          <div className="flex justify-between mt-2 font-bold bg-black text-white px-2 py-1">
            <span>TABLE: {table?.number}</span>
            <span>{formattedTime}</span>
          </div>
          <p className="text-left mt-2 font-bold">WAITER: {waiter?.name || 'N/A'}</p>
        </div>
      )}

      <table className="w-full text-left mb-3">
        <thead>
          <tr className="border-b border-black border-dashed">
            <th className="py-1.5 font-black text-[10px]">ITEM NAME</th>
            <th className="py-1.5 text-center font-black text-[10px]">QTY</th>
            {type === 'BILL' && (
              <>
                <th className="py-1.5 text-right font-black text-[10px]">RATE</th>
                <th className="py-1.5 text-right font-black text-[10px]">AMOUNT</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => (
            <tr key={idx} className="border-b border-slate-50">
              <td className="py-2 align-top pr-1 text-[10px] leading-[1.2]">{item.name}</td>
              <td className="py-2 text-center align-top font-bold text-[10px]">{item.quantity}</td>
              {type === 'BILL' && (
                <>
                  <td className="py-2 text-right align-top text-[10px]">{item.price.toFixed(2)}</td>
                  <td className="py-2 text-right align-top font-bold text-[10px]">{(item.price * item.quantity).toFixed(2)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {type === 'BILL' && (
        <div className="border-t border-black border-dashed pt-3 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span>GROSS TOTAL</span>
            <span>{order.subTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span>TAX (GST)</span>
            <span>{order.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[16px] font-black mt-3 pt-3 border-t-2 border-black border-double">
            <span>NET AMOUNT</span>
            <span>₹{order.totalAmount.toFixed(2)}</span>
          </div>
          
          <div className="mt-4 pt-4 border-t border-black border-dashed text-center space-y-1">
            <p className="font-black text-[11px] tracking-widest">{settings.thankYouMessage}</p>
            <p className="text-[8px] opacity-60 tracking-tighter">GST SUMMARY: CGST 2.5% | SGST 2.5%</p>
            <p className="text-[7px] opacity-40 mt-4">BILLING SOLUTION BY CLOUD-TAG POS</p>
          </div>
        </div>
      )}

      {type === 'KOT' && (
        <div className="mt-4 pt-4 border-t border-black border-dashed">
          <p className="text-center italic text-[9px]">--- END OF KOT ---</p>
        </div>
      )}
    </div>
  );
};

export default PrintSection;
