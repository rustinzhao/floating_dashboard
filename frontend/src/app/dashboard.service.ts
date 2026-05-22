import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface DashboardFilters {
  serviceVersion: string;
  phoneModel: string;
  buildVersion: string;
}

export interface SummaryMetric {
  label: string;
  value: number;
}

export interface ResultMetric {
  label: string;
  value: string;
  status: 'pass' | 'fail' | 'no-data' | 'neutral';
}

export interface AtqRow {
  id: string;
  code: string;
  description: string;
  atqExplanation: string;
  domain: string;
  target: string;
  targetExplanation: string;
  hasActiveTicket: boolean;
  hasChildTicket: boolean;
  classic: ResultMetric;
  le: ResultMetric;
}

export interface DashboardPayload {
  filterOptions: {
    serviceVersions: string[];
    phoneModels: string[];
    buildVersions: string[];
  };
  overview: {
    top40: SummaryMetric[];
    nonTop40: SummaryMetric[];
  };
  rows: AtqRow[];
}

export interface ActiveTicket {
  ticketId: string;
  title: string;
  status: string;
  owner: string;
  queue: string;
  updatedAt: string;
}

export interface TicketBundle {
  masterTicket: ActiveTicket;
  childTicket: ActiveTicket | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = '/api';

  getDashboard(filters: DashboardFilters): Observable<DashboardPayload> {
    return this.http.get<DashboardPayload>(`${this.apiBase}/dashboard`, {
      params: this.toParams(filters),
    });
  }

  getActiveTicket(atqId: string, filters: DashboardFilters): Observable<ActiveTicket | null> {
    return this.http.get<ActiveTicket | null>(`${this.apiBase}/atqs/${atqId}/active-ticket`, {
      params: this.toParams(filters),
    });
  }

  getTicketBundle(atqId: string, filters: DashboardFilters): Observable<TicketBundle> {
    return this.http.get<TicketBundle>(`${this.apiBase}/atqs/${atqId}/tickets`, {
      params: this.toParams(filters),
    });
  }

  private toParams(filters: DashboardFilters): HttpParams {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params = params.set(key, value);
      }
    });

    return params;
  }
}
