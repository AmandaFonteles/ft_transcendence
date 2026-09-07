// Make the backend expose a Prometheus-format /api/metrics endpoint carrying per-route HTTP metrics
//  plus Node.js runtime metrics, and add a backend scrape job so Prometheus collects them.

//import metrics
import { Injectable } from '@nestjs/common';
import {
	Counter,
	Gauge,
	Histogram,
	Registry,
	collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService {
	// Creating a Registry
	public readonly registry = new Registry();

	//init metrics
	public readonly httpRequestsTotal: Counter<'method' | 'route' | 'status'>;
	public readonly httpRequestDuration: Histogram<'method' | 'route' | 'status'>;
	public readonly httpRequestsInFlight: Gauge<'method'>;

	constructor() {
		//collect metrics
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

		//we use just method label here to keep the cardinality low
		this.httpRequestsInFlight = new Gauge({
			name: 'http_requests_in_flight',
			help: 'Number of HTTP requests currently being processed.',
			labelNames: ['method'] as const,
			registers: [this.registry],
		});
	}

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