//复用组件通用表单渲染器，支持 view/edit 两种模式

import React from 'react';
import { 
  Form, Input, InputNumber, Select, Switch, Descriptions, Divider, Tag
} from 'antd';

const { Option } = Select;

/**
 * 通用字段渲染器
 * @param {object} data - 订单数据
 * @param {string} mode - 'edit' | 'view'
 * @param {formInstance} form - 表单实例 (仅 edit 模式需要)
 */
const AssetFormRenderer = ({ data = {}, mode, form }) => {

  // 是否需要快递 (用于编辑模式的联动)
  const needShipping = Form.useWatch('shippingNeeded', form);
  // 是否有其他成本
  const hasOtherCost = Form.useWatch('hasOtherCost', form);

  // ==================== 判断是否显示快递信息 ====================
  // 编辑模式：使用 Form.useWatch 的值
  // 查看模式：使用 data 中的值
  const showShipping = mode === 'edit' ? needShipping : data.shippingNeeded;
  const showOtherCost = mode === 'edit' ? hasOtherCost : (data.otherCostAmount > 0);

  // ==================== 字段配置定义 ====================
  // 统一管理所有字段，避免重复代码
  const fieldConfig = {
    // 基础信息
    baseInfo: [
      { 
        key: 'orderNumber', 
        label: '内部订单号',
        render: (val) => <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{val || '-'}</span>
      },
      { 
        key: 'productName', 
        label: '商品名称',
        render: (val) => val || <span style={{ color: '#999' }}>未知商品</span>
      },
      { 
        key: 'userName', 
        label: '所属用户',
        render: (val) => val || <span style={{ color: '#999' }}>未知用户</span>
      },
      { 
        key: 'costPrice', 
        label: '原成本', 
        render: (val) => <span style={{ color: '#cf1322', fontWeight: 'bold' }}>¥{val || 0}</span>,
        editNode: null // 原成本不可编辑，直接展示
      },
      { 
        key: 'status', 
        label: '当前状态', 
        render: (val) => {
          const statusMap = {
            'Stocked': { text: '压货中', color: 'blue' },
            'Disposed': { text: '已处置', color: 'green' },
            '压货中': { text: '压货中', color: 'blue' },
            '已处置': { text: '已处置', color: 'green' }
          };
          const status = statusMap[val] || { text: val || '未知', color: 'default' };
          return <Tag color={status.color}>{status.text}</Tag>;
        }
      },
      { 
        key: 'stockDays', 
        label: '压货天数',
        render: (val, record) => {
          if (record.status === 'Disposed' || record.status === '已处置') return <span style={{ color: '#999' }}>-</span>;
          const color = val >= 7 ? '#cf1322' : val >= 3 ? '#fa8c16' : '#52c41a';
          return <span style={{ color, fontWeight: 'bold' }}>{val || 0} 天</span>;
        },
        editNode: null
      },
      { 
        key: 'createdAt', 
        label: '创建时间',
        editNode: null
      },
    ],
    // 处置信息
    disposeInfo: [
      { 
        key: 'resalePlatform', 
        label: '转售平台', 
        required: true,
        render: (val) => val ? <Tag color="blue">{val}</Tag> : <span style={{ color: '#999' }}>未填写</span>,
        editNode: <Input placeholder="请输入转售平台名称" />
      },
      { 
        key: 'resaleOrderNo', 
        label: '外部订单号',
        render: (val) => val ? <span style={{ fontFamily: 'monospace' }}>{val}</span> : <span style={{ color: '#999' }}>-</span>,
        editNode: <Input placeholder="外部平台订单号，用于搜索" />
      },
      { 
        key: 'soldPrice', 
        label: '变现金额', 
        required: true, 
        render: (val) => <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: 16 }}>¥{val || 0}</span>,
        editNode: <InputNumber style={{ width: '100%' }} min={0} prefix="¥" />
      },
      { 
        key: 'disposeAction', 
        label: '处置动作', 
        required: true,
        render: (val) => {
          const colorMap = {
            '确定售卖': 'processing',
            '确定结算': 'warning',
            '确定完结': 'success'
          };
          return val ? <Tag color={colorMap[val] || 'default'}>{val}</Tag> : <span style={{ color: '#999' }}>未处置</span>;
        },
        editNode: (
          <Select>
            <Option value="确定售卖">确定售卖</Option>
            <Option value="确定结算">确定结算</Option>
            <Option value="确定完结">确定完结</Option>
          </Select>
        )
      },
      { 
        key: 'disposedAt', 
        label: '处置时间',
        render: (val) => val || <span style={{ color: '#999' }}>-</span>,
        editNode: null
      },
    ],
    // 成本与物流
    costInfo: [
      { 
        key: 'shippingNeeded', 
        label: '需要快递', 
        valuePropName: 'checked',
        render: (val) => val ? <Tag color="blue">需要</Tag> : <Tag>不需要</Tag>,
        editNode: <Switch checkedChildren="是" unCheckedChildren="否" />
      },
      { 
        key: 'trackingNo', 
        label: '快递单号', 
        hide: !showShipping, // 动态显隐
        render: (val) => val ? <span style={{ fontFamily: 'monospace', color: '#1890ff' }}>{val}</span> : <span style={{ color: '#999' }}>未填写</span>,
        editNode: <Input placeholder="填写快递单号" />
      },
      { 
        key: 'shippingCost', 
        label: '快递成本', 
        hide: !showShipping,
        render: (val) => <span style={{ color: '#fa8c16' }}>¥{val || 0}</span>,
        editNode: <InputNumber style={{ width: '100%' }} min={0} prefix="¥" />
      },
      { 
        key: 'hasOtherCost', 
        label: '其他成本', 
        valuePropName: 'checked',
        // ✅ 查看模式：显示金额和备注（保持原来的逻辑）
        render: (val, record) => record.otherCostAmount > 0 ? `¥${record.otherCostAmount} (${record.otherCostRemark || '无备注'})` : '无',
        editNode: <Switch checkedChildren="是" unCheckedChildren="否" />
      },
      { 
        key: 'otherCostAmount', 
        label: '额外金额', 
        hide: !showOtherCost,
        render: (val) => <span style={{ color: '#eb2f96' }}>¥{val || 0}</span>,
        editNode: <InputNumber style={{ width: '100%' }} min={0} prefix="¥" />
      },
      { 
        key: 'otherCostRemark', 
        label: '成本备注', 
        hide: !showOtherCost,
        render: (val) => val || <span style={{ color: '#999' }}>无</span>,
        editNode: <Input placeholder="如：维修费" />
      },
    ],
    // 利润计算（仅查看模式显示）
    profitInfo: [
      {
        key: 'profit',
        label: '本单利润',
        render: (_, record) => {
          if (record.status !== 'Disposed' && record.status !== '已处置') {
            return <span style={{ color: '#999' }}>未处置</span>;
          }
          const soldPrice = record.soldPrice || 0;
          const costPrice = record.costPrice || 0;
          const shippingCost = record.shippingNeeded ? (record.shippingCost || 0) : 0;
          const otherCost = record.otherCostAmount || 0;
          const profit = soldPrice - costPrice - shippingCost - otherCost;
          const color = profit >= 0 ? '#52c41a' : '#cf1322';
          return (
            <span style={{ color, fontWeight: 'bold', fontSize: 18 }}>
              {profit >= 0 ? '+' : ''}¥{profit.toFixed(2)}
            </span>
          );
        }
      },
      {
        key: 'profitDetail',
        label: '利润明细',
        render: (_, record) => {
          if (record.status !== 'Disposed' && record.status !== '已处置') {
            return <span style={{ color: '#999' }}>-</span>;
          }
          const soldPrice = record.soldPrice || 0;
          const costPrice = record.costPrice || 0;
          const shippingCost = record.shippingNeeded ? (record.shippingCost || 0) : 0;
          const otherCost = record.otherCostAmount || 0;
          return (
            <span style={{ fontSize: 12, color: '#666' }}>
              ¥{soldPrice} - ¥{costPrice} - ¥{shippingCost}(运费) - ¥{otherCost}(其他)
            </span>
          );
        }
      }
    ]
  };

  // ==================== 渲染逻辑 ====================

  // 渲染单个字段
  const renderField = (config) => {
    const { key, label, render, editNode, required, hide, valuePropName } = config;
    const value = data[key];
    
    // 如果是编辑模式
    if (mode === 'edit') {
      // 如果配置了 hide 或者没有编辑节点，则不渲染
      if (hide || !editNode) return null;
      
      return (
        <Form.Item 
          key={key}
          name={key} 
          label={label} 
          valuePropName={valuePropName || 'value'}
          rules={[{ required: required, message: `${label}必填` }]}
        >
          {editNode}
        </Form.Item>
      );
    }

    // 如果是查看模式
    if (hide) return null;
    
    return (
      <Descriptions.Item key={key} label={label}>
        {render ? render(value, data) : (value || '-')}
      </Descriptions.Item>
    );
  };

  return (
    <div>
      {/* 基础信息 */}
      {mode === 'view' ? (
        <Descriptions title="📦 基础信息" bordered column={2} size="small">
          {fieldConfig.baseInfo.map(renderField)}
        </Descriptions>
      ) : (
        <>
          <Divider orientation="left" plain>基础信息 (不可编辑)</Divider>
          <Descriptions bordered column={2} size="small">
            {fieldConfig.baseInfo.map(renderField)}
          </Descriptions>
        </>
      )}

      {/* 处置信息 */}
      <Divider orientation="left" plain>{mode === 'view' ? '💰 处置信息' : '处置信息'}</Divider>
      {mode === 'view' ? (
        <Descriptions bordered column={2} size="small">
          {fieldConfig.disposeInfo.map(renderField)}
        </Descriptions>
      ) : (
        <>
          {fieldConfig.disposeInfo.map(renderField)}
        </>
      )}

      {/* 成本与物流 */}
      <Divider orientation="left" plain>{mode === 'view' ? '🚚 成本与物流' : '成本与物流'}</Divider>
      {mode === 'view' ? (
        <Descriptions bordered column={2} size="small">
          {fieldConfig.costInfo.map(renderField)}
        </Descriptions>
      ) : (
        <>
          {fieldConfig.costInfo.map(renderField)}
        </>
      )}

      {/* 利润信息（仅查看模式且已处置时显示） */}
      {mode === 'view' && (data.status === 'Disposed' || data.status === '已处置') && (
        <>
          <Divider orientation="left" plain>📊 利润分析</Divider>
          <Descriptions bordered column={2} size="small">
            {fieldConfig.profitInfo.map(renderField)}
          </Descriptions>
        </>
      )}
    </div>
  );
};

export default AssetFormRenderer;
