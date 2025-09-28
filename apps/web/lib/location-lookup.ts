import { BillingInformation } from '@/components/BillingInformationForm';

interface GooglePlaceResult {
  formatted_address: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  place_id: string;
}

interface LocationLookupResult {
  success: boolean;
  data?: Partial<BillingInformation>;
  error?: string;
}

// Extract address components from Google Places API result
function extractAddressComponents(place: GooglePlaceResult): Partial<BillingInformation> {
  const components = place.address_components;
  const result: Partial<BillingInformation> = {};

  let streetNumber = '';
  let route = '';

  components.forEach((component) => {
    const types = component.types;

    if (types.includes('street_number')) {
      streetNumber = component.long_name;
    } else if (types.includes('route')) {
      route = component.long_name;
    } else if (types.includes('locality')) {
      result.city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      result.state = component.long_name;
    } else if (types.includes('postal_code')) {
      result.postalCode = component.long_name;
    } else if (types.includes('country')) {
      result.country = component.short_name;
    }
  });

  // Combine street number and route for address line 1
  if (streetNumber && route) {
    result.addressLine1 = `${streetNumber} ${route}`;
  } else if (route) {
    result.addressLine1 = route;
  }

  return result;
}

// Google Places API lookup using Places API (requires API key)
export async function lookupLocationWithGoogle(query: string): Promise<LocationLookupResult> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }

    // First, use the Text Search to find places
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK' || !searchData.results || searchData.results.length === 0) {
      return {
        success: false,
        error: 'No locations found for the given address'
      };
    }

    // Get the first result
    const place = searchData.results[0];
    
    // Extract address components
    const addressData = extractAddressComponents(place);

    return {
      success: true,
      data: addressData
    };

  } catch (error) {
    console.error('Google Places lookup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to lookup location'
    };
  }
}

// Alternative: Client-side Google Places Autocomplete (requires Google Maps JavaScript API)
export function initializeGooglePlacesAutocomplete(
  inputElement: HTMLInputElement,
  onPlaceSelected: (place: Partial<BillingInformation>) => void
): void {
  if (!window.google || !window.google.maps || !window.google.maps.places) {
    console.error('Google Maps JavaScript API not loaded');
    return;
  }

  const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
    types: ['address'],
    fields: ['address_components', 'formatted_address']
  });

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    
    if (!place || !place.address_components) {
      return;
    }

    const addressData = extractAddressComponents(place as any);
    onPlaceSelected(addressData);
  });
}

// Mock implementation for development/testing
export async function mockLocationLookup(query: string): Promise<LocationLookupResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock responses based on query
  if (query.toLowerCase().includes('london')) {
    return {
      success: true,
      data: {
        addressLine1: '123 Baker Street',
        city: 'London',
        state: 'England',
        postalCode: 'NW1 6XE',
        country: 'GB'
      }
    };
  } else if (query.toLowerCase().includes('new york')) {
    return {
      success: true,
      data: {
        addressLine1: '123 Broadway',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US'
      }
    };
  } else {
    return {
      success: false,
      error: 'No mock data available for this location'
    };
  }
}

// Main lookup function that chooses the appropriate method
export async function lookupLocation(query: string): Promise<Partial<BillingInformation>> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  
  let result: LocationLookupResult;
  
  if (apiKey) {
    result = await lookupLocationWithGoogle(query);
  } else {
    // Fall back to mock implementation in development
    result = await mockLocationLookup(query);
  }

  if (!result.success) {
    throw new Error(result.error || 'Failed to lookup location');
  }

  return result.data || {};
}

// Type declarations for Google Maps API
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: any;
        };
      };
    };
  }
}