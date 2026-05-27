import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

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

const buildVersions = ['release_5.203', 'release_5.202', 'release_5.201'];

function metric(label: string, value: string, status: ResultMetric['status']): ResultMetric {
  return { label, value, status };
}

function queryLatency(minMs: number, maxMs: number): number {
  return Math.round(minMs + Math.random() * (maxMs - minMs));
}

function baseRows(): AtqRow[] {
  return [
    {
      id: 'atq-9-9',
      code: 'ATQ 9.9',
      description: 'L/R Sync - Microseconds',
      atqExplanation: 'Measures left/right audio synchronization drift. Large values can cause stereo image shift or audible echo.',
      domain: 'Audio',
      target: 'Classic: 200 LE: 26',
      targetExplanation: 'Classic passes when the 95th percentile shift is at or below 200 microseconds. LE uses a stricter 26 microsecond target.',
      hasActiveTicket: false,
      hasChildTicket: false,
      classic: metric('MAX Shift Audio - 95% Tile', 'No Data', 'no-data'),
      le: metric('MAX Shift Audio - 95% Tile', 'No Data', 'no-data'),
    },
    {
      id: 'atq-10-3',
      code: 'ATQ 10.3',
      description: 'Multipoint connection success between LE devices',
      atqExplanation: 'Checks whether two LE devices can complete multipoint connection flows without dropping the active session.',
      domain: 'Audio',
      target: '99%',
      targetExplanation: 'Success rate should be at least 99% across the selected build, model, and service version.',
      hasActiveTicket: false,
      hasChildTicket: false,
      classic: metric('SUCCESS_RATE', 'Not Measured', 'neutral'),
      le: metric('SUCCESS_RATE', 'No Data', 'no-data'),
    },
    {
      id: 'atq-10-5',
      code: 'ATQ 10.5',
      description: 'MP + SASS Off Media_switch_latency - Seconds',
      atqExplanation: 'Measures media switch latency when multipoint is enabled and SASS is disabled.',
      domain: 'Audio',
      target: '3',
      targetExplanation: 'The 95th percentile media switch latency should be 3 seconds or less.',
      hasActiveTicket: false,
      hasChildTicket: false,
      classic: metric('Result Connectivity 95%', '0.79', 'pass'),
      le: metric('Result Connectivity 95%', 'No Data', 'no-data'),
    },
    {
      id: 'atq-10-6',
      code: 'ATQ 10.6',
      description: 'Multipoint Connection times - Seconds',
      atqExplanation: 'Tracks how long multipoint connection setup takes during repeated connection attempts.',
      domain: 'Audio',
      target: '7',
      targetExplanation: 'The 95th percentile connection setup time should be 7 seconds or less.',
      hasActiveTicket: false,
      hasChildTicket: false,
      classic: metric('Result Connectivity 95%', '6.77', 'pass'),
      le: metric('Result Connectivity 95%', 'No Data', 'no-data'),
    },
    {
      id: 'atq-10-10',
      code: 'ATQ 10.10',
      description: 'MP + SASS successful switching rate',
      atqExplanation: 'Measures whether SASS chooses and switches to the expected active audio source.',
      domain: 'Audio',
      target: '99%',
      targetExplanation: 'Successful switching should reach at least 99% for this release slice.',
      hasActiveTicket: true,
      hasChildTicket: true,
      classic: metric('SUCCESS_RATE', '91.89%', 'fail'),
      le: metric('SUCCESS_RATE', 'No Data', 'no-data'),
    },
    {
      id: 'atq-10-19',
      code: 'ATQ 10.19',
      description: 'Number of glitches per hour in QA tests',
      atqExplanation: 'Counts audible glitch events observed during long-running QA playback tests.',
      domain: 'Audio',
      target: '1.40',
      targetExplanation: 'The glitch rate should stay at or below 1.40 events per hour.',
      hasActiveTicket: false,
      hasChildTicket: false,
      classic: metric('Glitches + GAPs', '2.05', 'fail'),
      le: metric('Glitches + GAPs', 'No Data', 'no-data'),
    },
    {
      id: 'atq-11-2',
      code: 'ATQ 11.2',
      description: 'Reconnect after phone handoff',
      atqExplanation: 'Validates reconnect reliability after audio ownership moves from one phone to another.',
      domain: 'Connectivity',
      target: '95%',
      targetExplanation: 'At least 95% of reconnect attempts should complete successfully.',
      hasActiveTicket: false,
      hasChildTicket: false,
      classic: metric('SUCCESS_RATE', '97.22%', 'pass'),
      le: metric('SUCCESS_RATE', '96.13%', 'pass'),
    },
    {
      id: 'atq-11-4',
      code: 'ATQ 11.4',
      description: 'Device discovery to first stream',
      atqExplanation: 'Measures the latency from device discovery to the first usable audio stream.',
      domain: 'Connectivity',
      target: '4',
      targetExplanation: 'The 95th percentile discovery-to-stream time should be 4 seconds or less.',
      hasActiveTicket: true,
      hasChildTicket: true,
      classic: metric('P95 Seconds', '4.81', 'fail'),
      le: metric('P95 Seconds', '3.34', 'pass'),
    },
    {
      id: 'atq-12-1',
      code: 'ATQ 12.1',
      description: 'Sustained playback battery drift',
      atqExplanation: 'Checks battery percentage drift during sustained playback sessions.',
      domain: 'Power',
      target: '2.5%',
      targetExplanation: 'Median battery drift should stay at or below 2.5% for the test window.',
      hasActiveTicket: false,
      hasChildTicket: false,
      classic: metric('Median Drift', '1.8%', 'pass'),
      le: metric('Median Drift', 'No Data', 'no-data'),
    },
    {
      id: 'atq-13-8',
      code: 'ATQ 13.8',
      description: 'Pairing prompt retry recovery',
      atqExplanation: 'Verifies that pairing can recover after a prompt timeout or retry path.',
      domain: 'Pairing',
      target: '98%',
      targetExplanation: 'Retry recovery should succeed at least 98% of the time.',
      hasActiveTicket: true,
      hasChildTicket: true,
      classic: metric('SUCCESS_RATE', '98.10%', 'pass'),
      le: metric('SUCCESS_RATE', '94.60%', 'fail'),
    },
  ];
}

function childTickets(): Record<string, ActiveTicket> {
  return {
    'atq-10-10': {
      ticketId: 'ATQBUG-1775',
      title: 'Regression in SASS switching success rate for Pixel 9 Pro',
      status: 'In Review',
      owner: 'sass-core',
      queue: 'Top 40 Failures',
      updatedAt: '7 min ago',
    },
    'atq-11-4': {
      ticketId: 'ATQBUG-1931',
      title: 'Discovery latency exceeds p95 target on cold start',
      status: 'Active',
      owner: 'bt-platform',
      queue: 'Connectivity',
      updatedAt: '1 hr ago',
    },
    'atq-13-8': {
      ticketId: 'ATQBUG-1868',
      title: 'LE pairing retry flow fails after consent dialog timeout',
      status: 'Active',
      owner: 'pairing-ui',
      queue: 'Pairing',
      updatedAt: '44 min ago',
    },
  };
}

function masterTicket(row: AtqRow, buildVersion: string): ActiveTicket {
  const suffix = row.code.replace('ATQ ', '').replace('.', '');
  const ownerByDomain: Record<string, string> = {
    Audio: 'audio-runtime',
    Connectivity: 'bt-platform',
    Pairing: 'pairing-ui',
    Power: 'power-audio',
  };

  return {
    ticketId: `ATQMASTER-${suffix}`,
    title: `${row.code} ${buildVersion} certification tracking`,
    status: 'Open',
    owner: ownerByDomain[row.domain] ?? 'atq-triage',
    queue: `${row.domain} ATQ`,
    updatedAt: 'Today',
  };
}

function dashboardFor(filters: DashboardFilters): DashboardPayload {
  const rows = baseRows();

  return {
    filterOptions: {
      serviceVersions: ['dc_2026.05', 'dc_2026.04', 'dc_2026.03'],
      phoneModels: ['Pixel 9 Pro', 'Pixel 9', 'Pixel 8a', 'Galaxy S25'],
      buildVersions,
    },
    overview: {
      top40: [
        { label: 'Classic Pass', value: rows.filter((row) => row.classic.status === 'pass').length },
        { label: 'Classic Fail', value: rows.filter((row) => row.classic.status === 'fail').length },
        { label: 'LE Pass', value: rows.filter((row) => row.le.status === 'pass').length },
        { label: 'LE Fail', value: rows.filter((row) => row.le.status === 'fail').length },
      ],
      nonTop40: [
        { label: 'Classic Pass', value: 11 },
        { label: 'Classic Fail', value: 2 },
        { label: 'LE Pass', value: 0 },
        { label: 'LE Fail', value: 0 },
      ],
    },
    rows,
  };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  getDashboard(filters: DashboardFilters): Observable<DashboardPayload> {
    return of(dashboardFor(filters)).pipe(delay(queryLatency(900, 1600)));
  }

  getActiveTicket(atqId: string): Observable<ActiveTicket | null> {
    return of(childTickets()[atqId] ?? null).pipe(delay(queryLatency(450, 900)));
  }

  getTicketBundle(atqId: string, filters: DashboardFilters): Observable<TicketBundle> {
    const buildVersion = filters.buildVersion || buildVersions[0];
    const row = baseRows().find((item) => item.id === atqId) ?? baseRows()[0];

    return of({
      masterTicket: masterTicket(row, buildVersion),
      childTicket: childTickets()[atqId] ?? null,
    }).pipe(delay(queryLatency(550, 950)));
  }
}
