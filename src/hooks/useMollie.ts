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
    mutationFn: async ({ customerId, subscriptionId }: { customerId: string; subscriptionId: string }) => {
      const { data, error } = await supabase.functions.invoke('mollie-payments/cancel-subscription', {
        body: { customerId, subscriptionId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
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

// Subscription pricing
export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Maandelijks',
    price: 9.99,
    interval: '1 month',
    description: 'Premium toegang - maandelijks opzegbaar',
    features: [
      'Onbeperkte maaltijdanalyses',
      'AI-inzichten & reflecties',
      'Maandelijkse totaalanalyse',
      'Alle bewegingsoefeningen',
      'Patronen & trends',
    ],
  },
  yearly: {
    id: 'yearly',
    name: 'Jaarlijks',
    price: 79.99,
    interval: '1 year',
    description: 'Premium toegang - 33% korting',
    savings: '40€ besparing',
    features: [
      'Alles van Maandelijks',
      '2 maanden gratis',
      'Prioriteit support',
      'Exclusieve content',
    ],
  },
} as const;

// Payment method icons
export const PAYMENT_METHOD_ICONS: Record<string, string> = {
  ideal: '🏦',
  creditcard: '💳',
  bancontact: '🇧🇪',
  paypal: '🅿️',
  applepay: '🍎',
  googlepay: '📱',
};
