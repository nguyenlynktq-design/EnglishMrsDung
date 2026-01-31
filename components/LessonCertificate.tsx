
import { toPng } from 'html-to-image';
import React, { useEffect, useRef, useState } from 'react';

interface LessonCertificateProps {
  studentName: string;
  topic: string;
  score: number;
  totalCorrect: number;
  evaluation: { text: string; emoji: string; praise: string };
  onClose: () => void;
}

export const LessonCertificate: React.FC<LessonCertificateProps> = ({ 
  studentName, 
  topic, 
  score, 
  totalCorrect, 
  evaluation, 
  onClose 
}) => {
  const certRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const now = new Date();
    const dateStr = `Ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(now.getMonth() + 1).padStart(2, '0')} năm ${now.getFullYear()}`;
    setCurrentDate(dateStr);

    const handleResize = () => {
      const width = window.innerWidth;
      const padding = 32;
      const availableWidth = width - padding;
      const certWidth = 1000;
      if (availableWidth < certWidth) {
        setScale(availableWidth / certWidth);
      } else {
        setScale(1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const downloadCert = async () => {
    if (!certRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(certRef.current, { 
        pixelRatio: 3, 
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });
      const link = document.createElement('a');
      link.download = `Certificate-MrsDung-${studentName || 'Student'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert("Lỗi tải chứng nhận, con hãy thử lại nhé!");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <button 
        onClick={onClose}
        className="fixed top-4 right-4 md:top-8 md:right-8 z-[120] bg-white/20 hover:bg-red-500 text-white p-3 md:p-4 rounded-full transition-all border border-white/20 shadow-2xl"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div className="flex flex-col md:flex-row gap-3 mb-6 w-full max-w-xl relative z-[110]">
        <button 
          onClick={downloadCert} 
          disabled={isDownloading}
          className="flex-1 bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-lg md:text-xl shadow-2xl hover:bg-emerald-400 transform active:scale-95 transition-all uppercase tracking-tighter flex items-center justify-center gap-4 border-b-8 border-emerald-700 active:border-b-0"
        >
          {isDownloading ? '⏳ ĐANG XỬ LÝ...' : <><span>💾</span> TẢI CHỨNG NHẬN</>}
        </button>
      </div>

      <div className="w-full flex justify-center items-center overflow-visible">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }} className="transition-transform duration-500">
          <div ref={certRef} className="w-[1000px] h-[750px] bg-white border-[25px] border-brand-50 p-12 flex flex-col items-center relative shadow-2xl shrink-0 overflow-hidden select-none">
            <div className="absolute inset-4 border border-brand-200 pointer-events-none opacity-30"></div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-100 rounded-full translate-x-1/2 -translate-y-1/2 opacity-20"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-highlight-100 rounded-full -translate-x-1/2 translate-y-1/2 opacity-20"></div>
            
            <div className="flex flex-col items-center mb-6 relative z-10">
              <div className="w-16 h-16 bg-brand-800 rounded-2xl flex items-center justify-center text-white text-3xl mb-3 shadow-lg border-2 border-white">
                <svg viewBox="0 0 100 100" className="w-10 h-10" fill="currentColor">
                  <path d="M50 20c-15 0-25 10-25 25 0 15 10 25 25 25s25-10 25-25c0-15-10-25-25-25zm0 40c-8.3 0-15-6.7-15-15s6.7-15 15-15 15 6.7 15 15-6.7 15-15 15z" />
                  <path d="M50 75c-15 0-30 5-30 15v5h60v-5c0-10-15-15-30-15z" />
                </svg>
              </div>
              <h2 className="text-lg font-black text-brand-800 uppercase tracking-[0.3em] mb-1 text-center">TRUNG TÂM ENGLISH MRS. DUNG</h2>
              <h1 className="text-3xl font-black text-brand-600 uppercase font-display border-b-4 border-brand-100 pb-1 text-center">SUCCESS WITH MRS. DUNG</h1>
            </div>

            <p className="text-base font-bold text-slate-400 mb-4 uppercase tracking-widest relative z-10">CERTIFICATE OF COMPLETION AWARDED TO</p>
            <h3 className="text-6xl font-black text-slate-800 border-b-4 border-emerald-500 px-8 pb-2 mb-8 relative z-10">{studentName || "NGÔI SAO NHÍ"}</h3>
            
            <div className="text-center mb-8 relative z-10">
              <p className="text-lg font-black text-slate-500 uppercase tracking-widest mb-1">FOR THE LESSON TOPIC</p>
              <p className="text-2xl font-black text-brand-700 uppercase italic">"{topic}"</p>
            </div>

            <div className="grid grid-cols-2 gap-8 w-full max-w-3xl mb-8 bg-brand-50/40 p-8 rounded-[2rem] border-2 border-white shadow-inner relative z-10">
               <div className="flex flex-col items-center border-r-2 border-white pr-4">
                  <p className="text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">FINAL SCORE</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-[8rem] font-black text-brand-600 leading-none drop-shadow-lg">{score}</p>
                    <p className="text-2xl font-black text-slate-300">/10</p>
                  </div>
                  <p className="mt-4 bg-brand-500 text-white px-6 py-2 rounded-full font-black text-lg shadow-md border-b-4 border-brand-700">{evaluation.emoji} {evaluation.text}</p>
               </div>
               <div className="flex flex-col justify-center pl-4 text-left space-y-4">
                  <p className="text-xl font-bold text-slate-600 italic leading-snug">"{evaluation.praise}"</p>
                  <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm">
                    <p className="text-xs font-black text-brand-500 uppercase mb-1">Kết quả luyện tập:</p>
                    <p className="text-lg font-black text-slate-700">Con đã đúng {totalCorrect}/50 câu hỏi.</p>
                  </div>
               </div>
            </div>

            <div className="w-full flex justify-between items-end mt-auto px-6 relative z-10">
               <div className="text-left">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">CERTIFICATE ID: EDU-MD-{Date.now().toString().slice(-8)}</p>
                  <p className="text-lg font-black text-brand-700 uppercase tracking-widest mt-1">English with Heart</p>
               </div>
               <div className="text-right">
                  <div className="text-center flex flex-col items-end">
                      <p className="text-[12px] font-black text-slate-500 mb-1 italic">Hải Phòng, {currentDate}</p>
                      <div className="w-48 h-1 bg-brand-800 mb-2"></div>
                      <p className="text-4xl font-black text-brand-800 italic font-serif leading-none pr-4">Mrs. Dung</p>
                      <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mt-1 pr-4">Head Teacher</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
