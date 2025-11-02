import { Component, ChangeDetectionStrategy, inject, computed, output } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';

import { InvestmentService } from '../../investment.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, TitleCasePipe],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private investmentService = inject(InvestmentService);

  addInvestment = output<void>();
  viewDetails = output<string>();

  investments = this.investmentService.investments;
  activeInvestments = computed(() => this.investments().filter(i => i.status === 'active'));
  
  // Dashboard computed values
  totalInvested = computed(() => this.investments().reduce((sum, inv) => sum + inv.principal, 0));
  totalReturns = computed(() => this.investments().reduce((sum, inv) => sum + this.investmentService.getTotalPaid(inv), 0));
  upcomingPayments = computed(() => {
    return this.activeInvestments()
      .map(inv => ({
        name: inv.name,
        dueDate: this.investmentService.getNextPaymentDate(inv),
        amount: this.investmentService.calculateSimpleInterestPerPeriod(inv),
      }))
      .filter(p => p.dueDate > new Date())
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 3);
  });
}
