"use client";

import { useState, useEffect } from "react";

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
 █████╗  ██████╗ ███████╗███╗   ██╗████████╗    ███████╗██╗██████╗ ███████╗
██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝    ██╔════╝██║██╔══██╗██╔════╝
███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║       █████╗  ██║██████╔╝█████╗
██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║       ██╔══╝  ██║██╔══██╗██╔══╝
██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║       ██║     ██║██║  ██║███████╗
╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝       ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝
`;


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

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

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
        {/* Agent Fire Banner Header */}
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
              agent designed, agent deployed, agent burns
            </p>
            <a
              href="https://x.com/Gary_Yorkk"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-6 py-2 bg-gradient-to-r from-[#F48C06] to-[#E85D04] text-black font-bold rounded hover:from-[#FFBA08] hover:to-[#F48C06] transition-all shadow-lg shadow-orange-500/30"
            >
              Follow on X
            </a>
            <a
              href="https://pump.fun/?q=fire&tab=created_timestamp"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-6 py-2 bg-gradient-to-r from-[#F48C06] to-[#E85D04] text-black font-bold rounded hover:from-[#FFBA08] hover:to-[#F48C06] transition-all shadow-lg shadow-orange-500/30"
            >
              Buy $FIRE
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
