import {
    IVerifyPaymentResult,
    IVirtualAccountParams,
    IVirtualAccountResult,
    IWebhookEvent,
} from '@modules/processor/interfaces/processor-response.interface';

export interface IBankTransferProcessor {
    createVirtualAccount(
        params: IVirtualAccountParams
    ): Promise<IVirtualAccountResult>;

    verifyPayment(paymentId: string): Promise<IVerifyPaymentResult>;

    validateWebhook(
        payload: Record<string, unknown>,
        headers: Record<string, string>
    ): Promise<IWebhookEvent>;
}
