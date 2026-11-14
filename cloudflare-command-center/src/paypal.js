// Invoice amounts and paid state are authoritative on the server.
export class PaymentError extends Error {
 constructor(message,status=502){super(message);this.status=status;}
}
export function paymentConfigured(env){
 return ['sandbox','live'].includes(env.PAYPAL_MODE)&&!!env.PAYPAL_CLIENT_ID&&!!env.PAYPAL_CLIENT_SECRET&&/^[A-Z0-9]{8,20}$/.test(env.PAYPAL_MERCHANT_ID||'');
}
export class InvoicePayments {
 constructor(env,fetcher=fetch){
  if(!paymentConfigured(env))throw new PaymentError('PayPal payments are not configured. Contact Superior to arrange payment.',503);
  this.env=env;this.fetcher=fetcher;
  this.base=env.PAYPAL_MODE==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';
 }
 async request(path,method='GET',body,requestId){
  try{
   const auth=await this.fetcher(this.base+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(this.env.PAYPAL_CLIENT_ID+':'+this.env.PAYPAL_CLIENT_SECRET),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000)});
   if(!auth.ok)throw Error();const token=(await auth.json()).access_token;if(!token)throw Error();
   const response=await this.fetcher(this.base+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...(requestId?{'PayPal-Request-Id':requestId}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error();return await response.json();
  }catch{throw new PaymentError('PayPal could not confirm this payment. Retry to check its status; do not submit another payment.');}
 }
 async requestId(invoice,operation){
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(operation+':'+invoice.id));
  return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,32);
 }
 async create(invoice,returnUrl){
  if(!Number.isFinite(invoice.total)||invoice.total<=0)throw new PaymentError('This invoice has no payable balance.',409);
  const order=await this.request('/v2/checkout/orders','POST',{intent:'CAPTURE',purchase_units:[{custom_id:invoice.id,invoice_id:invoice.id,amount:{currency_code:'USD',value:invoice.total.toFixed(2)},payee:{merchant_id:this.env.PAYPAL_MERCHANT_ID}}],payment_source:{paypal:{experience_context:{user_action:'PAY_NOW',shipping_preference:'NO_SHIPPING',return_url:returnUrl+'?paypal=return',cancel_url:returnUrl+'?paypal=cancel'}}}},await this.requestId(invoice,'create'));
  const href=order.links?.find(l=>['payer-action','approve'].includes(l.rel))?.href;
  let url;try{url=new URL(href);}catch{throw new PaymentError('PayPal approval is unavailable.');}
  const host=this.env.PAYPAL_MODE==='live'?'www.paypal.com':'www.sandbox.paypal.com';
  if(!/^[A-Z0-9]{10,40}$/.test(order.id||'')||url.protocol!=='https:'||url.hostname!==host)throw new PaymentError('PayPal approval is unavailable.');
  return {orderId:order.id,approvalUrl:url.href};
 }
 async capture(invoice){
  const orderId=invoice.paypalOrderId;
  if(!/^[A-Z0-9]{10,40}$/.test(orderId||''))throw new PaymentError('No PayPal order is associated with this invoice.',409);
  let order=await this.request('/v2/checkout/orders/'+orderId);
  if(order.status==='APPROVED'){
   // Recover a lost capture response by reading the same order on retry.
   try{await this.request('/v2/checkout/orders/'+orderId+'/capture','POST',{},await this.requestId(invoice,'capture'));}catch{}
   order=await this.request('/v2/checkout/orders/'+orderId);
  }
  const units=order.purchase_units||[],unit=units[0],captures=unit?.payments?.captures||[],capture=captures[0];
  if(order.id!==orderId||order.status!=='COMPLETED'||units.length!==1||unit.custom_id!==invoice.id||unit.invoice_id!==invoice.id||unit.payee?.merchant_id!==this.env.PAYPAL_MERCHANT_ID||captures.length!==1||capture.status!=='COMPLETED'||capture.final_capture!==true||capture.amount?.currency_code!=='USD'||!/^\d+\.\d{2}$/.test(capture.amount?.value||'')||Number(capture.amount.value)!==invoice.total||!capture.id)throw new PaymentError('PayPal has not confirmed the full invoice payment.',409);
  return {captureId:capture.id,orderId,paidAt:capture.create_time&&Number.isFinite(Date.parse(capture.create_time))?capture.create_time:new Date().toISOString()};
 }
}
