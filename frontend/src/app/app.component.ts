import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  ActiveTicket,
  AtqRow,
  DashboardFilters,
  DashboardPayload,
  DashboardService,
} from './dashboard.service';

type HoverKind = 'atq' | 'target' | 'ticket';

interface HoverState {
  kind: HoverKind;
  row: AtqRow;
  title: string;
  body?: string;
  ticket: ActiveTicket | null;
  loading: boolean;
  resultName?: 'Classic' | 'LE';
  x: number;
  y: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly dashboard = signal<DashboardPayload | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly hoverDetail = signal<HoverState | null>(null);

  filters: DashboardFilters = {
    serviceVersion: '',
    phoneModel: '',
    buildVersion: 'release_5.203',
  };

  readonly visibleRows = computed(() => {
    const rows = this.dashboard()?.rows ?? [];
    return rows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const rankDiff = this.sortRank(left.row) - this.sortRank(right.row);
        return rankDiff || left.index - right.index;
      })
      .map(({ row }) => row);
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.hideTooltip();

    this.dashboardService.getDashboard(this.filters).subscribe({
      next: (payload) => {
        this.dashboard.set(payload);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load dashboard data from the API.');
        this.loading.set(false);
      },
    });
  }

  showAtqInfo(event: MouseEvent, row: AtqRow): void {
    this.hoverDetail.set({
      kind: 'atq',
      row,
      title: `${row.code} explanation`,
      body: row.atqExplanation,
      ticket: null,
      loading: false,
      x: event.clientX + 18,
      y: event.clientY + 18,
    });
  }

  showTargetInfo(event: MouseEvent, row: AtqRow): void {
    this.hoverDetail.set({
      kind: 'target',
      row,
      title: `Target for ${row.code}`,
      body: row.targetExplanation,
      ticket: null,
      loading: false,
      x: event.clientX + 18,
      y: event.clientY + 18,
    });
  }

  showTicket(event: MouseEvent, row: AtqRow, resultName: 'Classic' | 'LE'): void {
    this.hoverDetail.set({
      kind: 'ticket',
      row,
      title: `${resultName} ticket status`,
      ticket: null,
      loading: true,
      resultName,
      x: event.clientX + 18,
      y: event.clientY + 18,
    });

    this.dashboardService.getActiveTicket(row.id, this.filters).subscribe({
      next: (ticket) => {
        const current = this.hoverDetail();
        if (current?.kind !== 'ticket' || current.row.id !== row.id || current.resultName !== resultName) {
          return;
        }

        this.hoverDetail.set({
          ...current,
          ticket,
          loading: false,
        });
      },
      error: () => {
        const current = this.hoverDetail();
        if (current?.kind === 'ticket' && current.row.id === row.id && current.resultName === resultName) {
          this.hoverDetail.set({ ...current, ticket: null, loading: false });
        }
      },
    });
  }

  moveTooltip(event: MouseEvent): void {
    const current = this.hoverDetail();
    if (!current) {
      return;
    }

    this.hoverDetail.set({
      ...current,
      x: event.clientX + 18,
      y: event.clientY + 18,
    });
  }

  hideTooltip(): void {
    this.hoverDetail.set(null);
  }

  rowHasFailure(row: AtqRow): boolean {
    return row.classic.status === 'fail' || row.le.status === 'fail';
  }

  rowStatusLabel(row: AtqRow): string {
    if (this.rowHasFailure(row) && !row.hasActiveTicket) {
      return 'Needs ticket';
    }

    if (this.rowHasFailure(row) && row.hasActiveTicket) {
      return 'Ticket active';
    }

    if (row.hasActiveTicket) {
      return 'Monitoring';
    }

    return 'Clear';
  }

  private sortRank(row: AtqRow): number {
    if (this.rowHasFailure(row) && !row.hasActiveTicket) {
      return 0;
    }

    if (this.rowHasFailure(row) && row.hasActiveTicket) {
      return 1;
    }

    if (row.classic.status === 'no-data' || row.le.status === 'no-data') {
      return row.hasActiveTicket ? 3 : 2;
    }

    if (row.classic.status === 'neutral' || row.le.status === 'neutral') {
      return 4;
    }

    return 5;
  }
}
