import { useState } from "react";
import { Textarea } from "theme-ui";
import { Button, Field, FieldHint, Flex } from "@/ui";
import type { StampPlacement } from "./map-stamps";
import type { TerrainGrid } from "./map-terrain";

const TEXTAREA_SX = {
  color: "text",
  fontFamily: "body",
  resize: "vertical",
  /* Theme UI grows textareas to fit their text, which would ignore `rows`. */
  fieldSizing: "fixed",
} as const;

interface MapResult {
  grid: TerrainGrid;
  stamps: StampPlacement[];
  notes: string;
}

/** Asks Claude for a new map, or to revise the current grid and stamps. */
export const MapPromptPanel = ({
  request: { width, height, grid, stamps },
  onResult,
  onError,
}: {
  request: { width: number; height: number; grid: TerrainGrid; stamps: StampPlacement[] };
  onResult: (result: MapResult) => void;
  onError: (message: string) => void;
}) => {
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");

  const askClaude = async (revise: boolean) => {
    setBusy(true);
    onError("");
    try {
      const response = await fetch("/api/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction,
          width,
          height,
          grid: revise ? grid : undefined,
          stamps: revise ? stamps : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onResult(result);
      setNotes(result.notes);
    } catch (failure) {
      onError(failure instanceof Error ? failure.message : "Claude failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Field label="Describe the map">
        <Textarea
          aria-label="Describe the map"
          rows={5}
          value={instruction}
          placeholder="A lake in the north-east with a sandy beach, a winding path from the west edge to the south edge, dark grass meadows..."
          onChange={(event) => setInstruction(event.target.value)}
          variant="forms.input"
          sx={TEXTAREA_SX}
        />
      </Field>
      <Flex sx={{ gap: 2 }}>
        <Button
          variant="control"
          disabled={busy || !instruction.trim()}
          onClick={() => askClaude(false)}
        >
          {busy ? "Thinking…" : "New map"}
        </Button>
        <Button
          variant="control"
          disabled={busy || !instruction.trim()}
          onClick={() => askClaude(true)}
        >
          Revise this map
        </Button>
      </Flex>
      {busy && <FieldHint>Claude Code is working; this takes a minute or so.</FieldHint>}
      {notes && <FieldHint>{notes}</FieldHint>}
    </>
  );
};
