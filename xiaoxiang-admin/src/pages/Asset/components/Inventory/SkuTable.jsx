// src/pages/Asset/components/Inventory/SkuTable.jsx
/**
 * SKU表格组件 - 可展开模式
 */
import React, { useState, useMemo } from 'react';
import { 
  Table, Button, Space, Input, Select, Tag, Modal, Form, 
  InputNumber, Cascader, message, Popconfirm, Badge,
  Row, Col, DatePicker, Switch, Divider, Tooltip
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  AppstoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import {
  SKU_STATUS,
  SKU_STATUS_LABELS,
  SKU_STATUS_COLORS,
  STOCK_WARNING_THRESHOLD,
  SALE_STATUS,
  SALE_STATUS_LABELS,
  SALE_STATUS_COLORS,
} from '../../constants/inventoryConstants';

import {
  generateSkuCode,
  calculateStockStatus,
} from '../../utils/inventoryUtils';

const SkuTable = ({ 
  skuList, 
  setSkuList, 
  categories, 
  categoryTree, 
  onExport 
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterSaleStatus, setFilterSaleStatus] = useState(null);
  
  const [skuModalVisible, setSkuModalVisible] = useState(false);
  const [editingSku, setEditingSku] = useState(null);
  const [editingParentSku, setEditingParentSku] = useState(null);

  // 子SKU弹窗状态
  const [subSkuModalVisible, setSubSkuModalVisible] = useState(false);
  const [viewingParentSku, setViewingParentSku] = useState(null);

  const [skuForm] = Form.useForm();

  // ==================== 主SKU列表（不含子SKU）====================
  const mainSkuList = useMemo(() => {
    return (skuList || []).map(sku => {
      // 计算主SKU的汇总数据
      let totalStock = 0;
      let totalFrozenStock = 0;
      let hasLowStock = false;
      let hasOutOfStock = false;
      let avgSalePrice = 0;
      let avgActualSalePrice = 0;
      let avgExpectedProfit = 0;
      let totalSoldQuantity = 0;
      let totalSaleAmount = 0;

      if (sku.isParent && sku.children && sku.children.length > 0) {
        let totalSalePrice = 0;
        let totalActualSalePrice = 0;
        let totalExpectedProfit = 0;
        let actualSalePriceCount = 0;

        sku.children.forEach(child => {
          totalStock += child.stock || 0;
          totalFrozenStock += child.frozenStock || 0;
          totalSalePrice += child.salePrice || 0;
          totalExpectedProfit += (child.salePrice || 0) - (child.costPrice || 0);
          totalSoldQuantity += child.soldQuantity || 0;
          totalSaleAmount += child.saleAmount || 0;
          if (child.actualSalePrice) {
            totalActualSalePrice += child.actualSalePrice;
            actualSalePriceCount++;
          }
          if (child.status === SKU_STATUS.LOW_STOCK) hasLowStock = true;
          if (child.status === SKU_STATUS.OUT_OF_STOCK) hasOutOfStock = true;
        });

        const childCount = sku.children.length;
        avgSalePrice = totalSalePrice / childCount;
        avgActualSalePrice = actualSalePriceCount > 0 ? totalActualSalePrice / actualSalePriceCount : 0;
        avgExpectedProfit = totalExpectedProfit / childCount;
      } else {
        totalStock = sku.stock || 0;
        totalFrozenStock = sku.frozenStock || 0;
        avgSalePrice = sku.salePrice || 0;
        avgActualSalePrice = sku.actualSalePrice || 0;
        avgExpectedProfit = (sku.salePrice || 0) - (sku.costPrice || 0);
        totalSoldQuantity = sku.soldQuantity || 0;
        totalSaleAmount = sku.saleAmount || 0;
      }

      return {
        ...sku,
        _totalStock: totalStock,
        _totalFrozenStock: totalFrozenStock,
        _hasLowStock: hasLowStock,
        _hasOutOfStock: hasOutOfStock,
        _childrenCount: sku.isParent ? (sku.children || []).length : 0,
        _avgSalePrice: avgSalePrice,
        _avgActualSalePrice: avgActualSalePrice,
        _avgExpectedProfit: avgExpectedProfit,
        _totalSoldQuantity: totalSoldQuantity,
        _totalSaleAmount: totalSaleAmount,
      };
    });
  }, [skuList]);

  // ==================== SKU 筛选 ====================
  const filteredSkuList = useMemo(() => {
    let list = [...mainSkuList];
    
    // 搜索过滤
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      list = list.filter(sku => {
        // 搜索主SKU
        if (sku.name.toLowerCase().includes(keyword) || 
            sku.skuCode.toLowerCase().includes(keyword)) {
          return true;
        }
        // 搜索子SKU
        if (sku.children && sku.children.length > 0) {
          return sku.children.some(child => 
            child.name.toLowerCase().includes(keyword) ||
            child.skuCode.toLowerCase().includes(keyword) ||
            (child.spec && child.spec.toLowerCase().includes(keyword))
          );
        }
        return false;
      });
    }
    
    // 分类过滤
    if (filterCategory) {
      list = list.filter(sku => {
        if (filterCategory.length >= 1 && sku.category1 !== filterCategory[0]) return false;
        if (filterCategory.length >= 2 && sku.category2 !== filterCategory[1]) return false;
        if (filterCategory.length >= 3 && sku.category3 !== filterCategory[2]) return false;
        return true;
      });
    }
    
    // 库存状态过滤
    if (filterStatus) {
      list = list.filter(sku => {
        if (sku.isParent && sku.children) {
          return sku.children.some(c => c.status === filterStatus);
        }
        return sku.status === filterStatus;
      });
    }
    
    // 售卖状态过滤
    if (filterSaleStatus) {
      list = list.filter(sku => {
        if (sku.isParent && sku.children) {
          return sku.children.some(c => c.saleStatus === filterSaleStatus);
        }
        return sku.saleStatus === filterSaleStatus;
      });
    }
    
    return list;
  }, [mainSkuList, searchKeyword, filterCategory, filterStatus, filterSaleStatus]);

  // ==================== SKU 操作 ====================
  const handleAddSku = () => {
    setEditingSku(null);
    setEditingParentSku(null);
    skuForm.resetFields();
    skuForm.setFieldsValue({
      listedAt: dayjs(),
      isForSale: false,
    });
    setSkuModalVisible(true);
  };

  const handleEditSku = (record, parentSku = null) => {
    setEditingSku(record);
    setEditingParentSku(parentSku);
    
    if (parentSku) {
      skuForm.setFieldsValue({
        ...record,
        listedAt: record.listedAt ? dayjs(record.listedAt) : null,
      });
    } else {
      skuForm.setFieldsValue({
        ...record,
        category: [record.category1, record.category2, record.category3].filter(Boolean),
        listedAt: record.listedAt ? dayjs(record.listedAt) : null,
      });
    }
    setSkuModalVisible(true);
  };

  const handleDeleteSku = (record, parentId = null) => {
    if (parentId) {
      // 删除子SKU
      setSkuList(prev => prev.map(sku => {
        if (sku.id === parentId) {
          const newChildren = sku.children.filter(c => c.id !== record.id);
          const totalStock = newChildren.reduce((sum, c) => sum + (c.stock || 0), 0);
          const allChildrenNotForSale = newChildren.every(c => !c.isForSale);
          
          return {
            ...sku,
            children: newChildren,
            status: calculateStockStatus(totalStock),
            isForSale: allChildrenNotForSale ? false : sku.isForSale,
            saleStatus: allChildrenNotForSale ? SALE_STATUS.NOT_FOR_SALE : sku.saleStatus,
          };
        }
        return sku;
      }));
    } else if (record.isParent) {
      // 删除主SKU
      setSkuList(prev => prev.filter(s => s.id !== record.id));
    } else {
      // 删除简单SKU
      setSkuList(prev => prev.filter(s => s.id !== record.id));
    }
    message.success('SKU 已删除');
  };

  // 处理售卖状态变更
  const handleSaleStatusChange = (record, isForSale, parentId = null) => {
    if (record.isParent && !parentId) {
      // 主SKU售卖状态变更
      if (!isForSale) {
        Modal.confirm({
          title: '确认关闭售卖？',
          content: '关闭主SKU售卖将同步关闭所有子SKU的售卖状态，确定继续？',
          okText: '确认关闭',
          cancelText: '取消',
          onOk: () => {
            setSkuList(prev => prev.map(sku => {
              if (sku.id === record.id) {
                const newChildren = (sku.children || []).map(child => ({
                  ...child,
                  isForSale: false,
                  saleStatus: SALE_STATUS.NOT_FOR_SALE,
                }));
                return {
                  ...sku,
                  isForSale: false,
                  saleStatus: SALE_STATUS.NOT_FOR_SALE,
                  children: newChildren,
                };
              }
              return sku;
            }));
            message.success('已关闭主SKU及所有子SKU的售卖状态');
          },
        });
      } else {
        setSkuList(prev => prev.map(sku => {
          if (sku.id === record.id) {
            return { ...sku, isForSale: true, saleStatus: SALE_STATUS.FOR_SALE };
          }
          return sku;
        }));
        message.success('已开启售卖');
      }
    } else if (parentId) {
      // 子SKU售卖状态变更
      setSkuList(prev => prev.map(sku => {
        if (sku.id === parentId) {
          const newChildren = sku.children.map(child => {
            if (child.id === record.id) {
              return {
                ...child,
                isForSale: isForSale,
                saleStatus: isForSale ? SALE_STATUS.FOR_SALE : SALE_STATUS.NOT_FOR_SALE,
              };
            }
            return child;
          });
          
          const allChildrenNotForSale = newChildren.every(c => !c.isForSale);
          
          return {
            ...sku,
            children: newChildren,
            isForSale: allChildrenNotForSale ? false : sku.isForSale,
            saleStatus: allChildrenNotForSale ? SALE_STATUS.NOT_FOR_SALE : SALE_STATUS.FOR_SALE,
          };
        }
        return sku;
      }));
      message.success(isForSale ? '已开启售卖' : '已关闭售卖');
    } else {
      // 简单SKU
      setSkuList(prev => prev.map(sku => {
        if (sku.id === record.id) {
          return {
            ...sku,
            isForSale: isForSale,
            saleStatus: isForSale ? SALE_STATUS.FOR_SALE : SALE_STATUS.NOT_FOR_SALE,
          };
        }
        return sku;
      }));
      message.success(isForSale ? '已开启售卖' : '已关闭售卖');
    }
  };

  const handleSaveSku = async () => {
    try {
      const values = await skuForm.validateFields();
      
      const saleStatus = values.isForSale ? SALE_STATUS.FOR_SALE : SALE_STATUS.NOT_FOR_SALE;
      
      const saleData = {
        isForSale: values.isForSale || false,
        saleStatus: saleStatus,
        salePlatform: values.salePlatform || null,
        listedAt: values.listedAt ? values.listedAt.toISOString() : null,
        actualSalePrice: values.actualSalePrice || null,
        listedStock: values.listedStock || 0,
      };
      
      if (editingParentSku) {
        // 保存子SKU
        const childData = {
          ...values,
          ...saleData,
          isParent: false,
          parentId: editingParentSku.id,
          status: calculateStockStatus(values.stock || 0),
          updatedAt: new Date().toISOString(),
        };

        if (editingSku) {
          setSkuList(prev => prev.map(sku => {
            if (sku.id === editingParentSku.id) {
              const newChildren = sku.children.map(c => 
                c.id === editingSku.id ? { ...c, ...childData } : c
              );
              const totalStock = newChildren.reduce((sum, c) => sum + (c.stock || 0), 0);
              const allChildrenNotForSale = newChildren.every(c => !c.isForSale);
              
              return {
                ...sku,
                children: newChildren,
                status: calculateStockStatus(totalStock),
                isForSale: allChildrenNotForSale ? false : sku.isForSale,
                saleStatus: allChildrenNotForSale ? SALE_STATUS.NOT_FOR_SALE : SALE_STATUS.FOR_SALE,
              };
            }
            return sku;
          }));
          message.success('子SKU 更新成功');
        } else {
          setSkuList(prev => prev.map(sku => {
            if (sku.id === editingParentSku.id) {
              const newChildren = [...(sku.children || []), {
                ...childData,
                id: 'sku_' + Date.now(),
                skuCode: values.skuCode || generateSkuCode(),
                createdAt: new Date().toISOString(),
              }];
              const totalStock = newChildren.reduce((sum, c) => sum + (c.stock || 0), 0);
              const anyChildForSale = newChildren.some(c => c.isForSale);
              
              return {
                ...sku,
                children: newChildren,
                status: calculateStockStatus(totalStock),
                isForSale: anyChildForSale ? true : sku.isForSale,
                saleStatus: anyChildForSale ? SALE_STATUS.FOR_SALE : SALE_STATUS.NOT_FOR_SALE,
              };
            }
            return sku;
          }));
          message.success('子SKU 创建成功');
        }
      } else {
        // 保存主SKU或简单SKU
        const category = values.category || [];
        
        const skuData = {
          ...values,
          ...saleData,
          category1: category[0] || null,
          category2: category[1] || null,
          category3: category[2] || null,
          skuCode: values.skuCode || generateSkuCode(),
          isParent: values.isParent !== false,
          parentId: null,
          children: editingSku ? editingSku.children : [],
          createdAt: editingSku ? editingSku.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (editingSku) {
          setSkuList(prev => prev.map(s => 
            s.id === editingSku.id ? { ...s, ...skuData } : s
          ));
          message.success('SKU 更新成功');
        } else {
          setSkuList(prev => [...prev, { 
            ...skuData, 
            id: 'sku_' + Date.now(),
            children: [],
          }]);
          message.success('SKU 创建成功');
        }
      }
      
      setSkuModalVisible(false);
      setEditingParentSku(null);
    } catch (e) {
      console.error('表单验证失败:', e);
    }
  };

  const handleAddSubSku = (parentSku) => {
    setEditingSku(null);
    setEditingParentSku(parentSku);
    skuForm.resetFields();
    skuForm.setFieldsValue({
      parentId: parentSku.id,
      listedAt: dayjs(),
      isForSale: false,
    });
    setSkuModalVisible(true);
  };

  // 查看子SKU弹窗
  const handleViewSubSku = (parentSku) => {
    setViewingParentSku(parentSku);
    setSubSkuModalVisible(true);
  };

  // ==================== 主表格列 ====================
  const mainColumns = [
    {
      title: 'SKU编码',
      dataIndex: 'skuCode',
      width: 150,
      fixed: 'left',
      render: (text, record) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: record.isParent ? 'bold' : 'normal' }}>
          {record.isParent && <AppstoreOutlined style={{ marginRight: 4, color: '#1890ff' }} />}
          {text}
        </span>
      ),
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      width: 200,
      render: (text, record) => {
        if (record.isParent) {
          return (
            <div style={{ background: '#e6f7ff', padding: '4px 8px', borderRadius: 4 }}>
              <div style={{ fontWeight: 600, color: '#1890ff' }}>{text}</div>
              <div style={{ fontSize: 11, color: '#999' }}>
                {record.brand && <span>{record.brand} | </span>}
                <span style={{ color: '#52c41a' }}>子SKU: {record._childrenCount}个</span>
              </div>
            </div>
          );
        }
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            {record.spec && <div style={{ fontSize: 12, color: '#999' }}>{record.spec}</div>}
          </div>
        );
      },
    },
    {
      title: '库存',
      key: 'stock',
      width: 60,
      align: 'center',
      render: (_, record) => {
        if (record.isParent) {
          return <Badge count={record._totalStock} showZero color={record._totalStock > 0 ? '#1890ff' : '#cf1322'} />;
        }
        if (record.stock === 0) return <Tag color="error">0</Tag>;
        if (record.stock <= STOCK_WARNING_THRESHOLD) return <Tag color="warning">{record.stock}</Tag>;
        return <span>{record.stock}</span>;
      },
    },
    {
      title: '冻结库存',
      key: 'frozenStock',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const frozen = record.isParent ? record._totalFrozenStock : record.frozenStock;
        if (!frozen || frozen === 0) {
          return <span style={{ color: '#ccc' }}>0</span>;
        }
        return (
          <Tooltip title="绑定订单中未完结的数量">
            <Tag color="orange" icon={<span style={{ fontSize: 12 }}>🔒</span>}>
              {frozen}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '成本价',
      dataIndex: 'costPrice',
      width: 75,
      align: 'right',
      render: (val, record) => {
        if (record.isParent) return <span style={{ color: '#ccc' }}>-</span>;
        return <span style={{ color: '#666' }}>¥{val || 0}</span>;
      },
    },
    {
      title: '售价',
      key: 'salePrice',
      width: 75,
      align: 'right',
      render: (_, record) => {
        const price = record.isParent ? record._avgSalePrice : record.salePrice;
        if (record.isParent && (!record.children || record.children.length === 0)) {
          return <span style={{ color: '#ccc' }}>-</span>;
        }
        return <span style={{ color: '#1890ff', fontWeight: 'bold' }}>¥{price.toFixed(2)}</span>;
      },
    },
    {
      title: '预计利润',
      key: 'expectedProfit',
      width: 90,
      align: 'right',
      sorter: (a, b) => {
        const profitA = a._avgExpectedProfit || 0;
        const profitB = b._avgExpectedProfit || 0;
        return profitA - profitB;
      },
      render: (_, record) => {
        if (record.isParent && (!record.children || record.children.length === 0)) {
          return <span style={{ color: '#ccc' }}>-</span>;
        }

        const profit = record._avgExpectedProfit || 0;
        const profitColor = profit > 0 ? '#52c41a' : profit < 0 ? '#cf1322' : '#999';
        const profitIcon = profit > 0 ? <ArrowUpOutlined /> : profit < 0 ? <ArrowDownOutlined /> : null;

        return (
          <Tooltip title={'平均利润 = 子SKU利润之和 / 子SKU数量'}>
            <span style={{ color: profitColor, fontWeight: 'bold' }}>
              {profitIcon} ¥{profit.toFixed(2)}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '实际售价',
      key: 'actualSalePrice',
      width: 80,
      align: 'right',
      render: (_, record) => {
        if (record.isParent && (!record.children || record.children.length === 0)) {
          return <span style={{ color: '#ccc' }}>-</span>;
        }
        const price = record.isParent ? record._avgActualSalePrice : record.actualSalePrice;
        if (!price) return <span style={{ color: '#ccc' }}>-</span>;
        return <span style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{price.toFixed(2)}</span>;
      },
    },
    {
      title: '上架库存',
      dataIndex: 'listedStock',
      width: 70,
      align: 'center',
      render: (val, record) => {
        if (record.isParent) return <span style={{ color: '#ccc' }}>-</span>;
        return <span>{val || 0}</span>;
      },
    },
    {
      title: '是否售卖',
      dataIndex: 'isForSale',
      width: 85,
      align: 'center',
      render: (isForSale, record) => (
        <Switch
          checked={isForSale}
          onChange={(checked) => handleSaleStatusChange(record, checked)}
          checkedChildren="售卖"
          unCheckedChildren="关闭"
          size="small"
        />
      ),
    },
    {
      title: '售卖平台',
      dataIndex: 'salePlatform',
      width: 75,
      render: (platform, record) => {
        if (record.isParent) return <span style={{ color: '#ccc' }}>-</span>;
        if (!platform) return <span style={{ color: '#ccc' }}>-</span>;
        return <Tag color="blue">{platform}</Tag>;
      },
    },
    {
      title: '售卖数量',
      key: 'soldQuantity',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const quantity = record.isParent ? record._totalSoldQuantity : record.soldQuantity;
        if (record.isParent && (!record.children || record.children.length === 0)) {
          return <span style={{ color: '#ccc' }}>0</span>;
        }
        if (!quantity || quantity === 0) return <span style={{ color: '#ccc' }}>0</span>;
        return (
          <Tooltip title={`总售卖金额: ¥${(record.isParent ? record._totalSaleAmount : record.saleAmount) || 0}`}>
            <Tag color="green">{quantity}</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 75,
      render: (status, record) => {
        if (record.isParent) {
          if (record._childrenCount === 0) return <Tag color="default">无子SKU</Tag>;
          if (record._hasOutOfStock) return <Tag color="error">有缺货</Tag>;
          if (record._hasLowStock) return <Tag color="warning">有预警</Tag>;
          return <Tag color="success">正常</Tag>;
        }
        return <Tag color={SKU_STATUS_COLORS[status]}>{SKU_STATUS_LABELS[status]}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4} wrap>
          {record.isParent && (
            <>
              <Button
                size="small"
                icon={<AppstoreOutlined />}
                onClick={() => handleViewSubSku(record)}
              >
                查看子SKU
              </Button>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleAddSubSku(record)}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                添加子SKU
              </Button>
            </>
          )}
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditSku(record)}>
            编辑
          </Button>
          <Popconfirm
            title={record.isParent ? "该主SKU下有子SKU，确定删除所有？" : "确定删除该 SKU？"}
            onConfirm={() => handleDeleteSku(record)}
            okText="删除"
            okType="danger"
          >
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ==================== 子表格列 ====================
  const subColumns = [
    {
      title: 'SKU编码',
      dataIndex: 'skuCode',
      width: 150,
      render: (text) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#666', paddingLeft: 20 }}>
          {text}
        </span>
      ),
    },
    {
      title: '规格名称',
      dataIndex: 'name',
      width: 200,
      render: (text, record) => (
        <div style={{ paddingLeft: 12, borderLeft: '2px solid #91d5ff' }}>
          <div style={{ color: '#333' }}>{text}</div>
          {record.spec && <div style={{ fontSize: 12, color: '#999' }}>{record.spec}</div>}
        </div>
      ),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 60,
      align: 'center',
      render: (stock) => {
        if (stock === 0) return <Tag color="error">0</Tag>;
        if (stock <= STOCK_WARNING_THRESHOLD) return <Tag color="warning">{stock}</Tag>;
        return <span>{stock}</span>;
      },
    },
    {
      title: '冻结库存',
      dataIndex: 'frozenStock',
      width: 80,
      align: 'center',
      render: (frozen) => {
        if (!frozen || frozen === 0) {
          return <span style={{ color: '#ccc' }}>0</span>;
        }
        return (
          <Tooltip title="绑定订单中未完结的数量">
            <Tag color="orange">🔒 {frozen}</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '成本价',
      dataIndex: 'costPrice',
      width: 75,
      align: 'right',
      render: (val) => <span style={{ color: '#666' }}>¥{val || 0}</span>,
    },
    {
      title: '售价',
      dataIndex: 'salePrice',
      width: 75,
      align: 'right',
      render: (val) => <span style={{ color: '#1890ff', fontWeight: 'bold' }}>¥{val || 0}</span>,
    },
    {
      title: '预计利润',
      key: 'expectedProfit',
      width: 90,
      align: 'right',
      sorter: (a, b) => ((a.salePrice || 0) - (a.costPrice || 0)) - ((b.salePrice || 0) - (b.costPrice || 0)),
      render: (_, record) => {
        const profit = (record.salePrice || 0) - (record.costPrice || 0);
        const profitColor = profit > 0 ? '#52c41a' : profit < 0 ? '#cf1322' : '#999';
        const profitIcon = profit > 0 ? <ArrowUpOutlined /> : profit < 0 ? <ArrowDownOutlined /> : null;
        
        return (
          <span style={{ color: profitColor, fontWeight: 'bold' }}>
            {profitIcon} ¥{profit}
          </span>
        );
      },
    },
    {
      title: '实际售价',
      dataIndex: 'actualSalePrice',
      width: 80,
      align: 'right',
      render: (val) => {
        if (!val) return <span style={{ color: '#ccc' }}>-</span>;
        return <span style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{val}</span>;
      },
    },
    {
      title: '上架库存',
      dataIndex: 'listedStock',
      width: 70,
      align: 'center',
      render: (val) => <span>{val || 0}</span>,
    },
    {
      title: '是否售卖',
      dataIndex: 'isForSale',
      width: 85,
      align: 'center',
      render: (isForSale, record, parentRecord) => (
        <Switch
          checked={isForSale}
          onChange={(checked) => handleSaleStatusChange(record, checked, record.parentId)}
          checkedChildren="售卖"
          unCheckedChildren="关闭"
          size="small"
        />
      ),
    },
    {
      title: '售卖平台',
      dataIndex: 'salePlatform',
      width: 75,
      render: (platform) => platform ? <Tag color="blue">{platform}</Tag> : <span style={{ color: '#ccc' }}>-</span>,
    },
    {
      title: '售卖数量',
      dataIndex: 'soldQuantity',
      width: 80,
      align: 'center',
      render: (quantity, record) => {
        if (!quantity || quantity === 0) return <span style={{ color: '#ccc' }}>0</span>;
        return (
          <Tooltip title={`售卖金额: ¥${record.saleAmount || 0}`}>
            <Tag color="green">{quantity}</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 75,
      render: (status) => <Tag color={SKU_STATUS_COLORS[status]}>{SKU_STATUS_LABELS[status]}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditSku(record, { id: record.parentId })}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDeleteSku(record, record.parentId)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 工具栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索 SKU / 商品名称"
            style={{ width: 180 }}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
            enterButton={<SearchOutlined />}
          />
          <Cascader
            placeholder="选择分类"
            options={categoryTree}
            onChange={setFilterCategory}
            value={filterCategory}
            changeOnSelect
            style={{ width: 160 }}
            allowClear
          />
          <Select
            placeholder="库存状态"
            style={{ width: 100 }}
            value={filterStatus}
            onChange={setFilterStatus}
            allowClear
          >
            <Select.Option value={SKU_STATUS.ACTIVE}>在售</Select.Option>
            <Select.Option value={SKU_STATUS.LOW_STOCK}>预警</Select.Option>
            <Select.Option value={SKU_STATUS.OUT_OF_STOCK}>缺货</Select.Option>
          </Select>
          <Select
            placeholder="售卖状态"
            style={{ width: 100 }}
            value={filterSaleStatus}
            onChange={setFilterSaleStatus}
            allowClear
          >
            <Select.Option value={SALE_STATUS.NOT_FOR_SALE}>不售卖</Select.Option>
            <Select.Option value={SALE_STATUS.FOR_SALE}>售卖中</Select.Option>
          </Select>
        </Space>
        <Space>
          <Button icon={<ExportOutlined />} onClick={onExport}>导出</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSku}>新建 SKU</Button>
        </Space>
      </div>

      {/* SKU 表格 */}
      <Table
        dataSource={filteredSkuList}
        columns={mainColumns}
        rowKey="id"
        scroll={{ x: 1400 }}
        pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (total) => '共 ' + total + ' 条' }}
        size="small"
      />

      {/* SKU 编辑弹窗 */}
      <Modal
        title={editingParentSku 
          ? (editingSku ? '编辑子SKU' : '添加子SKU')
          : (editingSku ? '编辑 SKU' : '新建 SKU')}
        open={skuModalVisible}
        onOk={handleSaveSku}
        onCancel={() => {
          setSkuModalVisible(false);
          setEditingParentSku(null);
        }}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form form={skuForm} layout="vertical">
          {editingParentSku && (
            <Form.Item name="parentId" hidden><Input /></Form.Item>
          )}
          
          {/* 基本信息 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>基本信息</div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="name" 
                  label={editingParentSku ? '规格名称' : '商品名称'}
                  rules={[{ required: true, message: '请输入名称' }]}
                >
                  <Input placeholder={editingParentSku ? '如：12+256GB 黑色' : '请输入商品名称'} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="skuCode" label="SKU 编码">
                  <Input placeholder="自动生成或手动输入" />
                </Form.Item>
              </Col>
            </Row>

            {!editingParentSku && (
              <>
                <Form.Item name="category" label="商品分类" rules={[{ required: true, message: '请选择商品分类' }]}>
                  <Cascader options={categoryTree} placeholder="请选择分类" style={{ width: '100%' }} />
                </Form.Item>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="brand" label="品牌">
                      <Input placeholder="如：Apple、小米" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="isParent" label="SKU类型" initialValue={true}>
                      <Select>
                        <Select.Option value={true}>主SKU（可添加子SKU）</Select.Option>
                        <Select.Option value={false}>简单SKU（无子SKU）</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </>
            )}

            {editingParentSku && (
              <Form.Item name="spec" label="规格描述">
                <Input placeholder="如：12GB+256GB / 黑色" />
              </Form.Item>
            )}
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* 库存与价格 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>库存与价格</div>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="stock" label="库存数量" rules={[{ required: true, message: '请输入库存数量' }]}>
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="库存" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="costPrice" label="成本价" rules={[{ required: true, message: '请输入成本价' }]}>
                  <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" placeholder="成本价" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="salePrice" label="售价" rules={[{ required: true, message: '请输入售价' }]}>
                  <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" placeholder="售价" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="actualSalePrice" label="实际售价">
                  <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" placeholder="实际售价" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="listedStock" label="上架库存">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="上架库存" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* 售卖设置 */}
          <div>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>售卖设置</div>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="isForSale" label="是否正在售卖" valuePropName="checked">
                  <Switch checkedChildren="售卖中" unCheckedChildren="未售卖" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="salePlatform" label="售卖平台">
                  <Input placeholder="如：闲鱼、转转" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="listedAt" label="上架时间">
                  <DatePicker showTime style={{ width: '100%' }} placeholder="上架时间" />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>

      {/* 子SKU查看弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppstoreOutlined style={{ color: '#1890ff' }} />
            <span>子SKU列表 - {viewingParentSku?.name}</span>
          </div>
        }
        open={subSkuModalVisible}
        onCancel={() => {
          setSubSkuModalVisible(false);
          setViewingParentSku(null);
        }}
        footer={null}
        width={1100}
      >
        {viewingParentSku && (
          <>
            {/* 主SKU汇总信息 */}
            <div style={{
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16
            }}>
              <Row gutter={16}>
                <Col span={2}>
                  <div style={{ color: '#666', fontSize: 12 }}>总库存</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
                    {viewingParentSku._totalStock || 0}
                  </div>
                </Col>
                <Col span={2}>
                  <div style={{ color: '#666', fontSize: 12 }}>冻结库存</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fa8c16' }}>
                    🔒 {viewingParentSku._totalFrozenStock || 0}
                  </div>
                </Col>
                <Col span={2}>
                  <div style={{ color: '#666', fontSize: 12 }}>子SKU数量</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a' }}>
                    {viewingParentSku._childrenCount || 0}
                  </div>
                </Col>
                <Col span={2}>
                  <div style={{ color: '#666', fontSize: 12 }}>总售卖数量</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fa8c16' }}>
                    {viewingParentSku._totalSoldQuantity || 0}
                  </div>
                </Col>
                <Col span={2}>
                  <div style={{ color: '#666', fontSize: 12 }}>总售卖金额</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fa8c16' }}>
                    ¥{(viewingParentSku._totalSaleAmount || 0).toFixed(2)}
                  </div>
                </Col>
                <Col span={2}>
                  <div style={{ color: '#666', fontSize: 12 }}>平均售价</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
                    ¥{(viewingParentSku._avgSalePrice || 0).toFixed(2)}
                  </div>
                </Col>
                <Col span={2}>
                  <div style={{ color: '#666', fontSize: 12 }}>平均实际售价</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a' }}>
                    ¥{(viewingParentSku._avgActualSalePrice || 0).toFixed(2)}
                  </div>
                </Col>
                <Col span={2}>
                  <div style={{ color: '#666', fontSize: 12 }}>平均预计利润</div>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: (viewingParentSku._avgExpectedProfit || 0) >= 0 ? '#52c41a' : '#cf1322'
                  }}>
                    ¥{(viewingParentSku._avgExpectedProfit || 0).toFixed(2)}
                  </div>
                </Col>
                <Col span={2}>
                  <div style={{ color: '#666', fontSize: 12 }}>品牌</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {viewingParentSku.brand || '-'}
                  </div>
                </Col>
              </Row>
            </div>

            {/* 子SKU表格 */}
            <Table
              dataSource={viewingParentSku.children || []}
              columns={subColumns}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 1000 }}
              locale={{ emptyText: '暂无子SKU' }}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default SkuTable;
