import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { taiAnhVeMay } from '../../utils/r2Storage';

/**
 * Nút tải một tấm ảnh trong kho về máy.
 *
 * Chỉ mỗi cái icon, không chữ giải thích — đặt ở góc phải trên mỗi tấm ảnh.
 * Vị trí và lúc nào hiện thì bên gọi tự quyết bằng `className`.
 *
 * Ảnh base64 hoặc blob thì không có nút: chúng chưa nằm trong kho, chưa có gì
 * để tải về.
 */
export default function NutTaiAnh({ src, className = '', onLoi }) {
  const [dangTai, setDangTai] = useState(false);

  if (!src || typeof src !== 'string' || src.startsWith('data:') || src.startsWith('blob:')) {
    return null;
  }

  const bam = async (e) => {
    e.preventDefault();
    e.stopPropagation();          // đừng kích hoạt thẻ ảnh bên dưới
    setDangTai(true);
    try {
      await taiAnhVeMay(src);
    } catch (err) {
      onLoi?.(err.message || 'Tải ảnh thất bại');
    } finally {
      setDangTai(false);
    }
  };

  return (
    <button
      type="button"
      data-khong-keo                 /* để cú bấm không bị hiểu nhầm là kéo đổi chỗ */
      onClick={bam}
      onPointerDown={(e) => e.stopPropagation()}
      disabled={dangTai}
      title="Tải hình này về máy"
      aria-label="Tải hình này về máy"
      className={`p-1.5 rounded-lg bg-black/65 hover:bg-[#C3EA39] text-white/85 hover:text-black backdrop-blur-sm border border-white/15 hover:border-[#C3EA39] transition-all cursor-pointer disabled:cursor-wait ${className}`}
    >
      {dangTai
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <Download className="w-3.5 h-3.5" />}
    </button>
  );
}
