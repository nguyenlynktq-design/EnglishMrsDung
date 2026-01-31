
import React, { useState, useEffect } from 'react';
import { ListeningQ, PracticeContent } from '../types';
import { playGeminiTTS } from '../services/geminiService';

interface PracticeSectionProps {
  content: PracticeContent;
  onScoreUpdate?: (score: number) => void;
}

export const PracticeSection: React.FC<PracticeSectionProps> = ({ content, onScoreUpdate }) => {
    const [selectedMap, setSelectedMap] = useState<Record<string, number>>({});
    const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});
    const questions = content?.listening || [];

    useEffect(() => {
        if (onScoreUpdate) {
            const correctCount = questions.filter(q => selectedMap[q.id] === q.correctAnswer).length;
            onScoreUpdate(correctCount);
        }
    }, [selectedMap, questions, onScoreUpdate]);

    const handleSelect = (qId: string, idx: number) => {
        if (selectedMap[qId] !== undefined) return;
        setSelectedMap(prev => ({ ...prev, [qId]: idx }));
    };

    const handlePlayAudio = async (qId: string, text: string) => {
        if (isPlaying[qId]) return;
        setIsPlaying(prev => ({ ...prev, [qId]: true }));
        await playGeminiTTS(text);
        setIsPlaying(prev => ({ ...prev, [qId]: false }));
    };

    return (
        <div className="space-y-6 md:space-y-12 animate-fade-in pb-6 md:pb-10 max-w-5xl mx-auto w-full">
            {questions.map((q, i) => {
                const userChoice = selectedMap[q.id];
                const isSelected = userChoice !== undefined;
                const isCorrect = userChoice === q.correctAnswer;

                return (
                    <div key={q.id} className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[3rem] shadow-xl border-2 md:border-4 border-brand-50">
                        <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-4 md:mb-8 items-center text-center md:text-left">
                            <span className="bg-brand-600 text-white font-black px-4 md:px-6 py-1.5 md:py-3 rounded-lg md:rounded-2xl h-fit border-b-2 md:border-b-4 border-brand-800 text-sm md:text-2xl uppercase shrink-0">Câu {i + 1}</span>
                            <button 
                                onClick={() => handlePlayAudio(q.id, q.audioText)}
                                disabled={isPlaying[q.id]}
                                className={`p-3 md:p-6 rounded-xl md:rounded-3xl shadow-xl transition-all flex items-center gap-2 md:gap-6 ring-4 md:ring-8 ring-brand-50 group active:scale-95 ${isPlaying[q.id] ? 'bg-brand-400 opacity-80' : 'bg-brand-500 hover:bg-brand-400 text-white'}`}
                            >
                                <span className={`text-2xl md:text-5xl group-hover:scale-110 transition-transform ${isPlaying[q.id] ? 'animate-pulse' : ''}`}>
                                    {isPlaying[q.id] ? '⏳' : '🔊'}
                                </span>
                                <span className="font-black text-sm md:text-3xl uppercase tracking-widest">
                                    {isPlaying[q.id] ? 'ĐANG PHÁT...' : 'NGHE LOA'}
                                </span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 md:gap-6">
                            {q.options.map((opt, idx) => {
                                let btnClass = "bg-white border-slate-100 hover:border-brand-300 hover:bg-brand-50";
                                
                                if (isSelected) {
                                    if (idx === q.correctAnswer) {
                                        btnClass = "bg-green-100 border-green-500 text-green-800 ring-2 md:ring-4 ring-green-100 scale-[1.01] md:scale-[1.02] z-10";
                                    } else if (idx === userChoice) {
                                        btnClass = "bg-rose-100 border-rose-500 text-rose-800 ring-2 md:ring-4 ring-rose-100 opacity-90";
                                    } else {
                                        btnClass = "bg-slate-50 border-slate-100 opacity-40 grayscale";
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelect(q.id, idx)}
                                        disabled={isSelected}
                                        className={`p-4 md:p-8 rounded-xl md:rounded-[2.5rem] border-2 md:border-4 font-black transition-all text-left text-lg md:text-3xl shadow-sm relative overflow-hidden ${btnClass} leading-tight md:leading-normal`}
                                    >
                                        <span className="mr-3 md:mr-6 font-black text-slate-300">{String.fromCharCode(65 + idx)}.</span>
                                        {opt}
                                        {isSelected && idx === q.correctAnswer && <span className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-xl md:text-4xl">✅</span>}
                                        {isSelected && idx === userChoice && idx !== q.correctAnswer && <span className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-xl md:text-4xl">❌</span>}
                                    </button>
                                );
                            })}
                        </div>

                        {isSelected && (
                            <div className={`mt-4 md:mt-8 p-4 md:p-8 rounded-xl md:rounded-[2.5rem] border-l-[8px] md:border-l-[15px] shadow-2xl animate-bounce-in ${isCorrect ? 'bg-green-50 border-green-500' : 'bg-rose-50 border-rose-500'}`}>
                                <div className="flex flex-col md:flex-row items-start gap-3 md:gap-6">
                                    <span className="text-3xl md:text-6xl drop-shadow-sm self-center md:self-start">{isCorrect ? '🌟' : '💡'}</span>
                                    <div className="flex-1 text-center md:text-left w-full">
                                        <h4 className={`font-black text-lg md:text-3xl mb-2 md:mb-4 uppercase tracking-tighter ${isCorrect ? 'text-green-700' : 'text-rose-700'}`}>
                                            {isCorrect ? 'TUYỆT VỜI!' : `CHƯA ĐÚNG RỒI!`}
                                        </h4>
                                        {!isCorrect && (
                                            <p className="text-sm md:text-2xl font-black text-slate-700 mb-2 md:mb-4 italic">
                                                Đáp án chính xác: <span className="text-green-600 underline decoration-2 md:decoration-4 underline-offset-4 md:underline-offset-8">{String.fromCharCode(65 + q.correctAnswer)}: {q.options[q.correctAnswer]}</span>
                                            </p>
                                        )}
                                        <div className="bg-white/60 p-3 md:p-6 rounded-xl md:rounded-2xl border md:border-2 border-current/10 shadow-inner">
                                            <p className="text-xs md:text-xl font-bold text-slate-600 leading-relaxed italic">
                                                Gợi ý: <span className="text-brand-700">{q.explanation}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
