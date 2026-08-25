import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { filterToRows, getTypeLabel, buildQrTextContent } from '../utils/deviceQr';

/**
 * 设备信息牌卡片组件
 *
 * 白底卡片，用于展示设备关键信息：顶部小标题（可选）、设备名与类型/型号、
 * 右上 64x64 二维码（扫码跳转设备公开页）、下方两列字段明细表。
 * 二维码默认按当前站点 origin + 设备公开页 URL 生成；
 * 外部传入 qrDataUrl 时优先复用（如打印场景复用已生成的二维码）。
 *
 * @param {Object} props - 组件属性
 * @param {Object} props.device - 设备对象（可含 rackName/roomName，用于拼接"所在位置"）
 * @param {string[]} [props.fields] - 勾选展示的字段 key 数组（空/未传回退默认字段）
 * @param {string} [props.qrDataUrl] - 外部传入的二维码 dataURL，传入时优先使用
 * @param {boolean} [props.showTitle] - 是否显示"设备信息牌"小标题，默认 true
 * @param {Object} [props.style] - 透传到外层 div 的内联样式（可覆盖 width 等默认值）
 * @returns {JSX.Element} 设备信息牌卡片
 */
export default function DeviceInfoCard({
  device,
  fields,
  qrDataUrl,
  showTitle = true,
  style,
}) {
  const [qr, setQr] = useState('');

  // 生成二维码：外部 qrDataUrl 优先；否则按设备公开页 URL 生成；失败静默不阻断渲染
  useEffect(() => {
    if (qrDataUrl) {
      setQr(qrDataUrl);
      return undefined;
    }
    const deviceId = device?.deviceId;
    if (!deviceId) {
      setQr('');
      return undefined;
    }
    let cancelled = false; // 防竞态：依赖变化/卸载后丢弃过期结果
    // 内容为纯文本设备信息（扫码直接展示，不跳转链接）
    const text = buildQrTextContent(device, fields);
    QRCode.toDataURL(text, { margin: 2, width: 512, errorCorrectionLevel: 'L' })
      .then((dataUrl) => {
        if (!cancelled) {
          setQr(dataUrl);
        }
      })
      .catch(() => {
        // 生成失败静默处理，展示占位块，不阻断卡片其余内容渲染
        if (!cancelled) {
          setQr('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [device?.deviceId, fields, qrDataUrl]);

  // 字段明细行：[{label, value}]，value 缺失为 '—'
  const rows = useMemo(() => filterToRows(device, fields), [device, fields]);

  // 副标题：类型（中文）/ 型号（存在才拼接展示）
  const subtitle = [device?.type ? getTypeLabel(device.type) : '', device?.model]
    .filter(Boolean)
    .join(' / ');

  return (
    <div
      className="device-info-card"
      style={{
        background: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: 10,
        padding: 16,
        width: 340,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {showTitle && (
        <div
          style={{
            fontSize: 10,
            color: '#9ca3af',
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          设备信息牌
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#1f2937',
              lineHeight: '24px',
              wordBreak: 'break-word',
            }}
          >
            {device?.name || '—'}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        <div
          style={{
            border: '1px solid #e5e7eb',
            padding: 4,
            borderRadius: 4,
            flexShrink: 0,
            background: '#fff',
          }}
        >
          {qr ? (
            <img
              src={qr}
              alt="设备二维码"
              style={{ width: 96, height: 96, display: 'block' }}
            />
          ) : (
            <div style={{ width: 96, height: 96, background: '#f3f4f6' }} />
          )}
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        {rows.map((row, index) => (
          <div
            key={`${row.label}-${index}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '3px 0',
              fontSize: 12,
              lineHeight: '18px',
            }}
          >
            <span style={{ color: '#8c8c8c', flexShrink: 0 }}>{row.label}</span>
            <span
              style={{
                color: '#1f2937',
                textAlign: 'right',
                wordBreak: 'break-all',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
