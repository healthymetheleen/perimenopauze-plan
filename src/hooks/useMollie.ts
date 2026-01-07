import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface CreatePaymentParams {
  amount: number;
  description: string;
  redirectUrl: string;
  metadata?: Record<string, string>;
  method?: string; // 'ideal', 'creditcard', 'bancontact', etc.
}

interface CreateIdealPaymentParams extends CreatePaymentParams {
  issuer?: string; // Bank ID for iDEAL
}

interface PaymentResponse {
  id: string;
  checkoutUrl: string;
  status: string;
}

interface CreateCustomerParams {
  name?: string;
  email?: string;
}

interface CreateSubscriptionParams {
  customerId: string;
  amount: number;
  description: string;
  interval: string;
}

interface IdealIssuer {
  id: string;
  name: string;
  image?: string;
}

interface PaymentMethod {
  id: string;
  description: string;
  image?: string;
  issuers?: IdealIssuer[];
}

interface Subscription {
  id: string;
  owner_id: string;
  plan: string;
  status: string;
  created_at: string;
  updated_at: string;
  trial_ends_at?: string;
  mollie_customer_id?: string;
  mollie_subscription_id?: string;
}

// Get available payment methods
export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: async (): Promise<PaymentMethod[]> => {
      const { data, error } = await supabase.functions.invoke('mollie-payments/get-methods');
      if (error) throw error;
      return data.methods || [];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// Get iDEAL bank issuers
export function useIdealIssuers() {
  return useQuery({
    queryKey: ['ideal-issuers'],
    queryFn: async (): Promise<IdealIssuer[]> => {
      const { data, error } = await supabase.functions.invoke('mollie-payments/get-ideal-issuers');
      if (error) throw error;
      return data.issuers || [];
    },
    staleTime: 60 * 60 * 1000,
  });
}

// Create standard payment
export function useCreatePayment() {
  return useMutation({
    mutationFn: async (params: CreatePaymentParams): Promise<PaymentResponse> => {
      const { data, error } = await supabase.functions.invoke('mollie-payments/create-payment', {
        body: params,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
  });
}

// Create first payment for recurring (establishes mandate)
export function useCreateFirstPayment() {
  return useMutation({
    mutationFn: async (params: CreateIdealPaymentParams): Promise<PaymentResponse & { customerId: string }> => {
      const { data, error } = await supabase.functions.invoke('mollie-payments/create-first-payment', {
        body: params,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
  });
}

// Create iDEAL payment specifically
export function useCreateIdealPayment() {
  return useMutation({
    mutationFn: async (params: CreateIdealPaymentParams): Promise<PaymentResponse> => {
      const { data, error } = await supabase.functions.invoke('mollie-payments/create-ideal-payment', {
        body: params,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
  });
}

export function useCreateCustomer() {
  return useMutation({
    mutationFn: async (params: CreateCustomerParams) => {
      const { data, error } = await supabase.functions.invoke('mollie-payments/create-customer', {
        body: params,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
  });
}

export function useCreateSubscription() {
  return useMutation({
    mutationFn: async (params: CreateSubscriptionParams) => {
      const { data, error } = await supabase.functions.invoke('mollie-payments/create-subscription', {
        body: params,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('mollie-payments/cancel-subscription');

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

// Request a refund (within 14-day window)
export function useRequestRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reason, reasonDetails }: { reason: string; reasonDetails?: string }) => {
      const { data, error } = await supabase.functions.invoke('mollie-payments/request-refund', {
        body: { reason, reasonDetails },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['refund-status'] });
    },
  });
}

// Get refund request status and eligibility
export function useRefundStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['refund-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('mollie-payments/get-refund-status');
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as {
        requests: Array<{
          id: string;
          status: string;
          reason: string;
          created_at: string;
          processed_at: string | null;
          amount_cents: number;
        }>;
        eligibility: {
          canRequest: boolean;
          isWithinWindow: boolean;
          hasPendingRequest: boolean;
          hasRecentRefund: boolean;
          daysSinceStart: number;
          daysRemaining: number;
        };
      };
    },
    enabled: !!user,
  });
}

// Admin: send broadcast email
export function useAdminBroadcast() {
  return useMutation({
    mutationFn: async ({ 
      subject, 
      message, 
      targetAudience 
    }: { 
      subject: string; 
      message: string; 
      targetAudience: 'all' | 'premium' | 'trial' | 'free';
    }) => {
      const { data, error } = await supabase.functions.invoke('admin-broadcast', {
        body: { subject, message, targetAudience },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
  });
}

// Get current user subscription
export function useSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async (): Promise<Subscription | null> => {
      const { data, error } = await supabase.functions.invoke('mollie-payments/get-subscription');
      if (error) throw error;
      return data.subscription;
    },
    enabled: !!user,
  });
}

export function usePaymentStatus(paymentId: string | null) {
  return useQuery({
    queryKey: ['payment-status', paymentId],
    queryFn: async () => {
      if (!paymentId) return null;

      const { data, error } = await supabase.functions.invoke('mollie-payments/get-payment', {
        body: { id: paymentId },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!paymentId,
    refetchInterval: 5000,
  });
}

// Subscription pricing - €7.50/month with 7-day free trial
export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Premium',
    price: 7.50,
    interval: '1 month',
    description: 'Volledige toegang tot alle functies',
    trialDays: 7,
    features: [
      'AI-maaltijdanalyses (30 per dag)',
      'Dagelijkse AI-inzichten & reflecties',
      'Maandelijkse totaalanalyse',
      'Alle bewegingsoefeningen op maat',
      'Patronen & trends ontdekken',
      'Slaap- en symptoomcorrelaties',
    ],
  },
} as const;

// Payment method icons (text labels, no emojis)
export const PAYMENT_METHOD_ICONS: Record<string, string> = {
  ideal: 'iDEAL',
  creditcard: 'Card',
  bancontact: 'BC',
  paypal: 'PayPal',
  applepay: 'Apple',
  googlepay: 'Google',
};
