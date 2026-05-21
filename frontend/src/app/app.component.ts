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
  sourceKey: string;
  kind: HoverKind;
  row: AtqRow;
  title: string;
  body?: string;
  ticket: ActiveTicket | null;
  loading: boolean;
  pinned: boolean;
  pinning: boolean;
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
  private pinTimer: ReturnType<typeof setTimeout> | null = null;

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

  showAtqInfo(event: MouseEvent, row: AtqRow, pinImmediately = false): void {
    const position = this.tooltipPosition(event);
    const sourceKey = `${row.id}:atq`;

    this.hoverDetail.set({
      sourceKey,
      kind: 'atq',
      row,
      title: `${row.code} explanation`,
      body: row.atqExplanation,
      ticket: null,
      loading: false,
      pinned: pinImmediately,
      pinning: !pinImmediately,
      x: position.x,
      y: position.y,
    });
    this.startPinTimer(sourceKey, pinImmediately);
  }

  showTargetInfo(event: MouseEvent, row: AtqRow, pinImmediately = false): void {
    const position = this.tooltipPosition(event);
    const sourceKey = `${row.id}:target`;

    this.hoverDetail.set({
      sourceKey,
      kind: 'target',
      row,
      title: `Target for ${row.code}`,
      body: row.targetExplanation,
      ticket: null,
      loading: false,
      pinned: pinImmediately,
      pinning: !pinImmediately,
      x: position.x,
      y: position.y,
    });
    this.startPinTimer(sourceKey, pinImmediately);
  }

  showTicket(event: MouseEvent, row: AtqRow, resultName: 'Classic' | 'LE', pinImmediately = false): void {
    const position = this.tooltipPosition(event);
    const sourceKey = `${row.id}:ticket:${resultName}`;

    this.hoverDetail.set({
      sourceKey,
      kind: 'ticket',
      row,
      title: `${resultName} ticket status`,
      ticket: null,
      loading: true,
      pinned: pinImmediately,
      pinning: !pinImmediately,
      resultName,
      x: position.x,
      y: position.y,
    });
    this.startPinTimer(sourceKey, pinImmediately);

    this.dashboardService.getActiveTicket(row.id, this.filters).subscribe({
      next: (ticket) => {
        const current = this.hoverDetail();
        if (current?.sourceKey !== sourceKey) {
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
        if (current?.sourceKey === sourceKey) {
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
    if (current.pinned) {
      return;
    }
    const position = this.tooltipPosition(event);

    this.hoverDetail.set({
      ...current,
      x: position.x,
      y: position.y,
    });
  }

  hideTooltip(): void {
    const current = this.hoverDetail();
    if (current?.pinned) {
      return;
    }
    this.clearPinTimer();
    this.hoverDetail.set(null);
  }

  closeTooltip(): void {
    this.clearPinTimer();
    this.hoverDetail.set(null);
  }

  ticketUrl(ticket: ActiveTicket): string {
    return `https://issuetracker.google.com/issues?q=${encodeURIComponent(ticket.ticketId)}`;
  }

  newTicketUrl(hover: HoverState): string {
    const title = `${hover.row.code} ${hover.resultName ?? ''} follow-up`.trim();
    const details = [
      `ATQ: ${hover.row.code}`,
      `Domain: ${hover.row.domain}`,
      `Build: ${this.filters.buildVersion}`,
      hover.resultName ? `Result: ${hover.resultName}` : '',
      `Status: ${this.rowStatusLabel(hover.row)}`,
    ].filter(Boolean).join('\n');

    return `https://issuetracker.google.com/issues/new?title=${encodeURIComponent(title)}&description=${encodeURIComponent(details)}`;
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

  resultSeverity(row: AtqRow, result: 'classic' | 'le'): 'critical' | 'warning' | 'missing' | 'normal' {
    const status = row[result].status;

    if (status === 'fail') {
      return row.hasActiveTicket ? 'warning' : 'critical';
    }

    if (status === 'no-data') {
      return 'missing';
    }

    return 'normal';
  }

  private sortRank(row: AtqRow): number {
    return Math.min(this.resultRank(row, 'classic'), this.resultRank(row, 'le'));
  }

  private resultRank(row: AtqRow, result: 'classic' | 'le'): number {
    switch (this.resultSeverity(row, result)) {
      case 'critical':
        return 0;
      case 'warning':
        return 1;
      case 'missing':
        return 2;
      default:
        return row[result].status === 'neutral' ? 3 : 4;
    }
  }

  private startPinTimer(sourceKey: string, pinImmediately: boolean): void {
    this.clearPinTimer();
    if (pinImmediately) {
      return;
    }

    this.pinTimer = setTimeout(() => {
      const current = this.hoverDetail();
      if (current?.sourceKey !== sourceKey) {
        return;
      }

      this.hoverDetail.set({
        ...current,
        pinned: true,
        pinning: false,
      });
      this.pinTimer = null;
    }, 600);
  }

  private clearPinTimer(): void {
    if (!this.pinTimer) {
      return;
    }

    clearTimeout(this.pinTimer);
    this.pinTimer = null;
  }

  private tooltipPosition(event: MouseEvent): { x: number; y: number } {
    const margin = 16;
    const popoverWidth = 360;
    const popoverHeight = 260;

    return {
      x: Math.max(margin, Math.min(event.clientX + 18, window.innerWidth - popoverWidth - margin)),
      y: Math.max(margin, Math.min(event.clientY + 18, window.innerHeight - popoverHeight - margin)),
    };
  }
}
