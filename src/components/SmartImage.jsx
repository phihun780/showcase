import React from 'react';
import { buildSrcSet } from '../utils/responsiveImage';

/**
 * <img> có thêm srcset tự động.
 *
 * Dùng y như <img> bình thường, chỉ thêm `sizes` để báo cho trình duyệt biết
 * ảnh sẽ chiếm bao nhiêu bề ngang màn hình — không có `sizes` thì trình duyệt
 * mặc định coi như 100vw và sẽ chọn bản to hơn mức cần.
 *
 * Ảnh chưa có bản thu nhỏ (mọi ảnh tải lên trước khi có tính năng này) sẽ
 * render đúng như một thẻ <img> thường, không có gì thay đổi.
 */
export default function SmartImage({ src, sizes, ...props }) {
  const srcSet = buildSrcSet(src);

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      {...props}
    />
  );
}
