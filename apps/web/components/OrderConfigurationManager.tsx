"use client";

import { useState } from 'react';
import { Button } from '@ui/base';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  DollarSign,
  Package,
  Eye,
  EyeOff,
  ExternalLink,
  Users,
  Calendar,
  Star,
  Tag,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { trpc } from "@/lib/trpc";

interface OrderConfigurationManagerProps {
  className?: string;
}

export function OrderConfigurationManager({ className }: OrderConfigurationManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [editingPricing, setEditingPricing] = useState<any>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

  // Fetch order configurations
  const { 
    data: configurations, 
    isLoading, 
    error,
    refetch 
  } = trpc.listOrderConfigurations.useQuery({
    includeInactive: showInactive
  });

  // Mutations
  const createMutation = trpc.createOrderConfiguration.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateForm(false);
    }
  });

  const updateMutation = trpc.updateOrderConfiguration.useMutation({
    onSuccess: () => {
      refetch();
      setEditingConfig(null);
    }
  });

  const deleteMutation = trpc.deleteOrderConfiguration.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  // Pricing option mutations
  const createPricingMutation = trpc.createOrderConfigurationPricingOption.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  const updatePricingMutation = trpc.updateOrderConfigurationPricingOption.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  const deletePricingMutation = trpc.deleteOrderConfigurationPricingOption.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  const formatCurrency = (amount: number, currency: string = 'gbp') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (config: any) => {
    if (!config.isActive) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>;
    }
    if (!config.isPublic) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Private</span>;
    }
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      try {
        await deleteMutation.mutateAsync({ id });
      } catch (error: any) {
        alert(error.message || 'Failed to delete configuration');
      }
    }
  };

  const handleToggleActive = async (config: any) => {
    await updateMutation.mutateAsync({
      id: config.id,
      isActive: !config.isActive
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading order configurations...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load order configurations</p>
          <Button onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Order Configurations</span>
            </CardTitle>
            <CardDescription>
              Manage checkout types and pricing options available to customers
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
              className="flex items-center space-x-2"
            >
              {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{showInactive ? 'Hide Inactive' : 'Show Inactive'}</span>
            </Button>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Configuration</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {configurations && configurations.length > 0 ? (
          <div className="space-y-4">
            {configurations.map((config) => (
              <div
                key={config.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{config.name}</h3>
                      {getStatusBadge(config)}
                      {config.category && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          <Tag className="h-3 w-3 mr-1" />
                          {config.category}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">/{config.slug}</span>
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {config._count.orders} orders
                      </span>
                      <span className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {config.pricingOptions.length} pricing options
                      </span>
                    </div>

                    {config.description && (
                      <p className="text-gray-700 mb-3">{config.description}</p>
                    )}

                    {/* Pricing Options Management */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">Pricing Options</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedConfigId(config.id);
                            setEditingPricing(null);
                            setShowPricingForm(true);
                          }}
                          className="text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Pricing
                        </Button>
                      </div>
                      
                      {config.pricingOptions.length > 0 ? (
                        <div className="space-y-2">
                          {config.pricingOptions.map((pricing: any) => (
                            <div
                              key={pricing.id}
                              className="bg-gray-50 rounded p-3 text-sm border"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium">{pricing.name}</span>
                                    {pricing.isDefault && <Star className="h-3 w-3 text-yellow-500" />}
                                    {pricing.isPopular && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Popular
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-indigo-600 font-semibold mt-1">
                                    {formatCurrency(pricing.amount, pricing.currency)}
                                    {pricing.isRecurring && (
                                      <span className="text-gray-500 ml-1">
                                        /{pricing.frequency?.toLowerCase()}
                                      </span>
                                    )}
                                    {pricing.setupFee > 0 && (
                                      <span className="text-gray-500 ml-2 text-xs">
                                        + {formatCurrency(pricing.setupFee, pricing.currency)} setup
                                      </span>
                                    )}
                                  </div>
                                  {!pricing.isActive && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 mt-1">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingPricing(pricing);
                                      setSelectedConfigId(config.id);
                                      setShowPricingForm(true);
                                    }}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm(`Delete pricing option "${pricing.name}"?`)) {
                                        deletePricingMutation.mutate({ id: pricing.id });
                                      }
                                    }}
                                    disabled={deletePricingMutation.isPending}
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-gray-50 rounded border-2 border-dashed border-gray-300">
                          <DollarSign className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No pricing options configured</p>
                        </div>
                      )}
                    </div>

                    {config.features && config.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {config.features.slice(0, 5).map((feature: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {feature}
                          </span>
                        ))}
                        {config.features.length > 5 && (
                          <span className="text-xs text-gray-500">
                            +{config.features.length - 5} more features
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/checkout/${config.slug}`, '_blank')}
                      className="flex items-center space-x-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Preview</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(config)}
                      disabled={updateMutation.isPending}
                    >
                      {config.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingConfig(config)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(config.id, config.name)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No order configurations</h3>
            <p className="text-gray-500 mb-4">
              Get started by creating your first checkout configuration.
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Configuration
            </Button>
          </div>
        )}
      </CardContent>

      {/* Create/Edit Form Modal would go here */}
      {(showCreateForm || editingConfig) && (
        <OrderConfigurationForm
          config={editingConfig}
          isOpen={showCreateForm || !!editingConfig}
          onClose={() => {
            setShowCreateForm(false);
            setEditingConfig(null);
          }}
          onSave={(data) => {
            if (editingConfig) {
              updateMutation.mutate({ id: editingConfig.id, ...data });
            } else {
              createMutation.mutate(data);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Pricing Options Form Modal */}
      {(showPricingForm && selectedConfigId) && (
        <PricingOptionForm
          configId={selectedConfigId}
          pricing={editingPricing}
          isOpen={showPricingForm}
          onClose={() => {
            setShowPricingForm(false);
            setEditingPricing(null);
            setSelectedConfigId(null);
          }}
          onSave={(data) => {
            if (editingPricing) {
              updatePricingMutation.mutate({ id: editingPricing.id, ...data });
            } else {
              createPricingMutation.mutate({ orderConfigurationId: selectedConfigId, ...data });
            }
          }}
          isLoading={createPricingMutation.isPending || updatePricingMutation.isPending}
        />
      )}
    </Card>
  );
}

// Order Configuration Form Component
interface OrderConfigurationFormProps {
  config?: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isLoading: boolean;
}

function OrderConfigurationForm({ 
  config, 
  isOpen, 
  onClose, 
  onSave, 
  isLoading 
}: OrderConfigurationFormProps) {
  const [formData, setFormData] = useState({
    name: config?.name || '',
    slug: config?.slug || '',
    description: config?.description || '',
    shortDescription: config?.shortDescription || '',
    features: config?.features || [],
    category: config?.category || '',
    displayOrder: config?.displayOrder || 0,
    isActive: config?.isActive ?? true,
    isPublic: config?.isPublic ?? true,
    requiresTerms: config?.requiresTerms ?? true,
    termsContent: config?.termsContent || '',
  });

  const [newFeature, setNewFeature] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_: any, i: number) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">
              {config ? 'Edit Configuration' : 'Create New Configuration'}
            </h2>
            <p className="text-gray-600 mt-1">
              Configure checkout options and pricing for your customers
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Premium Plan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., premium-plan"
                />
                <p className="text-xs text-gray-500 mt-1">URL: /checkout/{formData.slug}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed description of this configuration..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short Description
              </label>
              <input
                type="text"
                value={formData.shortDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief summary for cards and previews"
              />
            </div>

            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Features
              </label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add a feature..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  />
                  <Button type="button" onClick={addFeature}>Add</Button>
                </div>
                {formData.features.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map((feature: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {feature}
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., subscription, one-time, enterprise"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active (visible to customers)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Public (accessible without login)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.requiresTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, requiresTerms: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Require terms acceptance</span>
              </label>
            </div>

            {/* Terms Content */}
            {formData.requiresTerms && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions Content
                </label>
                <textarea
                  value={formData.termsContent}
                  onChange={(e) => setFormData(prev => ({ ...prev, termsContent: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="HTML content for terms and conditions..."
                />
              </div>
            )}
          </div>

          <div className="p-6 border-t flex justify-between">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {config ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                config ? 'Update Configuration' : 'Create Configuration'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Pricing Option Form Component
interface PricingOptionFormProps {
  configId: string;
  pricing?: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isLoading: boolean;
}

function PricingOptionForm({ 
  configId,
  pricing, 
  isOpen, 
  onClose, 
  onSave, 
  isLoading 
}: PricingOptionFormProps) {
  const [formData, setFormData] = useState({
    name: pricing?.name || '',
    amount: pricing?.amount || 0,
    currency: pricing?.currency || 'gbp',
    frequency: pricing?.frequency || '',
    isRecurring: pricing?.isRecurring || false,
    discountPercent: pricing?.discountPercent || 0,
    discountAmount: pricing?.discountAmount || 0,
    discountDescription: pricing?.discountDescription || '',
    trialDays: pricing?.trialDays || 0,
    setupFee: pricing?.setupFee || 0,
    displayOrder: pricing?.displayOrder || 0,
    isDefault: pricing?.isDefault || false,
    isPopular: pricing?.isPopular || false,
    isActive: pricing?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {pricing ? 'Edit Pricing Option' : 'Add Pricing Option'}
            </h2>
            <Button variant="outline" onClick={onClose} className="p-2">
              ×
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => handleInputChange('displayOrder', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (pence) *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="gbp">GBP</option>
                  <option value="usd">USD</option>
                  <option value="eur">EUR</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setup Fee (pence)
                </label>
                <input
                  type="number"
                  value={formData.setupFee}
                  onChange={(e) => handleInputChange('setupFee', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Recurring Settings */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Recurring Payment</span>
              </label>
            </div>

            {formData.isRecurring && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => handleInputChange('frequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select frequency</option>
                    <option value="EVERY_10_MINUTES">Every 10 Minutes (Testing)</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trial Days
                  </label>
                  <input
                    type="number"
                    value={formData.trialDays}
                    onChange={(e) => handleInputChange('trialDays', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Discount Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discountPercent}
                  onChange={(e) => handleInputChange('discountPercent', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Amount (pence)
                </label>
                <input
                  type="number"
                  value={formData.discountAmount}
                  onChange={(e) => handleInputChange('discountAmount', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Description
                </label>
                <input
                  type="text"
                  value={formData.discountDescription}
                  onChange={(e) => handleInputChange('discountDescription', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 'Early bird special'"
                />
              </div>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Default Option</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPopular}
                  onChange={(e) => handleInputChange('isPopular', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Popular</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  pricing ? 'Update Pricing' : 'Create Pricing'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}