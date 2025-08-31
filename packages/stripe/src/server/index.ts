import Stripe from 'stripe';
import {
  type StripeConfig,
  type CreatePaymentIntentInput,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type CreateSubscriptionInput,
  type UpdateSubscriptionInput,
  type CreatePriceInput,
  type WebhookEventInput,
  type StripeResponse,
  type PaginatedStripeResponse,
  StripeIntegrationError,
  CreatePaymentIntentSchema,
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CreateSubscriptionSchema,
  UpdateSubscriptionSchema,
  CreatePriceSchema,
  WebhookEventSchema,
} from '../types';

export class StripeServerClient {
  private stripe: Stripe;

  constructor(config: StripeConfig) {
    if (!config.secretKey) {
      throw new StripeIntegrationError('Stripe secret key is required');
    }

    this.stripe = new Stripe(config.secretKey, {
      apiVersion: config.apiVersion || '2023-10-16',
      typescript: true,
    });
  }

  // Payment Intents
  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<StripeResponse<Stripe.PaymentIntent>> {
    try {
      const validated = CreatePaymentIntentSchema.parse(input);
      
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: validated.amount,
        currency: validated.currency,
        metadata: validated.metadata,
        description: validated.description,
        automatic_payment_methods: validated.automatic_payment_methods,
      });

      return { success: true, data: paymentIntent };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async retrievePaymentIntent(id: string): Promise<StripeResponse<Stripe.PaymentIntent>> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(id);
      return { success: true, data: paymentIntent };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async confirmPaymentIntent(id: string, params?: Stripe.PaymentIntentConfirmParams): Promise<StripeResponse<Stripe.PaymentIntent>> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(id, params);
      return { success: true, data: paymentIntent };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async cancelPaymentIntent(id: string): Promise<StripeResponse<Stripe.PaymentIntent>> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(id);
      return { success: true, data: paymentIntent };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Customers
  async createCustomer(input: CreateCustomerInput): Promise<StripeResponse<Stripe.Customer>> {
    try {
      const validated = CreateCustomerSchema.parse(input);
      
      const customer = await this.stripe.customers.create({
        email: validated.email,
        name: validated.name,
        phone: validated.phone,
        metadata: validated.metadata,
      });

      return { success: true, data: customer };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async retrieveCustomer(id: string): Promise<StripeResponse<Stripe.Customer>> {
    try {
      const customer = await this.stripe.customers.retrieve(id);
      return { success: true, data: customer as Stripe.Customer };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateCustomer(input: UpdateCustomerInput): Promise<StripeResponse<Stripe.Customer>> {
    try {
      const validated = UpdateCustomerSchema.parse(input);
      
      const customer = await this.stripe.customers.update(validated.customerId, {
        email: validated.email,
        name: validated.name,
        phone: validated.phone,
        metadata: validated.metadata,
      });

      return { success: true, data: customer };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteCustomer(id: string): Promise<StripeResponse<Stripe.DeletedCustomer>> {
    try {
      const deleted = await this.stripe.customers.del(id);
      return { success: true, data: deleted };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listCustomers(params?: Stripe.CustomerListParams): Promise<PaginatedStripeResponse<Stripe.Customer>> {
    try {
      const customers = await this.stripe.customers.list(params);
      return { 
        success: true, 
        data: customers.data,
        has_more: customers.has_more,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Subscriptions
  async createSubscription(input: CreateSubscriptionInput): Promise<StripeResponse<Stripe.Subscription>> {
    try {
      const validated = CreateSubscriptionSchema.parse(input);
      
      const subscription = await this.stripe.subscriptions.create({
        customer: validated.customerId,
        items: [{ price: validated.priceId }],
        metadata: validated.metadata,
        trial_period_days: validated.trial_period_days,
        promotion_code: validated.promotion_code,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      return { success: true, data: subscription };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async retrieveSubscription(id: string): Promise<StripeResponse<Stripe.Subscription>> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(id);
      return { success: true, data: subscription };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateSubscription(input: UpdateSubscriptionInput): Promise<StripeResponse<Stripe.Subscription>> {
    try {
      const validated = UpdateSubscriptionSchema.parse(input);
      
      const updateData: Stripe.SubscriptionUpdateParams = {
        metadata: validated.metadata,
      };

      if (validated.priceId) {
        updateData.items = [{ price: validated.priceId }];
      }

      if (validated.quantity) {
        updateData.items = updateData.items || [];
        if (updateData.items[0]) {
          updateData.items[0].quantity = validated.quantity;
        }
      }

      const subscription = await this.stripe.subscriptions.update(validated.subscriptionId, updateData);
      return { success: true, data: subscription };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async cancelSubscription(id: string): Promise<StripeResponse<Stripe.Subscription>> {
    try {
      const subscription = await this.stripe.subscriptions.cancel(id);
      return { success: true, data: subscription };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Prices
  async createPrice(input: CreatePriceInput): Promise<StripeResponse<Stripe.Price>> {
    try {
      const validated = CreatePriceSchema.parse(input);
      
      const price = await this.stripe.prices.create({
        unit_amount: validated.unit_amount,
        currency: validated.currency,
        recurring: validated.recurring,
        product_data: validated.product_data,
        product: validated.product,
        metadata: validated.metadata,
      });

      return { success: true, data: price };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async retrievePrice(id: string): Promise<StripeResponse<Stripe.Price>> {
    try {
      const price = await this.stripe.prices.retrieve(id);
      return { success: true, data: price };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listPrices(params?: Stripe.PriceListParams): Promise<PaginatedStripeResponse<Stripe.Price>> {
    try {
      const prices = await this.stripe.prices.list(params);
      return { 
        success: true, 
        data: prices.data,
        has_more: prices.has_more,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Products
  async createProduct(params: Stripe.ProductCreateParams): Promise<StripeResponse<Stripe.Product>> {
    try {
      const product = await this.stripe.products.create(params);
      return { success: true, data: product };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async retrieveProduct(id: string): Promise<StripeResponse<Stripe.Product>> {
    try {
      const product = await this.stripe.products.retrieve(id);
      return { success: true, data: product };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listProducts(params?: Stripe.ProductListParams): Promise<PaginatedStripeResponse<Stripe.Product>> {
    try {
      const products = await this.stripe.products.list(params);
      return { 
        success: true, 
        data: products.data,
        has_more: products.has_more,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Webhooks
  async constructWebhookEvent(payload: string | Buffer, signature: string, secret: string): Promise<StripeResponse<Stripe.Event>> {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      return { success: true, data: event };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Payment Methods
  async listPaymentMethods(customerId: string, type?: Stripe.PaymentMethodListParams.Type): Promise<PaginatedStripeResponse<Stripe.PaymentMethod>> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: type || 'card',
      });
      return { 
        success: true, 
        data: paymentMethods.data,
        has_more: paymentMethods.has_more,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<StripeResponse<Stripe.PaymentMethod>> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      return { success: true, data: paymentMethod };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<StripeResponse<Stripe.PaymentMethod>> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      return { success: true, data: paymentMethod };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Invoices
  async retrieveInvoice(id: string): Promise<StripeResponse<Stripe.Invoice>> {
    try {
      const invoice = await this.stripe.invoices.retrieve(id);
      return { success: true, data: invoice };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listInvoices(customerId?: string): Promise<PaginatedStripeResponse<Stripe.Invoice>> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
      });
      return { 
        success: true, 
        data: invoices.data,
        has_more: invoices.has_more,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Error handling
  private handleError<T>(error: any): StripeResponse<T> {
    if (error instanceof Stripe.errors.StripeError) {
      return {
        success: false,
        error: new StripeIntegrationError(
          error.message,
          error.code,
          error.type,
          error.statusCode
        ),
      };
    }

    if (error instanceof StripeIntegrationError) {
      return {
        success: false,
        error: error,
      };
    }

    return {
      success: false,
      error: new StripeIntegrationError(
        error.message || 'An unexpected error occurred',
        'unknown_error'
      ),
    };
  }

  // Raw Stripe client access for advanced use cases
  get rawStripe(): Stripe {
    return this.stripe;
  }
}

export * from '../types';