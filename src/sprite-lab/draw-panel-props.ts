import type { PointerEvent } from "react";
import type { CorePromptId } from "./core-prompts";
import type { ActiveDraw, Frame } from "./lab-state";
import type { HumanLayer, Sheet } from "./sheets";
import type { DragItem } from "./use-candidate-drag";
import type { PendingCandidate } from "./use-pending-candidates";

export interface DrawPanelProps {
  cell: number;
  target: Sheet;
  /** The atlas, which is the body under a layer. */
  base: Sheet;
  baseHidden: boolean;
  frame: Frame;
  model: string;
  prompt: string;
  onModel: (model: string) => void;
  /** The open tab's core prompt, when edited. */
  core: string;
  promptTab: CorePromptId;
  onPrompt: (prompt: string) => void;
  wearableSheet: string;
  onCore: (core: string) => void;
  onPromptTab: (tab: CorePromptId) => void;
  onWearableSheet: (texture: string) => void;
  /** The character's worn sheets, shown around the edited one. */
  layers: { layer: HumanLayer; sheet: Sheet }[];
  pending: PendingCandidate[];
  /** Every frame being drawn, from `getFrameKey`. */
  drawingKeys: string[];
  onDrawStart: (draw: ActiveDraw) => void;
  onDrawEnd: (draw: ActiveDraw) => void;
  /** Changes when draws were added from outside this panel. */
  candidateRevision: number;
  /** Called whenever a frame's open draw may have changed. */
  onCandidateChanged: () => void;
  onCandidateDragStart: (item: DragItem, e: PointerEvent) => void;
  onClose: () => void;
}
