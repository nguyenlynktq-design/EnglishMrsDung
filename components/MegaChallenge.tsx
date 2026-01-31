
import React, { useState, useEffect } from 'react';
import { PracticeContent } from '../types';
import { playGeminiTTS } from '../services/geminiService';

interface MegaChallengeProps {
  megaData: PracticeContent['megaTest'];
  onScoresUpdate?: (scores: { mc: number; scramble: number; fill: number; error: number; listening: number; match: number }) => void;
}

export const MegaChallenge: React.FC<MegaChallengeProps> = ({ megaData, onScoresUpdate }) => {
  const [activeZone, setActiveZone] = useState<'mc' | 'fill' | 'error' | 'scramble' | 'listening'>('mc');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});

  const strictCheck = (userInput: string, target: string) => {
    if (!userInput || !target) return false;
    const normalizedInput = userInput.trim().replace(/\s+/g, ' ').toLowerCase().replace(/[.?!,]/g, '');
    const normalizedTarget = target.trim().replace(/\s+/g, ' ').toLowerCase().replace(/[.?!,]/g, '');
    return normalizedInput === normalizedTarget;
  };

  const handleAnswer = (qId: string, val: any) => {
    if (submitted[qId]) return;
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const checkFinal = (qId: string) => {
    setSubmitted(prev => ({ ...prev, [qId]: true }));
  };

  const handlePlayAudio = async (qId: string, text: string) => {
    // Luôn cho phép bấm lại để ngắt âm thanh cũ và phát âm thanh mới từ đầu
    setIsPlaying(prev => ({ ...prev, [qId]: true }));
    await playGeminiTTS(text);
    setIsPlaying(prev => ({ ...prev, [qId]: false }));
  };

  const calculateZoneScore = (zone: string) => {
    let correct = 0;
    if (!megaData) return 0;
    
    if (zone === 'mc') {
      (megaData.multipleChoice || []).forEach(q => { if (submitted[q.id] && answers[q.id] === q.correctAnswer) correct++; });
    } else if (zone === 'fill') {
      (megaData.fillBlank || []).forEach(q => {
        if (submitted[q.id] && strictCheck(answers[q.id], q.correctAnswer)) correct++;
      });
    } else if (zone === 'error') {
      (megaData.errorId || []).forEach(q => { if (submitted[q.id] && answers[q.id] === q.correctOptionIndex) correct++; });
    } else if (zone === 'scramble') {
      (megaData.scramble || []).forEach(q => {
        if (submitted[q.id] && strictCheck(answers[q.id], q.correctSentence)) correct++;
      });
    } else if (zone === 'listening') {
      (megaData.listening || []).forEach(q => {
        if (submitted[q.id] && answers[q.id] === q.correctAnswer) correct++;
      });
    }
    return correct;
  };

  useEffect(() => {
    if (onScoresUpdate) {
        onScoresUpdate({
            mc: calculateZoneScore('mc'),
            scramble: calculateZoneScore('scramble'),
            fill: calculateZoneScore('fill'),
            error: calculateZoneScore('error'),
            listening: calculateZoneScore('listening'),
            match: 0
        });
    }
  }, [submitted, megaData, activeZone]);

  if (!megaData) return (
      <div className="p-10 text-center bg-white rounded-[3rem] shadow-xl border-4 border-brand-100 italic text-slate-400">
          Đang chuẩn bị thử thách 50 câu cho con...
      </div>
  );

  return (
    <div className="bg-brand-900 rounded-3xl md:rounded-[3rem] shadow-2xl border-4 md:border-[10px] border-brand-800 overflow-hidden mb-8 md:mb-12 font-sans w-full">
      <div className="bg-brand-800 p-4 md:p-8 text-center border-b-2 md:border-b-4 border-brand-700">
        <h2 className="text-xl md:text-4xl font-black text-white uppercase italic mb-4 md:mb-6 tracking-tighter">🚀 50 MEGA CHALLENGES (MRS. DUNG AI) 🚀</h2>
        <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center gap-2 md:gap-3">
          {[
            { id: 'mc', label: '10 Quiz', icon: '📝' },
            { id: 'fill', label: '10 Điền từ', icon: '✏️' },
            { id: 'error', label: '10 Tìm lỗi', icon: '🔍' },
            { id: 'scramble', label: '10 Sắp xếp', icon: '🧩' },
            { id: 'listening', label: '10 Nghe', icon: '🔊' },
          ].map(z => (
            <button key={z.id} onClick={() => setActiveZone(z.id as any)} className={`px-3 md:px-8 py-3 md:py-5 rounded-xl md:rounded-2xl font-black text-xs md:text-xl flex items-center justify-center gap-1 md:gap-3 transition-all ${activeZone === z.id ? 'bg-highlight-400 text-brand-900 scale-[1.02] md:scale-105 shadow-xl ring-2 md:ring-4 ring-white/20' : 'bg-brand-700 text-brand-200 hover:bg-brand-600'}`}>
              <span className="text-base md:text-2xl">{z.icon}</span> {z.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-12 bg-white/5 min-h-[500px]">
        {activeZone === 'mc' && (
            <div className="space-y-6 md:space-y-8 animate-fade-in max-w-4xl mx-auto">
               {(megaData.multipleChoice || []).map((q, idx) => (
                  <div key={q.id} className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[3rem] shadow-xl border-2 md:border-4 border-slate-50 transition-all hover:border-brand-200">
                    <p className="font-black text-lg md:text-2xl text-slate-800 mb-4 md:mb-6 flex gap-2 md:gap-4 leading-tight"><span className="bg-brand-100 text-brand-600 px-2 md:px-4 py-0.5 md:py-1 rounded-lg md:rounded-xl h-fit">Q{idx + 1}</span>{q.question}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      {(q.options || []).map((opt, i) => (
                        <button key={i} onClick={() => { handleAnswer(q.id, i); checkFinal(q.id); }} disabled={submitted[q.id]} className={`p-3 md:p-6 rounded-xl md:rounded-2xl border-2 md:border-4 font-black text-left text-sm md:text-xl transition-all ${submitted[q.id] ? i === q.correctAnswer ? 'bg-green-100 border-green-500 text-green-700 ring-2 md:ring-4 ring-green-200' : answers[q.id] === i ? 'bg-red-100 border-red-500 text-red-700' : 'bg-slate-50 opacity-50' : 'bg-white border-slate-100 hover:border-brand-300 hover:bg-brand-50 hover:translate-y-[-2px]'}`}>
                          <span className="mr-2 md:mr-4 text-slate-300">{String.fromCharCode(65 + i)}.</span> {opt}
                        </button>
                      ))}
                    </div>
                    {submitted[q.id] && (
                        <div className={`mt-4 p-4 rounded-xl md:rounded-2xl border-l-4 ${answers[q.id] === q.correctAnswer ? 'bg-green-50 border-green-500' : 'bg-brand-50 border-brand-500'}`}>
                            <p className="font-bold text-slate-700 text-xs md:text-base italic">"Giải thích: {q.explanation}"</p>
                        </div>
                    )}
                  </div>
               ))}
            </div>
        )}

        {activeZone === 'listening' && (
            <div className="space-y-6 md:space-y-8 animate-fade-in max-w-4xl mx-auto">
               {(megaData.listening || []).map((q, idx) => (
                  <div key={q.id} className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[3rem] shadow-xl border-2 md:border-4 border-brand-50">
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-8">
                        <button 
                            onClick={() => handlePlayAudio(q.id, q.audioText)}
                            className={`w-24 h-24 md:w-32 md:h-32 rounded-full shadow-2xl flex items-center justify-center text-4xl md:text-6xl transition-all active:scale-95 ${isPlaying[q.id] ? 'bg-brand-400 animate-pulse' : 'bg-brand-600 hover:bg-brand-500 text-white border-b-8 border-brand-800'}`}
                        >
                            {isPlaying[q.id] ? '⏳' : '🔊'}
                        </button>
                        <div className="text-center md:text-left flex-1">
                            <p className="font-black text-brand-600 uppercase tracking-widest text-xs md:text-sm mb-2">Thử thách nghe số {idx + 1}</p>
                            <p className="font-black text-slate-800 text-xl md:text-3xl leading-tight italic">"{q.question}"</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      {(q.options || []).map((opt, i) => (
                        <button key={i} onClick={() => { handleAnswer(q.id, i); checkFinal(q.id); }} disabled={submitted[q.id]} className={`p-4 md:p-8 rounded-xl md:rounded-3xl border-2 md:border-4 font-black text-left text-sm md:text-2xl transition-all ${submitted[q.id] ? i === q.correctAnswer ? 'bg-green-100 border-green-500 text-green-700 ring-2 md:ring-4 ring-green-200' : answers[q.id] === i ? 'bg-red-100 border-red-500 text-red-700' : 'bg-slate-50 opacity-50' : 'bg-white border-slate-100 hover:border-brand-300 hover:bg-brand-50 shadow-sm'}`}>
                          <span className="mr-3 md:mr-4 text-slate-300">{String.fromCharCode(65 + i)}.</span> {opt}
                        </button>
                      ))}
                    </div>

                    {submitted[q.id] && (
                        <div className={`mt-6 p-6 rounded-2xl border-l-8 md:border-l-[15px] ${answers[q.id] === q.correctAnswer ? 'bg-green-50 border-green-500' : 'bg-rose-50 border-rose-500'} shadow-inner`}>
                            <p className="text-brand-800 font-black text-xs md:text-lg mb-2 uppercase">💡 Bài giảng của Mrs. Dung:</p>
                            <p className="font-bold text-slate-700 text-sm md:text-xl italic">"{q.explanation}"</p>
                        </div>
                    )}
                  </div>
               ))}
            </div>
        )}

        {activeZone === 'fill' && (
            <div className="space-y-6 md:space-y-10 animate-fade-in max-w-4xl mx-auto">
                {(megaData.fillBlank || []).map((q, idx) => {
                    const userVal = answers[q.id] || "";
                    const isCorrect = strictCheck(userVal, q.correctAnswer);
                    const displayText = (q.question || "").includes('___') ? q.question : (q.question || "") + " ___";
                    const questionParts = displayText.split('___');

                    return (
                        <div key={q.id} className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[3rem] shadow-xl border-b-4 md:border-b-8 border-slate-100 flex flex-col gap-4 md:gap-6">
                            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
                                <span className="text-4xl md:text-7xl bg-brand-50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-inner">{q.clueEmoji || '✏️'}</span>
                                <div className="text-xl md:text-4xl font-black text-slate-700 flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-4 flex-1 leading-snug">
                                    {questionParts[0]}
                                    <input 
                                        type="text" 
                                        disabled={submitted[q.id]} 
                                        value={userVal} 
                                        onChange={(e) => handleAnswer(q.id, e.target.value)}
                                        className={`w-32 md:w-56 p-1 md:p-3 text-center border-b-2 md:border-b-4 outline-none font-black rounded-lg md:rounded-xl transition-all ${submitted[q.id] ? (isCorrect ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700') : 'bg-brand-50/50 border-brand-200 focus:border-brand-500'}`}
                                        placeholder="..."
                                    />
                                    {questionParts[1]}
                                </div>
                            </div>
                            {!submitted[q.id] ? (
                                <button onClick={() => checkFinal(q.id)} className="w-full py-3 md:py-4 bg-brand-600 text-white rounded-xl md:rounded-2xl font-black text-sm md:text-xl shadow-lg uppercase">Kiểm tra 🚀</button>
                            ) : (
                                <div className={`p-4 md:p-6 rounded-xl md:rounded-2xl flex flex-col gap-3 ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <span className="text-2xl md:text-4xl">{isCorrect ? '🌟' : '💡'}</span>
                                        <p className="font-black text-lg md:text-xl">{isCorrect ? 'Chuẩn xác rồi con ơi!' : `Đáp án đúng là: "${q.correctAnswer}"`}</p>
                                    </div>
                                    <p className="text-sm font-bold opacity-80 border-t border-current/20 pt-2 italic">Giải thích: {q.explanation}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}

        {activeZone === 'error' && (
           <div className="space-y-6 md:space-y-12 animate-fade-in max-w-4xl mx-auto">
              {(megaData.errorId || []).map((q, idx) => {
                  const userAns = answers[q.id];
                  const isCorrect = userAns === q.correctOptionIndex;
                  return (
                    <div key={q.id} className="bg-white p-6 md:p-14 rounded-3xl md:rounded-[4rem] shadow-2xl border-b-[12px] border-slate-100 flex flex-col gap-8 md:gap-12">
                        <div className="text-center space-y-4">
                             <div className="inline-block bg-brand-100 text-brand-700 px-6 py-1 rounded-full font-black text-sm uppercase tracking-widest border-2 border-brand-200">Câu {idx + 1} / 10</div>
                             <p className="text-2xl md:text-5xl font-black text-slate-800 leading-tight italic font-serif">
                                "{q.sentence}"
                             </p>
                             <p className="text-slate-400 font-bold text-sm md:text-lg uppercase tracking-[0.2em] pt-4">👇 Chọn từ bị SAI trong 4 phương án sau: 👇</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                             {(q.options || []).map((opt, optIdx) => (
                               <button 
                                 key={optIdx} 
                                 onClick={() => { handleAnswer(q.id, optIdx); checkFinal(q.id); }}
                                 disabled={submitted[q.id]}
                                 className={`p-5 md:p-10 rounded-2xl md:rounded-[3rem] border-4 md:border-8 font-black text-xl md:text-4xl transition-all shadow-xl flex items-center justify-center gap-4 relative overflow-hidden ${
                                   submitted[q.id] 
                                    ? optIdx === q.correctOptionIndex 
                                      ? 'bg-green-500 border-green-700 text-white scale-105 z-10' 
                                      : userAns === optIdx 
                                        ? 'bg-red-500 border-red-700 text-white' 
                                        : 'bg-slate-50 border-slate-200 text-slate-300 grayscale opacity-40'
                                    : 'bg-white border-brand-100 text-brand-700 hover:border-brand-500 hover:bg-brand-50 hover:-translate-y-2'
                                 }`}
                               >
                                 <span className={`text-xl md:text-3xl ${submitted[q.id] ? 'text-white' : 'text-slate-300'}`}>({String.fromCharCode(65 + optIdx)})</span>
                                 {opt}
                                 {submitted[q.id] && optIdx === q.correctOptionIndex && <span className="absolute top-2 right-4 text-3xl">✅</span>}
                               </button>
                             ))}
                        </div>

                        {submitted[q.id] && (
                            <div className={`p-8 md:p-14 rounded-xl md:rounded-[4rem] text-center border-t-[12px] animate-fade-in shadow-2xl ${isCorrect ? 'text-green-700 bg-green-50 border-green-500' : 'text-rose-700 bg-rose-50 border-rose-500'}`}>
                                <p className="font-black text-3xl md:text-6xl mb-6">{isCorrect ? '🌟 TUYỆT ĐỐI CHÍNH XÁC! 🌟' : '💡 HÃY CỐ GẮNG LÊN! 💡'}</p>
                                <div className="bg-white/60 p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] border-2 md:border-4 border-current/10">
                                   <p className="font-bold text-xl md:text-3xl leading-relaxed italic text-slate-700">"Phân tích của chuyên gia: {q.explanation}"</p>
                                </div>
                            </div>
                        )}
                    </div>
                  );
              })}
           </div>
        )}

        {activeZone === 'scramble' && (
            <div className="space-y-6 md:space-y-10 animate-fade-in max-w-4xl mx-auto">
                {(megaData.scramble || []).map((q, idx) => {
                    const userVal = answers[q.id] || "";
                    const isCorrect = strictCheck(userVal, q.correctSentence);
                    return (
                        <div key={q.id} className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[3rem] shadow-xl border-b-4 md:border-b-8 border-slate-100 flex flex-col gap-4 md:gap-6">
                            <p className="text-slate-400 font-black uppercase text-[10px] md:text-xs mb-1 md:mb-2 tracking-widest">SẮP XẾP CÂU {idx + 1}:</p>
                            <div className="flex flex-wrap gap-2 md:gap-3 mb-2 md:mb-4">
                                {(q.scrambled || []).map((word, wi) => (
                                    <span key={wi} className="px-2 md:px-4 py-1 md:py-2 rounded md:rounded-xl font-black border md:border-2 bg-brand-50 text-brand-700 border-brand-100 shadow-sm text-xs md:text-base">
                                      {word}
                                    </span>
                                ))}
                            </div>
                            <input 
                                type="text"
                                disabled={submitted[q.id]}
                                value={userVal}
                                onChange={(e) => handleAnswer(q.id, e.target.value)}
                                placeholder="Viết lại câu hoàn chỉnh chuẩn ngữ pháp..."
                                className={`w-full p-4 md:p-6 text-lg md:text-2xl rounded-xl md:rounded-2xl border-2 md:border-4 font-black outline-none transition-all ${submitted[q.id] ? (isCorrect ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700') : 'bg-slate-50 border-slate-200 focus:border-brand-500'}`}
                            />
                            {!submitted[q.id] ? (
                                <button onClick={() => checkFinal(q.id)} className="w-full py-3 md:py-4 bg-brand-600 text-white rounded-xl md:rounded-2xl font-black text-sm md:text-xl shadow-lg uppercase">Kiểm tra 🚀</button>
                            ) : (
                                <div className={`p-4 md:p-6 rounded-xl md:rounded-2xl flex flex-col items-center gap-3 md:gap-4 ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    <p className="font-black text-xl mb-2">{isCorrect ? 'Chính xác!' : 'Đáp án đúng là:'}</p>
                                    <p className="text-xl font-bold italic">"{q.correctSentence}"</p>
                                    {q.translation && <p className="italic opacity-80 text-lg">({q.translation})</p>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
};
