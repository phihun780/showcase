import React, { useEffect, useState } from 'react';
import { RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { getCmsToken } from '../../utils/r2Storage';
import { Khoi } from './ONhap';

/**
 * Mục "Dung lượng kho": đang dùng bao nhiêu trên R2, so với mức 10 GB miễn phí.
 *
 * VÌ SAO ĐẾM CHỨ KHÔNG HỎI CLOUDFLARE:
 * R2 không có API trả về tổng dung lượng. Máy chủ phải đi hết danh sách file
 * rồi cộng cỡ từng cái — xem functions/api/dung-luong.js. Số trên trang quản
 * trị Cloudflare cũng có, nhưng cập nhật trễ vài tiếng nên vừa tải ảnh lên
 * xong nhìn vào đó không thấy gì đổi.
 *
 * HẠN MỨC 10 GB TÍNH CHO CẢ TÀI KHOẢN, không phải từng kho. Tài khoản còn kho
 * của webapp khác, nên chỉ đếm kho của trang này là nhìn thấy còn nhiều hơn
 * thực tế. Máy chủ cố đếm cả tài khoản; khoá R2 nào chỉ có quyền trên một kho
 * thì nó lùi về đếm kho đó và báo qua `phamVi`, giao diện nói rõ ra.
 *
 * VÌ SAO KHÔNG TỰ ĐẾM LẠI SAU MỖI LẦN TẢI ẢNH:
 * Mỗi lần đếm là đi hết kho — hàng nghìn file. Làm vậy sau mỗi tấm ảnh thì vừa
 * chậm vừa tốn lượt gọi (Cloudflare tính tiền theo lượt). Đếm một lần, muốn
 * cập nhật thì bấm nút Đếm lại.
 */

// Giữ kết quả lại giữa các lần mở mục này.
//
// Mỗi lần đếm là máy chủ đi hết danh sách file của cả tài khoản, nên bấm qua
// bấm lại giữa các mục mà lần nào cũng đếm lại thì vừa chậm vừa tốn lượt gọi.
// Giữ số cũ, cần mới thì bấm Đếm lại.
//
// Khoá theo LẦN GỌI ĐANG CHẠY chứ không theo kết quả: chỉ hỏi "đã có kết quả
// chưa" thì hai bản dựng cùng một nhịp sẽ cùng thấy chưa có và cùng lao đi
// gọi. Giữ lại chính lời hứa đang chạy dở thì ai tới sau bám vào đó mà chờ.
let boNhoChung = null;
let dangGoiDo = null;

async function docTuMayChu() {
  const token = getCmsToken();
  const res = await fetch('/api/dung-luong', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const d = await res.json();
  if (!res.ok || !d.success) throw new Error(d.error || `Lỗi ${res.status}`);
  return d;
}

function docDungLuong(batBuocDocLai = false) {
  if (!batBuocDocLai && boNhoChung) return Promise.resolve(boNhoChung);
  if (dangGoiDo) return dangGoiDo;

  dangGoiDo = docTuMayChu()
    .then(d => { boNhoChung = d; return d; })
    .finally(() => { dangGoiDo = null; });

  return dangGoiDo;
}

/** Đổi byte sang chữ người đọc được. */
function coChu(bytes) {
  if (!bytes) return '0 MB';
  // Chia cho 1000 chứ không phải 1024, để khớp cách Cloudflare hiển thị. Lấy
  // 1024 thì cùng một kho mà mục này báo 281 MB còn trang R2 báo 294 MB — nhìn
  // vào tưởng một trong hai đếm sai, trong khi cả hai đều đúng.
  const gb = bytes / 1e9;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1e6;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

export default function DungLuongKho() {
  const [soLieu, datSoLieu] = useState(boNhoChung);
  const [dangDoc, datDangDoc] = useState(!boNhoChung);
  const [loi, datLoi] = useState('');

  const doc = async (lamMoi = false) => {
    if (lamMoi) {
      datDangDoc(true);
      datLoi('');
    }
    try {
      datSoLieu(await docDungLuong(lamMoi));
    } catch (e) {
      datLoi(e.message || 'Không đọc được dung lượng');
    } finally {
      datDangDoc(false);
    }
  };

  useEffect(() => { if (!boNhoChung) doc(); }, []);

  const nutDemLai = (
    <button
      type="button"
      onClick={() => doc(true)}
      disabled={dangDoc}
      className="px-3.5 py-2 rounded-xl border border-white/10 text-white/60 hover:text-[#C3EA39] hover:border-[#C3EA39]/40 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default shrink-0"
    >
      {dangDoc
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Đang đếm…</span></>
        : <><RefreshCw className="w-3.5 h-3.5" /><span>Đếm lại</span></>}
    </button>
  );

  return (
    <Khoi
      tieuDe="Dung lượng kho R2"
      mo="Đếm thẳng từ kho, không lấy số của trang quản trị Cloudflare"
      phai={nutDemLai}
    >
      {loi ? (
        <p className="text-xs font-mono text-red-400 leading-relaxed">{loi}</p>
      ) : !soLieu ? (
        <p className="text-xs font-mono text-white/40">Đang đếm…</p>
      ) : (
        <ThongSo soLieu={soLieu} />
      )}
    </Khoi>
  );
}

function ThongSo({ soLieu }) {
  const pt = Math.min(100, Math.max(0, soLieu.phanTram || 0));

  // Ba mức màu. Dưới 75% thì xanh thương hiệu, tới 75% chuyển vàng, tới 90% đỏ
  // — để lúc sắp đầy thì nhìn phát biết ngay, không phải đọc số.
  const mau = pt >= 90 ? '#F87171' : pt >= 75 ? '#FBBF24' : '#C3EA39';
  const caTaiKhoan = soLieu.phamVi === 'taiKhoan' && Array.isArray(soLieu.cacKho);

  return (
    <div className="space-y-5">

      {/* Con số lớn */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-display font-extrabold text-white leading-none">
            {coChu(soLieu.tong)}
          </span>
          <span className="text-sm font-mono text-white/40">
            / {coChu(soLieu.mucMienPhi)}
          </span>
        </div>

        <div className="flex items-baseline gap-4 font-mono text-xs">
          <span className="text-white/45">
            {soLieu.soFile.toLocaleString('vi-VN')} file
          </span>
          <span style={{ color: mau }}>còn {coChu(soLieu.conLai)}</span>
          <span className="text-white/45">{pt.toFixed(2)}%</span>
        </div>
      </div>

      {/* Thanh mức dùng */}
      <div
        className="h-2.5 w-full rounded-full bg-white/8 overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(pt)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Đã dùng ${pt.toFixed(1)} phần trăm mức miễn phí`}
      >
        {/* Đã dùng ít quá thì thanh mỏng tới mức không thấy gì. Cho tối thiểu
            0,7% để luôn còn một vệt màu, đỡ trông như hỏng. */}
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(pt, pt > 0 ? 0.7 : 0)}%`, backgroundColor: mau }}
        />
      </div>

      {/* Kho quá lớn thì con số trên chỉ là phần đếm được, nói rõ ra. */}
      {soLieu.demDayDu === false && (
        <p className="text-[11px] font-mono text-amber-400/80 leading-relaxed flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>Kho quá nhiều file, mới đếm được một phần</span>
        </p>
      )}

      {/* Bảng chia nhỏ. Đếm được cả tài khoản thì liệt kê từng kho; chỉ đếm
          được một kho thì liệt kê theo thư mục trong kho đó. */}
      <BangChiaNho
        tieuDe={caTaiKhoan ? 'Từng kho trong tài khoản' : 'Từng thư mục trong kho'}
        hang={caTaiKhoan
          ? soLieu.cacKho.map(k => ({
              ten: k.ten,
              bytes: k.bytes,
              soFile: k.soFile,
              noiBat: soLieu.khoTrang && k.ten === soLieu.khoTrang.ten,
            }))
          : (soLieu.theoThuMuc || []).map(t => ({ ten: t.ten, bytes: t.bytes, soFile: t.soFile }))}
        tong={soLieu.tong}
        ghiChu={caTaiKhoan ? 'Dòng xanh là kho của trang này' : null}
      />

      {/* Chỉ đếm được một kho: nói rõ đây chưa phải tổng của cả tài khoản —
          không nói thì nhìn vào tưởng còn nhiều chỗ hơn thực tế. */}
      {!caTaiKhoan && (
        <p className="text-[11px] font-mono text-white/45 leading-relaxed flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-400/70" />
          <span>
            Mới tính kho của trang này. Hạn mức 10 GB tính cho cả tài khoản —
            muốn thấy tổng thì thêm một khoá R2 quyền{' '}
            <span className="text-white/70">Admin Read only</span> vào hai biến{' '}
            <span className="text-white/70">R2_READ_ALL_ACCESS_KEY_ID</span> và{' '}
            <span className="text-white/70">R2_READ_ALL_SECRET_ACCESS_KEY</span>.
          </span>
        </p>
      )}
    </div>
  );
}

function BangChiaNho({ tieuDe, hang, tong, ghiChu }) {
  if (!hang || hang.length === 0) return null;

  return (
    <div className="pt-4 border-t border-white/10 space-y-2.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] font-mono uppercase tracking-wider text-white/45">{tieuDe}</p>
        {ghiChu && <p className="text-[11px] font-mono text-white/30">{ghiChu}</p>}
      </div>

      <div className="space-y-1.5">
        {hang.map(h => {
          const phan = tong > 0 ? (h.bytes / tong) * 100 : 0;
          return (
            <div key={h.ten} className="flex items-center gap-3">
              <span className={`font-mono text-xs truncate w-32 sm:w-52 shrink-0 ${
                h.noiBat ? 'text-[#C3EA39]' : 'text-white/65'
              }`}>
                {h.ten}
              </span>

              {/* Vạch tỉ lệ: so cỡ giữa các kho bằng mắt nhanh hơn đọc số. */}
              <div className="flex-1 h-1.5 rounded-full bg-white/6 overflow-hidden min-w-0">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(phan, phan > 0 ? 1 : 0)}%`,
                    backgroundColor: h.noiBat ? '#C3EA39' : 'rgba(255,255,255,0.28)',
                  }}
                />
              </div>

              <span className="font-mono text-xs text-white/45 w-16 sm:w-20 text-right shrink-0">
                {coChu(h.bytes)}
              </span>
              <span className="font-mono text-[11px] text-white/30 w-16 text-right shrink-0 hidden sm:block">
                {h.soFile.toLocaleString('vi-VN')} file
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
