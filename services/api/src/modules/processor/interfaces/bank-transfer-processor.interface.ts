import {
    IAccountResolveResult,
    IBankInfo,
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

    listBanks(): Promise<IBankInfo[]>;

    resolveAccount(
        bankCode: string,
        accountNumber: string
    ): Promise<IAccountResolveResult>;

    validateWebhook(
        payload: Record<string, unknown>,
        headers: Record<string, string>
    ): Promise<IWebhookEvent>;
}
