import { useEffect, useState } from "react";
import { useThemeUI } from "theme-ui";
import { Box, Flex, Text } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import { readNetStats, type NetStats } from "@/client/net/net-stats";
import { msToHours } from "@/rules/stats";
import { DiscButton, GLASS_PILL } from "@/client/hud/app/glass-disc";

/** Snapshots come every tick; a gap this many ticks long is a visible hitch. */
const HITCH_TICKS = 3;
/** Without server numbers yet, assume the default 20 fps. */
const FALLBACK_TICK_MS = 50;
const GRAPH_HEIGHT = 40;

type Verdict = "smooth" | "network" | "server";

const VERDICT_TEXT: Record<Verdict, string> = {
  smooth: "Smooth",
  network: "Network hitch",
  server: "Server stalled",
};

const VERDICT_COLOR: Record<Verdict, string> = {
  smooth: "set",
  network: "warning",
  server: "danger",
};

/** Was the last hitch the network, or the server not ticking on time? */
const judge = (stats: NetStats): Verdict => {
  const tickMs = stats.server?.targetTickMs ?? FALLBACK_TICK_MS;
  if (stats.gapMax < tickMs * HITCH_TICKS) return "smooth";
  const server = stats.server;
  const serverStalled =
    !!server && (server.maxTickGapMs >= tickMs * 2 || server.loopDelayMaxMs >= tickMs * 2);
  return serverStalled ? "server" : "network";
};

const useNetStats = (intervalMs: number) => {
  const [stats, setStats] = useState(() => readNetStats(performance.now()));
  useEffect(() => {
    const id = setInterval(() => setStats(readNetStats(performance.now())), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return stats;
};

/** Wifi arcs, lit by how the last few seconds went. */
const SignalIcon = ({ verdict, isConnected }: { verdict: Verdict; isConnected: boolean }) => {
  const lit = !isConnected ? 0 : verdict === "smooth" ? 3 : verdict === "network" ? 2 : 1;
  const color = !isConnected ? "danger" : VERDICT_COLOR[verdict];
  const { theme } = useThemeUI();
  const arcs = ["M4 7.5a6.5 6.5 0 0 1 8 0", "M2 5a10 10 0 0 1 12 0"];
  return (
    <svg
      viewBox="0 0 16 13"
      style={{ width: 13, height: 11, display: "block", color: String(theme.colors?.[color]) }}
    >
      <circle cx={8} cy={11} r={1.5} fill="currentColor" opacity={lit >= 1 ? 1 : 0.3} />
      {arcs.map((d, i) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          opacity={i + 2 <= lit ? 1 : 0.3}
        />
      ))}
    </svg>
  );
};

/** How much history the graph spans. */
const GRAPH_WINDOW_MS = 10_000;
const GRAPH_WIDTH = 200;
const HITCH_COLOR = "#fca5a5";
/** Cards inside the panel: a shade over the glass, half as dark as the glass itself. */
const INSET_BG = "shadow.15";

/** Snapshot gaps over the last 10 seconds as an area, newest on the right. Hitches get a red tick. */
const GapGraph = ({ gaps, tickMs }: { gaps: number[]; tickMs: number }) => {
  const slots = Math.max(2, Math.round(GRAPH_WINDOW_MS / tickMs));
  const top = Math.ceil(Math.max(tickMs * 4, ...gaps) / 50) * 50;
  const x = (i: number) => ((slots - gaps.length + i) / (slots - 1)) * GRAPH_WIDTH;
  const y = (ms: number) => GRAPH_HEIGHT - (Math.min(ms, top) / top) * (GRAPH_HEIGHT - 2);
  const line = gaps.map((ms, i) => `${i ? "L" : "M"}${x(i)},${y(ms)}`).join("");
  const area = gaps.length
    ? `${line}L${x(gaps.length - 1)},${GRAPH_HEIGHT}L${x(0)},${GRAPH_HEIGHT}Z`
    : "";
  return (
    <Box sx={{ position: "relative", borderRadius: 6, bg: INSET_BG, p: "6px", pt: "14px" }}>
      <Text sx={{ position: "absolute", top: "3px", left: "6px", fontSize: "8px", opacity: 0.5 }}>
        {top} ms
      </Text>
      <Text sx={{ position: "absolute", top: "3px", right: "6px", fontSize: "8px", opacity: 0.5 }}>
        10s
      </Text>
      <svg
        viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: GRAPH_HEIGHT, display: "block", overflow: "visible" }}
      >
        <line
          x1={0}
          x2={GRAPH_WIDTH}
          y1={y(tickMs)}
          y2={y(tickMs)}
          stroke="white"
          strokeOpacity={0.25}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
        <path d={area} fill="white" fillOpacity={0.12} />
        <path
          d={line}
          fill="none"
          stroke="white"
          strokeOpacity={0.8}
          strokeWidth={1.25}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {gaps.map((ms, i) =>
          ms >= tickMs * HITCH_TICKS ? (
            <line
              key={i}
              x1={x(i)}
              x2={x(i)}
              y1={y(ms)}
              y2={GRAPH_HEIGHT}
              stroke={HITCH_COLOR}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ) : null,
        )}
      </svg>
    </Box>
  );
};

/** A small labelled number. */
const Tile = ({ label, value, warn }: { label: string; value: number; warn?: boolean }) => (
  <Flex
    sx={{
      flex: 1,
      flexDirection: "column",
      gap: "2px",
      py: "5px",
      px: "6px",
      borderRadius: 6,
      bg: INSET_BG,
    }}
  >
    <Text sx={{ fontSize: "8px", opacity: 0.5, textTransform: "uppercase" }}>{label}</Text>
    <Text sx={{ fontVariantNumeric: "tabular-nums", color: warn ? "danger" : "white" }}>
      {Math.round(value)}
      <Text as="span" sx={{ fontSize: "8px", opacity: 0.6, ml: "2px" }}>
        ms
      </Text>
    </Text>
  </Flex>
);

const Row = ({ label, value, warn }: { label: string; value: string; warn?: boolean }) => (
  <Flex sx={{ alignItems: "baseline", gap: "4px" }}>
    <Text sx={{ opacity: 0.6 }}>{label}</Text>
    {/* Dot leader, so the eye can follow a label to its value */}
    <Box sx={{ flex: 1, borderBottom: "1px dotted", borderColor: "white", opacity: 0.2 }} />
    <Text sx={{ fontVariantNumeric: "tabular-nums", color: warn ? "danger" : "white" }}>
      {value}
    </Text>
  </Flex>
);

const ms = (value: number) => `${Math.round(value)} ms`;

const NetStatsPanel = ({ stats, verdict }: { stats: NetStats; verdict: Verdict }) => {
  const { isConnected } = useAppContext();
  const { server } = stats;
  const tickMs = server?.targetTickMs ?? FALLBACK_TICK_MS;
  const color = isConnected ? VERDICT_COLOR[verdict] : "danger";
  return (
    <Flex
      sx={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        width: 210,
        flexDirection: "column",
        gap: "6px",
        p: "8px",
        borderRadius: 10,
        bg: "shadow.30",
        backdropFilter: "blur(10px)",
        color: "white",
        fontSize: 0,
        lineHeight: 1.2,
        pointerEvents: "all",
      }}
    >
      <Flex sx={{ alignItems: "center", gap: "6px" }}>
        <Flex sx={{ flex: 1, alignItems: "center", gap: "5px", lineHeight: 1 }}>
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              bg: color,
              flexShrink: 0,
              /* A dark ring so the dot holds its shape on light ground */
              boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.4)",
            }}
          />
          <Text sx={{ fontWeight: "bold", color, lineHeight: 1 }}>
            {isConnected ? VERDICT_TEXT[verdict] : "Disconnected"}
          </Text>
        </Flex>
        <Text sx={{ fontSize: 2, fontWeight: "bold", fontVariantNumeric: "tabular-nums" }}>
          {Math.round(stats.rttLast)}
          <Text as="span" sx={{ fontSize: "9px", fontWeight: "normal", opacity: 0.6, ml: "2px" }}>
            ms
          </Text>
        </Text>
      </Flex>
      <GapGraph gaps={stats.gaps} tickMs={tickMs} />
      <Flex sx={{ gap: "4px" }}>
        <Tile label="Max gap" value={stats.gapMax} warn={stats.gapMax >= tickMs * HITCH_TICKS} />
        <Tile label="p95 gap" value={stats.gapP95} />
        <Tile label="p95 ping" value={stats.rttP95} />
      </Flex>
      {server ? (
        <Flex sx={{ flexDirection: "column", gap: "3px", px: "2px" }}>
          <Row
            label="Server tick gap"
            value={ms(server.maxTickGapMs)}
            warn={server.maxTickGapMs >= tickMs * 2}
          />
          <Row
            label="Server tick work"
            value={`${server.maxTickWorkMs} ms`}
            warn={server.maxTickWorkMs >= tickMs}
          />
          <Row
            label="Event loop p99 / max"
            value={`${server.loopDelayP99Ms} / ${ms(server.loopDelayMaxMs)}`}
            warn={server.loopDelayMaxMs >= tickMs * 2}
          />
          <Row label="Players online" value={String(server.playersOnline)} />
          <Row label="Uptime" value={String(msToHours(server.upTimeMs))} />
        </Flex>
      ) : (
        <Text sx={{ opacity: 0.6, textAlign: "center" }}>Waiting for server…</Text>
      )}
    </Flex>
  );
};

/** Wifi icon right of the music disc; click for snapshot gaps, round trips and server tick health. */
export const NetStatsButton = () => {
  const { isConnected } = useAppContext();
  const [open, setOpen] = useState(false);
  const stats = useNetStats(open ? 250 : 1000);
  const verdict = judge(stats);
  return (
    <Box sx={{ position: "relative" }}>
      <Box sx={GLASS_PILL}>
        <DiscButton label="Network stats" onClick={() => setOpen(!open)}>
          <SignalIcon verdict={verdict} isConnected={isConnected} />
        </DiscButton>
      </Box>
      {open && <NetStatsPanel stats={stats} verdict={verdict} />}
    </Box>
  );
};
