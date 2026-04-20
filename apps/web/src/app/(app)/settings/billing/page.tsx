import { apiFetch } from '@/lib/api-server';
import { BillingClient } from './billing-client';

interface BillingData {
  subscription: { plan: string; status: string; current_period_end: string | null; cancel_at_period_end: boolean };
  plans: Record<string, { id: string; name: string; monthlyCredits: number; priceMonthly: number; rolloverCap: number }>;
  topups: Record<string, { id: string; credits: number; price: number }>;
  balance: { current: number; pending: number; lifetime_granted: number; lifetime_spent: number };
  invoices: {
    id: string;
    status: string;
    amountPaid: number;
    currency: string;
    issuedAt: string;
    hostedInvoiceUrl: string | null;
    creditsGranted: number;
  }[];
  transactions: {
    id: string;
    kind: string;
    status: string;
    amount: number;
    reason: string | null;
    createdAt: string;
  }[];
}

export default async function BillingSettingsPage() {
  const data = await apiFetch<BillingData>('/v1/billing');
  return <BillingClient data={data} />;
}
