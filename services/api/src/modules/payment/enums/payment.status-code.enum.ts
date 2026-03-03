export enum EnumPaymentStatusCodeError {
    notFound = 5500,
    transactionNotFound = 5501,
    transactionAlreadyProcessed = 5502,
    transactionExpired = 5503,
    chargeDeclined = 5504,
    processorError = 5505,
    invalidChannel = 5506,
    merchantNotFound = 5507,
    merchantInactive = 5508,
}
