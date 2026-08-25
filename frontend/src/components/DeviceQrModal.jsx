import { useState } from 'react';
import { Button, Checkbox, Modal, Space, message } from 'antd';
import { toPng } from 'html-to-image';
import DeviceInfoCard from './DeviceInfoCard';
import {
  ALL_QR_FIELDS,
  DEFAULT_QR_FIELDS,
  FILED_LABELS,
  buildQrUrl,
} from '../utils/deviceQr';

/**
 * 单设备二维码弹窗组件
 *
 * 左侧为信息牌实时预览，右侧为对外展示字段勾选（勾选变化即时反映到预览）；
 * 底部提供下载 PNG、打印 A4、复制二维码链接三种操作。
 * 二维码链接按当前站点 origin + 设备公开页地址 + 勾选字段拼接。
 * 弹窗内容仅在 open 时渲染（destroyOnClose），device 为 null 时不报错。
 *
 * @param {Object} props - 组件属性
 * @param {boolean} props.open - 弹窗是否打开
 * @param {Object|null} props.device - 设备对象（可为 null）
 * @param {Function} props.onClose - 关闭弹窗回调
 * @returns {JSX.Element} 单设备二维码弹窗
 */
export default function DeviceQrModal({ open, device, onClose }) {
  // 对外展示字段 key 数组（默认取默认字段集）
  const [fields, setFields] = useState(DEFAULT_QR_FIELDS);
  // PNG 下载中标记
  const [downloading, setDownloading] = useState(false);

  // 二维码公开页链接：device 缺失时 deviceId 传空串，保证不报错
  const qrUrl = buildQrUrl(
    typeof window !== 'undefined' ? window.location.origin : '',
    device?.deviceId || '',
    fields
  );

  /**
   * 切换字段勾选状态
   * deviceId（设备编号）为核心标识，强制包含、不可取消，保证扫码唯一绑定设备
   * @param {string} key - 字段 key
   * @param {boolean} checked - 是否勾选
   * @returns {void}
   */
  const handleToggleField = (key, checked) => {
    setFields((prev) => {
      if (key === 'deviceId') {
        // 设备编号不允许取消，始终保留
        return prev.includes('deviceId') ? prev : ['deviceId', ...prev];
      }
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      // 按 ALL_QR_FIELDS 顺序重排，保证预览行序稳定
      return ALL_QR_FIELDS.filter((item) => next.has(item));
    });
  };

  /**
   * 下载信息牌 PNG：html-to-image 截图预览区（pixelRatio:2 高清）并触发浏览器下载
   * @returns {Promise<void>}
   */
  const handleDownload = async () => {
    const node = document.getElementById('device-qr-preview');
    if (!node) {
      return;
    }
    setDownloading(true);
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${device?.name || device?.deviceId || '设备'}-信息牌.png`;
      link.href = dataUrl;
      link.click();
      message.success('已下载 PNG');
    } catch (error) {
      message.error('下载失败');
    } finally {
      setDownloading(false);
    }
  };

  /**
   * 打印 A4：触发浏览器打印，配合全局打印样式仅输出信息牌区域
   * @returns {void}
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * 复制二维码公开页链接到剪贴板
   * @returns {Promise<void>}
   */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      message.success('二维码链接已复制');
    } catch (error) {
      message.error('复制失败');
    }
  };

  return (
    <Modal
      title={`生成设备二维码 · ${device?.name || device?.deviceId || ''}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnClose
      getContainer={false}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {/* 左栏：信息牌预览 */}
        <div>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
            信息牌预览
          </div>
          <div id="device-qr-preview">
            <DeviceInfoCard device={device} fields={fields} />
          </div>
        </div>
        {/* 右栏：对外展示字段勾选 */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
            对外展示字段
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ALL_QR_FIELDS.map((key) => (
              <Checkbox
                key={key}
                checked={fields.includes(key)}
                // deviceId 为核心标识，强制包含、禁用取消
                disabled={key === 'deviceId'}
                onChange={(e) => handleToggleField(key, e.target.checked)}
              >
                {FILED_LABELS[key] || key}
              </Checkbox>
            ))}
          </div>
        </div>
      </div>
      {/* 底部操作按钮组 */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
          <Button type="primary" loading={downloading} onClick={handleDownload}>
            下载
          </Button>
          <Button onClick={handlePrint}>打印 A4</Button>
          <Button onClick={handleCopyLink}>复制链接</Button>
        </Space>
      </div>
    </Modal>
  );
}
