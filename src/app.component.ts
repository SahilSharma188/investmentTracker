import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Investment } from './investment.model';
import { InvestmentService } from './investment.service';

import { DashboardComponent } from './app/dashboard/dashboard.component';
import { InvestmentDetailComponent } from './app/investment-detail/investment-detail.component';
import { InvestmentFormComponent } from './app/investment-form/investment-form.component';

type View = 'dashboard' | 'form' | 'detail';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    DashboardComponent,
    InvestmentDetailComponent,
    InvestmentFormComponent
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private investmentService = inject(InvestmentService);

  // View state
  currentView = signal<View>('dashboard');
  selectedInvestmentId = signal<string | null>(null);

  // Data signals
  investments = this.investmentService.investments;
  
  selectedInvestment = computed(() => {
    const id = this.selectedInvestmentId();
    if (!id) return null;
    return this.investments().find(inv => inv.id === id) ?? null;
  });

  // View navigation
  setView(view: View) {
    this.currentView.set(view);
  }

  viewDetails(id: string) {
    this.selectedInvestmentId.set(id);
    this.setView('detail');
  }
  
  openAddForm() {
    this.selectedInvestmentId.set(null);
    this.setView('form');
  }

  openEditForm(investment: Investment) {
    this.selectedInvestmentId.set(investment.id);
    this.setView('form');
  }

  // CRUD operations
  saveInvestment(formData: Partial<Investment> & { id?: string | null }) {
    if (formData.id) { // Editing existing investment
      const existingInv = this.investments().find(i => i.id === formData.id)!;
      const updatedInv = { ...existingInv, ...formData };
      this.investmentService.updateInvestment(updatedInv);
    } else { // Adding new investment
      const { id, ...newInvData } = formData;
      this.investmentService.addInvestment(newInvData as Omit<Investment, 'id' | 'payments' | 'status'>);
    }
    this.setView('dashboard');
  }
  
  closeInvestment(investmentId: string) {
    if (investmentId) {
      this.investmentService.closeInvestment(investmentId);
      this.setView('dashboard');
    }
  }
}