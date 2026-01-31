
import React, { useState } from 'react';
import { MatchingPair, FillBlankQuestion, VocabularyItem } from '../types';

interface ActivitiesProps {
  matching: MatchingPair[];
  fillInBlank: FillBlankQuestion[];
  flashcards: VocabularyItem[];
}

export const Activities: React.FC<ActivitiesProps> = ({ matching, fillInBlank, flashcards }) => {
  const [activeTab, setActiveTab] = useState<'flashcards' | 'matching' | 'fill'>('flashcards');

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border-4 border-white ring-1 ring-slate-200 overflow-hidden">
      {/* Colorful Tabs */}
      <div className="flex bg-slate-50 p-2 gap-2 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('flashcards')}
          className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-sm font-black uppercase tracking-wide transition-all transform ${
            activeTab === 'flashcards' 
              ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg scale-100' 
              : 'bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 scale-95'
          }`}
        >
          🎴 Flashcards
        </button>
        <button 
          onClick={() => setActiveTab('matching')}
          className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-sm font-black uppercase tracking-wide transition-all transform ${
            activeTab === 'matching' 
              ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-lg scale-100' 
              : 'bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 scale-95'
          }`}
        >
          🧩 Matching
        </button>
        <button 
          onClick={() => setActiveTab('fill')}
          className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-sm font-black uppercase tracking-wide transition-all transform ${
            activeTab === 'fill' 
              ? 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-lg scale-100' 
              : 'bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 scale-95'
          }`}
        >
          ✏️ Fill Blanks
        </button>
      </div>

      <div className="p-4 md:p-8 bg-slate-50/50 min-h-[500px] flex items-center justify-center relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <div className="w-full z-10">
           {activeTab === 'flashcards' && <FlashcardGame items={flashcards || []} />}
           {activeTab === 'matching' && <MatchingGame pairs={matching || []} />}
           {activeTab === 'fill' && <FillBlankGame questions={fillInBlank || []} />}
        </div>
      </div>
    </div>
  );
};

const FlashcardGame: React.FC<{ items: VocabularyItem[] }> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!items || items.length === 0) return <div className="text-center text-slate-400 font-bold">Không có từ vựng nào</div>;

  const next = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % items.length), 150);
  };

  const prev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length), 150);
  };

  const current = items[currentIndex];

  const playAudio = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-8">
      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="cursor-pointer w-full aspect-[4/5] md:aspect-[4/3] perspective-1000 group relative"
      >
        <div 
          className="relative w-full h-full transition-transform duration-500 transform-style-3d" 
          style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* Front */}
          <div 
            className="absolute w-full h-full backface-hidden bg-white rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center p-10 border-b-[12px] border-brand-500 ring-8 ring-white" 
            style={{ backfaceVisibility: 'hidden' }}
          >
             <div className="absolute top-6 left-6 bg-brand-100 text-brand-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
               CARD {currentIndex + 1}/{items.length}
             </div>
             
             <div className="flex-1 flex flex-col items-center justify-center w-full">
                <span className="text-5xl md:text-6xl font-black text-slate-800 mb-6 tracking-tighter text-center break-words w-full">{current.word}</span>
                {current.ipa && <span className="text-xl text-brand-600 font-mono bg-brand-50 px-5 py-2 rounded-xl border-2 border-brand-100 shadow-sm">/{current.ipa}/</span>}
                <button 
                  onClick={(e) => playAudio(current.word, e)}
                  className="mt-12 p-6 rounded-full bg-brand-400 text-white hover:bg-brand-500 transition-all transform hover:scale-110 shadow-xl"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                </button>
             </div>
          </div>

          {/* Back */}
          <div 
            className="absolute w-full h-full backface-hidden bg-gradient-to-br from-brand-400 to-brand-600 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col ring-8 ring-brand-200" 
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="h-[55%] w-full bg-white p-4 relative flex items-center justify-center">
              <span className="text-[9rem] select-none transform transition-transform group-hover:scale-110 duration-500">{current.emoji || '✨'}</span>
            </div>
            <div className="h-[45%] p-8 flex flex-col items-center justify-center text-white text-center">
               <h3 className="text-4xl font-black mb-4 text-highlight-300 drop-shadow-xl uppercase tracking-tight">{current.meaning}</h3>
               {current.example && (
                 <div className="relative w-full">
                    <p className="text-xl font-bold opacity-90 leading-relaxed px-6 italic border-l-4 border-highlight-300/60 pl-4">
                      "{current.example}"
                    </p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-10">
        <button onClick={prev} className="p-5 rounded-full bg-white shadow-lg border-b-8 border-slate-200 hover:border-brand-400 hover:text-brand-500 transition-all active:border-b-0 active:translate-y-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button onClick={next} className="p-5 rounded-full bg-white shadow-lg border-b-8 border-slate-200 hover:border-brand-400 hover:text-brand-500 transition-all active:border-b-0 active:translate-y-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6 6-6"/></svg>
        </button>
      </div>
    </div>
  );
};

const MatchingGame: React.FC<{ pairs: MatchingPair[] }> = ({ pairs }) => {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());

  if (!pairs || pairs.length === 0) return <div className="text-center text-slate-400 font-bold">Không có dữ liệu</div>;

  const handleLeftClick = (id: string) => {
    if (matchedIds.has(id)) return;
    setSelectedLeft(id);
  };

  const handleRightClick = (id: string) => {
    if (matchedIds.has(id)) return;
    if (selectedLeft === id) {
      const newMatched = new Set(matchedIds);
      newMatched.add(id);
      setMatchedIds(newMatched);
      setSelectedLeft(null);
    } else {
      setSelectedLeft(null); 
    }
  };

  if (matchedIds.size === pairs.length && pairs.length > 0) {
     return (
       <div className="flex flex-col items-center justify-center h-full py-10 animate-fade-in text-center">
         <div className="text-9xl mb-8 animate-bounce">🏆</div>
         <h3 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-green-600 mb-4">QUÁ XUẤT SẮC!</h3>
         <button onClick={() => setMatchedIds(new Set())} className="mt-10 px-12 py-5 bg-brand-500 text-white font-black text-2xl rounded-[2rem] hover:bg-brand-600 shadow-2xl border-b-8 border-brand-700 active:border-b-0 active:translate-y-2 transition-all">CHƠI LẠI NHÉ</button>
       </div>
     )
  }

  return (
    <div className="grid grid-cols-2 gap-6 md:gap-12 h-full w-full max-w-4xl mx-auto">
      <div className="space-y-4">
        {pairs.map(p => (
          <button
            key={`l-${p.id}`}
            disabled={matchedIds.has(p.id)}
            onClick={() => handleLeftClick(p.id)}
            className={`w-full p-6 md:p-8 rounded-[2rem] border-b-[10px] text-left transition-all font-black text-2xl shadow-xl flex items-center justify-between
              ${matchedIds.has(p.id) ? 'opacity-30 bg-slate-100 border-transparent grayscale scale-95' : 
                selectedLeft === p.id ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-brand-200 scale-105 z-10 -translate-y-1' : 'bg-white border-slate-200 text-slate-700 hover:bg-brand-50 hover:border-brand-300'
              }
            `}
          >
            <span>{p.left}</span>
            {matchedIds.has(p.id) && <span className="text-green-500">✅</span>}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {pairs.map(p => (
          <button
            key={`r-${p.id}`}
            disabled={matchedIds.has(p.id)}
            onClick={() => handleRightClick(p.id)}
            className={`w-full p-6 md:p-8 rounded-[2rem] border-b-[10px] text-left transition-all font-bold text-xl shadow-xl flex items-center justify-between
              ${matchedIds.has(p.id) ? 'opacity-30 bg-emerald-50 border-transparent grayscale scale-95' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-brand-300'}
            `}
          >
             <span>{p.right}</span>
             {matchedIds.has(p.id) && <span className="text-emerald-500">✅</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

const FillBlankGame: React.FC<{ questions: FillBlankQuestion[] }> = ({ questions }) => {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  if (!questions || questions.length === 0) return <div className="text-center text-slate-400 font-bold">Không có dữ liệu câu hỏi</div>;

  const handleOption = (opt: string) => {
    if (feedback !== null) return;
    
    setSelectedOption(opt);
    const isCorrect = opt === questions[index].correctAnswer;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    
    const audioMsg = isCorrect ? "Excellent! Correct." : "Don't give up! Look at the answer.";
    const utterance = new SpeechSynthesisUtterance(audioMsg);
    window.speechSynthesis.speak(utterance);
  };

  const nextQuestion = () => {
    setFeedback(null);
    setSelectedOption(null);
    if (index < questions.length - 1) {
      setIndex(index + 1);
    } else {
      setIndex(0);
    }
  };

  const q = questions[index];

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto w-full">
      <div className="w-full h-4 bg-slate-200 rounded-full mb-10 overflow-hidden shadow-inner border-2 border-white">
        <div className="h-full bg-brand-500 transition-all duration-500 shadow-lg" style={{ width: `${((index + (feedback ? 1 : 0)) / questions.length) * 100}%` }}></div>
      </div>
      
      <div className="bg-white p-10 md:p-14 rounded-[3rem] shadow-2xl border-b-[15px] border-slate-100 w-full text-center mb-10 relative min-h-[250px] flex flex-col justify-center ring-8 ring-brand-50/50">
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-brand-600 text-white px-8 py-2 rounded-full text-sm font-black uppercase tracking-[0.2em] shadow-xl">
            THỬ THÁCH {index + 1}
        </div>
        <h3 className="text-3xl md:text-5xl font-black text-slate-700 leading-tight font-display">
            {(q?.question || '').split('___').map((part, i, arr) => (
            <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && (
                <span className={`inline-flex min-w-[150px] border-b-8 mx-4 px-4 py-1 rounded-2xl items-center justify-center transition-all duration-500 ${feedback === 'correct' ? 'border-green-500 text-green-700 bg-green-50' : feedback === 'wrong' ? 'border-red-500 text-red-700 bg-red-50' : 'border-brand-200 bg-brand-50/30 text-transparent'}`}>
                    {feedback ? q.correctAnswer : '?'}
                </span>
                )}
            </React.Fragment>
            ))}
        </h3>
      </div>

      {feedback && (
        <div className={`w-full mb-10 p-8 rounded-[2.5rem] border-l-[16px] shadow-2xl animate-bounce-in ${feedback === 'correct' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
          <div className="flex items-start gap-6">
             <span className="text-7xl drop-shadow-sm">{feedback === 'correct' ? '🌟' : '💡'}</span>
             <div className="flex-1">
                <h4 className="font-black text-3xl mb-2 uppercase tracking-tighter">
                   {feedback === 'correct' ? 'Tuyệt quá, con làm đúng rồi!' : 'Cố lên nào! Đáp án đúng là: ' + q.correctAnswer}
                </h4>
                <p className="font-bold text-2xl opacity-85 leading-relaxed italic border-t-2 border-current/10 pt-3">
                   "{q.explanation || 'Hãy ghi nhớ cấu trúc này nhé!'}"
                </p>
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {(q?.options || []).map((opt, i) => (
          <button
            key={i}
            onClick={() => handleOption(opt)}
            disabled={feedback !== null}
            className={`p-8 rounded-[2.5rem] border-b-[10px] text-3xl font-black transition-all transform shadow-xl
              ${feedback === null ? 'bg-white border-slate-200 text-slate-700 hover:bg-brand-50 hover:border-brand-400 hover:-translate-y-2' : 
                opt === q.correctAnswer ? 'bg-green-500 border-green-700 text-white scale-105' : 
                opt === selectedOption ? 'bg-red-500 border-red-700 text-white opacity-50' : 'bg-slate-50 border-slate-200 text-slate-300 grayscale opacity-30'}
            `}
          >
            {opt}
          </button>
        ))}
      </div>

      {feedback && (
        <button 
           onClick={nextQuestion}
           className="mt-12 w-full py-8 bg-brand-600 text-white rounded-[2.5rem] font-black text-4xl shadow-2xl hover:bg-brand-500 transform active:scale-95 transition-all animate-bounce border-b-[12px] border-brand-800 active:border-b-0 uppercase"
        >
           {index < questions.length - 1 ? 'CÂU TIẾP THEO ➔' : 'CON ĐÃ HOÀN THÀNH 🎉'}
        </button>
      )}
    </div>
  );
};
