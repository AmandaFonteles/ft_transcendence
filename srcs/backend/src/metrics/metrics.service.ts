import { Injectable } from '@nestjs/common';
import {
	Counter,
	Gauge,
	Histogram,
	Registry,
	collectDefaultMetrics,
} from 'prom-client';

@Injectable()
// Expose les metriques HTTP par route plus les metriques runtime Node, au format
// Prometheus, sur /api/metrics.
export class MetricsService {
	public readonly registry = new Registry();

	public readonly httpRequestsTotal: Counter<'method' | 'route' | 'status'>;
	public readonly httpRequestDuration: Histogram<'method' | 'route' | 'status'>;
	public readonly httpRequestsInFlight: Gauge<'method'>;

	constructor() {
		collectDefaultMetrics({ register: this.registry });

		this.httpRequestsTotal = new Counter({
			name: 'http_requests_total',
			help: 'Total number of HTTP requests, by method, route and status.',
			labelNames: ['method', 'route', 'status'] as const,
			registers: [this.registry],
		});

		this.httpRequestDuration = new Histogram({
			name: 'http_request_duration_seconds',
			help: 'HTTP request latency in seconds.',
			labelNames: ['method', 'route', 'status'] as const,
			buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
			registers: [this.registry],
		});

		this.httpRequestsInFlight = new Gauge({
			name: 'http_requests_in_flight',
			help: 'Number of HTTP requests currently being processed.',
			labelNames: ['method'] as const,
			registers: [this.registry],
		});
	}

	// Seul le label "method" est ajoute au vol : garde la cardinalite basse.
	observeRequest(
		method: string,
		route: string,
		status: number,
		durationSeconds: number,
	): void {
		const labels = { method, route, status: String(status) };
		this.httpRequestsTotal.inc(labels);
		this.httpRequestDuration.observe(labels, durationSeconds);
	}
}