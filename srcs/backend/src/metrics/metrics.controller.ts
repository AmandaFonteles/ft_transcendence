import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async scrape(@Res() res: Response): Promise<void> {
    // registry.metrics() est asynchrone : les metriques par defaut (event loop,
    // tas, handles ouverts) sont lues a cet instant, pas mises en cache.
    const body = await this.metrics.registry.metrics();

    res.setHeader('Content-Type', this.metrics.registry.contentType);
    res.send(body);
  }
}