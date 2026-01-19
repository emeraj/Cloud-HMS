
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
      <div id="print-section" className="text-black bg-white font-mono text-[12px] uppercase leading-tight print-view selection:bg-transparent">
        <div className="flex flex-col items-stretch">
          <div className="text-center mb-1">
            <h1 className="text-[16px] font-black tracking-tight mb-1">{settings.name}</h1>
            <p className="text-[14px] font-black border-y border-black border-dashed py-1.5 my-1.5">DAYBOOK REPORT</p>
            <p className="text-[10px] font-bold">DATE: {reportDate}</p>
          </div>

          <div className="border-t border-black border-dashed my-1"></div>

          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="border-b border-black border-dashed">
                <th className="py-1 font-black">BILL #</th>
                <th className="py-1 font-black">TIME</th>
                <th className="py-1 font-black">STAFF</th>
                <th className="py-1 text-right font-black">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {reportOrders.map((o) => (
                <tr key={o.id} className="border-b border-black border-dotted">
                  <td className="py-1">#{o.dailyBillNo || o.id.slice(-5)}</td>
                  <td className="py-1">{new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                  <td className="py-1 truncate max-w-[45px]">{o.cashierName || 'ADM'}</td>
                  <td className="py-1 text-right font-bold">{o.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-black border-dashed mt-3 pt-2 flex justify-between font-black text-[14px]">
            <span>TOTAL SALES:</span>
            <span>₹{total.toFixed(2)}</span>
          </div>

          <div className="text-center mt-6">
            <p className="text-[9px] opacity-40 italic">*** END OF REPORT ***</p>
          </div>
          <div className="text-center py-6">
            <br /><br /><br />
          </div>
          <div className="h-12"></div>
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

  const isEstimate = settings.invoiceFormat === 2;

  const upiUrl = settings.upiId 
    ? `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.name)}&am=${order.totalAmount.toFixed(2)}&cu=INR&tn=BILL_${order.dailyBillNo || order.id.slice(-4)}`
    : '';

  const qrCodeImg = upiUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`
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
    <div id="print-section" className="text-black bg-white font-mono text-[12px] uppercase leading-tight print-view selection:bg-transparent">
      {type === 'BILL' ? (
        <div className="flex flex-col items-stretch">
          {/* Restaurant Details Header */}
          <div className="text-center mb-1">
            <h1 className="text-[18px] font-black tracking-tight mb-1">{settings.name}</h1>
            <p className="text-[10px] whitespace-pre-line leading-normal px-2">{settings.address}</p>
            <p className="text-[10px] font-bold mt-1">CONTACT: {settings.phone}</p>
            {settings.fssai && <p className="text-[10px] font-bold mt-1">FSSAI: {settings.fssai}</p>}
            {!isEstimate && settings.gstin && <p className="text-[10px] font-bold">GSTIN: {settings.gstin}</p>}
          </div>

          {/* Simple Clean Header */}
          <div className="border-t border-black border-dashed mt-2 mb-1"></div>
          <div className="text-center py-1">
            <span className="text-[14px] font-black inline-block">
              {isEstimate ? 'E S T I M A T E' : 'T A X  I N V O I C E'}
            </span>
          </div>
          <div className="border-b border-black border-dashed mb-2 pb-1"></div>

          {/* Bill Info */}
          <div className="space-y-1 mb-2 px-0.5 text-[11px]">
            <div className="flex justify-between">
              <span className="font-bold">{isEstimate ? 'EST' : 'BILL'} NO: {isEstimate ? 'EST-' : 'INV-'}{order.dailyBillNo || order.id.slice(-5)}</span>
              <span>DATE: {formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span>CUST: {order.customerName || 'WALK-IN'}</span>
              <span>TIME: {formattedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-black">TABLE: {table?.number || 'N/A'}</span>
              <span>CAPT: {captain?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>CASHIER: {order.cashierName || 'ADMIN'}</span>
              <span>MODE: {order.paymentMode || 'CASH'}</span>
            </div>
          </div>

          <div className="border-t border-black border-dashed mb-1"></div>

          {/* Items Table */}
          <table className="w-full text-left mb-2">
            <thead>
              <tr className="border-b border-black border-dashed">
                <th className="py-1.5 font-black text-left w-[45%]">ITEM</th>
                <th className="py-1.5 text-center font-black w-[15%]">QTY</th>
                <th className="py-1.5 text-right font-black w-[20%]">RATE</th>
                <th className="py-1.5 text-right font-black w-[20%]">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-black border-dotted last:border-0">
                  <td className="py-1.5 align-top pr-1 leading-[1.2] text-[11px] font-bold">{idx + 1}. {item.name}</td>
                  <td className="py-1.5 text-center align-top font-bold">{item.quantity}</td>
                  <td className="py-1.5 text-right align-top">{item.price.toFixed(2)}</td>
                  <td className="py-1.5 text-right align-top font-bold">{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-black border-dashed mb-1"></div>

          {/* Totals Section */}
          <div className="space-y-1 mb-1 px-1 text-[11px]">
            <div className="flex justify-between">
              <span>SUBTOTAL:</span>
              <span>{order.subTotal.toFixed(2)}</span>
            </div>
            {!isEstimate && (
              <div className="flex justify-between">
                <span>TOTAL GST:</span>
                <span>{order.taxAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="border-y border-black border-dashed py-2 mb-3 flex justify-between items-center px-1">
            <span className="text-[14px] font-black">GRAND TOTAL:</span>
            <span className="text-[22px] font-black">₹{order.totalAmount.toFixed(2)}</span>
          </div>

          {/* Optional GST Summary */}
          {!isEstimate && settings.printGstSummary && Object.keys(gstBreakdown).length > 0 && (
            <div className="mb-3">
              <div className="text-center font-black text-[10px] mb-1">GST TAX SUMMARY</div>
              <table className="w-full text-[9px] border-collapse border-y border-black border-dashed">
                <thead>
                  <tr className="border-b border-black border-dashed">
                    <th className="text-left py-1">RATE</th>
                    <th className="text-right py-1">TAXABLE</th>
                    <th className="text-right py-1">CGST</th>
                    <th className="text-right py-1">SGST</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(gstBreakdown).map(([rate, vals]: [string, any]) => (
                    <tr key={rate}>
                      <td className="py-1">{Number(rate).toFixed(1)}%</td>
                      <td className="text-right py-1">{vals.taxable.toFixed(2)}</td>
                      <td className="text-right py-1">{vals.cgst.toFixed(2)}</td>
                      <td className="text-right py-1">{vals.sgst.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* UPI QR Code */}
          {settings.printQrCode && qrCodeImg && (
            <div className="text-center mb-4 mt-2">
              <p className="text-[10px] font-black mb-1.5 tracking-widest uppercase">SCAN TO PAY (UPI)</p>
              <img 
                src={qrCodeImg} 
                alt="Payment QR" 
                className="mx-auto w-32 h-32 mb-1 border border-black p-1" 
                loading="eager"
                crossOrigin="anonymous"
              />
              <p className="text-[10px] font-black">{settings.upiId}</p>
            </div>
          )}

          {/* Footer Info */}
          <div className="text-center space-y-1 mt-3">
            <p className="font-black text-[12px]">{settings.thankYouMessage}</p>
          </div>
          
          <div className="text-center py-8">
            <br /><br /><br />
          </div>
          <div className="h-12"></div>
        </div>
      ) : (
        /* KOT Template - Refined for clarity and thermal printing */
        <div className="text-center flex flex-col items-stretch">
          <div className="border-b-2 border-black border-dashed pb-2 mb-2">
            <h1 className="text-[12px] font-black tracking-[0.2em] mb-1">KITCHEN ORDER TICKET</h1>
            <div className="flex justify-between items-center px-1">
               <h2 className="text-[20px] font-black">KOT #{order.kotCount}</h2>
               <div className="bg-black text-white px-2 py-1 text-[18px] font-black">TBL: {table?.number || 'N/A'}</div>
            </div>
          </div>
          
          <div className="flex justify-between font-bold text-[10px] mb-2 px-1">
            <span>TIME: {formattedTime}</span>
            <span>CAPT: {captain?.name || 'N/A'}</span>
          </div>

          <table className="w-full text-left">
             <thead>
                <tr className="border-y-2 border-black border-dashed">
                  <th className="py-2 text-[12px] font-black">DISH NAME</th>
                  <th className="py-2 text-center text-[12px] font-black">QTY</th>
                </tr>
             </thead>
             <tbody>
               {order.items.map((item, idx) => (
                 <tr key={idx} className="border-b border-black border-dotted">
                    <td className="py-3 font-black text-[15px] leading-tight pr-2 uppercase">{item.name}</td>
                    <td className="py-3 text-center font-black text-[28px] border-l border-black border-dotted">{item.quantity}</td>
                 </tr>
               ))}
             </tbody>
          </table>
          
          <div className="mt-4 border-t border-black border-dashed pt-2">
            <p className="text-[11px] font-black italic">--- NEW ITEMS ONLY ---</p>
          </div>
          
          <div className="text-center py-8">
            <br /><br /><br />
          </div>
          <div className="h-12"></div>
        </div>
      )}
    </div>
  );
};

export default PrintSection;
