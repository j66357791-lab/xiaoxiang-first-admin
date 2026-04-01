// src/pages/Asset/components/DisposeModal.jsx
//处置/编辑弹窗（编辑模式）
import React, { useEffect } from 'react';
import { Modal, Form } from 'antd';
import AssetFormRenderer from './AssetFormRenderer';

const DisposeModal = ({ visible, record, onOk, onCancel }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && record) {
      form.setFieldsValue({
        resalePlatform: record.resalePlatform || undefined,
        resaleOrderNo: record.resaleOrderNo || '',
        soldPrice: record.soldPrice || null,
        disposeAction: record.disposeAction || '确定售卖',
        shippingNeeded: record.shippingNeeded || false,
        shippingCost: record.shippingCost || 0,
        trackingNo: record.trackingNo || '',
        hasOtherCost: record.otherCostAmount > 0,
        otherCostAmount: record.otherCostAmount || 0,
        otherCostRemark: record.otherCostRemark || '',
      });
    }
    if (!visible) {
      form.resetFields();
    }
  }, [visible, record, form]);

  const handleOk = () => {
    form.validateFields().then(values => {
      const postData = {
        ...values,
        shippingCost: values.shippingNeeded ? (values.shippingCost || 0) : 0,
        otherCostAmount: values.hasOtherCost ? (values.otherCostAmount || 0) : 0,
        otherCostRemark: values.hasOtherCost ? (values.otherCostRemark || '') : '',
      };
      onOk(postData);
    });
  };

  return (
    <Modal
      title="订单处置 / 编辑"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      destroyOnHidden
      width={700}
    >
      <Form form={form} layout="vertical">
        <AssetFormRenderer data={record} mode="edit" form={form} />
      </Form>
    </Modal>
  );
};

export default DisposeModal;
