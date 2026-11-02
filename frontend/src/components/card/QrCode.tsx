import { QRCodeCanvas } from 'qrcode.react';

type Props = { id: string; value: string; size?: number };

export default function QrCode({ id, value, size = 168 }: Props) {
  return (
    <div id={id} className="inline-flex rounded-2xl bg-white p-3 ring-1 ring-navy-100">
      <QRCodeCanvas value={value} size={size} level="M" includeMargin />
    </div>
  );
}
