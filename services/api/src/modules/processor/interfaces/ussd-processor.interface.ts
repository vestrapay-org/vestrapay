import {
    IUssdChargeParams,
    IUssdChargeResult,
    IUssdCompleteParams,
    IUssdCompleteResult,
    IUssdVerifyResult,
    IWebhookEvent,
} from '@modules/processor/interfaces/processor-response.interface';

export interface IUssdProcessor {
    initiateCharge(params: IUssdChargeParams): Promise<IUssdChargeResult>;

    completeCharge(params: IUssdCompleteParams): Promise<IUssdCompleteResult>;

    verifyCharge(reference: string): Promise<IUssdVerifyResult>;

    validateWebhook(
        payload: Record<string, unknown>,
        headers: Record<string, string>
    ): Promise<IWebhookEvent>;
}
