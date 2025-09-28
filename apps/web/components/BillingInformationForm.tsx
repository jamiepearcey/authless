"use client";

import { useState } from 'react';
import { Button } from '@ui/base';
import { Building, MapPin, Search } from 'lucide-react';

export interface BillingInformation {
  companyName?: string;
  vatNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface BillingInformationFormProps {
  billingInfo: BillingInformation;
  onChange: (field: keyof BillingInformation, value: string) => void;
  showToggle?: boolean;
  isVisible?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
  enableLocationLookup?: boolean;
  onLocationLookup?: (address: string) => Promise<Partial<BillingInformation>>;
}

export function BillingInformationForm({
  billingInfo,
  onChange,
  showToggle = true,
  isVisible = true,
  onToggleVisibility,
  enableLocationLookup = false,
  onLocationLookup,
}: BillingInformationFormProps) {
  const [isLookingUpLocation, setIsLookingUpLocation] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');

  const handleLocationLookup = async () => {
    if (!lookupQuery.trim() || !onLocationLookup) return;
    
    setIsLookingUpLocation(true);
    try {
      const result = await onLocationLookup(lookupQuery);
      
      // Update form with lookup results
      Object.entries(result).forEach(([key, value]) => {
        if (value) {
          onChange(key as keyof BillingInformation, value);
        }
      });
      
      setLookupQuery('');
    } catch (error) {
      console.error('Location lookup failed:', error);
    } finally {
      setIsLookingUpLocation(false);
    }
  };

  const countryOptions = [
    { value: '', label: 'Select country' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
    { value: 'AU', label: 'Australia' },
    { value: 'DE', label: 'Germany' },
    { value: 'FR', label: 'France' },
    { value: 'ES', label: 'Spain' },
    { value: 'IT', label: 'Italy' },
    { value: 'NL', label: 'Netherlands' },
    { value: 'BE', label: 'Belgium' },
    { value: 'IE', label: 'Ireland' },
    { value: 'AT', label: 'Austria' },
    { value: 'CH', label: 'Switzerland' },
    { value: 'SE', label: 'Sweden' },
    { value: 'NO', label: 'Norway' },
    { value: 'DK', label: 'Denmark' },
    { value: 'FI', label: 'Finland' },
    { value: 'PL', label: 'Poland' },
    { value: 'CZ', label: 'Czech Republic' },
    { value: 'HU', label: 'Hungary' },
    { value: 'PT', label: 'Portugal' },
    { value: 'GR', label: 'Greece' },
    { value: 'OTHER', label: 'Other' },
  ];

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building className="h-5 w-5 text-gray-600" />
          <h4 className="font-medium text-gray-900">Billing Information</h4>
          <span className="text-sm text-gray-500">(Optional)</span>
        </div>
        {showToggle && onToggleVisibility && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onToggleVisibility(!isVisible)}
          >
            {isVisible ? 'Hide' : 'Show'}
          </Button>
        )}
      </div>

      {isVisible && (
        <>
          <p className="text-sm text-gray-600">
            Add company and billing details for your invoice.
          </p>

          {enableLocationLookup && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Address Lookup
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search for your address..."
                  onKeyPress={(e) => e.key === 'Enter' && handleLocationLookup()}
                />
                <Button
                  type="button"
                  onClick={handleLocationLookup}
                  disabled={!lookupQuery.trim() || isLookingUpLocation}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  {isLookingUpLocation ? (
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span>{isLookingUpLocation ? 'Searching...' : 'Search'}</span>
                </Button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={billingInfo.companyName || ''}
                onChange={(e) => onChange('companyName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter company name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VAT Number
              </label>
              <input
                type="text"
                value={billingInfo.vatNumber || ''}
                onChange={(e) => onChange('vatNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter VAT number"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Billing Address Line 1
            </label>
            <input
              type="text"
              value={billingInfo.addressLine1 || ''}
              onChange={(e) => onChange('addressLine1', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter billing address"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Billing Address Line 2
            </label>
            <input
              type="text"
              value={billingInfo.addressLine2 || ''}
              onChange={(e) => onChange('addressLine2', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Apartment, suite, etc. (optional)"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={billingInfo.city || ''}
                onChange={(e) => onChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter city"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State/Region
              </label>
              <input
                type="text"
                value={billingInfo.state || ''}
                onChange={(e) => onChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter state/region"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={billingInfo.postalCode || ''}
                onChange={(e) => onChange('postalCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter postal code"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <select
              value={billingInfo.country || ''}
              onChange={(e) => onChange('country', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {countryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}