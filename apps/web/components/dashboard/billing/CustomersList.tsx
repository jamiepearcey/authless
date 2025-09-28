"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { Button } from '@ui/base';
import { Badge } from '@ui/base';
import { 
  Users, 
  Building, 
  Search, 
  Filter,
  ExternalLink,
  MoreHorizontal,
  Calendar,
  DollarSign,
  CreditCard,
  Mail,
  Phone
} from 'lucide-react';
import { DashboardContext } from './BillingDashboard';
import { useCustomersList } from '../hooks/useCustomersList';
import Link from 'next/link';

interface CustomersListProps {
  context: DashboardContext;
}

type FilterType = 'all' | 'active' | 'churned' | 'trial' | 'overdue';
type SortType = 'name' | 'revenue' | 'created' | 'lastPayment';

export function CustomersList({ context }: CustomersListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('revenue');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { customers, isLoading, error, totalCount } = useCustomersList({
    context,
    searchTerm,
    filter,
    sortBy,
    page: currentPage,
    pageSize
  });

  const isPlatform = context.type === 'platform';
  const entityType = isPlatform ? 'tenant' : 'customer';
  const entityTypePlural = isPlatform ? 'tenants' : 'customers';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isPlatform ? 'Tenant Overview' : 'Customer Overview'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="w-20 h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle>{isPlatform ? 'Tenant Overview' : 'Customer Overview'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-8">
            Failed to load {entityTypePlural}: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => `£${(value / 100).toLocaleString()}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      trial: { color: 'bg-blue-100 text-blue-800', label: 'Trial' },
      churned: { color: 'bg-red-100 text-red-800', label: 'Churned' },
      overdue: { color: 'bg-yellow-100 text-yellow-800', label: 'Overdue' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const filterOptions = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'active', label: 'Active', count: customers.filter(c => c.status === 'active').length },
    { key: 'trial', label: 'Trial', count: customers.filter(c => c.status === 'trial').length },
    { key: 'churned', label: 'Churned', count: customers.filter(c => c.status === 'churned').length },
    { key: 'overdue', label: 'Overdue', count: customers.filter(c => c.status === 'overdue').length }
  ];

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              {isPlatform ? <Building className="h-5 w-5" /> : <Users className="h-5 w-5" />}
              <span>{isPlatform ? 'Tenant Overview' : 'Customer Overview'}</span>
            </CardTitle>
            <CardDescription>
              Manage and view {entityTypePlural} associated with plans
            </CardDescription>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${entityTypePlural}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {filterOptions.map((option) => (
              <Button
                key={option.key}
                variant={filter === option.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(option.key as FilterType)}
                className="text-xs"
              >
                {option.label}
                {option.count > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-white bg-opacity-20 rounded">
                    {option.count}
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="revenue">Revenue (High to Low)</option>
              <option value="name">Name (A-Z)</option>
              <option value="created">Newest First</option>
              <option value="lastPayment">Recent Payment</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {customers.map((customer) => (
            <div key={customer.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-4">
                {/* Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                  {isPlatform ? customer.name.charAt(0).toUpperCase() : customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium text-gray-900">{customer.name}</h3>
                    {getStatusBadge(customer.status)}
                    {customer.planName && (
                      <Badge variant="outline" className="text-xs">
                        {customer.planName}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    {customer.email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>Joined {formatDate(customer.createdAt)}</span>
                    </div>
                    {customer.lastPaymentAt && (
                      <div className="flex items-center space-x-1">
                        <CreditCard className="h-3 w-3" />
                        <span>Last payment {formatDate(customer.lastPaymentAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="flex items-center space-x-6">
                {/* Revenue */}
                <div className="text-right">
                  <div className="flex items-center space-x-1 text-sm font-medium text-gray-900">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatCurrency(customer.totalRevenue)}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {customer.subscriptionCount} subscription{customer.subscriptionCount !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <Link href={isPlatform ? `/admin/tenants/${customer.id}` : `/admin/customers/${customer.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {customers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No {entityTypePlural} found</h3>
              <p className="text-gray-500">
                {searchTerm ? `No ${entityTypePlural} match your search criteria.` : `No ${entityTypePlural} have been added yet.`}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-sm text-gray-600">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} {entityTypePlural}
            </p>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CustomersList;