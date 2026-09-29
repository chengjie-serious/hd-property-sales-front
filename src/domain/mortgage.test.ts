import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateMortgage } from './mortgage.ts';

test('zero-interest equal-payment loan returns equal monthly payments', () => {
  const result = calculateMortgage({ principalYuan: 120000, years: 1, method: 'equalPayment', parts: [{ amountYuan: 120000, annualRatePercent: 0 }] });
  assert.equal(result.schedule.length, 12);
  assert.equal(result.schedule[0]?.paymentYuan, 10000);
  assert.equal(result.totalInterestYuan, 0);
  assert.equal(result.schedule.at(-1)?.remainingYuan, 0);
});

test('combination equal-principal loan pays down exactly and first payment exceeds last', () => {
  const result = calculateMortgage({ principalYuan: 300000, years: 2, method: 'equalPrincipal', parts: [
    { amountYuan: 200000, annualRatePercent: 3.5 },
    { amountYuan: 100000, annualRatePercent: 2.6 },
  ] });
  assert.equal(result.schedule.length, 24);
  assert.ok(result.schedule[0]!.paymentYuan > result.schedule.at(-1)!.paymentYuan);
  assert.equal(result.schedule.at(-1)?.remainingYuan, 0);
  assert.equal(Math.round(result.schedule.reduce((sum, month) => sum + month.principalYuan, 0) * 100), 30000000);
});

test('loan parts must match the stated principal', () => {
  assert.throws(() => calculateMortgage({ principalYuan: 100000, years: 10, method: 'equalPayment', parts: [{ amountYuan: 90000, annualRatePercent: 3.5 }] }));
});
