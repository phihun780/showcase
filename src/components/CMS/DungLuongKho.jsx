import React, { useEffect, useState } from 'react';
import { HardDrive, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { getCmsToken } from '../../utils/r2Storage';

/**
 * Ô hiển thị dung lượng đang dùng trên R2, so với mức 10 GB miễn phí.
 *
 * HẠN MỨC 10 GB TÍNH CHO CẢ TÀI KHOẢN, không phải từng kho. Tài khoản còn kho
 * của webapp khác, nên chỉ đếm kho của trang này là nhìn thấy còn nhiều hơn
 * thực tế. Máy chủ cố đếm cả tài khoản; khoá R2 nào chỉ có quyền trên một kho
 * thì nó lùi về đếm kho đó và báo lại qua `phamVi`, giao diện nói rõ ra.
 *
 * VÌ SAO ĐẾM CHỨ KHÔNG HỎI CLOUDFLARE:
 * R2 không có API trả về tổng dung lượng của một bucket. Máy chủ phải đi hết
 * danh sách file rồi cộng cỡ từng cái — xem functions/api/dung-luong.js. Con
 * số trên trang quản trị Cloudflare cũng có, nhưng cập nhật trễ vài tiếng nên
 * vừa tải ảnh lên xong nhìn vào đó không thấy gì đổi.
 *
 * VÌ SAO KHÔNG TỰ ĐẾM LẠI SAU MỖI LẦN TẢI ẢNH:
 * Mỗi lần đếm là đi hết kho — vài nghìn file. Làm vậy sau mỗi tấm ảnh thì vừa
 * chậm vừa tốn lượt gọi (Cloudflare tính tiền theo lượt). Đếm một lần lúc mở
 * CMS, muốn cập nhật thì bấm nút làm mới.
 */
// Kết quả dùng CHUNG cho mọi bản của ô này.
//
// Ô được dựng ở HAI chỗ — một trong thanh bên cho desktop, một ở cuối trang cho
// điện thoại — nhưng mỗi lúc chỉ một chỗ hiện (chỗ kia bị CSS giấu đi). Không
// gom lại thì cả hai cùng gọi API, mà mỗi lần gọi là máy chủ đi hết danh sách
// file của cả tài khoản: tốn gấp đôi mà chẳng được gì.
//
// PHẢI KHOÁ THEO LẦN GỌI ĐANG CHẠY, KHÔNG PHẢI THEO KẾT QUẢ:
// Hai ô dựng lên cùng một nhịp, nên nếu chỉ hỏi "đã có kết quả chưa" thì lúc
// đó cả hai đều thấy chưa có và cùng lao đi gọi. Đã đo: 4 lần gọi trong cùng
// 0,01 giây (hai ô, nhân đôi vì React chạy effect hai lần lúc phát triển).
// Giữ lại chính cái lời hứa đang chạy dở thì ai tới sau bám vào đó mà chờ.
let boNhoChung = null;
let dangGoiDo = null;
const nguoiNghe = new Set();

async function docTuMayChu() {
  const token = getCmsToken();
  const res = await fetch('/api/dung-luong', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const d = await res.json();
  if (!res.ok || !d.success) throw new Error(d.error || `Lỗi ${res.status}`);
  return d;
}

/** Đọc dung lượng, gom mọi lời gọi trùng nhau về một lần. */
function docDungLuong(batBuocDocLai = false) {
  if (!batBuocDocLai && boNhoChung) return Promise.resolve(boNhoChung);
  if (dangGoiDo) return dangGoiDo;

  dangGoiDo = docTuMayChu()
    .then(d => {
      boNhoChung = d;
      // Bản nào đọc xong thì phát cho bản kia, nên bấm nút làm mới ở một chỗ
      // là cả hai cùng cập nhật.
      nguoiNghe.forEach(f => f(d));
      return d;
    })
    .finally(() => { dangGoiDo = null; });

  return dangGoiDo;
}

export default function DungLuongKho() {
  const [soLieu, datSoLieu] = useState(boNhoChung);
  const [dangDoc, datDangDoc] = useState(!boNhoChung);
  const [loi, datLoi] = useState('');

  useEffect(() => {
    nguoiNghe.add(datSoLieu);
    return () => { nguoiNghe.delete(datSoLieu); };
  }, []);

  // `lamMoi` phân biệt lần đọc đầu (lúc mở CMS) với lần bấm nút làm mới.
  // Lần đầu KHÔNG đặt lại trạng thái trước khi gọi: state vốn đã là "đang đọc"
  // rồi, đặt lại là bắt React vẽ thêm một lượt thừa ngay lúc vừa dựng xong.
  const doc = async (lamMoi = false) => {
    if (lamMoi) {
      datDangDoc(true);
      datLoi('');
    }
    try {
      await docDungLuong(lamMoi);
    } catch (e) {
      datLoi(e.message || 'Không đọc được dung lượng');
    } finally {
      datDangDoc(false);
    }
  };

  // Đã có sẵn kết quả từ bản kia thì không gọi lại.
  useEffect(() => { if (!boNhoChung) doc(); }, []);

  return (
    <div className="mt-3 p-3 rounded-2xl bg-[#121216] border border-white/10 shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <HardDrive className="w-3.5 h-3.5 text-[#C3EA39] shrink-0" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-white/70 truncate">
            {soLieu?.phamVi === 'taiKhoan' ? 'R2 — cả tài khoản' : 'Kho ảnh'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => doc(true)}
          disabled={dangDoc}
          aria-label="Đếm lại dung lượng kho"
          className="w-6 h-6 rounded-md text-white/40 hover:text-[#C3EA39] hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer disabled:cursor-default shrink-0"
        >
          {dangDoc
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
      </div>

      {loi ? (
        <p className="text-[11px] font-mono text-red-400 leading-relaxed">{loi}</p>
      ) : !soLieu ? (
        <p className="text-[11px] font-mono text-white/40">Đang đếm…</p>
      ) : (
        <ThongSo soLieu={soLieu} />
      )}
    </div>
  );
}

/**
 * Đổi byte sang chữ người đọc được.
 *
 * Chia cho 1000 chứ không phải 1024, để khớp với cách Cloudflare hiển thị.
 * Lấy 1024 thì cùng một kho mà ô này báo 281 MB còn trang R2 báo 294 MB — nhìn
 * vào tưởng một trong hai đếm sai, trong khi cả hai đều đúng, chỉ là hai cây
 * thước khác nhau.
 */
function coChu(bytes) {
  if (!bytes) return '0 MB';
  const gb = bytes / 1e9;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1e6;
  if (mb >= 1) return `${mb.toFixed(0)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function ThongSo({ soLieu }) {
  const pt = Math.min(100, Math.max(0, soLieu.phanTram || 0));

  // Ba mức màu. Dưới 75% thì xanh thương hiệu, tới 75% chuyển vàng, tới 90% đỏ
  // — để lúc sắp đầy thì nhìn phát biết ngay, không phải đọc số.
  const mau = pt >= 90 ? '#F87171' : pt >= 75 ? '#FBBF24' : '#C3EA39';

  return (
    <>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className="text-base font-display font-extrabold text-white leading-none">
          {coChu(soLieu.tong)}
        </span>
        <span className="text-[11px] font-mono text-white/40">
          / {coChu(soLieu.mucMienPhi)}
        </span>
      </div>

      {/* Thanh mức dùng */}
      <div
        className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(pt)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Đã dùng ${pt.toFixed(1)} phần trăm mức miễn phí`}
      >
        {/* Đã dùng ít quá thì thanh mỏng tới mức không thấy gì. Cho tối thiểu
            2% để luôn còn một vệt màu, đỡ trông như hỏng. */}
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(pt, pt > 0 ? 2 : 0)}%`, backgroundColor: mau }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 mt-1.5">
        <span className="text-[10px] font-mono text-white/40">
          {soLieu.soFile.toLocaleString('vi-VN')} file
        </span>
        <span className="text-[10px] font-mono" style={{ color: mau }}>
          còn {coChu(soLieu.conLai)}
        </span>
      </div>

      {/* Kho quá lớn thì con số trên chỉ là phần đếm được, nói rõ ra. */}
      {soLieu.demDayDu === false && (
        <p className="mt-2 text-[10px] font-mono text-amber-400/80 leading-relaxed flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
          <span>Kho quá nhiều file, mới đếm được một phần</span>
        </p>
      )}

      {/* Đếm được cả tài khoản: liệt kê từng kho, nặng nhất lên đầu. Kho của
          chính trang này tô sáng để phân biệt với kho của webapp khác. */}
      {soLieu.phamVi === 'taiKhoan' && Array.isArray(soLieu.cacKho) && (
        <div className="mt-2.5 pt-2.5 border-t border-white/8 space-y-1">
          {soLieu.cacKho.slice(0, 6).map(k => {
            const cuaTrangNay = soLieu.khoTrang && k.ten === soLieu.khoTrang.ten;
            return (
              <div key={k.ten} className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-mono truncate ${
                  cuaTrangNay ? 'text-[#C3EA39]' : 'text-white/45'
                }`}>
                  {k.ten}
                </span>
                <span className="text-[10px] font-mono text-white/35 shrink-0">{coChu(k.bytes)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Chỉ đếm được một kho: liệt kê theo thư mục trong kho đó, kèm một dòng
          nói rõ đây chưa phải tổng của cả tài khoản — không nói thì nhìn vào
          tưởng còn nhiều chỗ hơn thực tế. */}
      {soLieu.phamVi !== 'taiKhoan' && (
        <>
          {Array.isArray(soLieu.theoThuMuc) && soLieu.theoThuMuc.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-white/8 space-y-1">
              {soLieu.theoThuMuc.slice(0, 4).map(t => (
                <div key={t.ten} className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-white/45 truncate">{t.ten}</span>
                  <span className="text-[10px] font-mono text-white/35 shrink-0">{coChu(t.bytes)}</span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-2 text-[10px] font-mono text-white/35 leading-relaxed flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-px text-amber-400/70" />
            <span>
              Mới tính kho của trang này. Hạn mức 10 GB tính cho cả tài khoản —
              muốn thấy tổng thì cấp cho khoá R2 quyền đọc mọi kho.
            </span>
          </p>
        </>
      )}
    </>
  );
}
