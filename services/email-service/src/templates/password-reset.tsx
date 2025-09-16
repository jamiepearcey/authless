import React from 'react';

interface PasswordResetProps {
  name: string;
  email: string;
  callbackUrl: string;
  token: string;
}

/**
 * Password reset email template
 */
export function PasswordReset({ 
  name, 
  email,
  callbackUrl,
  token 
}: PasswordResetProps) {
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      maxWidth: '600px', 
      margin: '0 auto',
      backgroundColor: '#ffffff'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#dc2626',
        padding: '30px 20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔐</div>
        <h1 style={{ 
          color: '#ffffff',
          margin: '0',
          fontSize: '28px',
          fontWeight: 'bold'
        }}>
          Password Reset Request
        </h1>
        <p style={{
          color: '#fecaca',
          fontSize: '16px',
          margin: '10px 0 0 0'
        }}>
          Someone requested a password reset for your account
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
          Hi {name},
        </h2>

        <p style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#374151',
          margin: '0 0 25px 0'
        }}>
          We received a request to reset the password for your account associated with <strong>{email}</strong>. 
          If you made this request, click the button below to create a new password.
        </p>

        {/* Reset Button */}
        <div style={{ textAlign: 'center', margin: '35px 0' }}>
          <a 
            href={callbackUrl}
            style={{
              backgroundColor: '#dc2626',
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
            Reset My Password
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
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          padding: '15px',
          margin: '25px 0'
        }}>
          <p style={{
            margin: '0 0 10px 0',
            fontSize: '14px',
            color: '#991b1b',
            fontWeight: '600'
          }}>
            🚨 Important Security Information:
          </p>
          <ul style={{
            margin: '0',
            paddingLeft: '18px',
            fontSize: '14px',
            color: '#991b1b',
            lineHeight: '1.4'
          }}>
            <li>This link will expire in 1 hour for security reasons</li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>Your current password will remain active until you create a new one</li>
          </ul>
        </div>

        <p style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#374151',
          margin: '25px 0 0 0'
        }}>
          If you have any concerns about your account security, please contact our support team immediately.
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
          <a href="mailto:support@authless.com" style={{ color: '#dc2626' }}>
            support@authless.com
          </a>
        </p>
        
        <p style={{
          margin: '0',
          fontSize: '12px',
          color: '#9ca3af',
          textAlign: 'center'
        }}>
          This is an automated security message. Please do not reply to this email.
        </p>
      </div>
    </div>
  );
}