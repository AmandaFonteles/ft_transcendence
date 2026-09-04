import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

// Global prefix '/api' is applied in main.ts, so this resolves to /api/metrics.
// No change to main.ts is needed, and none should be made: it is a shared file.
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async scrape(@Res() res: Response): Promise<void> {
    // registry.metrics() is async: default metrics are READ at this moment
    // (event loop lag, heap, open handles), not cached.
    const body = await this.metrics.registry.metrics();

    // 'text/plain; version=0.0.4; charset=utf-8'. Prometheus is tolerant, but
    // sending application/json here is the classic reason a target scrapes
    // "successfully" and yields nothing.
    res.setHeader('Content-Type', this.metrics.registry.contentType);
    res.send(body);
  }
}