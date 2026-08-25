import { useEffect, useState } from 'react';
import { Button, Checkbox, Modal } from 'antd';
import DeviceInfoCard from './DeviceInfoCard';
import { ALL_QR_FIELDS, DEFAULT_QR_FIELDS, FILED_LABELS } from '../utils/deviceQr';

/**
 * 批量设备二维码弹窗组件
 *
 * 用于批量预览并打印多台设备的二维码信息牌：
 * - 顶部 Checkbox 勾选本批统一展示的字段（应用到全部设备卡片）
 * - 卡片区横向换行排列各设备的二维码信息牌，支持滚动预览
 * - 弹窗打开期间给 body 标记 qr-batch-printing class，打印样式据此
 *   与其他二维码预览组件（#device-qr-preview）的打印规则互斥，
 *   只输出本弹窗的 #batch-qr-print-area 区域
 *
 * @param {Object} props - 组件属性
 * @param {boolean} props.open - 弹窗是否打开
 * @param {Object[]} props.devices - 设备对象数组
 * @param {Function} props.onClose - 关闭弹窗回调
 * @returns {JSX.Element} 批量设备二维码弹窗
 */
export default function DeviceQrBatchModal({ open, devices, onClose }) {
  // 本批统一展示的字段 key 数组（默认 DEFAULT_QR_FIELDS）
  const [fields, setFields] = useState(DEFAULT_QR_FIELDS);

  // 弹窗打开期间给 body 加互斥标记 class，卸载/关闭时移除，
  // 保证打印时只显示批量区域、隐藏其他二维码预览区域
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    document.body.classList.add('qr-batch-printing');
    return () => {
      document.body.classList.remove('qr-batch-printing');
    };
  }, [open]);

  /**
   * 切换字段勾选状态
   * @param {string} key - 字段 key
   * @param {boolean} checked - 是否勾选
   * @returns {void}
   */
  const toggleField = (key, checked) => {
    setFields((prev) => {
      if (key === 'deviceId') {
        // 设备编号为核心标识，强制包含、不可取消，保证扫码唯一绑定设备
        return prev.includes('deviceId') ? prev : ['deviceId', ...prev];
      }
      if (checked) {
        return prev.includes(key) ? prev : [...prev, key];
      }
      return prev.filter((item) => item !== key);
    });
  };

  /**
   * 触发浏览器打印（@media print 规则保证只输出批量二维码区域）
   * @returns {void}
   */
  const handlePrint = () => {
    window.print();
  };

  // 兜底归一化，避免 devices 缺省时 .length / .map 报错
  const deviceList = Array.isArray(devices) ? devices : [];

  return (
    <>
      {/* 打印样式内联注入（不改全局 css）：
          选择器限定 body.qr-batch-printing，与其他二维码预览组件的打印规则互斥 */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          body.qr-batch-printing #batch-qr-print-area,
          body.qr-batch-printing #batch-qr-print-area * { visibility: visible; }
          body.qr-batch-printing #device-qr-preview,
          body.qr-batch-printing #device-qr-preview * { visibility: hidden; }
          body.qr-batch-printing #batch-qr-print-area {
            position: absolute;
            left: 0;
            top: 0;
            display: block !important;
            max-height: none !important;
            overflow: visible !important;
          }
        }
      `}</style>
      <Modal
        title={`批量生成二维码（${deviceList.length} 台设备）`}
        open={open}
        onCancel={onClose}
        width={860}
        destroyOnClose
        getContainer={false}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
          <Button key="print" type="primary" onClick={handlePrint}>
            打印 A4
          </Button>,
        ]}
      >
        <div>
          <div style={{ marginBottom: 8, color: '#595959', fontSize: 13 }}>
            选择本批统一展示的字段（应用到全部设备）
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {ALL_QR_FIELDS.map((key) => (
              <Checkbox
                key={key}
                checked={fields.includes(key)}
                // deviceId 为核心标识，强制包含、禁用取消
                disabled={key === 'deviceId'}
                onChange={(e) => toggleField(key, e.target.checked)}
              >
                {FILED_LABELS[key] || key}
              </Checkbox>
            ))}
          </div>
        </div>
        <div
          id="batch-qr-print-area"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
            maxHeight: 480,
            overflow: 'auto',
            marginTop: 16,
          }}
        >
          {deviceList.map((device) => (
            <DeviceInfoCard
              key={device.deviceId}
              device={device}
              fields={fields}
              showTitle={false}
              style={{ width: 320, margin: 4 }}
            />
          ))}
        </div>
      </Modal>
    </>
  );
}
