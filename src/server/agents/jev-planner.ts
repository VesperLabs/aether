import type { Planner } from "@/agents";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

interface ChoiceAnswer {
  choice: string;
  confidence: number;
}

/**
 * A planner backed by Jev, TypeSafe's fast decision model (https://docs.typesafe.ai). One Choice
 * question per plan: the situation is the `state`, each option a `criteria` entry.
 */
export function createJevPlanner(apiKey: string, model = "jev-latest"): Planner {
  return async (situation, question, options) => {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        state: situation,
        questions: { next: { type: "choice", instructions: question, criteria: options } },
      }),
    });
    if (!response.ok) throw new Error(`Jev answered ${response.status}: ${await response.text()}`);
    const { answers } = (await response.json()) as { answers: { next: ChoiceAnswer } };
    return { choice: answers.next.choice, confidence: answers.next.confidence };
  };
}
