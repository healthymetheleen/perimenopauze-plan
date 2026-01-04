import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const MOLLIE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mollie-payments`;

interface CreatePaymentParams {
  amount: number;
  description: string;
  redirectUrl: string;
  metadata?: Record<string, string>;
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
  interval: string; // '1 month', '1 year', etc.
}

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
  return useMutation({
    mutationFn: async ({ customerId, subscriptionId }: { customerId: string; subscriptionId: string }) => {
      const { data, error } = await supabase.functions.invoke('mollie-payments/cancel-subscription', {
        body: { customerId, subscriptionId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
  });
}

export function usePaymentStatus(paymentId: string | null) {
  return useQuery({
    queryKey: ['payment-status', paymentId],
    queryFn: async () => {
      if (!paymentId) return null;

      const response = await fetch(
        `${MOLLIE_FUNCTION_URL}/get-payment?id=${paymentId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch payment status');

      return response.json();
    },
    enabled: !!paymentId,
    refetchInterval: 5000, // Poll every 5 seconds until payment is resolved
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
  },
  yearly: {
    id: 'yearly',
    name: 'Jaarlijks',
    price: 79.99,
    interval: '1 year',
    description: 'Premium toegang - 33% korting',
    savings: '40€ besparing',
  },
} as const;
