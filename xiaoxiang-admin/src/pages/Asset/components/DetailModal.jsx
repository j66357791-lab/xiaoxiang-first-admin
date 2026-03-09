//详情弹窗（只读模式）

import React from 'react';
import { Modal } from 'antd';
import AssetFormRenderer from './AssetFormRenderer';

const DetailModal = ({ visible, record, onCancel }) => {
  return (
    <Modal
      title="资产详情"
      open={visible}
      onCancel={onCancel}
      footer={null} // 只读不需要确定按钮
      width={700}
    >
      {/* 复用组件：查看模式 */}
      <AssetFormRenderer data={record} mode="view" />
    </Modal>
  );
};

export default DetailModal;
