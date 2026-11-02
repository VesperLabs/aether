/**
 * Runs agent scenarios: code-driven players that log in and play like real clients.
 *
 *   npm run bots                    every scenario
 *   npm run bots -- party combat    just these
 *   npm run bots -- --near Trevor   bring the bots to your character so you can watch
 *   npm run bots -- --local         fast-forward on a simulation even when the dev server is up
 *   npm run bots -- --residents 3   leave 3 residents living in the world until Ctrl-C
 *
 * With `npm run dev` up (and ENABLE_CHEATS=true), agents join that server in real time so you can
 * watch them; the live world can interfere, so that's watch mode, not a test. Otherwise each
 * scenario runs on a fast-forwarded simulation: real maps, no NPCs but what it summons, seeded.
 */
import net from "node:net";
import { Agent, SCENARIOS, runScenario, type Scenario } from "@/agents";
import { createSimulation } from "@/server/sim";
import {
  joinTestAgent,
  pickPlanner,
  realClock,
  startLocalServer,
  startResidents,
} from "@/server/agents";

const ALL: Scenario[] = SCENARIOS;

function parseArgs(argv: string[]) {
  const names: string[] = [];
  let near: string | undefined;
  let local = false;
  let residents = 0;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--near") near = argv[++i];
    else if (argv[i] === "--local") local = true;
    else if (argv[i] === "--residents") residents = Number(argv[++i]) || 1;
    else names.push(argv[i]);
  }
  return { names, near, local, residents };
}

/** Whether something is listening at the url's host and port. */
function isUp(url: string, timeoutMs = 500): Promise<boolean> {
  const { hostname, port } = new URL(url);
  return new Promise((resolve) => {
    const socket = net.connect({ host: hostname, port: Number(port) || 80 });
    const done = (up: boolean) => {
      socket.destroy();
      resolve(up);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

/** Runs a scenario on its own fresh simulation. */
async function simulate(scenario: Scenario, print: (line: string) => void) {
  const sim = await createSimulation({ mapNpcs: scenario.world === "full" });
  try {
    return await sim.run(() =>
      runScenario(scenario, {
        join: (name, charClass) =>
          Agent.join(sim.connect(), { name, charClass, clock: sim.clock, cheats: true }),
        clock: sim.clock,
        print,
      }),
    );
  } finally {
    sim.close();
  }
}

async function main() {
  const { names, near, local, residents } = parseArgs(process.argv.slice(2));
  const unknown = names.filter((n) => !ALL.some((s) => s.name === n));
  if (unknown.length) {
    console.error(`Unknown scenario: ${unknown.join(", ")}. Have: ${ALL.map((s) => s.name)}`);
    process.exit(2);
  }
  const chosen = names.length ? ALL.filter((s) => names.includes(s.name)) : ALL;

  const devUrl = process.env.SERVER_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
  const useDev = !local && (await isUp(devUrl));

  if (residents) {
    /* Residents live in real time, on the dev server or a local one */
    const server = useDev ? null : await startLocalServer();
    const url = server?.url ?? devUrl;
    const { planner, label } = pickPlanner();
    const living = await startResidents(url, residents, planner);
    console.log(`🏡 ${living.names.join(", ")} now live at ${url}, deciding with ${label}.`);
    console.log("   Ctrl-C to stop.");
    process.once("SIGINT", async () => {
      await living.stop();
      server?.close();
      process.exit(0);
    });
    return;
  }

  console.log(
    useDev
      ? `👀 Watch mode: agents join the dev server at ${devUrl} in real time. Your live world can\n` +
          "   interfere (map mobs, players), so failures here aren't test failures. Use --local to test."
      : "🤖 Agents on a fast-forwarded simulation (start npm run dev to watch them instead)",
  );
  if (useDev && !near) console.log("   (pass --near <your name> to watch them up close)");

  let failed = 0;
  for (const scenario of chosen) {
    const print = (line: string) => console.log(line);
    const result = useDev
      ? await runScenario(scenario, {
          join: (name, charClass) => joinTestAgent(devUrl, name, charClass),
          clock: realClock,
          near,
          print,
        })
      : await simulate(scenario, print);
    const issue = scenario.knownIssue ? ` (known issue #${scenario.knownIssue})` : "";
    if (result.passed) {
      console.log(issue ? `  ✓ passes now: close #${scenario.knownIssue}?` : "  ✓ passed");
    } else {
      console.log(`  ✗ failed${issue}`);
      if (!scenario.knownIssue && !useDev) failed++;
    }
  }

  console.log(failed ? `\n${failed} scenario(s) failed` : "\nAll scenarios passed");
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
