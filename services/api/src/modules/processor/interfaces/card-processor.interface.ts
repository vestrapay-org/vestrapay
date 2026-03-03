import {
    I3dsAuthParams,
    I3dsAuthResult,
    I3dsInitParams,
    I3dsInitResult,
    ICardData,
    ICreateSessionResult,
    IPayParams,
    IPayResult,
    IUpdateSessionResult,
} from '@modules/processor/interfaces/processor-response.interface';

export interface ICardProcessor {
    createSession(): Promise<ICreateSessionResult>;

    updateSessionWithCard(
        sessionId: string,
        card: ICardData
    ): Promise<IUpdateSessionResult>;

    initiate3dsAuth(params: I3dsInitParams): Promise<I3dsInitResult>;

    authenticatePayer(params: I3dsAuthParams): Promise<I3dsAuthResult>;

    pay(params: IPayParams): Promise<IPayResult>;
}
