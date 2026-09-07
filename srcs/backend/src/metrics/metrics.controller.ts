import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async scrape(@Res() res: Response): Promise<void> {
    // registry.metrics() is async: default metrics are READ at this moment
    // (event loop lag, heap, open handles), not cached.
    const body = await this.metrics.registry.metrics();

    res.setHeader('Content-Type', this.metrics.registry.contentType);
    res.send(body);
  }
}