"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Placeholder data - replace with real API calls later
const PLACEHOLDER_DATA = {
  tokensBurned: 50000000,
  botHoldings: 528600000,
  creatorFees: 11.28,
  buybackAmount: 0,
  tokenPrice: null,
  marketCap: null,
  totalSupply: 1000000000,
  circulatingSupply: 1000000000,
  holderCount: 37,
  burnIntervalMinutes: 10,
};

// ASCII Art Logo
const ASCII_LOGO = `
 ██████╗ ██████╗ ██╗███╗   ██╗    ████████╗ ██████╗ ██████╗  ██████╗██╗  ██╗
██╔════╝██╔═══██╗██║████╗  ██║    ╚══██╔══╝██╔═══██╗██╔══██╗██╔════╝██║  ██║
██║     ██║   ██║██║██╔██╗ ██║       ██║   ██║   ██║██████╔╝██║     ███████║
██║     ██║   ██║██║██║╚██╗██║       ██║   ██║   ██║██╔══██╗██║     ██╔══██║
╚██████╗╚██████╔╝██║██║ ╚████║       ██║   ╚██████╔╝██║  ██║╚██████╗██║  ██║
 ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝       ╚═╝    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
`;

// Mock holder addresses and weights for lottery wheel (natural distribution)
const MOCK_HOLDERS = [
  { address: "7xKp...3mNv", weight: 22 },
  { address: "Bq4R...8jTw", weight: 16 },
  { address: "9fLm...2pXa", weight: 13 },
  { address: "Hd6Y...5kRc", weight: 11 },
  { address: "3wNs...7vEb", weight: 9 },
  { address: "Kj8Q...1nGf", weight: 8 },
  { address: "5tAe...9hWd", weight: 7 },
  { address: "Vm2C...4rUs", weight: 6 },
  { address: "Fp7Z...6bMx", weight: 5 },
  { address: "Aw3J...0yLq", weight: 3 },
];

// Card suits and values for war game
const CARD_SUITS = ["\u2660", "\u2665", "\u2666", "\u2663"] as const;
const CARD_VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const CARD_VALUE_MAP: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

type TabType = "burn" | "lottery" | "war";

function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + "B";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + "K";
  }
  return num.toLocaleString();
}

function formatCurrency(num: number): string {
  return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPrice(num: number): string {
  if (num < 0.0001) {
    return "$" + num.toFixed(8);
  }
  return "$" + num.toFixed(6);
}

interface MetricCardProps {
  label: string;
  value: string;
  prefix?: string;
  color?: "orange" | "red" | "blue" | "yellow" | "default";
}

function MetricCard({ label, value, prefix = ">", color = "default" }: MetricCardProps) {
  const colorClasses = {
    orange: "text-[var(--accent-orange)] glow-orange",
    red: "text-[var(--accent-red)] glow-red",
    blue: "text-[var(--accent-blue)]",
    yellow: "text-[var(--accent-yellow)]",
    default: "text-[var(--foreground)]",
  };

  return (
    <div className="border border-[var(--border)] p-4 bg-[#0a0705] hover:border-[#5a2a0a] transition-colors">
      <div className="text-[var(--muted)] text-xs uppercase tracking-wider mb-2">
        {prefix} {label}
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>
        {value}
      </div>
    </div>
  );
}

function CountdownTimer({ intervalMinutes }: { intervalMinutes: number }) {
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      // Calculate minutes until next interval
      const currentIntervalMinutes = minutes % intervalMinutes;
      const minutesLeft = intervalMinutes - currentIntervalMinutes - 1;
      const secondsLeft = 60 - seconds;

      if (secondsLeft === 60) {
        return { minutes: minutesLeft + 1, seconds: 0 };
      }
      return { minutes: minutesLeft, seconds: secondsLeft };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [intervalMinutes]);

  const pad = (num: number) => num.toString().padStart(2, "0");

  return (
    <div className="border border-[var(--border)] p-4 bg-[#0a0705] hover:border-[#5a2a0a] transition-colors">
      <div className="text-[var(--muted)] text-xs uppercase tracking-wider mb-2">
        {">"} Next 5% Burn In
      </div>
      <div className="text-3xl font-bold text-[var(--accent-orange)] glow-orange font-mono">
        {pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        <span className="cursor-blink ml-1">_</span>
      </div>
      <div className="text-[var(--muted)] text-xs mt-2">
        Burns every {intervalMinutes} minutes
      </div>
    </div>
  );
}

function ProgressBar({ label, current, total }: { label: string; current: number; total: number }) {
  const percentage = (current / total) * 100;
  const burned = total - current;

  return (
    <div className="border border-[var(--border)] p-4 bg-[#0a0705]">
      <div className="text-[var(--muted)] text-xs uppercase tracking-wider mb-2">
        {">"} {label}
      </div>
      <div className="flex justify-between text-sm mb-2">
        <span>Circulating: {formatNumber(current)}</span>
        <span className="text-[var(--accent-red)]">Burned: {formatNumber(burned)}</span>
      </div>
      <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--accent-red)] via-[var(--accent-orange)] to-[var(--accent-yellow)] transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-right text-xs text-[var(--muted)] mt-1">
        {percentage.toFixed(2)}% remaining
      </div>
    </div>
  );
}

// ============================================================
// TAB NAVIGATION
// ============================================================
function TabNavigation({ activeTab, onTabChange }: { activeTab: TabType; onTabChange: (tab: TabType) => void }) {
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "burn", label: "Burn Tracker", icon: "\u2622" },
    { id: "lottery", label: "Lottery", icon: "\u2609" },
    { id: "war", label: "War", icon: "\u2694" },
  ];

  return (
    <div className="flex border border-[var(--border)] bg-[#0a0705] mb-6 overflow-hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-3 px-4 text-sm font-mono font-bold uppercase tracking-wider transition-all relative ${
            activeTab === tab.id
              ? "bg-gradient-to-b from-[#2a1200] to-[#0a0705] text-[var(--accent-orange)] glow-orange"
              : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[#120a04]"
          }`}
        >
          {activeTab === tab.id && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--accent-red)] via-[var(--accent-orange)] to-[var(--accent-yellow)]" />
          )}
          <span className="mr-2">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// LOTTERY TAB
// ============================================================
function useCountdown(intervalMinutes: number) {
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0, totalSeconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const currentIntervalMinutes = minutes % intervalMinutes;
      const minutesLeft = intervalMinutes - currentIntervalMinutes - 1;
      const secondsLeft = 60 - seconds;

      if (secondsLeft === 60) {
        return { minutes: minutesLeft + 1, seconds: 0, totalSeconds: (minutesLeft + 1) * 60 };
      }
      return { minutes: minutesLeft, seconds: secondsLeft, totalSeconds: minutesLeft * 60 + secondsLeft };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [intervalMinutes]);

  return timeLeft;
}

function LotteryWheel({ holders, spinning, winnerIndex }: { holders: typeof MOCK_HOLDERS; spinning: boolean; winnerIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const spinStartRef = useRef(0);
  const spinDurationRef = useRef(5000);
  const targetRotationRef = useRef(0);

  const segmentColors = [
    "#F48C06", "#DC2F02", "#E85D04", "#FFBA08", "#F48C06",
    "#DC2F02", "#E85D04", "#FFBA08", "#F48C06", "#DC2F02",
  ];

  const totalWeight = holders.reduce((sum, h) => sum + h.weight, 0);

  const drawWheel = useCallback((rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;

    ctx.clearRect(0, 0, size, size);

    // Draw outer glow ring
    ctx.beginPath();
    ctx.arc(center, center, radius + 6, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(244, 140, 6, 0.3)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw weighted segments
    let currentAngle = rotation;
    for (let i = 0; i < holders.length; i++) {
      const segmentAngle = (holders[i].weight / totalWeight) * 2 * Math.PI;
      const endAngle = currentAngle + segmentAngle;

      // Segment fill
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, currentAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = segmentColors[i % segmentColors.length];
      ctx.globalAlpha = i === winnerIndex && !spinning ? 1 : 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Segment border
      ctx.strokeStyle = "#0a0604";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(currentAngle + segmentAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#0a0604";
      const fontSize = Math.max(9, Math.min(size / 30, segmentAngle * radius * 0.3));
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillText(holders[i].address, radius - 12, 4);
      ctx.restore();

      currentAngle = endAngle;
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, 22, 0, 2 * Math.PI);
    ctx.fillStyle = "#0a0604";
    ctx.fill();
    ctx.strokeStyle = "#F48C06";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center text
    ctx.fillStyle = "#F48C06";
    ctx.font = `bold ${Math.max(10, size / 25)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$T", center, center);

    // Pointer (top)
    ctx.beginPath();
    ctx.moveTo(center - 12, 4);
    ctx.lineTo(center + 12, 4);
    ctx.lineTo(center, 24);
    ctx.closePath();
    ctx.fillStyle = "#FFBA08";
    ctx.fill();
    ctx.strokeStyle = "#0a0604";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [holders, winnerIndex, spinning, segmentColors]);

  useEffect(() => {
    if (spinning) {
      spinStartRef.current = Date.now();
      // Calculate the angle offset for the winning segment using weighted sizes
      let winnerStartAngle = 0;
      for (let i = 0; i < winnerIndex; i++) {
        winnerStartAngle += (holders[i].weight / totalWeight) * 2 * Math.PI;
      }
      const winnerSegmentAngle = (holders[winnerIndex].weight / totalWeight) * 2 * Math.PI;
      const winnerCenterAngle = winnerStartAngle + winnerSegmentAngle / 2;
      const finalSegmentRotation = -Math.PI / 2 - winnerCenterAngle;
      // Add 8 full spins
      targetRotationRef.current = finalSegmentRotation - 8 * 2 * Math.PI;
      spinDurationRef.current = 5000;

      const animate = () => {
        const elapsed = Date.now() - spinStartRef.current;
        const progress = Math.min(elapsed / spinDurationRef.current, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        rotationRef.current = eased * targetRotationRef.current;
        drawWheel(rotationRef.current);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      drawWheel(rotationRef.current);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [spinning, winnerIndex, drawWheel, holders.length]);

  // Initial draw
  useEffect(() => {
    drawWheel(0);
  }, [drawWheel]);

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        width={360}
        height={360}
        className="max-w-full"
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
}

function LotteryTab() {
  const timeLeft = useCountdown(PLACEHOLDER_DATA.burnIntervalMinutes);
  const [spinning, setSpinning] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState(-1);
  const [winner, setWinner] = useState<string | null>(null);
  const [pastWinners, setPastWinners] = useState<{ address: string; prize: string }[]>([
    { address: "Bq4R...8jTw", prize: "12,450 $TORCH" },
    { address: "5tAe...9hWd", prize: "8,220 $TORCH" },
    { address: "7xKp...3mNv", prize: "15,100 $TORCH" },
  ]);

  const pad = (num: number) => num.toString().padStart(2, "0");

  const triggerSpin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    setWinner(null);
    const idx = Math.floor(Math.random() * MOCK_HOLDERS.length);
    setWinnerIndex(idx);

    setTimeout(() => {
      setSpinning(false);
      setWinner(MOCK_HOLDERS[idx].address);
      const prize = `${(Math.floor(Math.random() * 20000) + 5000).toLocaleString()} $TORCH`;
      setPastWinners((prev) => [
        { address: MOCK_HOLDERS[idx].address, prize },
        ...prev.slice(0, 9),
      ]);
    }, 5200);
  }, [spinning]);

  // Auto-spin when countdown hits zero
  const prevTotalSeconds = useRef(timeLeft.totalSeconds);
  useEffect(() => {
    if (prevTotalSeconds.current > 0 && timeLeft.totalSeconds === 0) {
      triggerSpin();
    }
    prevTotalSeconds.current = timeLeft.totalSeconds;
  }, [timeLeft.totalSeconds, triggerSpin]);

  return (
    <div>
      {/* Lottery Header */}
      <section className="mb-6 border border-[var(--border)] bg-[#0a0705] p-4">
        <div className="text-[var(--muted)] text-xs uppercase tracking-wider mb-3">
          {">"} Lottery Protocol
        </div>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-blue)]">01</span>
            <span>Every 10-minute burn cycle triggers a lottery draw</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-yellow)]">02</span>
            <span>All $TORCH holders are automatically entered</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-orange)]">03</span>
            <span>Winner receives a share of the burn cycle fees</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-red)]">04</span>
            <span>Probability weighted by token holdings</span>
          </div>
        </div>
      </section>

      {/* Countdown + Spin */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Countdown */}
        <div className="border border-[var(--border)] p-6 bg-[#0a0705] hover:border-[#5a2a0a] transition-colors">
          <div className="text-[var(--muted)] text-xs uppercase tracking-wider mb-2">
            {">"} Next Lottery Draw In
          </div>
          <div className="text-4xl font-bold text-[var(--accent-orange)] glow-orange font-mono mb-4">
            {pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
            <span className="cursor-blink ml-1">_</span>
          </div>
          <div className="text-[var(--muted)] text-xs">
            {spinning ? "Drawing winner..." : "Synced with 10-minute burn interval — auto-spins at zero"}
          </div>
        </div>

        {/* Winner Display */}
        <div className="border border-[var(--border)] p-6 bg-[#0a0705] hover:border-[#5a2a0a] transition-colors flex flex-col items-center justify-center">
          <div className="text-[var(--muted)] text-xs uppercase tracking-wider mb-4">
            {">"} Result
          </div>
          {winner ? (
            <div className="text-center">
              <div className="text-[var(--accent-yellow)] text-xs uppercase tracking-widest mb-2 font-mono">
                *** WINNER ***
              </div>
              <div className="text-3xl font-bold text-[var(--accent-orange)] glow-orange font-mono mb-2">
                {winner}
              </div>
              <div className="text-[var(--accent-yellow)] text-sm font-mono">
                Prize: {pastWinners[0]?.prize}
              </div>
              <div className="mt-3 text-xs text-[var(--muted)] font-mono">
                &gt; tx_hash: 0x{Math.random().toString(16).slice(2, 10)}...{Math.random().toString(16).slice(2, 6)}
              </div>
            </div>
          ) : spinning ? (
            <div className="text-[var(--accent-orange)] text-2xl font-bold font-mono animate-pulse">
              DRAWING...
            </div>
          ) : (
            <div className="text-[var(--muted)] text-sm font-mono text-center">
              <div className="text-lg mb-2">---</div>
              Waiting for next draw
              <span className="cursor-blink ml-1">_</span>
            </div>
          )}
        </div>
      </section>

      {/* Wheel */}
      <section className="mb-6 border border-[var(--border)] bg-[#0a0705] p-6">
        <div className="text-[var(--muted)] text-xs uppercase tracking-wider mb-4">
          {">"} Holder Wheel
        </div>
        <LotteryWheel holders={MOCK_HOLDERS} spinning={spinning} winnerIndex={winnerIndex} />
      </section>

      {/* Past Winners Log */}
      <section className="border border-[var(--border)] bg-[#0a0705] p-4">
        <div className="text-[var(--muted)] text-xs uppercase tracking-wider mb-3">
          {">"} Recent Winners
        </div>
        <div className="space-y-1 font-mono text-sm">
          {pastWinners.map((w, i) => (
            <div key={i} className="flex items-center gap-3 py-1 border-b border-[var(--border)] last:border-b-0">
              <span className="text-[var(--accent-orange)]">{w.address}</span>
              <span className="text-[var(--muted)]">-&gt;</span>
              <span className="text-[var(--accent-yellow)]">{w.prize}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ============================================================
// WAR TAB
// ============================================================
interface PlayingCard {
  value: string;
  suit: typeof CARD_SUITS[number];
  numericValue: number;
}

interface WarResult {
  playerCard: PlayingCard;
  opponentCard: PlayingCard;
  result: "WIN" | "LOSS" | "TIE";
  time: string;
  wager: string;
}

function getRandomCard(): PlayingCard {
  const value = CARD_VALUES[Math.floor(Math.random() * CARD_VALUES.length)];
  const suit = CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)];
  return { value, suit, numericValue: CARD_VALUE_MAP[value] };
}

function CardBack({ label }: { label?: string }) {
  return (
    <div className="w-28 h-40 sm:w-32 sm:h-44 border-2 border-[var(--accent-orange)] rounded-lg bg-gradient-to-br from-[#1a0800] via-[#0d0400] to-[#1a0800] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Card back pattern */}
      <div className="absolute inset-2 border border-[var(--border)] rounded opacity-50" />
      <div className="absolute inset-4 border border-[var(--border)] rounded opacity-30" />
      <div className="text-[var(--accent-orange)] text-3xl font-bold glow-orange">$T</div>
      <div className="text-[var(--muted)] text-[10px] mt-1 uppercase tracking-widest font-mono">
        {label || "TORCH"}
      </div>
      {/* Corner flames */}
      <div className="absolute top-1 left-1 text-[var(--accent-red)] text-xs opacity-60">&#x1F525;</div>
      <div className="absolute bottom-1 right-1 text-[var(--accent-red)] text-xs opacity-60 rotate-180">&#x1F525;</div>
    </div>
  );
}

function CardFace({ card, highlight }: { card: PlayingCard; highlight?: "win" | "loss" | "tie" }) {
  const isRed = card.suit === "\u2665" || card.suit === "\u2666";
  const borderColor = highlight === "win"
    ? "border-[var(--accent-yellow)] shadow-[0_0_15px_rgba(255,186,8,0.4)]"
    : highlight === "loss"
    ? "border-[var(--accent-red)] shadow-[0_0_15px_rgba(220,47,2,0.3)]"
    : "border-[var(--accent-orange)]";

  return (
    <div className={`w-28 h-40 sm:w-32 sm:h-44 border-2 ${borderColor} rounded-lg bg-[#0d0400] flex flex-col items-center justify-center relative`}>
      {/* Top-left */}
      <div className={`absolute top-2 left-2 text-xs font-bold font-mono ${isRed ? "text-[var(--accent-red)]" : "text-[var(--accent-blue)]"}`}>
        {card.value}
        <br />
        {card.suit}
      </div>
      {/* Center */}
      <div className={`text-4xl ${isRed ? "text-[var(--accent-red)]" : "text-[var(--accent-blue)]"}`}>
        {card.suit}
      </div>
      <div className={`text-2xl font-bold font-mono mt-1 ${isRed ? "text-[var(--accent-red)]" : "text-[var(--accent-blue)]"}`}>
        {card.value}
      </div>
      {/* Bottom-right */}
      <div className={`absolute bottom-2 right-2 text-xs font-bold font-mono rotate-180 ${isRed ? "text-[var(--accent-red)]" : "text-[var(--accent-blue)]"}`}>
        {card.value}
        <br />
        {card.suit}
      </div>
    </div>
  );
}

function WarTab() {
  const [phase, setPhase] = useState<"idle" | "deposited" | "revealing" | "result">("idle");
  const [playerCard, setPlayerCard] = useState<PlayingCard | null>(null);
  const [opponentCard, setOpponentCard] = useState<PlayingCard | null>(null);
  const [warResult, setWarResult] = useState<"WIN" | "LOSS" | "TIE" | null>(null);
  const [warLog, setWarLog] = useState<WarResult[]>([
    {
      playerCard: { value: "K", suit: "\u2660", numericValue: 13 },
      opponentCard: { value: "9", suit: "\u2665", numericValue: 9 },
      result: "WIN",
      time: "14:18:32",
      wager: "5,000",
    },
    {
      playerCard: { value: "7", suit: "\u2666", numericValue: 7 },
      opponentCard: { value: "J", suit: "\u2663", numericValue: 11 },
      result: "LOSS",
      time: "14:12:05",
      wager: "2,500",
    },
    {
      playerCard: { value: "A", suit: "\u2665", numericValue: 14 },
      opponentCard: { value: "Q", suit: "\u2660", numericValue: 12 },
      result: "WIN",
      time: "14:05:41",
      wager: "10,000",
    },
    {
      playerCard: { value: "5", suit: "\u2663", numericValue: 5 },
      opponentCard: { value: "5", suit: "\u2665", numericValue: 5 },
      result: "TIE",
      time: "13:58:10",
      wager: "3,000",
    },
  ]);
  const [depositAmount, setDepositAmount] = useState("5,000");

  const handleDeposit = () => {
    setPhase("deposited");
    setPlayerCard(null);
    setOpponentCard(null);
    setWarResult(null);
  };

  const handleWar = () => {
    setPhase("revealing");
    const pc = getRandomCard();
    const oc = getRandomCard();

    // Reveal player card first
    setTimeout(() => {
      setPlayerCard(pc);
    }, 500);

    // Reveal opponent card
    setTimeout(() => {
      setOpponentCard(oc);
    }, 1200);

    // Determine result
    setTimeout(() => {
      let result: "WIN" | "LOSS" | "TIE";
      if (pc.numericValue > oc.numericValue) result = "WIN";
      else if (pc.numericValue < oc.numericValue) result = "LOSS";
      else result = "TIE";

      setWarResult(result);
      setPhase("result");

      const now = new Date();
      const timeStr = now.toLocaleString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setWarLog((prev) => [
        { playerCard: pc, opponentCard: oc, result, time: timeStr, wager: depositAmount },
        ...prev.slice(0, 9),
      ]);
    }, 1800);
  };

  const handleReset = () => {
    setPhase("idle");
    setPlayerCard(null);
    setOpponentCard(null);
    setWarResult(null);
  };

  const resultColor = warResult === "WIN"
    ? "text-[var(--accent-yellow)] glow-orange"
    : warResult === "LOSS"
    ? "text-[var(--accent-red)] glow-red"
    : "text-[var(--accent-blue)]";

  return (
    <div>
      {/* War Header */}
      <section className="mb-6 border border-[var(--border)] bg-[#0a0705] p-4">
        <div className="text-[var(--muted)] text-xs uppercase tracking-wider mb-3">
          {">"} Card War Protocol
        </div>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-blue)]">01</span>
            <span>Deposit $TORCH to enter a war challenge</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-yellow)]">02</span>
            <span>Each player draws one card - highest card wins</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-orange)]">03</span>
            <span>Winner takes 90% of the pot - 10% is burned</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-red)]">04</span>
            <span>Ties result in double-or-nothing rematch</span>
          </div>
        </div>
      </section>

      {/* Wager Selection */}
      {phase === "idle" && (
        <section className="mb-6 border border-[var(--border)] bg-[#0a0705] p-4">
          <div className="text-[var(--muted)] text-xs uppercase tracking-wider mb-3">
            {">"} Select Wager
          </div>
          <div className="flex flex-wrap gap-2">
            {["1,000", "2,500", "5,000", "10,000", "25,000"].map((amt) => (
              <button
                key={amt}
                onClick={() => setDepositAmount(amt)}
                className={`px-4 py-2 font-mono text-sm border rounded transition-all ${
                  depositAmount === amt
                    ? "border-[var(--accent-orange)] bg-[#2a1200] text-[var(--accent-orange)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-[#5a2a0a] hover:text-[var(--foreground)]"
                }`}
              >
                {amt}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Card Arena */}
      <section className="mb-6 border border-[var(--border)] bg-[#0a0705] p-6">
        <div className="text-[var(--muted)] text-xs uppercase tracking-wider mb-6 text-center">
          {">"} Battle Arena
        </div>

        <div className="flex items-center justify-center gap-4 sm:gap-8 md:gap-16 mb-6">
          {/* Player Side */}
          <div className="flex flex-col items-center gap-3">
            <div className="text-[var(--accent-blue)] text-xs uppercase tracking-wider font-mono">
              You
            </div>
            {playerCard ? (
              <CardFace
                card={playerCard}
                highlight={warResult === "WIN" ? "win" : warResult === "LOSS" ? "loss" : warResult === "TIE" ? "tie" : undefined}
              />
            ) : (
              <CardBack label="PLAYER" />
            )}
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-[var(--accent-red)] text-2xl font-bold font-mono glow-red">
              VS
            </div>
            {warResult && (
              <div className={`text-lg font-bold font-mono ${resultColor}`}>
                {warResult === "WIN" && "VICTORY!"}
                {warResult === "LOSS" && "DEFEAT"}
                {warResult === "TIE" && "TIE!"}
              </div>
            )}
          </div>

          {/* Opponent Side */}
          <div className="flex flex-col items-center gap-3">
            <div className="text-[var(--accent-red)] text-xs uppercase tracking-wider font-mono">
              Opponent
            </div>
            {opponentCard ? (
              <CardFace
                card={opponentCard}
                highlight={warResult === "LOSS" ? "win" : warResult === "WIN" ? "loss" : warResult === "TIE" ? "tie" : undefined}
              />
            ) : (
              <CardBack label="ENEMY" />
            )}
          </div>
        </div>

        {/* Pot Display */}
        {phase !== "idle" && (
          <div className="text-center mb-4">
            <span className="text-[var(--muted)] text-xs uppercase tracking-wider font-mono">Pot: </span>
            <span className="text-[var(--accent-yellow)] font-bold font-mono">
              {parseInt(depositAmount.replace(/,/g, "")) * 2 > 0
                ? (parseInt(depositAmount.replace(/,/g, "")) * 2).toLocaleString()
                : depositAmount}{" "}
              $TORCH
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center">
          {phase === "idle" && (
            <button
              onClick={handleDeposit}
              className="px-8 py-3 bg-gradient-to-r from-[#F48C06] to-[#E85D04] text-black font-bold font-mono uppercase tracking-wider rounded hover:from-[#FFBA08] hover:to-[#F48C06] transition-all shadow-lg shadow-orange-500/30"
            >
              Deposit {depositAmount} $TORCH to Challenge
            </button>
          )}
          {phase === "deposited" && (
            <button
              onClick={handleWar}
              className="px-8 py-3 bg-gradient-to-r from-[#DC2F02] to-[#E85D04] text-black font-bold font-mono uppercase tracking-wider rounded hover:from-[#F48C06] hover:to-[#DC2F02] transition-all shadow-lg shadow-red-500/30 animate-pulse"
            >
              GO TO WAR!
            </button>
          )}
          {phase === "revealing" && (
            <div className="px-8 py-3 text-[var(--accent-orange)] font-bold font-mono uppercase tracking-wider animate-pulse">
              Revealing cards...
            </div>
          )}
          {phase === "result" && (
            <div className="flex flex-col items-center gap-3">
              {warResult === "WIN" && (
                <div className="text-[var(--accent-yellow)] text-sm font-mono">
                  +{depositAmount} $TORCH earned | {Math.floor(parseInt(depositAmount.replace(/,/g, "")) * 0.1).toLocaleString()} $TORCH burned
                </div>
              )}
              {warResult === "LOSS" && (
                <div className="text-[var(--accent-red)] text-sm font-mono">
                  -{depositAmount} $TORCH lost | {Math.floor(parseInt(depositAmount.replace(/,/g, "")) * 0.1).toLocaleString()} $TORCH burned
                </div>
              )}
              {warResult === "TIE" && (
                <div className="text-[var(--accent-blue)] text-sm font-mono">
                  Tie! Wager returned.
                </div>
              )}
              <button
                onClick={handleReset}
                className="px-8 py-3 bg-gradient-to-r from-[#F48C06] to-[#E85D04] text-black font-bold font-mono uppercase tracking-wider rounded hover:from-[#FFBA08] hover:to-[#F48C06] transition-all shadow-lg shadow-orange-500/30"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      </section>

      {/* War Log */}
      <section className="border border-[var(--border)] bg-[#0a0705] p-4">
        <div className="text-[var(--muted)] text-xs uppercase tracking-wider mb-3">
          {">"} Battle Log
        </div>
        <div className="space-y-1 font-mono text-sm">
          {warLog.map((entry, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 py-1 border-b border-[var(--border)] last:border-b-0">
              <span className="text-[var(--accent-blue)]">
                {entry.playerCard.value}{entry.playerCard.suit}
              </span>
              <span className="text-[var(--muted)]">vs</span>
              <span className="text-[var(--accent-red)]">
                {entry.opponentCard.value}{entry.opponentCard.suit}
              </span>
              <span className="text-[var(--muted)]">|</span>
              <span className={
                entry.result === "WIN"
                  ? "text-[var(--accent-yellow)]"
                  : entry.result === "LOSS"
                  ? "text-[var(--accent-red)]"
                  : "text-[var(--accent-blue)]"
              }>
                {entry.result}
              </span>
              <span className="text-[var(--muted)]">|</span>
              <span className="text-[var(--foreground)]">{entry.wager} $TORCH</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("burn");

  // Fee schedule: DISABLED - set FEE_ENABLED to true and update FEE_START_TIME to activate
  const FEE_ENABLED = false;
  const FEE_START_TIME = 1773380951000; // epoch ms - change this to set start time
  const FEE_BASE = PLACEHOLDER_DATA.creatorFees;
  const FEE_INCREMENTS = [22.44, 30.20, 12.54, 30.56, 22.22, 22.22, 22.22, 22.22, 33.33, 33.33, 22.55];

  const getCreatorFees = () => {
    if (!FEE_ENABLED) return FEE_BASE;
    const elapsed = Date.now() - FEE_START_TIME;
    const minutesPassed = Math.floor(elapsed / 60000);
    let total = FEE_BASE;
    for (let i = 0; i < Math.min(minutesPassed, FEE_INCREMENTS.length); i++) {
      total += FEE_INCREMENTS[i];
    }
    return total;
  };

  const [creatorFees, setCreatorFees] = useState(FEE_BASE);

  useEffect(() => {
    setMounted(true);

    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    // Update fees every second to catch minute boundaries
    setCreatorFees(getCreatorFees());
    const feesTimer = setInterval(() => {
      setCreatorFees(getCreatorFees());
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(feesTimer);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Coin Torch Banner Header */}
        <header className="flame-banner rounded-lg mb-8">
          <div className="flame-top"></div>
          <div className="flame-columns">
            <div className="flame-col"></div>
            <div className="flame-col"></div>
            <div className="flame-col"></div>
            <div className="flame-col"></div>
            <div className="flame-col"></div>
            <div className="flame-col"></div>
            <div className="flame-col"></div>
            <div className="flame-col"></div>
            <div className="flame-col"></div>
            <div className="flame-col"></div>
            <div className="flame-col"></div>
            <div className="flame-col"></div>
            <div className="flame-col"></div>
            <div className="flame-col"></div>
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <pre className="ascii-flame text-[0.35rem] sm:text-[0.5rem] md:text-sm lg:text-base leading-none font-bold overflow-x-auto">
              {ASCII_LOGO}
            </pre>
            <p className="text-[var(--muted)] text-xs sm:text-sm mt-4 italic">
              agent designed, agent deployed, coin torch
            </p>
            <a
              href="https://x.com/Phil_Chuds"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-6 py-2 bg-gradient-to-r from-[#F48C06] to-[#E85D04] text-black font-bold rounded hover:from-[#FFBA08] hover:to-[#F48C06] transition-all shadow-lg shadow-orange-500/30"
            >
              Follow on X
            </a>
            <a
              href="https://pump.fun/?q=torch&tab=created_timestamp"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-6 py-2 bg-gradient-to-r from-[#F48C06] to-[#E85D04] text-black font-bold rounded hover:from-[#FFBA08] hover:to-[#F48C06] transition-all shadow-lg shadow-orange-500/30"
            >
              Buy $TORCH
            </a>
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 gap-2 text-sm">
            <div className="text-[var(--muted)]">
              <span className="text-[var(--accent-orange)]">$</span> ./dashboard --network=solana
            </div>
            <div className="text-[var(--muted)] font-mono">
              [{currentTime}] <span className="text-[var(--accent-orange)]">●</span> LIVE
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === "burn" && (
          <>
            {/* Framework */}
            <section className="mb-6 border border-[var(--border)] bg-[#0a0705] p-4">
              <div className="text-[var(--muted)] text-xs uppercase tracking-wider mb-3">
                {">"} Framework
              </div>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex items-start gap-2">
                  <span className="text-[var(--accent-blue)]">01</span>
                  <span>50% initial buy to supply control</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[var(--accent-yellow)]">02</span>
                  <span>5% burn every 10m</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[var(--accent-orange)]">03</span>
                  <span>Creator fees 100% buyback every 10m</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[var(--accent-red)]">04</span>
                  <span>Once bot supply is below 1%, 100% of buybacks will be auto burned</span>
                </div>
              </div>
            </section>

            {/* Countdown Timer - Featured */}
            <section className="mb-6">
              <CountdownTimer intervalMinutes={PLACEHOLDER_DATA.burnIntervalMinutes} />
            </section>

            {/* Main Metrics Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                label="Tokens Burned"
                value={`${formatNumber(PLACEHOLDER_DATA.tokensBurned)} (${((PLACEHOLDER_DATA.tokensBurned / PLACEHOLDER_DATA.totalSupply) * 100).toFixed(0)}%)`}
                color="red"
              />
              <MetricCard
                label="Bot Holdings"
                value={`${formatNumber(PLACEHOLDER_DATA.botHoldings)} (${((PLACEHOLDER_DATA.botHoldings / PLACEHOLDER_DATA.totalSupply) * 100).toFixed(1)}%)`}
                color="blue"
              />
              <MetricCard
                label="Creator Fees"
                value={formatCurrency(creatorFees)}
                color="orange"
              />
              <MetricCard
                label="Total Buybacks"
                value={formatCurrency(PLACEHOLDER_DATA.buybackAmount)}
                color="yellow"
              />
            </section>

            {/* Supply Progress */}
            <section className="mb-6">
              <ProgressBar
                label="Token Supply"
                current={PLACEHOLDER_DATA.circulatingSupply}
                total={PLACEHOLDER_DATA.totalSupply}
              />
            </section>

            {/* Market Metrics */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                label="Token Price"
                value={PLACEHOLDER_DATA.tokenPrice ? formatPrice(PLACEHOLDER_DATA.tokenPrice) : "fetching..."}
                color="orange"
              />
              <MetricCard
                label="Market Cap"
                value={PLACEHOLDER_DATA.marketCap ? formatCurrency(PLACEHOLDER_DATA.marketCap) : "fetching..."}
                color="default"
              />
              <MetricCard
                label="Total Supply"
                value={formatNumber(PLACEHOLDER_DATA.totalSupply)}
                color="default"
              />
              <MetricCard
                label="Holders"
                value={formatNumber(PLACEHOLDER_DATA.holderCount)}
                color="blue"
              />
            </section>
          </>
        )}

        {activeTab === "lottery" && <LotteryTab />}

        {activeTab === "war" && <WarTab />}

        {/* Footer */}
        <footer className="border-t border-[var(--border)] pt-4 mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[var(--muted)] text-xs gap-2">
            <div>
              <span className="text-[var(--accent-orange)]">$</span> echo &quot;Data refreshes automatically&quot;
            </div>
            <div>
              Network: <span className="text-[var(--foreground)]">Solana</span> |
              Status: <span className="text-[var(--accent-orange)]">Operational</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
