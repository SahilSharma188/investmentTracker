import { Component, ChangeDetectionStrategy, signal, inject, computed, effect, ViewChild, ElementRef, input, output } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import * as d3 from 'd3';

import { Investment } from '../../investment.model';
import { InvestmentService } from '../../investment.service';

@Component({
  selector: 'app-investment-detail',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, TitleCasePipe],
  templateUrl: './investment-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .chart-tooltip {
      position: absolute;
      text-align: center;
      padding: 8px;
      font: 12px sans-serif;
      background: #334155;
      color: white;
      border: 0px;
      border-radius: 8px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    }
  `],
})
export class InvestmentDetailComponent {
  private investmentService = inject(InvestmentService);

  investment = input.required<Investment>();

  editInvestment = output<Investment>();
  closeInvestment = output<Investment>();
  
  @ViewChild('chartContainer') chartContainer?: ElementRef<HTMLDivElement>;

  projectionYears = signal<number>(5);
  newPaymentAmount = signal<number | null>(null);
  
  projectedTotalEarnings = computed(() => {
    const inv = this.investment();
    if (!inv) return 0;
    const projections = this.investmentService.getProjections(inv, this.projectionYears());
    if (projections.length === 0) return 0;
    return projections[projections.length - 1].earnings;
  });

  projectedFutureValue = computed(() => {
    const inv = this.investment();
    if (!inv) return 0;
    return inv.principal + this.projectedTotalEarnings();
  });

  // D3 chart effect
  constructor() {
    effect(() => {
      const inv = this.investment();
      if (inv && this.chartContainer) {
        this.drawProjectionChart(inv, this.projectionYears());
      }
    }, { allowSignalWrites: true });
  }
  
  onProjectionYearsChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.projectionYears.set(Number(input.value));
  }
  
  logPayment() {
      const amount = this.newPaymentAmount();
      const inv = this.investment();
      if (amount != null && amount > 0 && inv) {
          this.investmentService.logPayment(inv.id, amount);
          this.newPaymentAmount.set(null);
      }
  }

  // Helpers
  getInterestPerPeriod(investment: Investment) {
    return this.investmentService.calculateSimpleInterestPerPeriod(investment);
  }

  getTotalPaid(investment: Investment) {
    return this.investmentService.getTotalPaid(investment);
  }

  getNextPaymentDate(investment: Investment) {
    return this.investmentService.getNextPaymentDate(investment);
  }

  // D3 Chart Logic
  private drawProjectionChart(investment: Investment, years: number) {
    if (!this.chartContainer) return;
    
    const data = this.investmentService.getProjections(investment, years);
    if (data.length === 0) {
        this.chartContainer.nativeElement.innerHTML = `<div class="text-center p-8 text-slate-500">No projections available for closed investments.</div>`;
        return;
    }

    d3.select(this.chartContainer.nativeElement).selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = this.chartContainer.nativeElement.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(this.chartContainer.nativeElement)
      .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
      .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const x = d3.scaleBand()
      .range([0, width])
      .domain(data.map(d => d.year.toString()))
      .padding(0.3);

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
        .style('text-anchor', 'end');

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.earnings) || 0])
      .range([height, 0]);

    svg.append('g').call(d3.axisLeft(y).tickFormat((d) => `₹${d3.format(",.0f")(d as number)}`));

    const tooltip = d3.select('body').append('div').attr('class', 'chart-tooltip');

    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
        .attr('x', d => x(d.year.toString())!)
        .attr('y', height)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', '#4f46e5')
        .attr('rx', 4)
        .on('mouseover', function(event, d) {
          d3.select(this).transition().duration(200).attr('fill', '#312e81');
          tooltip.transition().duration(200).style('opacity', .9);
          tooltip.html(`Year: ${d.year}<br/>Earnings: ₹${d3.format(",.2f")(d.earnings)}`)
            .style('left', (event.pageX + 5) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this).transition().duration(200).attr('fill', '#4f46e5');
          tooltip.transition().duration(500).style('opacity', 0);
        })
        .transition()
        .duration(750)
        .delay((d, i) => i * 30)
        .attr('y', d => y(d.earnings))
        .attr('height', d => height - y(d.earnings));

    // Axis labels
    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height + margin.top + 20)
        .text('Year');

    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 20)
        .attr('x', -height / 2)
        .text('Cumulative Earnings');
  }
}
