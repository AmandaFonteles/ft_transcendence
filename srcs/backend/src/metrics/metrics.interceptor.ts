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
// Un interceptor s'execute avant le controller et reagit a nouveau une fois le
// travail termine : c'est la qu'on mesure la duree d'une requete.
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Un evenement WebSocket n'a pas de reponse HTTP a mesurer.
    if (context.getType() !== 'http') {
      return next.handle();
    }

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

  private getRoute(req: Request): string {
    const pattern = req.route?.path;
    if (!pattern) {
      return 'unmatched';
    }
    return req.baseUrl + pattern;
  }
}