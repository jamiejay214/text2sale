/** Shared disclosure used by the public form, consent record and carrier submission. */
export function smsConsentText(name: string, messageTypes: string): string {
  return `By checking this optional box, I agree to receive recurring marketing and customer care text messages from ${name}, including ${messageTypes}, at the mobile number provided, including messages sent using automated technology. Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time. Reply HELP for help. Consent is not a condition of any purchase. Mobile information and SMS opt-in data will not be shared with third parties or affiliates for marketing or promotional purposes.`;
}
