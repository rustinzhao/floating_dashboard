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

interface TicketHoverState {
  row: AtqRow;
  ticket: ActiveTicket | null;
  loading: boolean;
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
  readonly selectedDomain = signal('Audio');
  readonly hoveredTicket = signal<TicketHoverState | null>(null);

  filters: DashboardFilters = {
    serviceVersion: '',
    phoneModel: '',
    buildVersion: 'release_5.203',
  };

  readonly domains = computed(() => {
    const domainSet = new Set(this.dashboard()?.rows.map((row) => row.domain) ?? []);
    return Array.from(domainSet);
  });

  readonly visibleRows = computed(() => {
    const rows = this.dashboard()?.rows ?? [];
    return rows.filter((row) => row.domain === this.selectedDomain());
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.dashboardService.getDashboard(this.filters).subscribe({
      next: (payload) => {
        this.dashboard.set(payload);
        this.loading.set(false);

        if (!this.domains().includes(this.selectedDomain())) {
          this.selectedDomain.set(this.domains()[0] ?? 'Audio');
        }
      },
      error: () => {
        this.errorMessage.set('Unable to load dashboard data from the API.');
        this.loading.set(false);
      },
    });
  }

  showTicket(event: MouseEvent, row: AtqRow): void {
    this.hoveredTicket.set({
      row,
      ticket: null,
      loading: true,
      x: event.clientX + 18,
      y: event.clientY + 18,
    });

    this.dashboardService.getActiveTicket(row.id, this.filters).subscribe({
      next: (ticket) => {
        const current = this.hoveredTicket();
        if (current?.row.id !== row.id) {
          return;
        }

        this.hoveredTicket.set({
          ...current,
          ticket,
          loading: false,
        });
      },
      error: () => {
        const current = this.hoveredTicket();
        if (current?.row.id === row.id) {
          this.hoveredTicket.set({ ...current, ticket: null, loading: false });
        }
      },
    });
  }

  moveTicket(event: MouseEvent): void {
    const current = this.hoveredTicket();
    if (!current) {
      return;
    }

    this.hoveredTicket.set({
      ...current,
      x: event.clientX + 18,
      y: event.clientY + 18,
    });
  }

  hideTicket(): void {
    this.hoveredTicket.set(null);
  }
}
