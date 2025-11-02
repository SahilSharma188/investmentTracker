import { Injectable, signal, computed, effect } from '@angular/core';
import { Investment, Payment, InterestFrequency } from './investment.model';

@Injectable({
  providedIn: 'root',
})
export class InvestmentService {
  private readonly STORAGE_KEY = 'investments_data';
  investments = signal<Investment[]>([]);

  constructor() {
    this.loadFromLocalStorage();
    effect(() => {
      this.saveToLocalStorage(this.investments());
    });
  }

  private loadFromLocalStorage() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        this.investments.set(JSON.parse(data));
      } else {
        // Load sample data if nothing is in local storage
        //this.investments.set(this.getSampleData());
      }
    } catch (e) {
      console.error('Error loading from local storage', e);
      //this.investments.set(this.getSampleData());
    }
  }

  private saveToLocalStorage(investments: Investment[]) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(investments));
    } catch (e) {
      console.error('Error saving to local storage', e);
    }
  }

  addInvestment(investment: Omit<Investment, 'id' | 'payments' | 'status'>) {
    const newInvestment: Investment = {
      ...investment,
      id: crypto.randomUUID(),
      payments: [],
      status: 'active',
    };
    this.investments.update(invs => [...invs, newInvestment]);
  }

  updateInvestment(updatedInvestment: Investment) {
    this.investments.update(invs => 
      invs.map(inv => inv.id === updatedInvestment.id ? updatedInvestment : inv)
    );
  }

  getInvestmentById(id: string) {
    return computed(() => this.investments().find(inv => inv.id === id));
  }

  logPayment(investmentId: string, amount: number) {
    const newPayment: Payment = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      amount,
    };

    this.investments.update(invs => 
      invs.map(inv => {
        if (inv.id === investmentId) {
          return { ...inv, payments: [...inv.payments, newPayment] };
        }
        return inv;
      })
    );
  }

  closeInvestment(investmentId: string) {
    this.investments.update(invs => 
      invs.map(inv => {
        if (inv.id === investmentId) {
          return { ...inv, status: 'closed' };
        }
        return inv;
      })
    );
  }
  
  // Calculation helpers
  getPeriodsPerYear(frequency: InterestFrequency): number {
    switch (frequency) {
      case 'monthly': return 12;
      case 'quarterly': return 4;
      case 'half-yearly': return 2;
      case 'yearly': return 1;
    }
  }

  calculateSimpleInterestPerPeriod(investment: Investment): number {
    const periodsPerYear = this.getPeriodsPerYear(investment.frequency);
    const ratePerPeriod = investment.interestRate / 100 / periodsPerYear;
    return investment.principal * ratePerPeriod;
  }
  
  getTotalPaid(investment: Investment): number {
      return investment.payments.reduce((sum, p) => sum + p.amount, 0);
  }

  getOutstandingBalance(investment: Investment): number {
    const totalPaid = this.getTotalPaid(investment);
    return investment.principal - totalPaid; // Simple balance for now
  }

  getNextPaymentDate(investment: Investment): Date {
      const startDate = new Date(investment.startDate);
      if (investment.status === 'closed') return startDate;

      let lastDate = startDate;
      if (investment.payments.length > 0) {
        lastDate = new Date(investment.payments[investment.payments.length - 1].date);
      }

      const periodsPerYear = this.getPeriodsPerYear(investment.frequency);
      const monthsToAdd = 12 / periodsPerYear;

      let nextDate = new Date(lastDate);
      // If no payments made, first payment is based on start date
      if (investment.payments.length === 0) {
          nextDate.setMonth(startDate.getMonth() + monthsToAdd);
          return nextDate;
      }

      // Find the latest payment date and calculate next from there.
      const latestPaymentDate = investment.payments.reduce((latest, p) => {
          const pDate = new Date(p.date);
          return pDate > latest ? pDate : latest;
      }, new Date(0));
      
      nextDate = new Date(latestPaymentDate);
      nextDate.setMonth(latestPaymentDate.getMonth() + monthsToAdd);
      
      // If calculated next date is in the past, keep adding periods until it's in the future
      while (nextDate < new Date()) {
         nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
      }

      return nextDate;
  }
  
  getProjections(investment: Investment, years: number = 5): { year: number, earnings: number }[] {
    if (investment.status === 'closed') return [];
    
    const periodsPerYear = this.getPeriodsPerYear(investment.frequency);
    const interestPerPeriod = this.calculateSimpleInterestPerPeriod(investment);
    const totalPeriods = years * periodsPerYear;
    const projections = [];
    let cumulativeInterest = 0;

    for (let i = 1; i <= years; i++) {
        cumulativeInterest = interestPerPeriod * periodsPerYear * i;
        projections.push({ year: new Date().getFullYear() + i, earnings: cumulativeInterest });
    }
    return projections;
  }

  private getSampleData(): Investment[] {
    const today = new Date();
    const lastYear = new Date(today);
    lastYear.setFullYear(today.getFullYear() - 1);

    return [
      {
        id: 'sample-1',
        name: 'Lending to Friend',
        principal: 5000,
        interestRate: 8,
        frequency: 'quarterly',
        startDate: lastYear.toISOString().split('T')[0],
        payments: [
          {id: 'p1', date: new Date(new Date().setMonth(today.getMonth() - 9)).toISOString().split('T')[0], amount: 100},
          {id: 'p2', date: new Date(new Date().setMonth(today.getMonth() - 6)).toISOString().split('T')[0], amount: 100},
          {id: 'p3', date: new Date(new Date().setMonth(today.getMonth() - 3)).toISOString().split('T')[0], amount: 100},
        ],
        status: 'active',
      },
      {
        id: 'sample-2',
        name: 'Peer-to-Peer Loan',
        principal: 10000,
        interestRate: 12,
        frequency: 'monthly',
        startDate: new Date(today.setMonth(today.getMonth() - 6)).toISOString().split('T')[0],
        payments: [],
        status: 'active',
      },
      {
        id: 'sample-3',
        name: 'Old Bond',
        principal: 2000,
        interestRate: 5,
        frequency: 'yearly',
        startDate: new Date(today.setFullYear(today.getFullYear() - 3)).toISOString().split('T')[0],
        payments: [{id:'p4', date: '2023-12-01', amount: 2100}],
        status: 'closed',
      }
    ];
  }
}
