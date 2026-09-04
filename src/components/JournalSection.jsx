import React, { useState } from 'react';
import { ArrowUpRight, Calendar, Clock, Terminal } from 'lucide-react';
import { posts } from '../data/posts';
import PostModal from './PostModal';

export default function JournalSection() {
  const [activePost, setActivePost] = useState(null);

  return (
    <section id="journal" className="py-24 sm:py-32 border-b border-white/10 scroll-mt-16 relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <div className="text-xs font-mono tracking-widest text-[#C3EA39] uppercase mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C3EA39]" />
              <span>02 // WRITINGS & DESIGN THOUGHTS</span>
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-extrabold uppercase text-white tracking-tight">
              BÀI VIẾT & GÓC NHÌN
            </h2>
          </div>
          <p className="text-sm text-white/60 max-w-md font-mono">
            // Nơi chia sẻ đúc kết sau 2 năm thiết kế UI/UX, triết lý tối giản và kinh nghiệm phối hợp cùng developers.
          </p>
        </div>

        {/* Creative Index Row List */}
        <div className="divide-y divide-white/10 border-y border-white/10">
          {posts.map((post, idx) => (
            <article
              key={post.id}
              onClick={() => setActivePost(post)}
              className="group cursor-pointer py-8 sm:py-10 flex flex-col md:flex-row md:items-baseline justify-between gap-6 hover:bg-[#121216] px-4 -mx-4 rounded-2xl transition-all duration-300"
            >
              {/* Index & Category */}
              <div className="w-full md:w-1/4 shrink-0 flex md:flex-col items-center md:items-start justify-between gap-2 text-xs font-mono text-white/50">
                <div className="flex items-center gap-2">
                  <span className="text-[#C3EA39] font-bold">0{idx + 1}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-[#C3EA39] border border-white/5">
                    {post.category}
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] text-white/40">
                  <Calendar className="w-3.5 h-3.5" />
                  {post.date}
                </span>
              </div>

              {/* Title & Excerpt */}
              <div className="flex-1 space-y-2">
                <h3 className="text-xl sm:text-2xl font-display font-bold text-white group-hover:text-[#C3EA39] transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-white/60 font-light leading-relaxed line-clamp-2 max-w-2xl">
                  {post.excerpt}
                </p>
              </div>

              {/* Action Trigger */}
              <div className="shrink-0 flex items-center gap-2 text-xs font-mono text-white/40 group-hover:text-[#C3EA39] group-hover:translate-x-1 transition-all">
                <span className="hidden sm:inline">ĐỌC BÀI</span>
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </article>
          ))}
        </div>

      </div>

      {/* Post Modal */}
      <PostModal
        post={activePost}
        isOpen={Boolean(activePost)}
        onClose={() => setActivePost(null)}
      />
    </section>
  );
}
