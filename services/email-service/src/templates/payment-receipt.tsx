import React from 'react';

interface PaymentReceiptProps {
  userName: string;
  amount: string;
  currency: string;
  transactionId: string;
  items?: Array<{ name: string; price: string; quantity: number }>;
}

export const PaymentReceipt: React.FC<PaymentReceiptProps> = ({ 
  userName, 
  amount, 
  currency, 
  transactionId,
  items = []
}) => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ 
        backgroundColor: '#28a745', 
        padding: '20px', 
        textAlign: 'center',
        borderBottom: '3px solid #1e7e34'
      }}>
        <h1 style={{ color: 'white', margin: '0' }}>
          Payment Receipt
        </h1>
      </div>
      
      <div style={{ padding: '30px 20px' }}>
        <h2 style={{ color: '#333', marginBottom: '20px' }}>
          Thank you for your payment, {userName}! 🎉
        </h2>
        
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#333', marginTop: '0', marginBottom: '15px' }}>
            Transaction Details
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontWeight: 'bold' }}>Transaction ID:</span>
            <span style={{ fontFamily: 'monospace' }}>{transactionId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontWeight: 'bold' }}>Amount:</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
              {currency} {amount}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>Date:</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>
        
        {items.length > 0 && (
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px',
            marginBottom: '30px'
          }}>
            <h3 style={{ color: '#333', marginTop: '0', marginBottom: '15px' }}>
              Items Purchased
            </h3>
            {items.map((item, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '10px',
                paddingBottom: '10px',
                borderBottom: index < items.length - 1 ? '1px solid #dee2e6' : 'none'
              }}>
                <span>{item.name} (x{item.quantity})</span>
                <span>{currency} {item.price}</span>
              </div>
            ))}
          </div>
        )}
        
        <div style={{ 
          backgroundColor: '#e7f3ff', 
          padding: '20px', 
          borderRadius: '8px',
          marginTop: '30px'
        }}>
          <h3 style={{ color: '#0056b3', marginTop: '0' }}>What's Next?</h3>
          <p style={{ color: '#0056b3', margin: '0' }}>
            You should receive access to your purchased items shortly. 
            If you have any questions about your order, please contact our support team.
          </p>
        </div>
        
        <p style={{ fontSize: '14px', color: '#888', marginTop: '30px', textAlign: 'center' }}>
          This receipt serves as proof of payment. Please keep it for your records.
        </p>
      </div>
      
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        textAlign: 'center',
        borderTop: '1px solid #dee2e6'
      }}>
        <p style={{ margin: '0', color: '#888', fontSize: '12px' }}>
          © {new Date().getFullYear()} Our Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
};
