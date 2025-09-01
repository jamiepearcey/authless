import React from 'react';

interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
  companyName?: string;
  activationLink?: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ 
  userName, 
  userEmail, 
  companyName = 'Our Platform',
  activationLink 
}) => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        textAlign: 'center',
        borderBottom: '3px solid #007bff'
      }}>
        <h1 style={{ color: '#007bff', margin: '0' }}>
          Welcome to {companyName}!
        </h1>
      </div>
      
      <div style={{ padding: '30px 20px' }}>
        <h2 style={{ color: '#333', marginBottom: '20px' }}>
          Hello {userName}! 👋
        </h2>
        
        <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
          Thank you for joining {companyName}. We're excited to have you on board!
        </p>
        
        <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
          Your account has been created successfully with the email: <strong>{userEmail}</strong>
        </p>
        
        {activationLink && (
          <div style={{ 
            backgroundColor: '#e7f3ff', 
            padding: '20px', 
            borderRadius: '8px', 
            margin: '30px 0',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 15px 0', color: '#0056b3' }}>
              <strong>Next Step:</strong> Please activate your account
            </p>
            <a 
              href={activationLink}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                padding: '12px 24px',
                textDecoration: 'none',
                borderRadius: '6px',
                display: 'inline-block',
                fontWeight: 'bold'
              }}
            >
              Activate Account
            </a>
          </div>
        )}
        
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          marginTop: '30px'
        }}>
          <h3 style={{ color: '#333', marginTop: '0' }}>Getting Started</h3>
          <ul style={{ color: '#555', lineHeight: '1.6' }}>
            <li>Complete your profile</li>
            <li>Explore our features</li>
            <li>Check out our documentation</li>
            <li>Join our community</li>
          </ul>
        </div>
        
        <p style={{ fontSize: '14px', color: '#888', marginTop: '30px', textAlign: 'center' }}>
          If you have any questions, feel free to reach out to our support team.
        </p>
      </div>
      
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        textAlign: 'center',
        borderTop: '1px solid #dee2e6'
      }}>
        <p style={{ margin: '0', color: '#888', fontSize: '12px' }}>
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </p>
      </div>
    </div>
  );
};
