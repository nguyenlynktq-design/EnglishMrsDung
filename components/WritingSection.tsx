
import React, { useState } from 'react';
import { correctWriting } from '../services/geminiService';

interface WritingSectionProps {
  topic: string;
}

export const WritingSection: React.FC<WritingSectionProps> = ({ topic }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCheck = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      // Pass the creative writing prompt 'topic' to the AI
      const data = await correctWriting(text, topic);
      setResult(data);
    } catch (e) {
      alert("Mrs. Dung đang bận một chút, con thử lại sau nhé!");
    } finally {
      setLoading(false);
    }
  };

  const renderFeedback = (val: any) => {
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val !== null) {
      return Object.values(val).join(' ');
    }
    return "Tuyệt vời!";
  };

  return (
    <div className="bg-white rounded-[3rem] shadow-2xl border-[10px] border-brand-50 overflow-hidden mb-12 animate-fade-in">
      <div className="bg-brand-600 p-8 md:p-14 text-white relative border-b-[15px] border-brand-800">
         <div className="absolute top-8 right-8 text-7xl opacity-20">✏️</div>
         <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">Writing Practice</h2>
         <div className="bg-white/10 p-6 rounded-[2rem] border border-white/20 backdrop-blur-sm">
            <p className="text-highlight-300 font-black text-sm uppercase tracking-widest mb-2">ĐỀ BÀI CỦA CON:</p>
            <p className="text-2xl md:text-3xl font-black text-white drop-shadow-sm leading-tight">{topic}</p>
         </div>
      </div>

      <div className="p-8 md:p-20">
        <div className="mb-12">
            <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Con hãy gõ đoạn văn của mình vào đây nhé... (Ví dụ: I like playing football with my friends...)"
                rows={7}
                className="w-full p-10 text-3xl md:text-4xl rounded-[3rem] border-8 border-slate-50 focus:border-brand-400 outline-none transition-all font-black text-slate-800 shadow-inner bg-slate-50 resize-none font-display"
            />
            <button 
                onClick={handleCheck}
                disabled={loading || !text.trim()}
                className="mt-10 w-full py-8 bg-brand-500 text-white rounded-[3rem] font-black text-4xl shadow-2xl hover:bg-brand-400 transform transition-all active:scale-95 disabled:opacity-50 border-b-[15px] border-brand-700 active:border-b-0 uppercase tracking-tighter"
            >
                {loading ? 'MRS. DUNG ĐANG CHẤM BÀI CHO CON...' : '🚀 CHẤM ĐIỂM VÀ SỬA BÀI VIẾT'}
            </button>
        </div>

        {result && (
          <div className="space-y-16 animate-fade-in">
            <div className="bg-brand-50 rounded-[5rem] p-12 md:p-16 border-8 border-brand-100 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-16 relative z-10">
                    <div className="flex flex-col items-center shrink-0">
                        <span className="text-brand-400 font-black text-xl uppercase tracking-[0.3em] mb-4">Điểm của con</span>
                        <div className="w-56 h-56 bg-white rounded-full flex items-center justify-center text-8xl font-black text-brand-600 border-[20px] border-brand-200 shadow-[0_30px_60px_-15px_rgba(34,197,94,0.3)]">
                            {typeof result.score === 'number' ? result.score : 0}/10
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-4xl md:text-5xl font-black text-brand-800 mb-6 uppercase tracking-tight">Lời khen từ Mrs. Dung 🌟</h3>
                        <p className="text-3xl md:text-4xl font-black text-slate-700 italic leading-relaxed">
                            "{renderFeedback(result.feedback)}"
                        </p>
                    </div>
                </div>
                
                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white/80 backdrop-blur-md p-8 rounded-[3rem] border-4 border-white shadow-xl flex flex-col items-center">
                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Đúng Từ Vựng (Vocabulary)</span>
                    <span className="text-5xl font-black text-brand-700 leading-none">{result.breakdown?.vocabulary || 0}<span className="text-xl text-slate-300">/5.0</span></span>
                    <div className="w-full bg-slate-100 h-5 mt-6 rounded-full overflow-hidden border-2 border-white shadow-inner">
                      <div className="bg-brand-500 h-full transition-all duration-1000" style={{ width: `${((result.breakdown?.vocabulary || 0)/5)*100}%` }}></div>
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-md p-8 rounded-[3rem] border-4 border-white shadow-xl flex flex-col items-center">
                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Đúng Ngữ Pháp (Grammar)</span>
                    <span className="text-5xl font-black text-brand-700 leading-none">{result.breakdown?.grammar || 0}<span className="text-xl text-slate-300">/5.0</span></span>
                    <div className="w-full bg-slate-100 h-5 mt-6 rounded-full overflow-hidden border-2 border-white shadow-inner">
                      <div className="bg-brand-500 h-full transition-all duration-1000" style={{ width: `${((result.breakdown?.grammar || 0)/5)*100}%` }}></div>
                    </div>
                  </div>
                </div>
            </div>

            <div className="bg-white rounded-[5rem] p-12 md:p-16 border-[12px] border-dashed border-brand-100 relative group shadow-2xl">
                <div className="absolute -top-10 left-16 bg-brand-500 text-white px-10 py-4 rounded-full font-black text-2xl shadow-2xl uppercase tracking-[0.2em] transform -rotate-1">
                   Bản sửa chi tiết
                </div>
                <div className="space-y-8">
                    <p className="text-4xl md:text-5xl font-black text-slate-800 leading-relaxed italic font-display">
                        "{typeof result.fixedText === 'string' ? result.fixedText : text}"
                    </p>
                    <div className="pt-8 border-t-2 border-slate-100">
                        <h5 className="text-brand-600 font-black uppercase text-sm tracking-widest mb-4">Các lỗi con cần lưu ý:</h5>
                        <ul className="space-y-4">
                            {(result.errors || []).map((err: any, i: number) => (
                                <li key={i} className="flex items-start gap-4 text-2xl">
                                    <span className="text-rose-500 shrink-0 mt-1">❌</span>
                                    <p className="text-slate-600"><span className="line-through text-slate-400 mr-2">{err.original}</span> <span className="text-emerald-600 font-black mr-2">➔ {err.fixed}</span> <span className="text-slate-500 font-bold">({err.reason})</span></p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {result.suggestions && (
               <div className="bg-slate-900 rounded-[5rem] p-16 md:p-24 relative shadow-2xl overflow-hidden group">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-highlight-400 rounded-full translate-x-1/2 -translate-y-1/2 opacity-10"></div>
                  
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-6 bg-highlight-400 text-slate-900 px-10 py-4 rounded-full font-black text-2xl uppercase tracking-widest mb-12 shadow-[0_20px_40px_-10px_rgba(250,204,21,0.5)] border-b-8 border-highlight-600 transform rotate-[-1deg]">
                      <span>🏆</span> MRS. DUNG'S UPGRADE (VIẾT LẠI CÂU HAY HƠN)
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-xl p-12 md:p-16 rounded-[4rem] border-4 border-white/10 shadow-inner">
                      <p className="text-4xl md:text-5xl font-black text-white leading-relaxed italic font-display tracking-tight text-center md:text-left">
                         "{result.suggestions}"
                      </p>
                    </div>
                    
                    <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-10">
                      <p className="text-slate-400 font-black text-2xl italic max-w-2xl leading-snug text-center md:text-left">
                        "Đây là cách diễn đạt nâng cao và tự nhiên hơn để con làm bài thi đạt điểm tối đa đấy!"
                      </p>
                    </div>
                  </div>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
