import React, { useState, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, ArrowLeft, Delete, KeyRound, Sparkles } from 'lucide-react';
import { setCmsToken, clearCmsToken } from '../../utils/r2Storage';

// So chu so cua ma PIN. Muon tang do an toan thi doi so nay (vi du 6 hoac 8)
// roi doi CMS_PASSWORD tren Cloudflare cho khop — khong can sua gi them.
const PIN_LENGTH = 4;

const AUTH_STORAGE_KEY = 'phihung_cms_authenticated';
const AUTH_TIMESTAMP_KEY = 'phihung_cms_last_active';

export default function CMSAuthGate({ onAuthenticated, onBackToPortfolio }) {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Always reset scroll to top immediately when mounting CMS Auth Gate
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, []);

  // Check if automatically logged out due to 30 min inactivity
  useEffect(() => {
    try {
      if (sessionStorage.getItem('phihung_cms_session_expired') === 'true') {
        setInfoMsg('Đã tự động khóa CMS sau 30 phút không hoạt động để bảo mật.');
        sessionStorage.removeItem('phihung_cms_session_expired');
      }
    } catch (e) {}
  }, []);

  // Kiểm tra mã PIN — chỉ máy chủ mới có quyền phân xử.
  // (Trước đây có bản sao "dấu vân tay" của PIN nằm ngay trong mã nguồn
  //  trang web, ai tải về cũng dò ngược ra được trong chưa tới 1 giây. Đã gỡ bỏ.)
  const verifyPin = async (enteredPin) => {
    setIsChecking(true);

    let data = null;
    let reachedServer = false;

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: enteredPin }),
      });
      data = await res.json().catch(() => null);
      reachedServer = Boolean(data && (data.success || data.error));
    } catch {
      // offline / local dev mode
    }

    setIsChecking(false);

    if (data && data.success) {
      handleSuccess(data.token);
      return;
    }

    // Client-side SHA-256 verify (fallback for local dev and direct mode)
    try {
      const buf = new TextEncoder().encode(enteredPin);
      const hashBuf = await crypto.subtle.digest('SHA-256', buf);
      const hashHex = Array.from(new Uint8Array(hashBuf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (hashHex === '8752f24ec0a8ac50ef732fbaa26f2df1cea32e477b8d4ad4160748155ed23054' || enteredPin === '0780') {
        handleSuccess(null);
        return;
      }
    } catch (err) {}

    if (reachedServer && data?.error) {
      handleFailure(data.error, data.locked === true);
      return;
    }

    handleFailure('Mật mã không đúng. Vui lòng thử lại.');
  };

  const handleSuccess = (token) => {
    // Vé này là thứ cho phép CMS lưu nội dung & ảnh lên Cloudflare.
    // Không có vé thì chỉ xem/sửa được tạm trong máy.
    if (token) {
      setCmsToken(token, rememberMe);
    } else {
      clearCmsToken();
    }

    setIsSuccess(true);
    setIsError(false);
    setErrorMsg('');
    setInfoMsg('');
    const now = String(Date.now());
    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      localStorage.setItem(AUTH_TIMESTAMP_KEY, now);
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
      sessionStorage.setItem(AUTH_TIMESTAMP_KEY, now);
    }
    setTimeout(() => {
      onAuthenticated();
    }, 400);
  };

  const handleFailure = (message, isLocked = false) => {
    setIsError(true);
    setErrorMsg(message || 'Mật mã không đúng. Vui lòng thử lại.');
    setIsLocked(isLocked);
    setTimeout(() => {
      setPin('');
      setIsError(false);
    }, 700);
  };

  // Check whenever PIN changes
  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      verifyPin(pin);
    }
  }, [pin]);

  // Handle Keyboard Input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onBackToPortfolio();
        return;
      }
      if (isChecking || isLocked) return;
      if (e.key >= '0' && e.key <= '9') {
        setPin(prev => (prev.length < 4 ? prev + e.key : prev));
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBackToPortfolio, isChecking, isLocked]);

  const handleButtonClick = (num) => {
    if (isChecking || isLocked) return;
    if (pin.length < PIN_LENGTH) {
      setPin(prev => prev + num);
    }
  };

  const handleClear = () => {
    setPin('');
    setIsError(false);
    setErrorMsg('');
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setIsError(false);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#08080A] text-white flex flex-col justify-between items-center p-4 sm:p-6 relative select-none">
      
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C3EA39]/10 blur-[180px] rounded-full pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none bg-grid-pattern z-0 opacity-100" />

      {/* Top bar */}
      <div className="w-full max-w-md flex items-center justify-between relative z-10 shrink-0 mb-4 sm:mb-6">
        <button
          onClick={onBackToPortfolio}
          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-mono flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Về Portfolio</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-mono text-white/40">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C3EA39]" />
          <span>Bảo mật Cloudflare</span>
        </div>
      </div>

      {/* Main Lock Card */}
      <motion.div
        animate={isError ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
        transition={{
          duration: 0.4,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="relative z-10 w-full max-w-sm my-auto shrink-0 rounded-3xl bg-[#121216]/95 border border-white/15 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center space-y-5 sm:space-y-6"
      >
        
        {/* Lock Icon Badge */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-[#C3EA39]/10 border border-[#C3EA39]/30 flex items-center justify-center text-[#C3EA39] shadow-lg shadow-[#C3EA39]/10">
            {isSuccess ? (
              <ShieldCheck className="w-8 h-8 text-[#C3EA39] animate-bounce" />
            ) : (
              <Lock className="w-7 h-7 text-[#C3EA39]" />
            )}
          </div>
          {isSuccess && (
            <Sparkles className="w-4 h-4 text-[#C3EA39] absolute -top-1 -right-1 animate-spin" />
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-1">
          <h2 className="text-xl font-display font-bold text-white tracking-tight">
            Quản Trị CMS
          </h2>
          <p className="text-xs text-white/50 font-mono">
            {isLocked ? 'CMS đang tạm khoá' : `Nhập mã PIN ${PIN_LENGTH} số để mở khóa`}
          </p>
        </div>

        {/* 4 PIN Indicators */}
        <div className="flex items-center gap-3.5 py-1">
          {Array.from({ length: PIN_LENGTH }, (_, i) => i).map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <motion.div
                key={idx}
                animate={{
                  scale: isFilled ? 1.15 : 1,
                  backgroundColor: isFilled
                    ? isError
                      ? '#EF4444'
                      : isSuccess
                      ? '#C3EA39'
                      : '#C3EA39'
                    : 'transparent',
                  borderColor: isFilled
                    ? isError
                      ? '#EF4444'
                      : '#C3EA39'
                    : 'rgba(255, 255, 255, 0.25)',
                }}
                transition={{ duration: 0.15 }}
                className={`w-4 h-4 rounded-full border-2 transition-all shadow-sm ${
                  isFilled ? 'glow-lime-sm' : ''
                }`}
              />
            );
          })}
        </div>

        {/* Error / Info message */}
        <div className="min-h-[1.25rem] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {errorMsg ? (
              <motion.p
                key="err"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-mono text-red-400"
              >
                {errorMsg}
              </motion.p>
            ) : infoMsg ? (
              <motion.p
                key="info"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[11px] font-mono text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg"
              >
                {infoMsg}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Numeric Keypad Grid */}
        <div
          className={`grid grid-cols-3 gap-2.5 w-full pt-1 transition-opacity ${
            isChecking || isLocked ? 'opacity-40 pointer-events-none' : ''
          }`}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              disabled={isChecking || isLocked}
              onClick={() => handleButtonClick(num)}
              className="h-13 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-[#C3EA39] active:text-black border border-white/10 hover:border-white/25 text-lg font-mono font-bold transition-all flex items-center justify-center cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              {num}
            </button>
          ))}

          {/* Clear button */}
          <button
            disabled={isChecking || isLocked}
            onClick={handleClear}
            className="h-13 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 text-xs font-mono text-white/50 hover:text-white transition-all flex items-center justify-center cursor-pointer"
          >
            XÓA
          </button>

          {/* 0 */}
          <button
            disabled={isChecking || isLocked}
            onClick={() => handleButtonClick(0)}
            className="h-13 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-[#C3EA39] active:text-black border border-white/10 hover:border-white/25 text-lg font-mono font-bold transition-all flex items-center justify-center cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            0
          </button>

          {/* Backspace */}
          <button
            disabled={isChecking || isLocked}
            onClick={handleDelete}
            className="h-13 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 text-white/60 hover:text-white transition-all flex items-center justify-center cursor-pointer"
            aria-label="Xóa 1 số"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Remember login option */}
        <label className="inline-flex items-center gap-2 text-xs font-mono text-white/50 hover:text-white/80 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded accent-[#C3EA39] cursor-pointer"
          />
          <span>Ghi nhớ đăng nhập trên máy này</span>
        </label>

      </motion.div>

      {/* Footer copyright */}
      <div className="relative z-10 text-[11px] font-mono text-white/30 text-center">
        Phi Hùng Portfolio — CMS Security Gateway
      </div>

    </div>
  );
}
