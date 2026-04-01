// src/pages/Categories.jsx 
import React, { useState, useEffect } from 'react'; 
import { Card, Table, Button, Modal, Form, Input, Select, Switch, Space, message, Popconfirm, Badge, Upload, Image } from 'antd'; 
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons'; 
import { request, uploadFile } from '../utils/request'; 

export default function Categories() { 
  const [loading, setLoading] = useState(false); 
  const [categories, setCategories] = useState([]); 
  const [modalVisible, setModalVisible] = useState(false); 
  const [editingCategory, setEditingCategory] = useState(null); 
  const [form] = Form.useForm(); 
  const [uploading, setUploading] = useState(false); 
  const [expandedRowKeys, setExpandedRowKeys] = useState([]); 

  const colorOptions = [ 
    { value: '#4364F7', label: '蓝色' }, 
    { value: '#F44336', label: '红色' }, 
    { value: '#4CAF50', label: '绿色' }, 
    { value: '#FF9800', label: '橙色' }, 
    { value: '#9C27B0', label: '紫色' }, 
    { value: '#00BCD4', label: '青色' }, 
  ]; 

  // 获取分类列表
  const fetchCategories = async () => { 
    setLoading(true); 
    try { 
      const res = await request('/api/categories/list'); 
      console.log('=== 接口返回数据 ===', res); 
      
      if (res && res.data) { 
        const list = Array.isArray(res.data) ? res.data : (res.data.data || []); 
        
        // 🔧 核心修复：后端返回的主键是 _id，统一映射为 id，保证后续逻辑不出错
        const normalizedList = list.map(item => ({
          ...item,
          id: item._id 
        }));
        console.log('=== 解析后的列表 ===', normalizedList); 

        if (normalizedList.length > 0) { 
          setCategories(normalizedList); 
          const allIds = normalizedList.map(item => String(item.id)); 
          setExpandedRowKeys(allIds); 
        } else { 
          setCategories([]); 
          message.info('数据库中暂无分类数据'); 
        } 
      } else if (res && res.success === false) { 
        message.error(res.message || '获取分类失败'); 
      } 
    } catch (e) { 
      console.error('获取分类异常:', e); 
      message.error('获取分类失败'); 
    } finally { 
      setLoading(false); 
    } 
  }; 

  useEffect(() => { 
    fetchCategories(); 
  }, []); 

  // 构建树形数据
  const buildTree = (data) => { 
    if (!data || data.length === 0) return []; 
    const map = {}; 
    const roots = []; 
    
    data.forEach(item => { 
      map[String(item.id)] = { ...item, children: [] }; 
    }); 
    
    data.forEach(item => { 
      const id = String(item.id); 
      const parentId = item.parentId ? String(item.parentId) : null; 
      if (parentId && map[parentId]) { 
        map[parentId].children.push(map[id]); 
      } else { 
        roots.push(map[id]); 
      } 
    }); 
    console.log('=== 构建的树形数据 ===', roots); 
    return roots; 
  }; 

  // 获取层级
  const getLevel = (record) => { 
    if (!record.parentId) return 1; 
    const parent = categories.find(c => String(c.id) === String(record.parentId)); 
    if (!parent?.parentId) return 2; 
    return 3; 
  }; 

  // 打开弹窗
  const openModal = (record = null) => { 
    setEditingCategory(record); 
    if (record) { 
      form.setFieldsValue({ 
        name: record.name, 
        color: record.color || '#4364F7', 
        icon: record.icon, 
        parentId: record.parentId || undefined, 
        sort: record.sort || 0, 
        isActive: record.isActive ?? true, 
      }); 
    } else { 
      form.resetFields(); 
      form.setFieldsValue({ 
        color: '#4364F7', 
        sort: 0, 
        isActive: true, 
      }); 
    } 
    setModalVisible(true); 
  }; 

  // 上传图标
  const handleUploadIcon = async (file) => { 
    setUploading(true); 
    try { 
      const result = await uploadFile(file); 
      const url = result.data?.url || result.url; 
      if (result.ok || url) { 
        form.setFieldValue('icon', url); 
        message.success('上传成功'); 
      } 
    } catch (error) { 
      message.error('上传失败'); 
    } finally { 
      setUploading(false); 
    } 
  }; 

  // 保存
  const handleSave = async () => { 
    try { 
      const values = await form.validateFields(); 
      const parentId = values.parentId && values.parentId !== '' ? values.parentId : null; 
      let level = 1; 
      if (parentId) { 
        const parent = categories.find(c => String(c.id) === String(parentId)); 
        if (parent) { 
          level = (parent.level || getLevel(parent)) + 1; 
        } 
      } 

      const data = { 
        ...values, 
        parentId, 
        level 
      }; 

      const url = editingCategory?.id ? `/api/categories/${editingCategory.id}` : '/api/categories'; 
      const method = editingCategory ? 'PUT' : 'POST'; 
      const res = await request(url, { 
        method, 
        body: JSON.stringify(data), 
      }); 

      if (res.ok || res.success) { 
        message.success(editingCategory ? '更新成功' : '添加成功'); 
        setModalVisible(false); 
        fetchCategories(); 
      } else { 
        message.error(res.message || res.data?.message || '操作失败'); 
      } 
    } catch (e) { 
      console.error(e); 
      message.error('操作失败'); 
    } 
  }; 

  // 删除
  const handleDelete = async (id) => { 
    try { 
      const res = await request(`/api/categories/${id}`, { 
        method: 'DELETE' 
      }); 
      if (res.ok || res.success) { 
        message.success('删除成功'); 
        fetchCategories(); 
      } 
    } catch (e) { 
      message.error('删除失败'); 
    } 
  }; 

  // 父级选项
  const getParentOptions = () => { 
    const options = [{ value: null, label: '无（一级分类）' }]; 
    const addOptions = (items, level = 1) => { 
      items.forEach(item => { 
        if (!editingCategory || String(item.id) !== String(editingCategory.id)) { 
          const prefix = '—'.repeat(level - 1); 
          options.push({ 
            value: item.id, 
            label: `${prefix}${item.name}`, 
            disabled: level >= 3, 
          }); 
          if (item.children?.length > 0) { 
            addOptions(item.children, level + 1); 
          } 
        } 
      }); 
    }; 
    addOptions(buildTree(categories)); 
    return options; 
  }; 

  // 表格列
  const columns = [ 
    { 
      title: '分类名称', 
      dataIndex: 'name', 
      key: 'name', 
      render: (text, record) => ( 
        <Space> 
          {record.icon ? ( 
            <Image src={`https://xiaoxiang.zeabur.app${record.icon}`} style={{ width: 24, height: 24, borderRadius: 4 }} preview={false} /> 
          ) : ( 
            <div style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: record.color || '#4364F7', }} /> 
          )} 
          <span>{text}</span> 
          {record.isActive === false && <span style={{ color: '#999' }}>(已禁用)</span>} 
        </Space> 
      ), 
    }, 
    { 
      title: '层级', 
      key: 'level', 
      width: 100, 
      render: (_, record) => { 
        const level = record.level || getLevel(record); 
        const colors = ['blue', 'green', 'orange']; 
        return <Badge color={colors[level - 1]} text={`${level}级`} />; 
      }, 
    }, 
    { 
      title: '排序', 
      dataIndex: 'sort', 
      key: 'sort', 
      width: 60, 
    }, 
    { 
      title: '操作', 
      key: 'action', 
      width: 200, 
      render: (_, record) => { 
        const hasChildren = categories.some(c => String(c.parentId) === String(record.id)); 
        const level = record.level || getLevel(record); 
        return ( 
          <Space> 
            <Button type="link" size="small" onClick={() => openModal(record)}> 
              编辑 
            </Button> 
            {level < 3 && ( 
              <Button type="link" size="small" onClick={() => openModal({ parentId: record.id })}> 
                添加子分类 
              </Button> 
            )} 
            <Popconfirm 
              title="确定删除？" 
              onConfirm={() => handleDelete(record.id)} 
              okText="确定" 
              cancelText="取消" 
              disabled={hasChildren} 
            > 
              <Button type="link" danger size="small" disabled={hasChildren}> 
                删除 
              </Button> 
            </Popconfirm> 
          </Space> 
        ); 
      }, 
    }, 
  ]; 

  return ( 
    <Card 
      title="分类管理" 
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>添加分类</Button>} 
    > 
      <Table 
        dataSource={buildTree(categories)} 
        columns={columns} 
        rowKey="id"  // 🔧 修复：配合映射后的 id 字段
        loading={loading} 
        pagination={false} 
        expandedRowKeys={expandedRowKeys} 
        onExpandedRowsChange={(keys) => setExpandedRowKeys(keys)} 
      /> 
      <Modal 
        title={editingCategory?.id ? '编辑分类' : '添加分类'} 
        open={modalVisible} 
        onOk={handleSave} 
        onCancel={() => setModalVisible(false)} 
        okText="确定" 
        cancelText="取消" 
        confirmLoading={uploading} 
      > 
        <Form form={form} layout="vertical"> 
          <Form.Item name="name" label="分类名称" rules={[{ required: true }]}> 
            <Input placeholder="请输入分类名称" /> 
          </Form.Item> 
          <Form.Item name="parentId" label="父级分类"> 
            <Select placeholder="选择父级分类" allowClear options={getParentOptions()} /> 
          </Form.Item> 
          <Form.Item name="color" label="颜色" initialValue="#4364F7"> 
            <Select> 
              {colorOptions.map(opt => ( 
                <Select.Option key={opt.value} value={opt.value}> 
                  <Space> 
                    <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: opt.value }} /> 
                    {opt.label} 
                  </Space> 
                </Select.Option> 
              ))} 
            </Select> 
          </Form.Item> 
          <Form.Item label="图标"> 
            <Space> 
              <Form.Item name="icon" noStyle> 
                <Input placeholder="图标URL" style={{ width: 250 }} /> 
              </Form.Item> 
              <Upload showUploadList={false} beforeUpload={handleUploadIcon} accept="image/*"> 
                <Button icon={<UploadOutlined />} loading={uploading}>上传</Button> 
              </Upload> 
            </Space> 
          </Form.Item> 
          <Form.Item name="sort" label="排序" initialValue={0}> 
            <Input type="number" placeholder="数字越小越靠前" /> 
          </Form.Item> 
          <Form.Item name="isActive" label="状态" valuePropName="checked" initialValue={true}> 
            <Switch checkedChildren="启用" unCheckedChildren="禁用" /> 
          </Form.Item> 
        </Form> 
      </Modal> 
    </Card> 
  ); 
}
