# -*- coding: utf-8 -*-
"""
Dựng font web (.woff2) từ các file .ttf trong font-web/.

VÌ SAO CÓ FILE NÀY:
font-web/ chứa file .ttf để CÀI VÀO MÁY (Illustrator, Photoshop). Trình duyệt
dùng được .ttf nhưng nặng gấp đôi, lại chứa cả bảng chữ Hy Lạp, Cyrillic... mà
trang không bao giờ dùng tới. Script này cắt bớt chữ không dùng rồi nén sang
.woff2, đổ ra public/fonts/ cho trang tải.

CHẠY KHI NÀO:
Chỉ khi đổi font hoặc thêm độ đậm mới. File .woff2 trong public/fonts/ đã nằm
sẵn trong git nên ngày thường không phải chạy — kể cả trên máy mới.

    pip install fonttools brotli
    python scripts/dung-font.py

MÁY MỚI CHƯA CÓ font-web/:
Thư mục đó nằm trong .gitignore (nặng, mà lúc nào cũng tải lại được). Cần chạy
script này thì lên Google Fonts tải bốn bộ về, giải nén vào font-web/ theo đúng
tên thư mục bên dưới — địa chỉ ghi trong font-web/DOC-TRUOC-KHI-CAI.txt.
"""

import os
import shutil
import subprocess
import sys

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NGUON = os.path.join(GOC, 'font-web')
DICH = os.path.join(GOC, 'public', 'fonts')

# Bảng chữ giữ lại: Latin + Latin mở rộng + tiếng Việt.
# Lấy đúng theo dải Google Fonts công bố cho ba nhóm đó, gộp làm một.
BANG_CHU = ','.join([
    # latin
    'U+0000-00FF', 'U+0131', 'U+0152-0153', 'U+02BB-02BC', 'U+02C6', 'U+02DA',
    'U+02DC', 'U+2000-206F', 'U+2074', 'U+20AC', 'U+2122', 'U+2191', 'U+2193',
    'U+2212', 'U+2215', 'U+FEFF', 'U+FFFD',
    # latin-ext
    'U+0100-02AF', 'U+0304', 'U+0308', 'U+0329', 'U+1E00-1E9F', 'U+1EF2-1EFF',
    'U+2020', 'U+20A0-20AB', 'U+20AD-20C0', 'U+2113', 'U+2C60-2C7F',
    'U+A720-A7FF',
    # vietnamese
    'U+0102-0103', 'U+0110-0111', 'U+0128-0129', 'U+0168-0169', 'U+01A0-01A1',
    'U+01AF-01B0', 'U+0300-0301', 'U+0303-0304', 'U+0308-0309', 'U+0323',
    'U+1EA0-1EF9', 'U+20AB',
])

# Chỉ dựng đúng những độ đậm trang thật sự gọi tới.
# Trang không dùng chữ nghiêng ở đâu cả, nên bỏ hết bản Italic.
CAN_DUNG = [
    ('Be-Vietnam-Pro/BeVietnamPro-Light.ttf',      'be-vietnam-pro-300.woff2'),
    ('Be-Vietnam-Pro/BeVietnamPro-Regular.ttf',    'be-vietnam-pro-400.woff2'),
    ('Be-Vietnam-Pro/BeVietnamPro-Medium.ttf',     'be-vietnam-pro-500.woff2'),
    ('Be-Vietnam-Pro/BeVietnamPro-SemiBold.ttf',   'be-vietnam-pro-600.woff2'),
    ('Be-Vietnam-Pro/BeVietnamPro-Bold.ttf',       'be-vietnam-pro-700.woff2'),
    ('Be-Vietnam-Pro/BeVietnamPro-ExtraBold.ttf',  'be-vietnam-pro-800.woff2'),
    ('Be-Vietnam-Pro/BeVietnamPro-Black.ttf',      'be-vietnam-pro-900.woff2'),
    # Font biến thiên: một file lo hết mọi độ đậm 100–800.
    ('JetBrains-Mono/JetBrainsMono[wght].ttf',     'jetbrains-mono-var.woff2'),
]


def main():
    if not os.path.isdir(NGUON):
        sys.exit('Không thấy thư mục font-web/')

    if os.path.isdir(DICH):
        shutil.rmtree(DICH)
    os.makedirs(DICH)

    tong_vao = 0
    tong_ra = 0

    for duong_dan, ten_ra in CAN_DUNG:
        vao = os.path.join(NGUON, duong_dan.replace('/', os.sep))
        if not os.path.isfile(vao):
            sys.exit('Thiếu file font: %s' % duong_dan)

        ra = os.path.join(DICH, ten_ra)
        subprocess.run(
            [
                sys.executable, '-m', 'fontTools.subset', vao,
                '--unicodes=%s' % BANG_CHU,
                '--layout-features=kern,liga,clig,calt,ccmp,mark,mkmk,locl',
                '--flavor=woff2',
                '--output-file=%s' % ra,
            ],
            check=True,
        )

        co_vao = os.path.getsize(vao)
        co_ra = os.path.getsize(ra)
        tong_vao += co_vao
        tong_ra += co_ra
        print('  %-28s %6.1f KB -> %5.1f KB' % (ten_ra, co_vao / 1024, co_ra / 1024))

    print('')
    print('Xong. %d file, %.0f KB -> %.0f KB (còn %.0f%%)'
          % (len(CAN_DUNG), tong_vao / 1024, tong_ra / 1024, tong_ra / tong_vao * 100))


if __name__ == '__main__':
    main()
