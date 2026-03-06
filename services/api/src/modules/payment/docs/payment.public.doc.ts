import { HttpStatus, applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocDefault,
    DocOneOf,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumPaymentStatusCodeError } from '@modules/payment/enums/payment.status-code.enum';
import { PaymentChargeCardRequestDto } from '@modules/payment/dtos/request/payment.charge-card.request.dto';
import { Payment3dsCompleteRequestDto } from '@modules/payment/dtos/request/payment.3ds-complete.request.dto';
import { PaymentChargeBankTransferRequestDto } from '@modules/payment/dtos/request/payment.charge-bank-transfer.request.dto';
import { PaymentChargeUssdRequestDto } from '@modules/payment/dtos/request/payment.charge-ussd.request.dto';
import { PaymentCompleteUssdRequestDto } from '@modules/payment/dtos/request/payment.complete-ussd.request.dto';
import { PaymentChargeCardResponseDto } from '@modules/payment/dtos/response/payment.charge-card.response.dto';
import { PaymentVerifyResponseDto } from '@modules/payment/dtos/response/payment.verify.response.dto';

export function PaymentPublicChargeCardDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Charge a card',
            description: `
Initiates a card payment. Card data is never stored — it is tokenized into a short-lived MPGS session server-side.

**The response \`status\` field tells you what to do next:**

| status | Meaning | Next step |
|--------|---------|-----------|
| \`success\` | Card charged immediately — no 3DS was required | Done. Show success to the user. |
| \`3ds_required\` | Card issuer requires 3DS authentication | Inject \`threeDsHtml\` into the page, wait for challenge, then call POST /charge/card/3ds-complete |
| \`failed\` | Card declined by the network | Show an error to the user. |

**Not every card triggers 3DS.** Whether 3DS is required depends on the card issuer and the risk profile of the transaction. Many cards will go straight to \`success\` or \`failed\` with no challenge.

---

**Authentication:** \`x-api-key\` header — format: \`{key}:{secret}\`

**Amount:** Always the smallest currency unit — ₦1,000 = \`100000\` (kobo), $10 = \`1000\` (cents)
            `.trim(),
        }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: PaymentChargeCardRequestDto,
        }),
        DocResponse<PaymentChargeCardResponseDto>('payment.chargeCard', {
            dto: PaymentChargeCardResponseDto,
        }),
        DocDefault({
            httpStatus: HttpStatus.NOT_FOUND,
            statusCode: EnumPaymentStatusCodeError.merchantNotFound,
            messagePath: 'payment.error.merchantNotFound',
        }),
        DocOneOf(
            HttpStatus.BAD_REQUEST,
            {
                statusCode: EnumPaymentStatusCodeError.processorError,
                messagePath: 'payment.error.processorError',
            },
            {
                statusCode: EnumPaymentStatusCodeError.chargeDeclined,
                messagePath: 'payment.error.chargeDeclined',
            }
        )
    );
}

export function PaymentPublicComplete3dsDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Complete a 3DS card payment',
            description: `
Finalises a card payment after the payer has completed the 3DS challenge.

**Only call this when \`POST /charge/card\` returned \`status: "3ds_required"\`.**

**How it works:**
1. \`POST /charge/card\` returns \`threeDsHtml\` — inject it into the page (it renders a bank OTP/challenge iframe).
2. The payer completes (or cancels) the authentication.
3. Detect completion via \`postMessage\` from the iframe, or by polling \`GET /verify/:reference\` until status changes from \`processing\`.
4. Call this endpoint with the original \`reference\`.

**Response statuses:**

| status | Meaning |
|--------|---------|
| \`success\` | 3DS passed, payment approved |
| \`failed\` | 3DS passed but card declined, or authentication failed |

Returns \`400 transactionAlreadyProcessed\` if called more than once on the same reference.
            `.trim(),
        }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: Payment3dsCompleteRequestDto,
        }),
        DocResponse<PaymentChargeCardResponseDto>('payment.3dsComplete', {
            dto: PaymentChargeCardResponseDto,
        }),
        DocDefault({
            httpStatus: HttpStatus.NOT_FOUND,
            statusCode: EnumPaymentStatusCodeError.transactionNotFound,
            messagePath: 'payment.error.transactionNotFound',
        }),
        DocDefault({
            httpStatus: HttpStatus.BAD_REQUEST,
            statusCode: EnumPaymentStatusCodeError.transactionAlreadyProcessed,
            messagePath: 'payment.error.transactionAlreadyProcessed',
        })
    );
}

export function PaymentPublicChargeBankTransferDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Charge via bank transfer',
            description: `
Creates a transaction and generates a temporary Wema Bank virtual account. The customer transfers the exact amount to the account to complete payment.

**Flow:**
1. Call this endpoint with amount and email.
2. Display the returned \`accountNumber\`, \`bankName\`, and \`accountName\` to the customer.
3. Customer transfers the exact amount from their bank app.
4. AlatPay sends a webhook when payment is received, or poll \`GET /verify/:reference\`.

**The virtual account expires after ~24 hours** (see \`expiresAt\`).

**Amount:** Always the smallest currency unit — ₦1,000 = \`100000\` (kobo).
            `.trim(),
        }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: PaymentChargeBankTransferRequestDto,
        }),
        DocDefault({
            httpStatus: HttpStatus.NOT_FOUND,
            statusCode: EnumPaymentStatusCodeError.merchantNotFound,
            messagePath: 'payment.error.merchantNotFound',
        })
    );
}

export function PaymentPublicChargeUssdDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Charge via phone number (USSD)',
            description: `
Creates a transaction and initiates a phone-number direct debit via AlatPay. A prompt is sent to the customer's phone to authorize the payment.

**Flow:**
1. Call this endpoint with amount, email, and phoneNumber.
2. The response returns \`status: "pending"\` and a \`reference\`.
3. Call \`POST /charge/ussd/complete\` with the reference and phoneNumber to trigger the phone prompt.
4. The customer approves on their phone.
5. AlatPay sends a webhook, or poll \`GET /verify/:reference\`.

**Amount:** Always the smallest currency unit — ₦1,000 = \`100000\` (kobo).
            `.trim(),
        }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: PaymentChargeUssdRequestDto,
        }),
        DocDefault({
            httpStatus: HttpStatus.NOT_FOUND,
            statusCode: EnumPaymentStatusCodeError.merchantNotFound,
            messagePath: 'payment.error.merchantNotFound',
        })
    );
}

export function PaymentPublicCompleteUssdDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Complete a phone number payment',
            description: `
Triggers the phone prompt for a previously initialized phone-number payment.

**Only call this after \`POST /charge/ussd\` returned a reference.**

The customer will receive a prompt on their phone to approve the debit. Poll \`GET /verify/:reference\` or wait for the webhook to confirm the result.

**Response statuses:**

| status | Meaning |
|--------|---------|
| \`success\` | Payment approved immediately |
| \`pending\` | Prompt sent to phone, awaiting approval |
| \`failed\` | Payment declined |
            `.trim(),
        }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: PaymentCompleteUssdRequestDto,
        }),
        DocDefault({
            httpStatus: HttpStatus.NOT_FOUND,
            statusCode: EnumPaymentStatusCodeError.transactionNotFound,
            messagePath: 'payment.error.transactionNotFound',
        }),
        DocDefault({
            httpStatus: HttpStatus.BAD_REQUEST,
            statusCode: EnumPaymentStatusCodeError.transactionAlreadyProcessed,
            messagePath: 'payment.error.transactionAlreadyProcessed',
        })
    );
}

export function PaymentPublicVerifyDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Verify a transaction',
            description: `
Returns the current status and details of any transaction by its reference.

**Use this to:**
- Confirm a card payment completed (poll until \`status\` is \`success\` or \`failed\`).
- Retrieve the amount, fees, channel, and paid-at timestamp.

**Transaction statuses:**

| Status | Meaning |
|--------|---------|
| \`pending\` | Transaction created, charge not yet started |
| \`processing\` | Charge in progress — awaiting 3DS completion or network response |
| \`success\` | Payment confirmed |
| \`failed\` | Payment declined or error occurred |
            `.trim(),
        }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            params: [
                {
                    name: 'reference',
                    description:
                        'Transaction reference returned by the charge endpoint (e.g. VPY_MMARA6NS_B19910D6DA76)',
                    required: true,
                    type: 'string',
                    example: 'VPY_MMARA6NS_B19910D6DA76',
                },
            ],
        }),
        DocResponse<PaymentVerifyResponseDto>('payment.verify', {
            dto: PaymentVerifyResponseDto,
        }),
        DocDefault({
            httpStatus: HttpStatus.NOT_FOUND,
            statusCode: EnumPaymentStatusCodeError.transactionNotFound,
            messagePath: 'payment.error.transactionNotFound',
        })
    );
}
