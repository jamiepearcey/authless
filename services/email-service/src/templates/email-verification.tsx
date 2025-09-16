import React from 'react';

interface EmailVerificationProps {
  name: string;
  email: string;
  callbackUrl: string;
  token: string;
}

/**
 * Email verification template for user registration
 */
export function EmailVerification({ 
  name, 
  email,
  callbackUrl,
  token 
}: EmailVerificationProps) {
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      maxWidth: '600px', 
      margin: '0 auto',
      backgroundColor: '#ffffff'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#4f46e5',
        padding: '30px 20px',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          color: '#ffffff',
          margin: '0',
          fontSize: '28px',
          fontWeight: 'bold'
        }}>
          Welcome to Authless!
        </h1>
        <p style={{
          color: '#e0e7ff',
          fontSize: '16px',
          margin: '10px 0 0 0'
        }}>
          Please verify your email address to get started
        </p>
      </div>

      {/* Main Content */}
      <div style={{ padding: '40px 30px' }}>
        <h2 style={{
          color: '#1f2937',
          fontSize: '24px',
          margin: '0 0 20px 0',
          fontWeight: '600'
        }}>
          Hi {name}! 👋
        </h2>

        <p style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#374151',
          margin: '0 0 25px 0'
        }}>
          Thanks for signing up! We're excited to have you on board. To complete your registration 
          and start using your account, please verify your email address by clicking the button below.
        </p>

        {/* Verification Button */}
        <div style={{ textAlign: 'center', margin: '35px 0' }}>
          <a 
            href={callbackUrl}
            style={{
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              padding: '15px 30px',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              display: 'inline-block',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            Verify Email Address
          </a>
        </div>

        <p style={{
          fontSize: '14px',
          lineHeight: '1.5',
          color: '#6b7280',
          margin: '25px 0'
        }}>
          If the button doesn't work, you can copy and paste this link into your browser:
        </p>

        <div style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '12px',
          wordBreak: 'break-all',
          fontSize: '13px',
          color: '#374151',
          margin: '15px 0 25px 0'
        }}>
          {callbackUrl}
        </div>

        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          padding: '15px',
          margin: '25px 0'
        }}>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#92400e'
          }}>
            <strong>⚠️ Security Notice:</strong> This verification link will expire in 24 hours. 
            If you didn't create an account, you can safely ignore this email.
          </p>
        </div>

        <p style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#374151',
          margin: '25px 0 0 0'
        }}>
          Once verified, you'll be able to access all features and start exploring what we have to offer.
        </p>
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: '25px 30px',
        borderTop: '1px solid #e5e7eb'
      }}>
        <p style={{
          margin: '0 0 10px 0',
          fontSize: '14px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          Need help? Contact our support team at{' '}
          <a href="mailto:support@authless.com" style={{ color: '#4f46e5' }}>
            support@authless.com
          </a>
        </p>
        
        <p style={{
          margin: '0',
          fontSize: '12px',
          color: '#9ca3af',
          textAlign: 'center'
        }}>
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
  );
}