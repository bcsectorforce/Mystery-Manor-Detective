import React, { useEffect, useRef, useState } from "react";
import type { Person } from "../game/types";
import { BLAKE_QUESTIONS } from "../game/blakeData";
import type { BlakeQuestionKey } from "../game/types";
import { playStrangerKnifeStrike } from "../game/audio";

interface Props {
  question: BlakeQuestionKey;
  uncaughtKillers: Person[];
  onKilled: () => void;
  onFinished: () => void;
}

type AnimPhase =
  | "intro"
  | "city_walk"
  | "pub_interior"
  | "blake_question"
  | "reveal"
  | "city_return"
  | "wrong"
  | "knife"
  | "done";

export function BlakeCinematic({ question, uncaughtKillers, onKilled, onFinished }: Props) {
  const [phase, setPhase] = useState<AnimPhase>("intro");
  const [playerX, setPlayerX] = useState(80);
  const [returnX, setReturnX] = useState(620);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const [answerInput, setAnswerInput] = useState("");
  const [answerError, setAnswerError] = useState(false);
  const [revealedKiller, setRevealedKiller] = useState<Person | null>(null);
  const [blakeArmRaise, setBlakeArmRaise] = useState(0);
  const [letterboxHeight, setLetterboxHeight] = useState(0);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const questionData = BLAKE_QUESTIONS[question];

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  useEffect(() => {
    setPhase("intro");
    const t1 = setTimeout(() => setLetterboxHeight(14), 100);
    const t2 = setTimeout(() => {
      setFadeOpacity(0);
      const t3 = setTimeout(() => {
        setFadeOpacity(1);
        setPhase("city_walk");
        animateCityWalk();
      }, 800);
      timerRef.current = t3;
    }, 1800);
    timerRef.current = t2;
    return () => { clearTimer(); clearTimeout(t1); };
  }, []);

  const animateCityWalk = () => {
    const start = Date.now();
    const duration = 5500;
    const animate = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      setPlayerX(80 + t * 520);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setFadeOpacity(0);
        timerRef.current = setTimeout(() => {
          setFadeOpacity(1);
          setPhase("pub_interior");
          timerRef.current = setTimeout(() => {
            setPhase("blake_question");
            setTimeout(() => inputRef.current?.focus(), 100);
          }, 2200);
        }, 700);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  };

  const handleSubmit = () => {
    const trimmed = answerInput.trim().toLowerCase();
    const correct = questionData.answers.some((a) => a.toLowerCase() === trimmed);
    if (correct) {
      setAnswerError(false);
      const killer = uncaughtKillers[Math.floor(Math.random() * uncaughtKillers.length)] ?? null;
      setRevealedKiller(killer);
      setPhase("reveal");
      const start = Date.now();
      const raiseAnim = () => {
        const t = Math.min((Date.now() - start) / 1200, 1);
        setBlakeArmRaise(t);
        if (t < 1) rafRef.current = requestAnimationFrame(raiseAnim);
      };
      rafRef.current = requestAnimationFrame(raiseAnim);
      timerRef.current = setTimeout(() => {
        setFadeOpacity(0);
        timerRef.current = setTimeout(() => {
          setFadeOpacity(1);
          setPhase("city_return");
          const returnStart = Date.now();
          const returnDur = 4500;
          const animReturn = () => {
            const t = Math.min((Date.now() - returnStart) / returnDur, 1);
            setReturnX(620 - t * 520);
            if (t < 1) {
              rafRef.current = requestAnimationFrame(animReturn);
            } else {
              setFadeOpacity(0);
              timerRef.current = setTimeout(() => {
                setPhase("done");
                onFinished();
              }, 600);
            }
          };
          rafRef.current = requestAnimationFrame(animReturn);
        }, 700);
      }, 5500);
    } else {
      setAnswerError(true);
      setPhase("wrong");
      timerRef.current = setTimeout(() => {
        playStrangerKnifeStrike();
        setPhase("knife");
        timerRef.current = setTimeout(() => {
          setPhase("done");
          onKilled();
        }, 2500);
      }, 2200);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden" style={{ background: "#000" }}>
      {/* Letterbox bars */}
      <div
        className="absolute left-0 right-0 top-0 z-20 transition-all"
        style={{ height: `${letterboxHeight}vh`, background: "#000", transitionDuration: "800ms" }}
      />
      <div
        className="absolute left-0 right-0 bottom-0 z-20 transition-all"
        style={{ height: `${letterboxHeight}vh`, background: "#000", transitionDuration: "800ms" }}
      />

      {/* Main scene */}
      <div className="absolute inset-0 flex items-center justify-center">
        {phase === "intro" && (
          <div className="flex flex-col items-center gap-4 z-10">
            <p className="text-amber-400/60 text-xs tracking-[0.4em] uppercase font-bold">Outside the Mansion</p>
            <p
              className="text-2xl font-bold tracking-wider"
              style={{ color: "#e8d8c0", fontFamily: "'Special Elite', 'Courier New', serif" }}
            >
              You slip out into the night…
            </p>
          </div>
        )}

        {(phase === "city_walk") && (
          <CityScene playerX={playerX} />
        )}

        {(phase === "city_return") && (
          <CitySceneReturn playerX={returnX} />
        )}

        {(phase === "pub_interior") && (
          <PubScene blakeApproaching={true} blakeArmRaise={0} revealedKiller={null} />
        )}

        {(phase === "blake_question") && (
          <div className="flex flex-col items-center justify-center gap-0 w-full h-full relative">
            <PubScene blakeApproaching={false} blakeArmRaise={0} revealedKiller={null} />
            <div
              className="absolute z-10 flex flex-col items-center gap-4"
              style={{ bottom: "18vh" }}
            >
              <div
                className="px-8 py-5 rounded-lg flex flex-col items-center gap-4"
                style={{
                  background: "linear-gradient(160deg, #1a1208 0%, #2a1e10 100%)",
                  border: "1px solid rgba(200,160,80,0.5)",
                  boxShadow: "0 0 40px rgba(180,120,20,0.3)",
                  maxWidth: 480,
                }}
              >
                <p className="text-amber-300/70 text-xs tracking-widest uppercase font-bold">Blake asks…</p>
                <p
                  className="text-center text-lg font-bold"
                  style={{ color: "#e8d0a0", fontFamily: "'Special Elite', 'Courier New', serif" }}
                >
                  "{questionData.question}"
                </p>
                <div className="flex gap-2 w-full mt-1">
                  <input
                    ref={inputRef}
                    value={answerInput}
                    onChange={(e) => { setAnswerInput(e.target.value); setAnswerError(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                    placeholder="Type your answer…"
                    className="flex-1 px-4 py-2 rounded text-sm font-mono outline-none"
                    style={{
                      background: answerError ? "rgba(120,20,20,0.7)" : "rgba(20,15,8,0.9)",
                      border: answerError ? "1px solid rgba(220,60,60,0.7)" : "1px solid rgba(180,130,40,0.4)",
                      color: "#f0d080",
                    }}
                  />
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 rounded text-sm font-bold transition-all hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, #7a5a10, #c09020)",
                      color: "#fff",
                      border: "1px solid rgba(220,180,60,0.5)",
                    }}
                  >
                    Answer
                  </button>
                </div>
                {answerError && (
                  <p className="text-red-400 text-xs italic">That doesn't seem right…</p>
                )}
              </div>
            </div>
          </div>
        )}

        {phase === "reveal" && revealedKiller && (
          <div className="flex flex-col items-center justify-center gap-0 w-full h-full relative">
            <PubScene blakeApproaching={false} blakeArmRaise={blakeArmRaise} revealedKiller={revealedKiller} />
            <div
              className="absolute z-10 flex flex-col items-center gap-2"
              style={{ bottom: "16vh" }}
            >
              <p
                className="text-sm tracking-widest"
                style={{ color: "#e8d0a0", fontFamily: "'Special Elite', 'Courier New', serif" }}
              >
                Blake raises a photograph…
              </p>
            </div>
          </div>
        )}

        {phase === "wrong" && (
          <div className="flex flex-col items-center justify-center gap-6 z-10">
            <p
              className="text-2xl font-bold tracking-wider"
              style={{
                color: "#e8d0a0",
                fontFamily: "'Special Elite', 'Courier New', serif",
                textShadow: "0 0 20px rgba(200,100,0,0.5)",
              }}
            >
              "Wrong. And for that…"
            </p>
            <div className="text-5xl animate-pulse" style={{ filter: "drop-shadow(0 0 10px rgba(200,0,0,0.7))" }}>
              😐
            </div>
          </div>
        )}

        {phase === "knife" && (
          <div className="flex flex-col items-center justify-center gap-6 z-10">
            <div
              className="text-8xl"
              style={{ filter: "drop-shadow(0 0 30px #ff0000)", animation: "pulse 0.4s infinite" }}
            >
              🔪
            </div>
            <p
              className="text-2xl font-bold tracking-widest text-red-400"
              style={{ fontFamily: "'Special Elite', 'Courier New', serif", textShadow: "0 0 20px rgba(255,0,0,0.8)" }}
            >
              YOU'VE BEEN SILENCED
            </p>
          </div>
        )}
      </div>

      {/* Fade overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none transition-opacity"
        style={{ background: "#000", opacity: 1 - fadeOpacity, transitionDuration: "700ms" }}
      />
    </div>
  );
}

function CityScene({ playerX }: { playerX: number }) {
  return (
    <svg width="700" height="420" viewBox="0 0 700 420" style={{ maxWidth: "100vw", maxHeight: "72vh" }}>
      {/* Night sky gradient */}
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020814" />
          <stop offset="100%" stopColor="#060d22" />
        </linearGradient>
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(220,220,180,0.5)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id="lampGlow1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,220,100,0.35)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <rect width="700" height="420" fill="url(#skyGrad)" />

      {/* Stars */}
      {[
        [40,20],[90,35],[150,15],[200,28],[260,10],[320,22],[380,18],[440,30],[500,12],[560,25],[620,18],[680,35],
        [70,55],[130,48],[190,60],[250,45],[310,52],[370,40],[430,58],[490,44],[550,50],[610,38],[660,60],
        [20,80],[100,75],[170,82],[230,70],[290,85],[350,72],[410,78],[470,68],[530,80],[590,74],[650,85],
      ].map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.2 : 0.8}
          fill={`rgba(255,255,255,${0.4 + (i % 5) * 0.12})`}
          opacity={0.7 + (i % 3) * 0.1}
        />
      ))}

      {/* Moon */}
      <ellipse cx="620" cy="50" rx="30" ry="30" fill="url(#moonGlow)" />
      <circle cx="620" cy="50" r="18" fill="#e8e4c8" opacity="0.9" />
      <circle cx="628" cy="44" r="13" fill="#060d22" opacity="0.15" />

      {/* Skyscrapers */}
      {/* Building 1 - tall thin */}
      <rect x="30" y="60" width="55" height="270" fill="#0a0e1a" />
      <rect x="30" y="60" width="55" height="2" fill="#1a2040" />
      {[0,1,2,3,4,5,6,7].map(row => [0,1,2].map(col => (
        <rect key={`b1-${row}-${col}`} x={36+col*16} y={70+row*28} width={10} height={18}
          fill={Math.random() > 0.3 ? "#f5d060" : "#1a2040"} opacity={0.85} />
      )))}

      {/* Building 2 - wide */}
      <rect x="100" y="100" width="90" height="230" fill="#080c18" />
      <rect x="110" y="90" width="70" height="10" fill="#0a0e1a" />
      {[0,1,2,3,4,5,6].map(row => [0,1,2,3].map(col => (
        <rect key={`b2-${row}-${col}`} x={108+col*20} y={108+row*28} width={13} height={18}
          fill={(row+col)%3!==0 ? "#f5d060" : "#131828"} opacity={0.8} />
      )))}
      {/* Mall sign */}
      <rect x="108" y="252" width="76" height="22" rx="2" fill="#1a3060" stroke="#4060c0" strokeWidth="1" />
      <text x="146" y="267" textAnchor="middle" fontSize="8" fill="#80a8ff" fontFamily="monospace" fontWeight="bold">GRAND MALL</text>

      {/* Building 3 - medium */}
      <rect x="205" y="130" width="65" height="200" fill="#070b16" />
      {[0,1,2,3,4,5].map(row => [0,1,2].map(col => (
        <rect key={`b3-${row}-${col}`} x={212+col*19} y={140+row*28} width={12} height={16}
          fill={(row*3+col)%4!==1 ? "#f0c840" : "#0e1424"} opacity={0.85} />
      )))}

      {/* Building 4 - very tall */}
      <rect x="285" y="30" width="50" height="300" fill="#090d1a" />
      <rect x="300" y="20" width="20" height="12" fill="#0d1222" />
      <circle cx="310" cy="18" r="3" fill="#ff4444" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {[0,1,2,3,4,5,6,7,8].map(row => [0,1].map(col => (
        <rect key={`b4-${row}-${col}`} x={292+col*22} y={40+row*28} width={14} height={18}
          fill={(row+col)%3!==2 ? "#f5c830" : "#111828"} opacity={0.9} />
      )))}

      {/* Building 5 */}
      <rect x="350" y="90" width="75" height="240" fill="#080c18" />
      {[0,1,2,3,4,5,6].map(row => [0,1,2].map(col => (
        <rect key={`b5-${row}-${col}`} x={358+col*22} y={100+row*30} width={15} height={20}
          fill={(row+col)%4!==0 ? "#f0c840" : "#101622"} opacity={0.8} />
      )))}

      {/* Building 6 */}
      <rect x="440" y="70" width="60" height="260" fill="#07091a" />
      <rect x="445" y="62" width="50" height="10" fill="#0a0d1e" />
      {[0,1,2,3,4,5,6,7].map(row => [0,1,2].map(col => (
        <rect key={`b6-${row}-${col}`} x={448+col*17} y={78+row*28} width={11} height={18}
          fill={row%2===col%2 ? "#f0cc40" : "#0e1626"} opacity={0.85} />
      )))}

      {/* Building 7 - far right */}
      <rect x="520" y="50" width="80" height="280" fill="#060a18" />
      <rect x="535" y="38" width="50" height="14" fill="#080d1c" />
      {[0,1,2,3,4,5,6,7,8].map(row => [0,1,2,3].map(col => (
        <rect key={`b7-${row}-${col}`} x={527+col*18} y={58+row*26} width={12} height={16}
          fill={(row*4+col)%5!==2 ? "#f5d050" : "#101828"} opacity={0.85} />
      )))}

      {/* Building 8 */}
      <rect x="615" y="110" width="55" height="220" fill="#080c1a" />
      {[0,1,2,3,4,5,6].map(row => [0,1,2].map(col => (
        <rect key={`b8-${row}-${col}`} x={622+col*16} y={118+row*28} width={10} height={18}
          fill={row%3!==1 ? "#f0cc38" : "#0e1826"} opacity={0.8} />
      )))}

      {/* Street */}
      <rect x="0" y="330" width="700" height="50" fill="#0f1018" />
      {/* Road markings */}
      {[50,150,250,350,450,550,650].map((x) => (
        <rect key={x} x={x} y="352" width="40" height="5" rx="2" fill="rgba(255,255,255,0.15)" />
      ))}

      {/* Sidewalk */}
      <rect x="0" y="315" width="700" height="15" fill="#181820" />
      {/* Sidewalk tiles */}
      {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(i => (
        <rect key={i} x={i*50} y="315" width="49" height="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}

      {/* Street lamps */}
      {[80, 240, 400, 560].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="315" rx="25" ry="20" fill="url(#lampGlow1)" />
          <line x1={x} y1="270" x2={x} y2="320" stroke="#333" strokeWidth="3" />
          <line x1={x} y1="270" x2={x+20} y2="260" stroke="#333" strokeWidth="2" />
          <circle cx={x+20} cy="258" r="5" fill="#ffe080" opacity="0.95">
            <animate attributeName="opacity" values="0.95;0.8;0.95" dur="3s" repeatCount="indefinite" />
          </circle>
        </g>
      ))}

      {/* Taxis */}
      <g>
        <rect x="180" y="335" width="55" height="22" rx="3" fill="#e8b800" />
        <rect x="190" y="328" width="35" height="12" rx="2" fill="#c4a000" />
        <circle cx="192" cy="358" r="6" fill="#222" />
        <circle cx="224" cy="358" r="6" fill="#222" />
        <rect x="184" y="330" width="28" height="8" rx="1" fill="rgba(150,200,255,0.4)" />
        <text x="207" y="348" textAnchor="middle" fontSize="6" fill="#333" fontWeight="bold">TAXI</text>
      </g>
      <g>
        <rect x="450" y="334" width="55" height="22" rx="3" fill="#f0c000" />
        <rect x="460" y="327" width="35" height="12" rx="2" fill="#cca200" />
        <circle cx="462" cy="357" r="6" fill="#222" />
        <circle cx="494" cy="357" r="6" fill="#222" />
        <rect x="456" y="329" width="28" height="8" rx="1" fill="rgba(150,200,255,0.4)" />
        <text x="477" y="347" textAnchor="middle" fontSize="6" fill="#333" fontWeight="bold">TAXI</text>
      </g>

      {/* People silhouettes on sidewalk */}
      {[120, 200, 310, 490, 580].map((x, i) => (
        <g key={i} transform={`translate(${x}, 290)`}>
          <circle cx="0" cy="-22" r="6" fill="#1a1820" />
          <rect x="-5" y="-16" width="10" height="18" rx="2" fill="#141218" />
          <rect x="-4" y="2" width="4" height="10" rx="1" fill="#141218" />
          <rect x="0" y="2" width="4" height="10" rx="1" fill="#141218" />
        </g>
      ))}

      {/* Player character (moves) */}
      <g transform={`translate(${playerX}, 295)`}>
        <circle cx="0" cy="-20" r="8" fill="#c8a060" opacity="0.9" />
        <circle cx="0" cy="-18" r="6" fill="#e0c080" opacity="0.7" />
        <circle cx="-2" cy="-21" r="1.5" fill="#3a2a10" />
        <circle cx="2" cy="-21" r="1.5" fill="#3a2a10" />
        <rect x="-5" y="-12" width="10" height="14" rx="2" fill="#c0a050" opacity="0.8" />
      </g>

      {/* Caption */}
      <text x="350" y="410" textAnchor="middle" fill="rgba(200,160,100,0.5)" fontSize="10"
        fontFamily="'Special Elite','Courier New',serif" letterSpacing="3">
        HEADING TO THE PUB…
      </text>
    </svg>
  );
}

function CitySceneReturn({ playerX }: { playerX: number }) {
  return (
    <svg width="700" height="420" viewBox="0 0 700 420" style={{ maxWidth: "100vw", maxHeight: "72vh" }}>
      <defs>
        <linearGradient id="skyGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020814" />
          <stop offset="100%" stopColor="#060d22" />
        </linearGradient>
      </defs>
      <rect width="700" height="420" fill="url(#skyGrad2)" />
      {/* Same city, player moving left */}
      {[40,90,150,200,260,320,380,440,500,560,620,680,70,130,190,250,310,370,430,490,550,610,660].map((x, i) => (
        <circle key={i} cx={x} cy={20 + (i % 5) * 12} r={0.9} fill="rgba(255,255,255,0.6)" />
      ))}
      <circle cx="620" cy="50" r="18" fill="#e8e4c8" opacity="0.9" />
      <rect x="30" y="60" width="55" height="270" fill="#0a0e1a" />
      <rect x="100" y="100" width="90" height="230" fill="#080c18" />
      <rect x="205" y="130" width="65" height="200" fill="#070b16" />
      <rect x="285" y="30" width="50" height="300" fill="#090d1a" />
      <rect x="350" y="90" width="75" height="240" fill="#080c18" />
      <rect x="440" y="70" width="60" height="260" fill="#07091a" />
      <rect x="520" y="50" width="80" height="280" fill="#060a18" />
      <rect x="615" y="110" width="55" height="220" fill="#080c1a" />
      <rect x="0" y="330" width="700" height="50" fill="#0f1018" />
      <rect x="0" y="315" width="700" height="15" fill="#181820" />
      <g>
        <rect x="180" y="335" width="55" height="22" rx="3" fill="#e8b800" />
        <circle cx="192" cy="358" r="6" fill="#222" />
        <circle cx="224" cy="358" r="6" fill="#222" />
      </g>
      <g transform={`translate(${playerX}, 295)`}>
        <circle cx="0" cy="-20" r="8" fill="#c8a060" opacity="0.9" />
        <circle cx="0" cy="-18" r="6" fill="#e0c080" opacity="0.7" />
        <circle cx="-2" cy="-21" r="1.5" fill="#3a2a10" />
        <circle cx="2" cy="-21" r="1.5" fill="#3a2a10" />
        <rect x="-5" y="-12" width="10" height="14" rx="2" fill="#c0a050" opacity="0.8" />
      </g>
      <text x="350" y="410" textAnchor="middle" fill="rgba(200,160,100,0.5)" fontSize="10"
        fontFamily="'Special Elite','Courier New',serif" letterSpacing="3">
        RETURNING TO THE MANSION…
      </text>
    </svg>
  );
}

function PubScene({
  blakeApproaching,
  blakeArmRaise,
  revealedKiller,
}: {
  blakeApproaching: boolean;
  blakeArmRaise: number;
  revealedKiller: Person | null;
}) {
  return (
    <svg width="700" height="420" viewBox="0 0 700 420" style={{ maxWidth: "100vw", maxHeight: "72vh" }}>
      <defs>
        <linearGradient id="pubFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1a08" />
          <stop offset="100%" stopColor="#1a0e04" />
        </linearGradient>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5c3010" />
          <stop offset="100%" stopColor="#3a1c08" />
        </linearGradient>
        <radialGradient id="pubLight1" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="rgba(255,200,80,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id="pubLight2" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="rgba(255,180,60,0.12)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {/* Background wall */}
      <rect width="700" height="420" fill="#1c1008" />

      {/* Wood paneling on walls */}
      {[0,1,2,3,4,5,6].map(i => (
        <rect key={i} x={i*100} y="0" width="99" height="180" fill={i%2===0 ? "#1e1208" : "#1a1006"} />
      ))}
      {/* Wall horizontal rail */}
      <rect x="0" y="175" width="700" height="8" fill="#3a2008" />

      {/* Pub sign */}
      <rect x="270" y="12" width="160" height="36" rx="4" fill="#0a0804" stroke="#8b6020" strokeWidth="2" />
      <text x="350" y="35" textAnchor="middle" fontSize="14" fill="#d4a030" fontFamily="'Special Elite','Courier New',serif" fontWeight="bold">
        THE GOAT PUB
      </text>

      {/* Warm ambient light from ceiling */}
      <rect x="0" y="0" width="700" height="240" fill="url(#pubLight1)" />

      {/* Bar counter (top section) */}
      <rect x="0" y="80" width="200" height="100" fill="url(#barGrad)" rx="0" />
      <rect x="0" y="78" width="200" height="6" fill="#7c4820" />
      {/* Bar stools */}
      {[30, 80, 130, 175].map((x) => (
        <g key={x}>
          <circle cx={x} cy="192" r="14" fill="#3a2010" stroke="#5c3818" strokeWidth="1.5" />
          <line x1={x} y1="206" x2={x} y2="240" stroke="#2a1808" strokeWidth="4" />
          <line x1={x-8} y1="240" x2={x+8} y2="240" stroke="#2a1808" strokeWidth="3" />
        </g>
      ))}

      {/* Bottles on shelf behind bar */}
      <rect x="0" y="50" width="200" height="4" fill="#4a2c0a" />
      {[10,30,50,68,85,105,125,145,165].map((x, i) => (
        <g key={x}>
          <rect x={x} y="24" width={i%3===0?10:8} height="26" rx="2"
            fill={["#2a6040","#8b2020","#604020","#2040a0","#6a3820"][i%5]} opacity="0.85" />
          <rect x={x+1} y="20" width={i%3===0?8:6} height="6" rx="1" fill="#aaa" opacity="0.4" />
        </g>
      ))}

      {/* People at bar */}
      {[25, 80, 135].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="158" r="10" fill={["#c08040","#a06828","#d09850"][i]} />
          <rect x={x-9} y="168" width="18" height="28" rx="3" fill={["#2a3060","#204030","#3a2020"][i]} />
        </g>
      ))}

      {/* Floor */}
      <rect x="0" y="260" width="700" height="160" fill="url(#pubFloor)" />
      {/* Floor planks */}
      {[0,1,2,3,4,5,6].map(i => (
        <rect key={i} x={0} y={260+i*22} width="700" height="21" fill={i%2===0 ? "#2a1a08" : "#261608"} />
      ))}
      {/* Floor plank lines */}
      {[100,200,300,400,500,600].map(x => (
        <line key={x} x1={x} y1="260" x2={x} y2="420" stroke="#1a0e04" strokeWidth="1.5" opacity="0.5" />
      ))}

      {/* Pool table */}
      <rect x="270" y="240" width="200" height="120" rx="6" fill="#1a4a1a" stroke="#5c3820" strokeWidth="3" />
      <rect x="278" y="248" width="184" height="104" rx="4" fill="#226622" />
      {/* Pool table pockets */}
      {[[278,248],[462,248],[278,352],[462,352],[370,248],[370,352]].map(([px,py],i) => (
        <circle key={i} cx={px} cy={py} r="8" fill="#0a0804" />
      ))}
      {/* Pool balls */}
      <circle cx="360" cy="300" r="7" fill="#e8e8e8" />
      <circle cx="380" cy="295" r="7" fill="#e8c020" />
      <circle cx="395" cy="308" r="7" fill="#c02020" />
      <circle cx="345" cy="308" r="7" fill="#2040c0" />
      <circle cx="370" cy="318" r="7" fill="#e07820" />
      {/* Pool cue */}
      <line x1="260" y1="285" x2="355" y2="300" stroke="#b08040" strokeWidth="4" strokeLinecap="round" />
      <line x1="260" y1="285" x2="245" y2="282" stroke="#e0c080" strokeWidth="3" strokeLinecap="round" />

      {/* More pub patrons */}
      {[490, 560, 630].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="230" r="12" fill={["#c07840","#906030","#d0a060"][i]} />
          <rect x={x-11} y="242" width="22" height="32" rx="3" fill={["#204060","#3a3030","#203a20"][i]} />
          <rect x={x-8} y="274" width="7" height="20" rx="2" fill={["#1a3050","#2a2020","#183018"][i]} />
          <rect x={x+1} y="274" width="7" height="20" rx="2" fill={["#1a3050","#2a2020","#183018"][i]} />
        </g>
      ))}

      {/* Blake character (right side) */}
      <BlakeCharacter blakeApproaching={blakeApproaching} blakeArmRaise={blakeArmRaise} revealedKiller={revealedKiller} />

      {/* Warm ceiling lights */}
      {[100, 350, 580].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="0" rx="60" ry="40" fill="url(#pubLight2)" />
          <circle cx={x} cy="10" r="8" fill="#f0d060" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.5;0.6" dur="4s" repeatCount="indefinite" />
          </circle>
          <line x1={x} y1="0" x2={x} y2="10" stroke="#888" strokeWidth="2" />
        </g>
      ))}

      {/* Caption */}
      <text x="350" y="410" textAnchor="middle" fill="rgba(200,160,80,0.5)" fontSize="10"
        fontFamily="'Special Elite','Courier New',serif" letterSpacing="3">
        INSIDE THE GOAT PUB
      </text>
    </svg>
  );
}

function BlakeCharacter({
  blakeApproaching,
  blakeArmRaise,
  revealedKiller,
}: {
  blakeApproaching: boolean;
  blakeArmRaise: number;
  revealedKiller: Person | null;
}) {
  const bx = 550;
  const by = 200;
  const armAngle = -blakeArmRaise * 90;

  return (
    <g>
      {/* Blake body */}
      <circle cx={bx} cy={by - 40} r="18" fill="#d4a868" />
      <rect x={bx - 16} y={by - 22} width="32" height="45" rx="5" fill="#1a2a4a" />
      {/* Name tag */}
      <rect x={bx - 12} y={by - 18} width="28" height="16" rx="2" fill="#f0f0f0" />
      <text x={bx} y={by - 7} textAnchor="middle" fontSize="7" fill="#1a1a4a" fontWeight="bold" fontFamily="monospace">BLAKE</text>
      {/* Left arm (static) */}
      <rect x={bx - 22} y={by - 20} width="10" height="30" rx="4" fill="#1a2a4a" />
      {/* Right arm (raises for reveal) */}
      <g transform={`rotate(${armAngle}, ${bx + 18}, ${by - 16})`}>
        <rect x={bx + 16} y={by - 20} width="10" height="30" rx="4" fill="#1a2a4a" />
        {/* Picture held by Blake when arm is raised */}
        {blakeArmRaise > 0.7 && revealedKiller && (
          <g transform={`translate(${bx + 22}, ${by - 50})`}>
            <rect x="-30" y="-45" width="60" height="75" rx="3" fill="#e8e0d0" stroke="#8b6030" strokeWidth="2" />
            <rect x="-26" y="-41" width="52" height="55" rx="2" fill="#f5f0e8" />
            {/* Killer portrait */}
            <circle cx="0" cy="-20" r="14" fill={revealedKiller.color} />
            <circle cx="0" cy="-18" r="10" fill={revealedKiller.secondaryColor} />
            {/* Eyes */}
            <circle cx="-4" cy="-20" r="2" fill="rgba(0,0,0,0.6)" />
            <circle cx="4" cy="-20" r="2" fill="rgba(0,0,0,0.6)" />
            {/* Accessories */}
            {revealedKiller.accessories.includes("hat") && (
              <rect x="-14" y="-37" width="28" height="10" rx="2" fill="#3a2010" />
            )}
            {revealedKiller.accessories.includes("glasses") && (
              <g>
                <rect x="-12" y="-22" width="9" height="6" rx="1" fill="none" stroke="#888" strokeWidth="1.2" />
                <rect x="3" y="-22" width="9" height="6" rx="1" fill="none" stroke="#888" strokeWidth="1.2" />
                <line x1="-3" y1="-19" x2="3" y2="-19" stroke="#888" strokeWidth="1" />
              </g>
            )}
            {/* Name + ID */}
            <text x="0" y="5" textAnchor="middle" fontSize="7" fill="#333" fontWeight="bold" fontFamily="monospace">
              {revealedKiller.name}
            </text>
            <text x="0" y="16" textAnchor="middle" fontSize="6" fill="#666" fontFamily="monospace">
              ID: {revealedKiller.id}
            </text>
            {revealedKiller.accessories.length > 0 && (
              <text x="0" y="26" textAnchor="middle" fontSize="5.5" fill="#888" fontFamily="monospace">
                {revealedKiller.accessories.join(", ")}
              </text>
            )}
          </g>
        )}
      </g>
      {/* Legs */}
      <rect x={bx - 10} y={by + 22} width="9" height="28" rx="3" fill="#111" />
      <rect x={bx + 1} y={by + 22} width="9" height="28" rx="3" fill="#111" />
      {/* Speech bubble when approaching */}
      {blakeApproaching && (
        <g>
          <rect x={bx - 80} y={by - 85} width="90" height="36" rx="6" fill="#f5f0e8" stroke="#c8a060" strokeWidth="1" />
          <polygon points={`${bx - 20},${by - 50} ${bx - 10},${by - 50} ${bx - 10},${by - 43}`} fill="#f5f0e8" />
          <text x={bx - 35} y={by - 68} textAnchor="middle" fontSize="8" fill="#2a1a08" fontFamily="'Special Elite','Courier New',serif">
            Hey there…
          </text>
          <text x={bx - 35} y={by - 57} textAnchor="middle" fontSize="7.5" fill="#2a1a08" fontFamily="'Special Elite','Courier New',serif">
            I know something.
          </text>
        </g>
      )}
    </g>
  );
}
