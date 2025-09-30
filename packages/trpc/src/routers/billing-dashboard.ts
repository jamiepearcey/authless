import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../middleware";

const DashboardContextSchema = z.object({
  type: z.enum(['platform', 'tenant']),
  tenantId: z.string().optional(),
  timeRange: z.enum(['week', 'month', 'quarter', 'year']),
});

export const billingDashboardRouter = router({
  // Get billing metrics overview
  getBillingMetrics: protectedProcedure
    .input(DashboardContextSchema)
    .query(async ({ ctx, input }) => {
      try {
        const isPlatform = input.type === 'platform';
        const isAdmin = ctx.session.user.platformRole === 'admin';
        
        if (isPlatform && !isAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Platform billing metrics require admin access',
          });
        }

        const tenantFilter = isPlatform 
          ? {} 
          : { tenantId: input.tenantId || ctx.session.user.tenantId };

        // Get date range based on timeRange
        const now = new Date();
        let startDate: Date;
        
        switch (input.timeRange) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'quarter':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get total revenue from completed orders (current period)
        const orders = await ctx.db.order.findMany({
          where: {
            ...tenantFilter,
            createdAt: { gte: startDate },
            status: 'COMPLETED',
          },
        });

        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

        // Get previous period revenue for growth calculation
        const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
        const previousOrders = await ctx.db.order.findMany({
          where: {
            ...tenantFilter,
            createdAt: { 
              gte: previousPeriodStart,
              lt: startDate,
            },
            status: 'COMPLETED',
          },
        });

        const previousRevenue = previousOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        // Get active subscriptions (current period)
        const activeSubscriptions = await ctx.db.subscription.count({
          where: {
            ...tenantFilter,
            status: 'ACTIVE',
          },
        });

        // Get previous period subscriptions for growth calculation
        const previousSubscriptions = await ctx.db.subscription.count({
          where: {
            ...tenantFilter,
            status: 'ACTIVE',
            createdAt: {
              gte: previousPeriodStart,
              lt: startDate,
            },
          },
        });

        const subscriptionGrowth = previousSubscriptions > 0 ? 
          ((activeSubscriptions - previousSubscriptions) / previousSubscriptions) * 100 : 0;

        // Get customer/tenant counts
        let customerCount = 0;
        let tenantCount = 0;
        let customerGrowth = 0;
        let tenantGrowth = 0;

        if (isPlatform) {
          // Platform view: count tenants with billing enabled
          tenantCount = await ctx.db.tenant.count({
            where: {
              createdAt: { gte: startDate },
              billingEnabled: true,
            },
          });
          
          // Previous period tenant count
          const previousTenantCount = await ctx.db.tenant.count({
            where: {
              createdAt: { 
                gte: previousPeriodStart,
                lt: startDate,
              },
              billingEnabled: true,
            },
          });
          
          tenantGrowth = previousTenantCount > 0 ? 
            ((tenantCount - previousTenantCount) / previousTenantCount) * 100 : 0;
          
          // Also count total active memberships across all tenants
          customerCount = await ctx.db.membership.count({
            where: {
              createdAt: { gte: startDate },
              status: 'active',
            },
          });

          // Previous period customer count
          const previousCustomerCount = await ctx.db.membership.count({
            where: {
              createdAt: { 
                gte: previousPeriodStart,
                lt: startDate,
              },
              status: 'active',
            },
          });

          customerGrowth = previousCustomerCount > 0 ? 
            ((customerCount - previousCustomerCount) / previousCustomerCount) * 100 : 0;
        } else {
          // Tenant view: count users who are members of this tenant
          customerCount = await ctx.db.membership.count({
            where: {
              tenantId: input.tenantId || ctx.session.user.tenantId,
              createdAt: { gte: startDate },
              status: 'active',
            },
          });

          // Previous period customer count for this tenant
          const previousCustomerCount = await ctx.db.membership.count({
            where: {
              tenantId: input.tenantId || ctx.session.user.tenantId,
              createdAt: { 
                gte: previousPeriodStart,
                lt: startDate,
              },
              status: 'active',
            },
          });

          customerGrowth = previousCustomerCount > 0 ? 
            ((customerCount - previousCustomerCount) / previousCustomerCount) * 100 : 0;
        }

        // Calculate MRR from active subscriptions (current period)
        const activeMonthlySubscriptions = await ctx.db.subscription.findMany({
          where: {
            ...tenantFilter,
            status: 'ACTIVE',
            frequency: 'MONTHLY',
          },
        });

        const mrr = activeMonthlySubscriptions.reduce((sum, sub) => sum + sub.amount, 0);

        // Calculate previous period MRR for growth
        const previousMonthlySubscriptions = await ctx.db.subscription.findMany({
          where: {
            ...tenantFilter,
            status: 'ACTIVE',
            frequency: 'MONTHLY',
            createdAt: {
              gte: previousPeriodStart,
              lt: startDate,
            },
          },
        });

        const previousMRR = previousMonthlySubscriptions.reduce((sum, sub) => sum + sub.amount, 0);
        const mrrGrowth = previousMRR > 0 ? ((mrr - previousMRR) / previousMRR) * 100 : 0;

        return {
          totalRevenue,
          revenueGrowth,
          activeTenants: isPlatform ? tenantCount : 0,
          tenantGrowth: isPlatform ? tenantGrowth : 0,
          activeCustomers: customerCount,
          customerGrowth,
          activeSubscriptions,
          subscriptionGrowth,
          mrr,
          mrrGrowth,
        };

      } catch (error) {
        console.error('Error fetching billing metrics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch billing metrics',
        });
      }
    }),

  // Get plan metrics for breakdown
  getPlanMetrics: protectedProcedure
    .input(DashboardContextSchema)
    .query(async ({ ctx, input }) => {
      try {
        const isPlatform = input.type === 'platform';
        const isAdmin = ctx.session.user.platformRole === 'admin';
        
        if (isPlatform && !isAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Platform plan metrics require admin access',
          });
        }

        // Get all order configurations (plans) with their order data
        const orderConfigurations = await ctx.db.orderConfiguration.findMany({
          where: isPlatform 
            ? { isActive: true } // Platform view: get all active configurations
            : { 
                tenantId: input.tenantId || ctx.session.user.tenantId,
                isActive: true 
              },
          include: {
            orders: {
              where: {
                status: 'COMPLETED',
              },
              include: {
                subscription: true, // Include the subscription for each order
              },
            },
          },
        });

        const planMetrics = await Promise.all(orderConfigurations.map(async (config) => {
          // Calculate total revenue from completed orders for this plan
          const totalRevenue = config.orders.reduce((sum: number, order: any) => sum + order.totalAmount, 0);
          
          // Count active subscriptions for this plan
          const subscriberCount = config.orders.filter(order => 
            order.subscription && order.subscription.status === 'ACTIVE'
          ).length;

          // Calculate growth rate by comparing current period to previous period
          const now = new Date();
          let startDate: Date;
          
          switch (input.timeRange) {
            case 'week':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case 'month':
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case 'quarter':
              startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              break;
            case 'year':
              startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
              break;
            default:
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          }

          const previousPeriodOrders = await ctx.db.order.findMany({
            where: {
              orderConfigurationId: config.id,
              status: 'COMPLETED',
              createdAt: {
                gte: new Date(startDate.getTime() - (now.getTime() - startDate.getTime())),
                lt: startDate,
              },
              ...(isPlatform ? {} : { tenantId: input.tenantId || ctx.session.user.tenantId }),
            },
          });

          const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + order.totalAmount, 0);
          const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

          return {
            planName: config.name,
            subscriberCount,
            totalRevenue,
            growthRate,
          };
        }));

        return planMetrics;

      } catch (error) {
        console.error('Error fetching plan metrics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch plan metrics',
        });
      }
    }),

  // Get subscription metrics for charts
  getSubscriptionMetrics: protectedProcedure
    .input(DashboardContextSchema)
    .query(async ({ ctx, input }) => {
      try {
        const isPlatform = input.type === 'platform';
        const isAdmin = ctx.session.user.platformRole === 'admin';
        
        if (isPlatform && !isAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Platform subscription metrics require admin access',
          });
        }

        const tenantFilter = isPlatform 
          ? {} 
          : { tenantId: input.tenantId || ctx.session.user.tenantId };

        // Generate actual time series data from database
        const dataPoints = [];
        const daysBack = input.timeRange === 'week' ? 7 : 
                        input.timeRange === 'month' ? 30 :
                        input.timeRange === 'quarter' ? 90 : 365;
        
        for (let i = daysBack - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);
          
          // Get revenue for this day from completed orders
          const dayOrders = await ctx.db.order.findMany({
            where: {
              ...tenantFilter,
              status: 'COMPLETED',
              createdAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          });
          
          const revenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
          
          // Get subscription count for this day
          const subscriptions = await ctx.db.subscription.count({
            where: {
              ...tenantFilter,
              status: 'ACTIVE',
              createdAt: {
                lte: endOfDay,
              },
              OR: [
                { endDate: null },
                { endDate: { gte: startOfDay } },
              ],
            },
          });
          
          // Get customer count for this day
          let customers = 0;
          if (isPlatform) {
            customers = await ctx.db.membership.count({
              where: {
                status: 'active',
                createdAt: {
                  lte: endOfDay,
                },
              },
            });
          } else {
            customers = await ctx.db.membership.count({
              where: {
                tenantId: input.tenantId || ctx.session.user.tenantId,
                status: 'active',
                createdAt: {
                  lte: endOfDay,
                },
              },
            });
          }
          
          dataPoints.push({
            date: date.toISOString().split('T')[0],
            revenue,
            subscriptions,
            customers,
          });
        }

        return dataPoints;

      } catch (error) {
        console.error('Error fetching subscription metrics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch subscription metrics',
        });
      }
    }),

  // Get customer list
  getCustomersList: protectedProcedure
    .input(DashboardContextSchema.extend({
      search: z.string().optional(),
      limit: z.number().default(10),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const isPlatform = input.type === 'platform';
        const isAdmin = ctx.session.user.platformRole === 'admin';
        
        if (isPlatform && !isAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Platform customer list requires admin access',
          });
        }

        const tenantFilter = isPlatform 
          ? {} 
          : { tenantId: input.tenantId || ctx.session.user.tenantId };

        const searchFilter = input.search ? {
          OR: [
            { name: { contains: input.search, mode: 'insensitive' as const } },
            { email: { contains: input.search, mode: 'insensitive' as const } },
          ],
        } : {};

        if (isPlatform) {
          // Platform view: return tenants with billing info
          const tenants = await ctx.db.tenant.findMany({
            where: {
              ...searchFilter,
              billingEnabled: true, // Only show tenants with billing enabled
            },
            include: {
              _count: {
                select: {
                  memberships: {
                    where: {
                      status: 'active',
                    },
                  },
                  subscriptions: {
                    where: {
                      status: 'ACTIVE',
                    },
                  },
                  orders: {
                    where: {
                      status: 'COMPLETED',
                    },
                  },
                },
              },
            },
            take: input.limit,
            skip: input.offset,
            orderBy: { createdAt: 'desc' },
          });

          const total = await ctx.db.tenant.count({
            where: {
              ...searchFilter,
              billingEnabled: true,
            },
          });

          return {
            items: tenants.map(tenant => ({
              id: tenant.id,
              name: tenant.name,
              email: '', // Tenants don't have email field
              status: tenant.status,
              subscriptions: tenant._count.subscriptions,
              customers: tenant._count.memberships,
              orders: tenant._count.orders,
              joinedAt: tenant.createdAt,
              lastActive: tenant.updatedAt,
            })),
            total,
          };
        } else {
          // Tenant view: return users who are members of this tenant
          const memberships = await ctx.db.membership.findMany({
            where: {
              tenantId: input.tenantId || ctx.session.user.tenantId,
              status: 'active',
              user: searchFilter.OR ? {
                OR: searchFilter.OR,
              } : {},
            },
            include: {
              user: {
                include: {
                  _count: {
                    select: {
                      subscriptions: {
                        where: {
                          status: 'ACTIVE',
                        },
                      },
                      orders: {
                        where: {
                          status: 'COMPLETED',
                        },
                      },
                    },
                  },
                },
              },
            },
            take: input.limit,
            skip: input.offset,
            orderBy: { createdAt: 'desc' },
          });

          const total = await ctx.db.membership.count({
            where: {
              tenantId: input.tenantId || ctx.session.user.tenantId,
              status: 'active',
              user: searchFilter.OR ? {
                OR: searchFilter.OR,
              } : {},
            },
          });

          return {
            items: memberships.map(membership => ({
              id: membership.user.id,
              name: membership.user.name || 'Unknown User',
              email: membership.user.email || '',
              status: membership.user.status,
              subscriptions: membership.user._count.subscriptions,
              customers: 0, // Not applicable for users
              orders: membership.user._count.orders,
              joinedAt: membership.createdAt,
              lastActive: membership.user.lastLoginAt || membership.user.updatedAt,
            })),
            total,
          };
        }

      } catch (error) {
        console.error('Error fetching customers list:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch customers list',
        });
      }
    }),
});