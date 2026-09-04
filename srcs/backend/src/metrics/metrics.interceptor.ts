// Interceptor - piece of code that runs before a controller does its work and 
// can react again when the work is finished. We use this interceptor here to
// collect the metrics of the backend, since NestJS doesn't already have the data we need (like nginx and postgres)
// intercept does that job. We need to call next.handle() to actualy run the controller.

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { MetricsService } from './metrics.service';

const METRICS_ROUTE = '/api/metrics';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

	// WebSocket event don't have http response, so we need switch to http
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const route = this.getRoute(req);
    if (route === METRICS_ROUTE) {
      return next.handle();
    }

    const method = req.method;

    const start = performance.now();

    this.metrics.httpRequestsInFlight.inc({ method });

    res.once('close', () => {
      const durationSeconds = (performance.now() - start) / 1000;

      this.metrics.httpRequestsInFlight.dec({ method });
      this.metrics.observeRequest(method, route, res.statusCode, durationSeconds);
    });

    return next.handle();
  }

  // Returns the route PATTERN ('/api/cards/:id'), never the real URL
  // ('/api/cards/8f3a-...'). Express fills req.route when it matches a handler.
  // Using the real URL would create a new time series per card id, overflowing Prometheus
  private getRoute(req: Request): string {
    const pattern = req.route?.path;
    if (!pattern) {
      return 'unmatched'; 
    }
    return req.baseUrl + pattern;
  }
}