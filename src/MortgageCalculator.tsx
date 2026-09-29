import { Alert, Button, Form, InputNumber, Modal, Radio, Space, Statistic, Table, Typography } from 'antd';
import { useState } from 'react';
import { calculateMortgage, type MortgageResult, type RepaymentMethod } from './domain/mortgage';

type Props = { open: boolean; onClose: () => void; salePriceWan: number };
type FormValues = {
  salePriceWan: number; downMode: 'ratio' | 'amount'; downRatio: number; downAmountWan: number; years: number;
  loanType: 'commercial' | 'fund' | 'combination';
  method: RepaymentMethod;
  commercialRate: number; fundRate: number; fundAmountWan: number;
};

export function MortgageCalculator({ open, onClose, salePriceWan }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [result, setResult] = useState<MortgageResult>();
  const [downPayment, setDownPayment] = useState(0);
  const [error, setError] = useState('');
  const loanType = Form.useWatch('loanType', form);
  const downMode = Form.useWatch('downMode', form);

  function calculate(values: FormValues) {
    try {
      const priceYuan = Math.round(values.salePriceWan * 10000 * 100) / 100;
      const downYuan = values.downMode === 'amount' ? Math.round(values.downAmountWan * 10000 * 100) / 100 : Math.round(priceYuan * values.downRatio / 100 * 100) / 100;
      const principalYuan = Math.round((priceYuan - downYuan) * 100) / 100;
      const fundYuan = values.loanType === 'fund' ? principalYuan : values.loanType === 'combination' ? Math.round((values.fundAmountWan ?? 0) * 10000 * 100) / 100 : 0;
      const commercialYuan = Math.round((principalYuan - fundYuan) * 100) / 100;
      if (downYuan < 0 || principalYuan <= 0 || fundYuan < 0 || commercialYuan < 0) throw new Error('首付和贷款额无效，组合贷公积金金额不能超过贷款总额');
      const parts = [
        ...(commercialYuan > 0 ? [{ amountYuan: commercialYuan, annualRatePercent: values.commercialRate }] : []),
        ...(fundYuan > 0 ? [{ amountYuan: fundYuan, annualRatePercent: values.fundRate }] : []),
      ];
      setResult(calculateMortgage({ principalYuan, years: values.years, method: values.method, parts }));
      setDownPayment(downYuan);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '计算失败');
      setResult(undefined);
    }
  }

  return <Modal title="房贷计算器" open={open} onCancel={onClose} width={800} footer={null} destroyOnHidden>
    <Form form={form} layout="vertical" onFinish={calculate} initialValues={{
      salePriceWan, downMode: 'ratio', downRatio: 30, downAmountWan: 0, years: 30, loanType: 'commercial', method: 'equalPayment',
      commercialRate: 3.5, fundRate: 2.6, fundAmountWan: 0,
    }}>
      <div className="calculator-grid">
        <Form.Item label="房屋总价（万元）" name="salePriceWan" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} className="full-width" /></Form.Item>
        <Form.Item label="首付输入方式" name="downMode"><Radio.Group options={[{ value: 'ratio', label: '按比例' }, { value: 'amount', label: '按金额' }]} /></Form.Item>
        {downMode === 'amount' ?
          <Form.Item label="首付金额（万元）" name="downAmountWan" rules={[{ required: true }]}><InputNumber min={0} precision={2} className="full-width" /></Form.Item> :
          <Form.Item label="首付比例（%）" name="downRatio" rules={[{ required: true }]}><InputNumber min={0} max={99} precision={1} className="full-width" /></Form.Item>}
        <Form.Item label="贷款年限" name="years" rules={[{ required: true }]}><InputNumber min={1} max={30} precision={0} className="full-width" /></Form.Item>
        <Form.Item label="贷款类型" name="loanType"><Radio.Group options={[{ value: 'commercial', label: '商业' }, { value: 'fund', label: '公积金' }, { value: 'combination', label: '组合' }]} /></Form.Item>
      </div>
      <Form.Item label="还款方式" name="method"><Radio.Group options={[{ value: 'equalPayment', label: '等额本息' }, { value: 'equalPrincipal', label: '等额本金' }]} /></Form.Item>
      <div className="calculator-grid">
        {loanType !== 'fund' && <Form.Item label="商业贷款年利率（%）" name="commercialRate" rules={[{ required: true }]}><InputNumber min={0} max={100} precision={3} className="full-width" /></Form.Item>}
        {loanType !== 'commercial' && <Form.Item label="公积金贷款年利率（%）" name="fundRate" rules={[{ required: true }]}><InputNumber min={0} max={100} precision={3} className="full-width" /></Form.Item>}
        {loanType === 'combination' && <Form.Item label="公积金贷款额（万元）" name="fundAmountWan" rules={[{ required: true }]}><InputNumber min={0} precision={2} className="full-width" /></Form.Item>}
      </div>
      <Typography.Paragraph type="secondary">利率为可编辑示例值，不代表实时银行报价；首付比例和贷款额度以实际审批为准。</Typography.Paragraph>
      <Button type="primary" htmlType="submit">计算还款</Button>
    </Form>
    {error && <Alert className="calculator-error" type="error" message={error} />}
    {result && <div className="calculator-result">
      <Space size="large" wrap>
        <Statistic title="首付款" value={downPayment} precision={2} suffix="元" />
        <Statistic title="贷款本金" value={result.principalYuan} precision={2} suffix="元" />
        <Statistic title="首月还款" value={result.schedule[0]?.paymentYuan} precision={2} suffix="元" />
        <Statistic title="末月还款" value={result.schedule.at(-1)?.paymentYuan} precision={2} suffix="元" />
        <Statistic title="总利息" value={result.totalInterestYuan} precision={2} suffix="元" />
        <Statistic title="还款总额" value={result.totalPaidYuan} precision={2} suffix="元" />
      </Space>
      <Table rowKey="month" className="repayment-table" size="small" pagination={{ pageSize: 12 }} dataSource={result.schedule}
        columns={[{ title: '期数', dataIndex: 'month' },
          { title: '月供（元）', dataIndex: 'paymentYuan', render: (value: number) => value.toFixed(2) },
          { title: '本金（元）', dataIndex: 'principalYuan', render: (value: number) => value.toFixed(2) },
          { title: '利息（元）', dataIndex: 'interestYuan', render: (value: number) => value.toFixed(2) },
          { title: '剩余本金（元）', dataIndex: 'remainingYuan', render: (value: number) => value.toFixed(2) }]} />
      <Typography.Text type="secondary">仅供测算，实际利率、额度和还款计划以银行或公积金中心合同为准。</Typography.Text>
    </div>}
  </Modal>;
}
