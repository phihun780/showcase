import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ArrowUpRight, MapPin } from 'lucide-react';
import { profile } from '../data/profile';

export default function ContactSection() {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(profile.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section id="contact" className="pt-8 sm:pt-16 pb-16 sm:pb-24 scroll-mt-16 relative">
      
      {/* Background Glow */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#C3EA39]/10 blur-[160px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        
        {/* Synchronized Section Header with Reveal Motion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-baseline gap-3 sm:gap-4 mb-2">
            <span className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-[#C3EA39]">
              03
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Thông tin
            </h2>
          </div>
          <p className="text-sm sm:text-base text-white/70 font-light max-w-xl leading-relaxed">
            Luôn sẵn sàng lắng nghe về các ý tưởng sản phẩm mới, cơ hội hợp tác freelance hoặc vị trí full-time phù hợp.
          </p>
        </motion.div>

        {/* Clean Direct Contact Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          
          {/* Left: Email Direct Box (6 Cols) */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 p-6 sm:p-8 rounded-3xl bg-[#121216] border border-white/10 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <span className="text-xs font-mono text-[#C3EA39] uppercase tracking-wider block">
                // GỬI EMAIL TRỰC TIẾP
              </span>
              <a
                href={`mailto:${profile.email}`}
                className="block text-2xl sm:text-3xl md:text-4xl font-bold text-white hover:text-[#C3EA39] transition-colors break-all"
              >
                {profile.email}
              </a>
              <p className="text-xs sm:text-sm text-white/60 font-light">
                Phản hồi nhanh trong vòng 24 giờ làm việc.
              </p>
            </div>

            <button
              onClick={handleCopyEmail}
              className="w-full py-3.5 px-5 rounded-2xl bg-white/5 hover:bg-[#C3EA39] hover:text-black text-xs sm:text-sm font-mono text-white flex items-center justify-center gap-2.5 transition-all border border-white/10 group cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold">ĐÃ SAO CHÉP EMAIL!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#C3EA39] group-hover:text-black" />
                  <span>SAO CHÉP ĐỊA CHỈ EMAIL</span>
                </>
              )}
            </button>
          </motion.div>

          {/* Right: Social Media & Profile Grid (6 Cols) */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 p-6 sm:p-8 rounded-3xl bg-[#121216] border border-white/10 flex flex-col justify-between space-y-6"
          >
            <div>
              <span className="text-xs font-mono text-[#C3EA39] uppercase tracking-wider block mb-4">
                // MẠNG XÃ HỘI & HỒ SƠ THIẾT KẾ
              </span>
              
              <div className="grid grid-cols-2 gap-3">
                {profile.socials.map((soc, idx) => (
                  <a
                    key={idx}
                    href={soc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-[#C3EA39]/50 hover:bg-white/5 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <span className="block text-sm font-bold text-white group-hover:text-[#C3EA39] transition-colors">
                        {soc.name}
                      </span>
                      <span className="block text-[11px] font-mono text-white/40">
                        @{soc.name.toLowerCase()}
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-[#C3EA39] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </a>
                ))}
              </div>
            </div>

            {/* Location footer note */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-white/50">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C3EA39]" />
                {profile.location}
              </span>
              <span className="text-white/40">GMT+7</span>
            </div>

          </motion.div>

        </div>

      </div>
    </section>
  );
}
