import {
    IUssdChargeParams,
    IUssdChargeResult,
    IUssdVerifyResult,
    IWebhookEvent,
} from '@modules/processor/interfaces/processor-response.interface';

export interface IUssdProcessor {
    initiateCharge(params: IUssdChargeParams): Promise<IUssdChargeResult>;

    verifyCharge(reference: string): Promise<IUssdVerifyResult>;

    validateWebhook(
        payload: Record<string, unknown>,
        headers: Record<string, string>
    ): Promise<IWebhookEvent>;
}
