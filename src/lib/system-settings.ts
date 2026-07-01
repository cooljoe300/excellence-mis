export const DEFAULT_ADMISSION_NUMBER_FORMAT = 'EOC/{CODE}/{SEQ3}/{YY}';

export interface PaymentSettings {
  mpesaPaybill: string;
  mpesaAccountLabel: string;
  mpesaStkEnabled: boolean;
  pesapalEnabled: boolean;
  bankName: string;
  bankAccount: string;
  bankBranch: string;
}
