import { Logger } from '@nestjs/common';

export class ProcessorHttpClient {
    constructor(
        private readonly baseUrl: string,
        private readonly headers: Record<string, string>,
        private readonly logger: Logger,
        private readonly timeoutMs = 15_000
    ) {}

    async request(
        method: string,
        path: string,
        body?: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const url = `${this.baseUrl}${path}`;
        this.logger.debug(`${method} ${url}`);

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...this.headers,
            },
            signal: AbortSignal.timeout(this.timeoutMs),
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
            this.logger.error(`HTTP ${response.status} on ${method} ${path}`);
        }

        return data;
    }
}
