import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Trophy } from 'lucide-react';
import Mole from './components/Mole';
import Footer from './components/Footer';
import { audioService } from './services/audioService';
import { MoleData, MoleStatus } from './types';

// Game Configuration
const GAME_DURATION = 30; // seconds
const MIN_PEEP_TIME = 400; // ms
const MAX_PEEP_TIME = 1000; // ms
const HOLE_COUNT = 6;

const App: React.FC = () => {
  // State
  const [moles, setMoles] = useState<MoleData[]>(
    Array.from({ length: HOLE_COUNT }, (_, i) => ({ id: i, status: MoleStatus.IDLE }))
  );
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Refs for game loop control (avoiding stale closures in timeouts)
  const lastHoleRef = useRef<number>(-1);
  const isPlayingRef = useRef(false);
  const gameTimerRef = useRef<number | null>(null);
  const peepTimerRef = useRef<number | null>(null);

  // Initialize Audio Logic
  useEffect(() => {
    audioService.setMuted(isMuted);
  }, [isMuted]);

  // Helper: Random Time
  const randomTime = (min: number, max: number) => {
    return Math.round(Math.random() * (max - min) + min);
  };

  // Helper: Random Hole
  const randomHole = (currentMoles: MoleData[]): number => {
    const idx = Math.floor(Math.random() * currentMoles.length);
    const hole = currentMoles[idx].id;
    if (hole === lastHoleRef.current) {
      return randomHole(currentMoles);
    }
    lastHoleRef.current = hole;
    return hole;
  };

  // The Peep Cycle
  const peep = useCallback(() => {
    if (!isPlayingRef.current) return;

    const time = randomTime(MIN_PEEP_TIME, MAX_PEEP_TIME);
    const holeIdx = randomHole(moles);

    // 1. Set Mole UP
    setMoles((prev) =>
      prev.map((m) => (m.id === holeIdx ? { ...m, status: MoleStatus.UP } : m))
    );
    
    // Play Pop Sound
    audioService.playPop();

    // 2. Schedule Mole DOWN
    peepTimerRef.current = window.setTimeout(() => {
      setMoles((prev) => {
        // Only reset if it wasn't whacked in the meantime (optional, but standard logic usually resets regardless or checks)
        // In this implementation, we force it down even if whacked to clear the grid for next frame
        return prev.map((m) => (m.id === holeIdx ? { ...m, status: MoleStatus.IDLE } : m));
      });
      
      // Continue loop if still playing
      if (isPlayingRef.current) {
        peep();
      }
    }, time);
  }, [moles]);

  // Start Game
  const startGame = () => {
    if (isPlaying) return;

    setScore(0);
    setTimeLeft(GAME_DURATION);
    setIsPlaying(true);
    isPlayingRef.current = true;
    
    // Reset board
    setMoles(Array.from({ length: HOLE_COUNT }, (_, i) => ({ id: i, status: MoleStatus.IDLE })));

    // Start Loop
    peep();

    // Start Timer
    gameTimerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // End Game
  const endGame = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (peepTimerRef.current) clearTimeout(peepTimerRef.current);

    setMoles((prev) => prev.map((m) => ({ ...m, status: MoleStatus.IDLE })));
    
    // Update High Score
    setHighScore(prev => Math.max(prev, score));
    audioService.playGameOver();
  };

  // Whack Handler
  const handleWhack = (id: number, isTrusted: boolean) => {
    if (!isTrusted || !isPlayingRef.current) return;

    setMoles((prev) =>
      prev.map((m) => {
        if (m.id === id && m.status === MoleStatus.UP) {
            // Valid Whack
            audioService.playBonk();
            setScore((s) => s + 1);
            return { ...m, status: MoleStatus.WHACKED };
        }
        return m;
      })
    );

    // After a short delay, hide the whacked mole immediately? 
    // Usually, the existing timeout handles the hide, but visual feedback is immediate via status change.
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (peepTimerRef.current) clearTimeout(peepTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-amber-50">
      
      {/* HEADER */}
      <header className="bg-amber-600 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
             <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
               🔨 Whack-a-Mole
             </h1>
             <p className="text-amber-200 text-xs hidden md:block">The Classic Arcade Experience</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="bg-amber-800/30 px-4 py-2 rounded-lg text-center">
                <span className="block text-amber-200 text-xs uppercase font-bold">Score</span>
                <span className="text-2xl font-black font-mono">{score}</span>
             </div>
             <button 
               onClick={() => setIsMuted(!isMuted)}
               className="p-2 bg-amber-700 hover:bg-amber-800 rounded-full transition-colors"
               aria-label={isMuted ? "Unmute" : "Mute"}
             >
               {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
             </button>
          </div>
        </div>
      </header>

      {/* MAIN GAME AREA */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 w-full max-w-4xl mx-auto">
        
        {/* Controls & Status */}
        <div className="w-full flex justify-between items-end mb-8 px-2">
            <div className="text-slate-700">
               <div className="flex items-center gap-2 text-sm font-bold uppercase text-slate-400">
                 <Trophy size={16} /> High Score
               </div>
               <div className="text-3xl font-black text-slate-800">{Math.max(score, highScore)}</div>
            </div>

            <div className="text-center">
               <div className="text-5xl font-black text-amber-600 mb-1 font-mono">
                 {timeLeft}
                 <span className="text-base text-slate-400 ml-1 font-sans font-normal">s</span>
               </div>
            </div>

            <div>
               {!isPlaying ? (
                 <button 
                   onClick={startGame}
                   className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-green-500/50 shadow-lg transform hover:scale-105 active:scale-95 transition-all"
                 >
                   <Play size={20} fill="currentColor" /> Start
                 </button>
               ) : (
                 <button 
                   disabled
                   className="flex items-center gap-2 bg-slate-300 text-slate-500 px-6 py-3 rounded-xl font-bold cursor-not-allowed opacity-75"
                 >
                   Running...
                 </button>
               )}
            </div>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8 md:gap-8 w-full max-w-2xl bg-amber-100/50 p-6 md:p-8 rounded-3xl border-4 border-amber-200 shadow-xl">
          {moles.map((mole) => (
            <Mole 
              key={mole.id} 
              id={mole.id} 
              status={mole.status} 
              onWhack={handleWhack} 
            />
          ))}
        </div>

        {/* Instructions */}
        {!isPlaying && timeLeft === GAME_DURATION && score === 0 && (
          <p className="mt-8 text-slate-500 animate-bounce text-sm">
            Press <strong>Start</strong> to generate moles!
          </p>
        )}
        
        {!isPlaying && timeLeft === 0 && (
          <div className="mt-8 text-center animate-pulse">
             <h2 className="text-2xl font-bold text-slate-800">Game Over!</h2>
             <button onClick={startGame} className="mt-2 text-amber-600 font-bold underline flex items-center justify-center gap-1 mx-auto">
                <RotateCcw size={16} /> Play Again
             </button>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
};

export default App;