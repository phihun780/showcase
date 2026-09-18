import React from 'react';

/**
 * Một ô nhập, dựng từ mô tả trong `truongNoiDung.js`.
 *
 * Trước đây mỗi ô là một khối JSX viết tay chừng 12 dòng, 37 ô thành hơn 400
 * dòng gần như y hệt nhau. Giờ tất cả đi qua đây, nên kiểu dáng chắc chắn giống
 * nhau và thêm ô mới chỉ là thêm một dòng mô tả.
 */
// Tailwind chỉ sinh CSS cho tên lớp nó thấy nguyên văn trong code. Ghép chuỗi
// kiểu `sm:col-span-${co}` sẽ không ra lớp nào cả, nên phải liệt kê sẵn.
const COT = {
  2: 'sm:col-span-2', 3: 'sm:col-span-3', 4: 'sm:col-span-4',
  5: 'sm:col-span-5', 6: 'sm:col-span-6', 8: 'sm:col-span-8',
  10: 'sm:col-span-10', 12: 'sm:col-span-12',
};

export function ONhap({ truong, giaTri, doi }) {
  const { k, nhan, vd, co = 12, dong, dam, kieu } = truong;
  const laNhieuDong = Boolean(dong);

  const chung =
    'w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 ' +
    'focus:border-[#C3EA39] focus:outline-none text-base sm:text-sm transition-colors';

  const rieng =
    kieu === 'ma'
      ? ' text-[#C3EA39] font-mono font-bold text-center'
      : dam
        ? ' text-white font-bold'
        : ' text-white';

  return (
    <div className={`space-y-1 ${COT[co] || COT[12]}`}>
      <label htmlFor={`o-${k}`} className="text-xs font-mono text-white/70 uppercase block">
        {nhan}
      </label>
      {laNhieuDong ? (
        <textarea
          id={`o-${k}`}
          rows={dong}
          value={giaTri || ''}
          placeholder={vd}
          onChange={e => doi(k, e.target.value)}
          className={chung + rieng + ' resize-y leading-relaxed'}
        />
      ) : (
        <input
          id={`o-${k}`}
          type="text"
          value={giaTri || ''}
          placeholder={vd}
          onChange={e => doi(k, e.target.value)}
          className={chung + rieng}
        />
      )}
    </div>
  );
}

/**
 * Khung bọc một nhóm ô. Dùng chung cho cả ô chữ lẫn mấy khối ảnh, để mọi thứ
 * trong CMS có cùng một kiểu viền, cùng một khoảng cách.
 */
export function Khoi({ tieuDe, mo, phai, children, className = '' }) {
  return (
    <section className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#121216] border border-white/10 space-y-4 ${className}`}>
      {(tieuDe || phai) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div>
            {tieuDe && (
              <h3 className="text-sm sm:text-base font-display font-bold text-white">{tieuDe}</h3>
            )}
            {mo && <p className="text-[11px] font-mono text-white/50 mt-0.5">{mo}</p>}
          </div>
          {phai}
        </div>
      )}
      {children}
    </section>
  );
}

/** Lưới 12 cột dùng chung cho các ô chữ. */
export function LuoiO({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4 items-start">{children}</div>;
}
