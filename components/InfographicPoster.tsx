
import { toPng } from 'html-to-image';
import React, { useEffect, useState } from 'react';
import { generateStoryImage } from '../services/geminiService';
import { LessonPlan } from '../types';

interface InfographicPosterProps {
  lesson: LessonPlan;
}

export const InfographicPoster: React.FC<InfographicPosterProps> = ({ lesson }) => {
  const [cartoonSubject, setCartoonSubject] = useState(lesson.topic);
  const [cartoonImage, setCartoonImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingPage, setDownloadingPage] = useState<number | null>(null);

  useEffect(() => {
    if (lesson.topic) {
      setCartoonSubject(lesson.topic);
      handleGenerateCartoon(lesson.topic);
    }
  }, [lesson.topic]);

  const handleGenerateCartoon = async (subject: string = cartoonSubject) => {
    setIsGenerating(true);
    try {
      const prompt = `adorable 3d chibi render of ${subject} concept, pixar style animation, cute big eyes, volumetric lighting, 8k resolution, vibrant colors, 3d blender render, high detail, clean background`;
      const imageUrl = await generateStoryImage(prompt, "3D Cartoon, Pixar Style", "1:1");
      setCartoonImage(imageUrl);
    } catch (e) {
      console.error("Failed to generate cartoon:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPosterPage = async (pageId: string, pageNum: number) => {
    const el = document.getElementById(pageId);
    if (!el) return;
    setDownloadingPage(pageNum);
    try {
      const dataUrl = await toPng(el, { 
        cacheBust: true, 
        backgroundColor: '#ffffff', 
        pixelRatio: 2,
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });
      const link = document.createElement('a');
      link.download = `Summary-MrsDung-${lesson.topic}-P${pageNum}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) { 
      console.error(e); 
      alert("Lỗi xuất ảnh, hãy thử lại!");
    } finally {
      setDownloadingPage(null);
    }
  };

  const vocabP1Limit = 18; 
  const vocabP1 = lesson.vocabulary.slice(0, vocabP1Limit);
  const vocabRemainder = lesson.vocabulary.slice(vocabP1Limit);
  
  const vocabP2Limit = 24; 
  const vocabP2 = vocabRemainder.slice(0, vocabP2Limit);
  const vocabP3 = vocabRemainder.slice(vocabP2Limit);
  
  const hasPage2 = vocabRemainder.length > 0;
  const hasPage3 = vocabP3.length > 0;

  return (
    <div className="flex flex-col items-center gap-10 py-10 bg-brand-50 rounded-[2rem] md:rounded-[4rem] border-4 border-brand-100 shadow-inner max-w-full overflow-hidden w-full">
      <div className="text-center space-y-4 max-w-4xl px-4 w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="text-center md:text-left flex-1">
              <h2 className="text-3xl md:text-5xl font-black text-slate-800 uppercase tracking-tighter mb-1 leading-none">Lesson Summary</h2>
              <p className="text-slate-500 font-bold text-sm md:text-xl italic opacity-80 uppercase tracking-widest">Success with Mrs. Dung</p>
            </div>
            <div className="bg-white p-2 rounded-2xl md:rounded-[2rem] shadow-xl border-2 border-slate-100 flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <input 
                type="text" 
                value={cartoonSubject}
                onChange={(e) => setCartoonSubject(e.target.value)}
                className="flex-1 md:w-64 p-3 rounded-xl border-none focus:ring-0 font-bold text-slate-700 text-base"
              />
              <button 
                onClick={() => handleGenerateCartoon()}
                disabled={isGenerating}
                className="bg-brand-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:bg-brand-700 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {isGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <>✨ Đổi Hình 3D</>}
              </button>
            </div>
          </div>
          <div className="md:hidden animate-pulse text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            <span>←</span> Vuốt sang để xem poster <span>→</span>
          </div>
      </div>

      <div className="flex flex-col items-center gap-16 w-full px-4 overflow-x-auto pb-10 scrollbar-hide">
          <div className="flex flex-col items-center gap-6 min-w-fit">
              <div id="poster-p1" className="w-[850px] min-h-[1200px] bg-white p-10 relative overflow-hidden font-sans border-[10px] border-brand-50 shadow-2xl ring-4 ring-white flex flex-col">
                  <div className="absolute inset-0 bg-brand-50/5 pointer-events-none"></div>
                  <div className="bg-brand-800 rounded-[2rem] p-8 relative overflow-hidden mb-6 flex items-center gap-8 shadow-xl">
                      <div className="w-32 h-32 bg-white p-1 rounded-2xl shadow-inner border-2 border-brand-100 flex items-center justify-center relative overflow-hidden shrink-0">
                        {cartoonImage ? <img src={cartoonImage} alt="Summary" crossOrigin="anonymous" className="w-full h-full object-cover rounded-xl" /> : <div className="text-6xl">🎨</div>}
                      </div>
                      <div className="flex-1">
                        <div className="bg-highlight-400 text-brand-900 px-4 py-0.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-2 w-fit shadow-md">LESSON SUMMARY ✨</div>
                        <h1 className="text-4xl font-black text-white leading-tight uppercase tracking-tighter line-clamp-1 drop-shadow-md">{lesson.topic}</h1>
                        <p className="text-brand-100 text-lg font-bold opacity-90 mt-1 italic">Mrs. Dung English Center</p>
                      </div>
                  </div>
                  <div className="flex-grow flex flex-col gap-4 overflow-hidden">
                      <h3 className="text-brand-800 font-black text-2xl uppercase tracking-widest border-b-2 border-brand-100 pb-1 mb-1 flex items-center gap-2"><span>📖</span> VOCABULARY</h3>
                      <div className="grid grid-cols-3 gap-3 px-1">
                          {vocabP1.map((item, idx) => (
                              <div key={idx} className="bg-brand-50/40 p-2.5 rounded-2xl flex items-center gap-3 border border-brand-100 h-24 shadow-sm overflow-hidden transform hover:scale-[1.02] transition-transform">
                                  <span className="text-3xl w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-brand-50">{item.emoji}</span>
                                  <div className="flex-1 leading-tight overflow-hidden">
                                      <p className="font-black text-brand-900 text-base truncate">{item.word}</p>
                                      <p className="text-[9px] font-mono text-brand-400 font-bold">/{item.ipa}/</p>
                                      <p className="text-xs font-black text-brand-600 italic truncate mt-0.5">{item.meaning}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                      {lesson.grammar && (
                        <div className="mt-auto p-6 bg-highlight-50 rounded-[2.5rem] border-[4px] border-white shadow-lg relative overflow-hidden ring-1 ring-highlight-200">
                            <h3 className="text-highlight-800 font-black text-xl mb-1 uppercase tracking-tight flex items-center gap-2"><span>💡</span> GRAMMAR POINT</h3>
                            <p className="text-slate-800 font-black text-lg italic leading-relaxed">{lesson.grammar.explanation}</p>
                        </div>
                      )}
                  </div>
                  <div className="mt-auto pt-6 w-full text-center text-[10px] font-black text-brand-300 uppercase tracking-[0.4em]">ENGLISH WITH HEART - SUCCESS WITH MRS. DUNG</div>
              </div>
              <button onClick={() => downloadPosterPage('poster-p1', 1)} disabled={downloadingPage === 1} className="bg-brand-600 text-white px-10 py-4 rounded-full font-black text-xl shadow-2xl hover:bg-brand-500 active:translate-y-1 transition-all uppercase tracking-tighter border-b-[6px] border-brand-800 active:border-b-0 w-fit">
                {downloadingPage === 1 ? 'ĐANG XỬ LÝ...' : '📥 TẢI SUMMARY TRANG 1'}
              </button>
          </div>
          {hasPage2 && (
            <div className="flex flex-col items-center gap-6 min-w-fit">
                <div id="poster-p2" className="w-[850px] min-h-[1200px] bg-white p-10 relative overflow-hidden font-sans border-[10px] border-brand-50 shadow-2xl ring-4 ring-white flex flex-col">
                    <div className="bg-brand-800 rounded-[2rem] p-8 relative overflow-hidden mb-6 shadow-xl">
                        <div className="bg-highlight-400 text-brand-900 px-4 py-0.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-2 w-fit shadow-md">NEXT PAGE ✨</div>
                        <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tighter line-clamp-1">{lesson.topic}</h1>
                    </div>
                    <div className="flex-grow flex flex-col gap-5 overflow-hidden px-2">
                        {vocabP2.length > 0 && (
                          <div className="space-y-3">
                              <h3 className="text-brand-800 font-black text-xl uppercase tracking-widest border-b-2 border-brand-100 pb-1">📖 VOCABULARY (TIẾP)</h3>
                              <div className="grid grid-cols-3 gap-3">
                                  {vocabP2.map((item, idx) => (
                                      <div key={idx} className="bg-slate-50 p-2.5 rounded-2xl flex items-center gap-3 border border-slate-100 h-24 shadow-sm">
                                          <span className="text-3xl w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-slate-50">{item.emoji}</span>
                                          <div className="flex-1 leading-tight overflow-hidden">
                                              <p className="font-black text-slate-800 text-base truncate">{item.word}</p>
                                              <p className="text-xs font-black text-brand-500 italic truncate mt-0.5">{item.meaning}</p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                        )}
                    </div>
                </div>
                <button onClick={() => downloadPosterPage('poster-p2', 2)} disabled={downloadingPage === 2} className="bg-indigo-600 text-white px-10 py-4 rounded-full font-black text-xl shadow-2xl hover:bg-indigo-500 active:translate-y-1 transition-all uppercase tracking-tighter border-b-[6px] border-indigo-800 active:border-b-0 w-fit">
                  {downloadingPage === 2 ? 'ĐANG XỬ LÝ...' : '📥 TẢI SUMMARY TRANG 2'}
                </button>
            </div>
          )}
      </div>
    </div>
  );
};
