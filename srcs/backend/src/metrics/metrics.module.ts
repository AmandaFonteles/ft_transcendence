import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    {
      // APP_INTERCEPTOR binds the interceptor GLOBALLY, from inside this
      // module. The alternative, app.useGlobalInterceptors() in main.ts, would
      // (a) modify a shared file and (b) instantiate the interceptor outside
      // the DI container, so it could not receive MetricsService by injection.
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  // Exported so a teammate can inject MetricsService to add a business metric
  // later (e.g. a cards_moved_total counter) by importing MetricsModule.
  exports: [MetricsService],
})
export class MetricsModule {}