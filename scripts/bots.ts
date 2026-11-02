/**
 * Runs agent scenarios: code-driven players that log in and play like real clients.
 *
 *   npm run bots                    every scenario
 *   npm run bots -- party combat    just these
 *   npm run bots -- --near Trevor   bring the bots to your character so you can watch
 *   npm run bots -- --local         always use a fresh in-process server
 *   npm run bots -- --residents 3   leave 3 residents living in the world until Ctrl-C
 *
 * With `npm run dev` up (and ENABLE_CHEATS=true), the bots join that server, so they show up in
 * your game. Otherwise a server starts in this process just for the run.
 */
import net from "node:net";
import { SCENARIOS, runScenario, type Scenario } from "@/agents";
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
  const server = useDev ? null : await startLocalServer();
  const url = server?.url ?? devUrl;
  console.log(useDev ? `🤖 Bots joining the dev server at ${url}` : "🤖 Bots on a local server");
  if (useDev && !near) console.log("   (pass --near <your name> to watch them up close)");

  if (residents) {
    const { planner, label } = pickPlanner();
    const living = await startResidents(url, residents, planner);
    console.log(
      `🏡 ${living.names.join(", ")} now live here, deciding with ${label}. Ctrl-C to stop.`,
    );
    process.once("SIGINT", async () => {
      await living.stop();
      server?.close();
      process.exit(0);
    });
    return;
  }

  let failed = 0;
  for (const scenario of chosen) {
    const result = await runScenario(scenario, {
      join: (name, charClass) => joinTestAgent(url, name, charClass),
      clock: realClock,
      near,
      print: (line) => console.log(line),
    });
    const issue = scenario.knownIssue ? ` (known issue #${scenario.knownIssue})` : "";
    if (result.passed) {
      console.log(issue ? `  ✓ passes now: close #${scenario.knownIssue}?` : "  ✓ passed");
    } else {
      console.log(`  ✗ failed${issue}`);
      if (!scenario.knownIssue) failed++;
    }
  }

  server?.close();
  console.log(failed ? `\n${failed} scenario(s) failed` : "\nAll scenarios passed");
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
