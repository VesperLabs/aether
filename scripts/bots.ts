/**
 * Runs agent scenarios: code-driven players that log in and play like real clients.
 *
 *   npm run bots                    every scenario
 *   npm run bots -- party combat    just these
 *   npm run bots -- --near Trevor   bring the bots to your character so you can watch
 *   npm run bots -- --local         fast-forward on a simulation even when the dev server is up
 *   npm run bots -- --wander 3      leave 3 bots wandering the world until Ctrl-C
 *
 * With `npm run dev` up (and ENABLE_CHEATS=true), agents join that server in real time so you can
 * watch them; the live world can interfere, so that's watch mode, not a test. Otherwise each
 * scenario runs on a fast-forwarded simulation: real maps, no NPCs but what it summons, seeded.
 */
import net from "node:net";
import { SCENARIOS, runScenario } from "@/agents";
import { simulateScenario } from "@/server/sim";
import { joinTestAgent, realClock, startLocalServer, startWanderers } from "@/server/agents";

function parseArgs(argv: string[]) {
  const names: string[] = [];
  let near: string | undefined;
  let local = false;
  let wanderers = 0;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--near") near = argv[++i];
    else if (argv[i] === "--local") local = true;
    else if (argv[i] === "--wander") wanderers = Number(argv[++i]) || 1;
    else names.push(argv[i]);
  }
  return { names, near, local, wanderers };
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
  const { names, near, local, wanderers } = parseArgs(process.argv.slice(2));
  const unknown = names.filter((n) => !SCENARIOS.some((s) => s.name === n));
  if (unknown.length) {
    console.error(`Unknown scenario: ${unknown.join(", ")}. Have: ${SCENARIOS.map((s) => s.name)}`);
    process.exit(2);
  }
  const chosen = names.length ? SCENARIOS.filter((s) => names.includes(s.name)) : SCENARIOS;

  const devUrl = process.env.SERVER_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
  const useDev = !local && (await isUp(devUrl));

  if (wanderers) {
    /* Wanderers live in real time, on the dev server or a local one */
    const server = useDev ? null : await startLocalServer();
    const url = server?.url ?? devUrl;
    const living = await startWanderers(url, wanderers);
    console.log(`🏡 ${living.names.join(", ")} now wandering at ${url}.`);
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

  const print = (line: string) => console.log(line);
  let failed = 0;
  for (const scenario of chosen) {
    const result = useDev
      ? await runScenario(scenario, {
          join: (name, charClass) => joinTestAgent(devUrl, name, charClass),
          clock: realClock,
          near,
          print,
        })
      : await simulateScenario(scenario, { print });
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
