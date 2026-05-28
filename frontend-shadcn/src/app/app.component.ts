import { CommonModule } from '@angular/common';
import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  ActiveTicket,
  AtqRow,
  DashboardFilters,
  DashboardPayload,
  DashboardService,
  TicketBundle,
} from './dashboard.service';

type HoverKind = 'atq' | 'target' | 'ticket';
type SortMode = 'issue' | 'domain';

interface HoverState {
  sourceKey: string;
  kind: HoverKind;
  row: AtqRow;
  title: string;
  body?: string;
  tickets: TicketBundle | null;
  loading: boolean;
  pinned: boolean;
  pinning: boolean;
  resultName?: 'Classic' | 'LE';
  x: number;
  y: number;
  maxHeight: number;
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
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  readonly dashboard = signal<DashboardPayload | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly hoverDetail = signal<HoverState | null>(null);
  readonly sortMode = signal<SortMode>('issue');

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
        const diff = this.compareRows(left.row, right.row);
        return diff || left.index - right.index;
      })
      .map(({ row }) => row);
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    const current = this.hoverDetail();
    if (!current?.pinned) {
      return;
    }

    if (this.isPointerInsideActiveArea(event.target, current.sourceKey)) {
      this.clearCloseTimer();
      return;
    }

    this.schedulePinnedClose(current.sourceKey);
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

  setSortMode(mode: SortMode): void {
    this.sortMode.set(mode);
    this.hideTooltip();
  }

  showAtqInfo(event: MouseEvent, row: AtqRow, pinImmediately = false): void {
    this.clearCloseTimer();
    const position = this.tooltipPosition(event, 'atq');
    const sourceKey = `${row.id}:atq`;
    if (this.retainPinnedSource(sourceKey)) {
      return;
    }

    this.hoverDetail.set({
      sourceKey,
      kind: 'atq',
      row,
      title: `${row.code} explanation`,
      body: row.atqExplanation,
      tickets: null,
      loading: false,
      pinned: pinImmediately,
      pinning: !pinImmediately,
      x: position.x,
      y: position.y,
      maxHeight: position.maxHeight,
    });
    this.startPinTimer(sourceKey, pinImmediately);
  }

  showTargetInfo(event: MouseEvent, row: AtqRow, pinImmediately = false): void {
    this.clearCloseTimer();
    const position = this.tooltipPosition(event, 'target');
    const sourceKey = `${row.id}:target`;
    if (this.retainPinnedSource(sourceKey)) {
      return;
    }

    this.hoverDetail.set({
      sourceKey,
      kind: 'target',
      row,
      title: `Target for ${row.code}`,
      body: row.targetExplanation,
      tickets: null,
      loading: false,
      pinned: pinImmediately,
      pinning: !pinImmediately,
      x: position.x,
      y: position.y,
      maxHeight: position.maxHeight,
    });
    this.startPinTimer(sourceKey, pinImmediately);
  }

  showTicket(event: MouseEvent, row: AtqRow, resultName: 'Classic' | 'LE', pinImmediately = false): void {
    this.clearCloseTimer();
    const position = this.tooltipPosition(event, 'ticket');
    const sourceKey = `${row.id}:ticket:${resultName}`;
    if (this.retainPinnedSource(sourceKey)) {
      return;
    }

    this.hoverDetail.set({
      sourceKey,
      kind: 'ticket',
      row,
      title: `${resultName} ticket status`,
      tickets: null,
      loading: true,
      pinned: pinImmediately,
      pinning: !pinImmediately,
      resultName,
      x: position.x,
      y: position.y,
      maxHeight: position.maxHeight,
    });
    this.startPinTimer(sourceKey, pinImmediately);
    this.loadTickets(sourceKey, row);
  }

  moveTooltip(event: MouseEvent): void {
    const current = this.hoverDetail();
    if (!current) {
      return;
    }
    if (current.pinned) {
      return;
    }
    const position = this.tooltipPosition(event, current.kind);

    this.hoverDetail.set({
      ...current,
      x: position.x,
      y: position.y,
      maxHeight: position.maxHeight,
    });
  }

  leaveHoverSource(): void {
    const current = this.hoverDetail();
    if (!current) {
      return;
    }
    if (current.pinned) {
      this.schedulePinnedClose(current.sourceKey);
      return;
    }

    this.clearPinTimer();
    this.hoverDetail.set(null);
  }

  enterTooltip(): void {
    this.clearCloseTimer();
  }

  leaveTooltip(): void {
    const current = this.hoverDetail();
    if (!current) {
      return;
    }
    if (current.pinned) {
      this.schedulePinnedClose(current.sourceKey);
      return;
    }

    this.closeTooltip();
  }

  hideTooltip(): void {
    this.clearCloseTimer();
    this.clearPinTimer();
    this.hoverDetail.set(null);
  }

  closeTooltip(): void {
    this.clearCloseTimer();
    this.clearPinTimer();
    this.hoverDetail.set(null);
  }

  ticketUrl(ticket: ActiveTicket): string {
    return `https://issuetracker.google.com/issues?q=${encodeURIComponent(ticket.ticketId)}`;
  }

  newChildTicketUrl(hover: HoverState): string {
    const masterTicket = hover.tickets?.masterTicket;
    const title = `${hover.row.code} ${hover.resultName ?? ''} child follow-up`.trim();
    const details = [
      `ATQ: ${hover.row.code}`,
      `Domain: ${hover.row.domain}`,
      `Build: ${this.filters.buildVersion}`,
      masterTicket ? `Master ticket: ${masterTicket.ticketId}` : '',
      hover.resultName ? `Result: ${hover.resultName}` : '',
      `Status: ${this.rowStatusLabel(hover.row)}`,
    ].filter(Boolean).join('\n');

    return `https://issuetracker.google.com/issues/new?title=${encodeURIComponent(title)}&description=${encodeURIComponent(details)}`;
  }

  rowHasFailure(row: AtqRow): boolean {
    return row.classic.status === 'fail' || row.le.status === 'fail';
  }

  rowStatusLabel(row: AtqRow): string {
    if (this.rowHasFailure(row) && !row.hasChildTicket) {
      return 'Needs child';
    }

    if (this.rowHasFailure(row) && row.hasChildTicket) {
      return 'Child active';
    }

    if (row.hasChildTicket) {
      return 'Monitoring';
    }

    return 'Clear';
  }

  resultSeverity(row: AtqRow, result: 'classic' | 'le'): 'critical' | 'warning' | 'missing' | 'normal' {
    const status = row[result].status;

    if (status === 'fail') {
      return row.hasChildTicket ? 'warning' : 'critical';
    }

    if (status === 'no-data') {
      return 'missing';
    }

    return 'normal';
  }

  isHoverSource(row: AtqRow, result: 'Classic' | 'LE'): boolean {
    const hover = this.hoverDetail();
    return hover?.sourceKey === `${row.id}:ticket:${result}`;
  }

  private sortRank(row: AtqRow): number {
    return Math.min(this.resultRank(row, 'classic'), this.resultRank(row, 'le'));
  }

  private compareRows(left: AtqRow, right: AtqRow): number {
    const rankDiff = this.sortRank(left) - this.sortRank(right);

    if (this.sortMode() === 'domain') {
      const domainDiff = left.domain.localeCompare(right.domain);
      return domainDiff || rankDiff || this.compareAtqCodes(left.code, right.code);
    }

    return rankDiff || this.compareAtqCodes(left.code, right.code);
  }

  private compareAtqCodes(left: string, right: string): number {
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
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

  private loadTickets(sourceKey: string, row: AtqRow): void {
    this.dashboardService.getTicketBundle(row.id, this.filters).subscribe({
      next: (tickets) => {
        const current = this.hoverDetail();
        if (current?.sourceKey !== sourceKey) {
          return;
        }

        this.hoverDetail.set({
          ...current,
          tickets,
          loading: false,
        });
      },
      error: () => {
        const current = this.hoverDetail();
        if (current?.sourceKey === sourceKey) {
          this.hoverDetail.set({ ...current, tickets: null, loading: false });
        }
      },
    });
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
    }, 1500);
  }

  private clearPinTimer(): void {
    if (!this.pinTimer) {
      return;
    }

    clearTimeout(this.pinTimer);
    this.pinTimer = null;
  }

  private retainPinnedSource(sourceKey: string): boolean {
    const current = this.hoverDetail();
    return current?.sourceKey === sourceKey && current.pinned;
  }

  private isPointerInsideActiveArea(target: EventTarget | null, sourceKey: string): boolean {
    if (!(target instanceof Element)) {
      return false;
    }

    if (target.closest('.detail-popover')) {
      return true;
    }

    const source = target.closest<HTMLElement>('[data-hover-source]');
    return source?.dataset['hoverSource'] === sourceKey;
  }

  private schedulePinnedClose(sourceKey: string): void {
    this.clearCloseTimer();
    this.closeTimer = setTimeout(() => {
      const current = this.hoverDetail();
      if (current?.sourceKey !== sourceKey) {
        return;
      }

      this.closeTooltip();
    }, 180);
  }

  private clearCloseTimer(): void {
    if (!this.closeTimer) {
      return;
    }

    clearTimeout(this.closeTimer);
    this.closeTimer = null;
  }

  private tooltipPosition(event: MouseEvent, kind: HoverKind): { x: number; y: number; maxHeight: number } {
    const margin = 16;
    const gap = 12;
    const popoverWidth = 390;
    const minimumVisibleHeight = kind === 'ticket' ? 180 : 160;
    const preferredHeight = kind === 'ticket' ? 620 : 240;
    const spaceBelow = window.innerHeight - event.clientY - gap - margin;
    const spaceAbove = event.clientY - gap - margin;
    let x = event.clientX + gap;
    let y = spaceBelow >= minimumVisibleHeight || spaceBelow >= spaceAbove
      ? event.clientY + gap
      : event.clientY - minimumVisibleHeight - gap;

    if (x + popoverWidth + margin > window.innerWidth) {
      x = event.clientX - popoverWidth - gap;
    }

    const maxX = Math.max(margin, window.innerWidth - popoverWidth - margin);
    const maxY = Math.max(margin, window.innerHeight - minimumVisibleHeight - margin);
    const clampedY = Math.max(margin, Math.min(y, maxY));

    return {
      x: Math.max(margin, Math.min(x, maxX)),
      y: clampedY,
      maxHeight: Math.min(
        preferredHeight,
        Math.max(minimumVisibleHeight, window.innerHeight - clampedY - margin),
      ),
    };
  }
}
