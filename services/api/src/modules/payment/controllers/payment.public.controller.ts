import {
    Body,
    Controller,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Res,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Response } from '@common/response/decorators/response.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { RequestIPAddress } from '@common/request/decorators/request.decorator';
import { PaymentService } from '@modules/payment/services/payment.service';
import { PaymentChargeCardRequestDto } from '@modules/payment/dtos/request/payment.charge-card.request.dto';
import { PaymentChargeBankTransferRequestDto } from '@modules/payment/dtos/request/payment.charge-bank-transfer.request.dto';
import { PaymentChargeUssdRequestDto } from '@modules/payment/dtos/request/payment.charge-ussd.request.dto';
import { Payment3dsCompleteRequestDto } from '@modules/payment/dtos/request/payment.3ds-complete.request.dto';
import { PaymentCompleteUssdRequestDto } from '@modules/payment/dtos/request/payment.complete-ussd.request.dto';
import { Response as ExpressResponse } from 'express';
import {
    PaymentPublicChargeCardDoc,
    PaymentPublicChargeBankTransferDoc,
    PaymentPublicChargeUssdDoc,
    PaymentPublicComplete3dsDoc,
    PaymentPublicCompleteUssdDoc,
    PaymentPublicVerifyDoc,
} from '@modules/payment/docs/payment.public.doc';

@ApiTags('modules.public.payment')
@Controller({
    version: '1',
    path: '/payment',
})
export class PaymentPublicController {
    constructor(private readonly paymentService: PaymentService) {}

    @PaymentPublicChargeCardDoc()
    @Response('payment.chargeCard')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/charge/card')
    async chargeCard(
        @Body() body: PaymentChargeCardRequestDto,
        @RequestIPAddress() ipAddress: string
    ) {
        return {
            data: await this.paymentService.chargeCard(body, ipAddress),
        };
    }

    @PaymentPublicComplete3dsDoc()
    @Response('payment.3dsComplete')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/charge/card/3ds-complete')
    async complete3ds(@Body() body: Payment3dsCompleteRequestDto) {
        return {
            data: await this.paymentService.complete3ds(body.reference),
        };
    }

    @ApiExcludeEndpoint()
    @Post('/3ds-callback')
    async threeDsCallbackPost(@Res() res: ExpressResponse) {
        return this.handleThreeDsCallback(res);
    }

    @ApiExcludeEndpoint()
    @Get('/3ds-callback')
    async threeDsCallbackGet(@Res() res: ExpressResponse) {
        return this.handleThreeDsCallback(res);
    }

    private async handleThreeDsCallback(res: ExpressResponse) {
        const result = await this.paymentService.handle3dsCallback();
        const color = result.status === 'success' ? '#22c55e' : '#ef4444';
        res.setHeader('Content-Type', 'text/html');
        res.removeHeader('X-Frame-Options');
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-src *; frame-ancestors *;");
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>VestraPay - Payment Result</title></head>
            <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fafb;">
                <div style="text-align:center;padding:40px;background:white;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                    <div style="font-size:48px;margin-bottom:16px;">${result.status === 'success' ? '&#10003;' : '&#10007;'}</div>
                    <h1 style="color:${color};margin:0 0 8px;">${result.status === 'success' ? 'Payment Successful' : 'Payment Failed'}</h1>
                    <p style="color:#6b7280;margin:0 0 16px;">Reference: ${result.reference}</p>
                    <pre style="background:#f3f4f6;padding:16px;border-radius:8px;text-align:left;font-size:12px;">${JSON.stringify(result, null, 2)}</pre>
                </div>
                <script>
                    try { window.parent.postMessage(${JSON.stringify(result)}, '*'); } catch(e) {}
                </script>
            </body>
            </html>
        `);
    }

    @ApiExcludeEndpoint()
    @Get('/test-checkout')
    async testCheckout(@Res() res: ExpressResponse) {
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-src *;");
        res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VestraPay Test Checkout</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#f0f2f5;min-height:100vh;display:flex;align-items:center;justify-content:center}
.c{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.1);padding:40px;width:440px}
h1{font-size:22px;margin-bottom:4px}
.sub{color:#6b7280;margin-bottom:20px;font-size:13px}
.f{margin-bottom:14px}label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px}
input{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px}
.r{display:flex;gap:10px}.r .f{flex:1}
button{width:100%;padding:13px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;margin-top:6px}
button:hover{background:#4f46e5}button:disabled{background:#9ca3af;cursor:not-allowed}
#s{margin-top:14px;padding:10px;border-radius:8px;font-size:12px;display:none}
.si{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
.ss{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}
.se{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
#tc{margin-top:14px}
</style>
</head>
<body>
<div class="c">
<h1>VestraPay Test Checkout</h1>
<p class="sub">Test card: 5123450000000008 | Expiry: 01/39 | CVV: 100</p>
<div class="f"><label>Amount (NGN)</label><input type="number" id="amt" value="1000" min="1"></div>
<div class="f"><label>Email</label><input type="email" id="em" value="test@example.com"></div>
<div class="f"><label>Card Number</label><input type="text" id="cn" value="5123450000000008"></div>
<div class="r">
<div class="f"><label>Exp Month</label><input type="text" id="mm" value="01" maxlength="2"></div>
<div class="f"><label>Exp Year</label><input type="text" id="yy" value="39" maxlength="2"></div>
<div class="f"><label>CVV</label><input type="text" id="cv" value="100" maxlength="4"></div>
</div>
<div class="f"><label>API Key (key:secret)</label><input type="text" id="ak" placeholder="fyFGb7ywyM37TqDY8nuhAmGW5:secret..."></div>
<button id="btn" onclick="pay()">Pay Now</button>
<div id="s"></div>
<div id="tc"></div>
<div id="rd" style="display:none;margin-top:14px;padding:14px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;text-align:left;font-size:13px"></div>
</div>
<script>
const B=window.location.origin+'/api/v1/public/payment';
function ss(m,t){const e=document.getElementById('s');e.textContent=m;e.className='s'+t;e.style.display='block'}
function showResult(d){
const rd=document.getElementById('rd');
rd.innerHTML='<h3 style="margin:0 0 8px;font-size:14px;">Payment Result</h3>'+
'<div style="margin-bottom:6px"><b>Status:</b> <span style="color:'+(d.status==='success'?'#166534':'#991b1b')+'">'+d.status+'</span></div>'+
'<div style="margin-bottom:6px"><b>Reference:</b> '+d.reference+'</div>'+
'<pre style="background:#f3f4f6;padding:10px;border-radius:6px;font-size:11px;overflow-x:auto;margin-top:8px">'+JSON.stringify(d,null,2)+'</pre>';
rd.style.display='block';
}
window.addEventListener('message',function(ev){
if(ev.data&&ev.data.reference){
document.getElementById('tc').innerHTML='';
const d=ev.data;const btn=document.getElementById('btn');
if(d.status==='success'){ss('Payment Successful! Ref: '+d.reference,'s');btn.textContent='Paid!'}
else{ss('Payment Failed','e');btn.disabled=false;btn.textContent='Try Again'}
showResult(d);
}
});
async function pay(){
const K=document.getElementById('ak').value.trim();
if(!K){ss('Enter your API key first','e');return}
const btn=document.getElementById('btn');btn.disabled=true;btn.textContent='Processing...';
document.getElementById('rd').style.display='none';document.getElementById('tc').innerHTML='';
ss('Sending to MPGS...','i');
try{
const r=await fetch(B+'/charge/card',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':K},
body:JSON.stringify({amount:parseInt(document.getElementById('amt').value)*100,currency:'NGN',
email:document.getElementById('em').value,
card:{number:document.getElementById('cn').value.replace(/\\s/g,''),
cvv:document.getElementById('cv').value,
expiryMonth:document.getElementById('mm').value,
expiryYear:document.getElementById('yy').value}})});
const j=await r.json();const d=j.data;
if(d.status==='success'){ss('Payment Successful! Ref: '+d.reference,'s');showResult(d);btn.textContent='Paid!';return}
if(d.status==='3ds_required'){
ss('3DS challenge loaded below. Complete it to finish payment.','i');
const tc=document.getElementById('tc');
tc.innerHTML=d.threeDsHtml;
tc.querySelectorAll('script').forEach(s=>{const n=document.createElement('script');n.textContent=s.textContent;s.parentNode.replaceChild(n,s)});
btn.textContent='Complete 3DS below...';return}
if(d.status==='failed'){ss('Payment failed','e');showResult(d);btn.disabled=false;btn.textContent='Try Again';return}
ss(JSON.stringify(d),'e');
}catch(e){ss('Error: '+e.message,'e');btn.disabled=false;btn.textContent='Try Again'}}
</script>
</body>
</html>`);
    }

    @PaymentPublicChargeBankTransferDoc()
    @Response('payment.chargeBankTransfer')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/charge/bank-transfer')
    async chargeBankTransfer(
        @Body() body: PaymentChargeBankTransferRequestDto
    ) {
        return {
            data: await this.paymentService.chargeBankTransfer(body),
        };
    }

    @PaymentPublicChargeUssdDoc()
    @Response('payment.chargeUssd')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/charge/ussd')
    async chargeUssd(@Body() body: PaymentChargeUssdRequestDto) {
        return { data: await this.paymentService.chargeUssd(body) };
    }

    @PaymentPublicCompleteUssdDoc()
    @Response('payment.completeUssd')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/charge/ussd/complete')
    async completeUssd(@Body() body: PaymentCompleteUssdRequestDto) {
        return {
            data: await this.paymentService.completeUssd(
                body.reference,
                body.phoneNumber
            ),
        };
    }

    @ApiExcludeEndpoint()
    @HttpCode(HttpStatus.OK)
    @Post('/webhook/alatpay')
    async alatpayWebhook(
        @Body() body: Record<string, unknown>,
        @Headers() headers: Record<string, string>
    ) {
        // Determine channel from payload and route to appropriate handler
        const data = body.data as Record<string, unknown> | undefined;
        const channel = (data?.channel as string) ?? '';

        if (
            channel === 'ussd' ||
            channel === 'phone' ||
            channel === 'phone_number'
        ) {
            await this.paymentService.handleAlatpayUssdWebhook(body, headers);
        } else {
            await this.paymentService.handleAlatpayWebhook(body, headers);
        }

        return { status: 'ok' };
    }

    @ApiExcludeEndpoint()
    @HttpCode(HttpStatus.OK)
    @Post('/webhook/korapay')
    async korapayWebhook(
        @Body() body: Record<string, unknown>,
        @Headers() headers: Record<string, string>
    ) {
        await this.paymentService.handleKorapayWebhook(body, headers);
        return { status: 'ok' };
    }

    @PaymentPublicVerifyDoc()
    @Response('payment.verify')
    @ApiKeyProtected()
    @Get('/verify/:reference')
    async verify(@Param('reference') reference: string) {
        return { data: await this.paymentService.verify(reference) };
    }
}
