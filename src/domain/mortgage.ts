export type RepaymentMethod = 'equalPayment' | 'equalPrincipal';
export type LoanPart = { amountYuan: number; annualRatePercent: number };
export type MortgageInput = {
  principalYuan: number;
  years: number;
  method: RepaymentMethod;
  parts: LoanPart[];
};
export type PaymentMonth = {
  month: number;
  paymentYuan: number;
  principalYuan: number;
  interestYuan: number;
  remainingYuan: number;
};
export type MortgageResult = {
  principalYuan: number;
  totalInterestYuan: number;
  totalPaidYuan: number;
  schedule: PaymentMonth[];
};

type CentsMonth = { payment: number; principal: number; interest: number; remaining: number };
const yuan = (cents: number) => cents / 100;

function calculatePart(part: LoanPart, months: number, method: RepaymentMethod): CentsMonth[] {
  const amount = Math.round(part.amountYuan * 100);
  const monthlyRate = part.annualRatePercent / 100 / 12;
  const equalPayment = monthlyRate === 0 ? Math.round(amount / months) :
    Math.round(amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
  const equalPrincipal = Math.floor(amount / months);
  const schedule: CentsMonth[] = [];
  let remaining = amount;
  for (let month = 1; month <= months; month++) {
    const interest = Math.round(remaining * monthlyRate);
    const principal = month === months ? remaining :
      method === 'equalPrincipal' ? equalPrincipal : Math.min(remaining, equalPayment - interest);
    remaining -= principal;
    schedule.push({ payment: principal + interest, principal, interest, remaining });
  }
  return schedule;
}

export function calculateMortgage(input: MortgageInput): MortgageResult {
  const { principalYuan, years, method, parts } = input;
  if (!Number.isFinite(principalYuan) || principalYuan <= 0 || !Number.isInteger(years) || years < 1 || years > 30 ||
      !['equalPayment', 'equalPrincipal'].includes(method) || !Array.isArray(parts) || parts.length < 1 || parts.length > 2 ||
      parts.some((part) => !Number.isFinite(part.amountYuan) || part.amountYuan < 0 || !Number.isFinite(part.annualRatePercent) || part.annualRatePercent < 0 || part.annualRatePercent > 100) ||
      Math.round(parts.reduce((sum, part) => sum + part.amountYuan, 0) * 100) !== Math.round(principalYuan * 100)) {
    throw new Error('贷款金额、利率或年限无效');
  }
  const months = years * 12;
  const schedules = parts.map((part) => calculatePart(part, months, method));
  const combined = Array.from({ length: months }, (_, index) => {
    const items = schedules.map((schedule) => schedule[index]!);
    return {
      month: index + 1,
      paymentYuan: yuan(items.reduce((sum, item) => sum + item.payment, 0)),
      principalYuan: yuan(items.reduce((sum, item) => sum + item.principal, 0)),
      interestYuan: yuan(items.reduce((sum, item) => sum + item.interest, 0)),
      remainingYuan: yuan(items.reduce((sum, item) => sum + item.remaining, 0)),
    };
  });
  const totalInterestCents = schedules.flat().reduce((sum, item) => sum + item.interest, 0);
  return {
    principalYuan: yuan(Math.round(principalYuan * 100)),
    totalInterestYuan: yuan(totalInterestCents),
    totalPaidYuan: yuan(Math.round(principalYuan * 100) + totalInterestCents),
    schedule: combined,
  };
}
