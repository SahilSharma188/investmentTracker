export type InterestFrequency = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

export interface Payment {
  id: string;
  date: string;
  amount: number;
}

export interface Investment {
  id: string;
  name: string;
  principal: number;
  interestRate: number; // Annual rate
  frequency: InterestFrequency;
  startDate: string;
  payments: Payment[];
  status: 'active' | 'closed';
}
