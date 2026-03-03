import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

@Controller({
    version: VERSION_NEUTRAL,
    path: '/health',
})
export class HealthPublicController {
    @Get('/liveness')
    liveness(): { status: string } {
        return { status: 'ok' };
    }
}
