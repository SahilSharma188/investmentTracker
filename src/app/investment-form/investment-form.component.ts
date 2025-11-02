import { Component, ChangeDetectionStrategy, inject, input, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Investment, InterestFrequency } from '../../investment.model';

@Component({
  selector: 'app-investment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './investment-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestmentFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  
  investmentToEdit = input<Investment | null>();

  save = output<Partial<Investment>>();
  cancel = output<void>();

  investmentForm = this.fb.group({
    id: [''],
    name: ['', Validators.required],
    principal: [0, [Validators.required, Validators.min(1)]],
    interestRate: [0, [Validators.required, Validators.min(0.1)]],
    frequency: ['monthly' as InterestFrequency, Validators.required],
    startDate: [new Date().toISOString().split('T')[0], Validators.required],
  });

  ngOnInit() {
    const investment = this.investmentToEdit();
    if (investment) {
      this.investmentForm.patchValue(investment);
    }
  }

  onSave() {
    if (this.investmentForm.invalid) return;
    this.save.emit(this.investmentForm.getRawValue());
  }
}
