// src/pages/Asset/components/BindSkuModal.jsx
/**
 * 绑定SKU弹窗 - 支持选择子SKU
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Select, InputNumber, message, Alert, Descriptions, Tag, Button, Divider } from 'antd';
import { LinkOutlined, ShopOutlined, DollarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

// ✅ 修复：从常量文件导入
import { SKU_STATUS_LABELS, SALE_STATUS_LABELS, SALE_STATUS_COLORS } from '../constants/inventoryConstants';

// ✅ 从工具函数文件导入
import { getAllSubSkus } from '../utils/inventoryUtils';

const BindSkuModal = ({
  visible,
  record,
  skuList,
  onOk,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [selectedSku, setSelectedSku] = useState(null);

  // ✅ 获取所有可选的子SKU
  const selectableSkus = useMemo(() => {
    return getAllSubSkus(skuList || []);
  }, [skuList]);

  useEffect(() => {
    if (visible && record) {
      form.setFieldsValue({
        skuId: record.relatedSkuId || undefined,
        quantity: record.relatedQuantity || 1,
      });
      if (record.relatedSkuId) {
        const sku = selectableSkus.find(s => s.id === record.relatedSkuId);
        setSelectedSku(sku);
      }
    } else if (!visible) {
      form.resetFields();
      setSelectedSku(null);
    }
  }, [visible, record, form, selectableSkus]);

  const handleSkuChange = (skuId) => {
    const sku = selectableSkus.find(s => s.id === skuId);
    setSelectedSku(sku);
  };

  const handleOk = () => {
    form.validateFields().then(values => {
      if (!values.skuId) {
        message.error('请选择要绑定的SKU');
        return;
      }

      const sku = selectableSkus.find(s => s.id === values.skuId);
      const bindData = {
        relatedSkuId: values.skuId,
        relatedSkuName: sku ? sku.name : '',
        relatedSkuCode: sku ? sku.skuCode : '',
        relatedSkuSpec: sku ? sku.spec : '',
        relatedQuantity: values.quantity || 1,
        bindTime: new Date().toISOString(),
      };

      onOk(bindData);
    });
  };

  const handleUnbind = () => {
    Modal.confirm({
      title: '确认解除绑定？',
      content: '解除后，库存中心将不再显示此订单的关联信息',
      onOk: () => {
        onOk({
          relatedSkuId: null,
          relatedSkuName: null,
          relatedSkuCode: null,
          relatedSkuSpec: null,
          relatedQuantity: null,
          bindTime: null,
        });
      }
    });
  };

  // 判断是否在处置状态跟踪中（已处置的订单）
  const isDisposed = record && (record.status === 'Disposed' || record.status === '已处置');
  const isCompleted = record && record.disposeAction === '确定完结';

  const footerButtons = [
    <Button key="cancel" onClick={onCancel}>取消</Button>,
    <Button key="submit" type="primary" onClick={handleOk}>
      {record && record.relatedSkuId ? '更新绑定' : '确认绑定'}
    </Button>,
  ];

  if (record && record.relatedSkuId) {
    footerButtons.unshift(
      <Button key="unbind" danger onClick={handleUnbind} style={{ float: 'left' }}>
        解除绑定
      </Button>
    );
  }

  return (
    <Modal
      title={
        <span>
          <LinkOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          绑定SKU - {record ? record.orderNumber : ''}
        </span>
      }
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={600}
      okText="确认绑定"
      cancelText="取消"
      footer={footerButtons}
    >
      <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="商品名称">{record ? record.productName : '-'}</Descriptions.Item>
        <Descriptions.Item label="成本价">¥{record ? record.costPrice : 0}</Descriptions.Item>
        <Descriptions.Item label="当前状态">
          <Tag color="blue">{record ? record.status : '-'}</Tag>
        </Descriptions.Item>
      </Descriptions>

      {/* 售卖信息区域 - 仅已处置订单显示 */}
      {isDisposed && (
        <>
          <Divider orientation="left" plain style={{ margin: '12px 0' }}>
            📋 售卖信息
          </Divider>
          <Descriptions size="small" column={2} style={{ marginBottom: 16 }} bordered>
            <Descriptions.Item label="是否售卖">
              <Tag color={isDisposed ? 'processing' : 'default'}>
                {isDisposed ? '售卖中' : '未售卖'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="售卖平台">
              {record?.resalePlatform ? (
                <Tag color="blue" icon={<ShopOutlined />}>{record.resalePlatform}</Tag>
              ) : <span style={{ color: '#ccc' }}>-</span>}
            </Descriptions.Item>
            <Descriptions.Item label="售卖状态">
              <Tag color={isCompleted ? 'success' : 'processing'}>
                {isCompleted ? '售卖完毕' : '售卖中'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="变现金额">
              <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                <DollarOutlined /> ¥{record?.soldPrice || 0}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="售卖时间" span={2}>
              {record?.completedAt ? (
                <span>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {dayjs(record.completedAt).format('YYYY-MM-DD HH:mm:ss')}
                </span>
              ) : <span style={{ color: '#ccc' }}>-</span>}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}

      <Alert
        message="绑定SKU后，该订单将在库存中心的绑定订单中显示，同时对应SKU库存将增加。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="skuId"
          label="选择SKU（支持选择具体配置）"
          rules={[{ required: true, message: '请选择要绑定的SKU' }]}
        >
          <Select
            placeholder="请选择SKU"
            showSearch
            optionFilterProp="children"
            onChange={handleSkuChange}
            listHeight={300}
          >
            {selectableSkus.map(sku => (
              <Select.Option key={sku.id} value={sku.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    {sku.parentName && <span style={{ color: '#999' }}>{sku.parentName} - </span>}
                    {sku.name}
                    {sku.spec && <span style={{ color: '#999', fontSize: 12 }}> ({sku.spec})</span>}
                  </span>
                  <Tag color={sku.stock > 0 ? 'blue' : 'red'} style={{ marginLeft: 8 }}>
                    库存: {sku.stock}
                  </Tag>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {selectedSku && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="SKU编码">{selectedSku.skuCode}</Descriptions.Item>
              <Descriptions.Item label="当前库存">
                <Tag color={selectedSku.stock > 0 ? 'blue' : 'red'}>{selectedSku.stock}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="成本价">¥{selectedSku.costPrice}</Descriptions.Item>
              <Descriptions.Item label="售价">¥{selectedSku.salePrice}</Descriptions.Item>
              {selectedSku.spec && (
                <Descriptions.Item label="规格" span={2}>{selectedSku.spec}</Descriptions.Item>
              )}
              {/* 显示售卖数量 */}
              <Descriptions.Item label="已售卖数量">
                <Tag color="orange">{selectedSku.soldQuantity || 0}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="售卖金额">
                ¥{selectedSku.saleAmount || 0}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}

        <Form.Item
          name="quantity"
          label="绑定数量（将增加到SKU库存）"
          initialValue={1}
          rules={[{ required: true, message: '请输入绑定数量' }]}
        >
          <InputNumber
            min={1}
            max={999}
            style={{ width: '100%' }}
            placeholder="绑定数量"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BindSkuModal;
