import { useEffect, useMemo, useState } from "react";
import { Button, Flex, loadSheet, Select, Text } from "@/ui";
import { DRAW_MODELS, HAND_DRAWN_MODEL } from "./draw-models";
import { fillPrompt, fillWearablePrompt } from "./draw-prompts";
import { drawFrame } from "./draw-frame";
import { getCorePrompt } from "./core-prompts";
import type { DrawPanelProps } from "./draw-panel-props";
import { FramePreview } from "./frame-preview";
import { FrameEditor } from "./frame-editor";
import { blankCanvas, cropFrame, paintFrameStack, useFrameStack, keepRedrawn } from "./frame-stack";
import { GenerationList } from "./generation-list";
import {
  copyGeneration,
  getGenerationUrl,
  listGenerations,
  loadGenerationCanvas,
  replaceGenerationImage,
  saveGeneration,
  type Generation,
} from "./generations-api";
import type { Frame } from "./lab-state";
import {
  clearOpenCandidate,
  getFrameKey,
  getOpenCandidate,
  setOpenCandidate,
} from "./open-candidates";
import { NudgePanel } from "./nudge-panel";
import { PromptFields } from "./prompt-fields";
import { PromptWindow } from "./prompt-window";
import { WearableWindow, type WearableInputs } from "./wearable-window";
import { FloatingPanel } from "./floating-panel";
import { WINDOW_WIDTH } from "./window-layout";
import { getSheetGender } from "./sheets";
import { useOriginalEdit } from "./use-original-edit";

/**
 * The drawing being compared, and the frame of the sheet it belongs to. `editKey` keeps the tools'
 * undo history when an edited original becomes this candidate.
 */
type Result = { canvas: HTMLCanvasElement; id: string; frameKey: string; editKey?: string };

/** Shown for a selected frame: redraw it in the chosen sheet, and manage what's been drawn. */
export const DrawPanel = ({
  cell,
  target,
  base,
  baseHidden,
  frame,
  model,
  prompt,
  promptTab,
  wearableSheet,
  onModel,
  onPrompt,
  onPromptTab,
  onWearableSheet,
  layers,
  pending,
  drawingKeys,
  onDrawStart,
  onDrawEnd,
  candidateRevision,
  onCandidateChanged,
  onCandidateDragStart,
  onClose,
}: DrawPanelProps) => {
  const isLayer = target.src !== base.src;
  const core = getCorePrompt(promptTab).prompt;
  const [error, setError] = useState("");
  const [targetImage, setTargetImage] = useState<HTMLCanvasElement | null>(null);
  const [result, setResult] = useState<Result>();
  /* Only shown on its own frame. */
  const frameKey = getFrameKey(target.src, frame);
  const drawing = drawingKeys.includes(frameKey);
  const shown = result?.frameKey === frameKey ? result : undefined;
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [nudging, setNudging] = useState(false);
  const stack = useFrameStack(base, layers, pending).filter(
    ({ layer }) => !(baseHidden && isLayer && layer === "skin"),
  );
  const frameGenerations = generations.filter(
    (generation) =>
      generation.src === target.src &&
      generation.frame.column === frame.column &&
      generation.frame.row === frame.row,
  );
  const originalUrl = useMemo(
    () => (targetImage ? cropFrame(targetImage, frame, cell).toDataURL("image/png") : undefined),
    [targetImage, frame, cell],
  );

  const refreshGenerations = () => {
    listGenerations().then(setGenerations);
  };

  useEffect(refreshGenerations, [candidateRevision]);

  useEffect(() => {
    let live = true;
    loadSheet(target).then((image) => {
      if (live) setTargetImage(image);
    });
    return () => {
      live = false;
    };
  }, [target]);

  const loadCandidate = (generation: Generation) => loadGenerationCanvas(generation, cell);

  const handleSelect = async (generation: Generation) => {
    setOpenCandidate(frameKey, generation.id);
    const canvas = await loadCandidate(generation);
    setResult({ canvas, id: generation.id, frameKey });
    onCandidateChanged();
  };

  const handleSelectOriginal = () => {
    clearOpenCandidate(frameKey);
    setResult(undefined);
    onCandidateChanged();
  };

  /* Reopens what was left open here, once the frame changes or its draws arrive. */
  useEffect(() => {
    const openId = getOpenCandidate(frameKey);
    const generation = frameGenerations.find(({ id }) => id === openId);
    if (!generation || generation.id === result?.id) return;
    let live = true;
    loadCandidate(generation).then((canvas) => {
      if (live) setResult({ canvas, id: generation.id, frameKey });
    });
    return () => {
      live = false;
    };
  }, [frameKey, generations]);

  const renderFrame = (
    ctx: CanvasRenderingContext2D,
    drawTarget: (ctx: CanvasRenderingContext2D) => void,
  ) => {
    const shownStack =
      promptTab === "quarterTurn" ? keepRedrawn(stack, frame, target.src, pending) : stack;
    if (shownStack.length) paintFrameStack(ctx, shownStack, frame, cell, target.src, drawTarget);
    else drawTarget(ctx);
  };

  const handleEdited = () => {
    refreshGenerations();
    onCandidateChanged();
  };

  const openNewCandidate = (
    generation: Generation,
    canvas: HTMLCanvasElement,
    editKey?: string,
  ) => {
    setOpenCandidate(frameKey, generation.id);
    setResult({ canvas, id: generation.id, frameKey, editKey });
    handleEdited();
  };

  const originalKey = `original:${frameKey}`;
  const original = useOriginalEdit({
    target,
    targetImage,
    frame,
    cell,
    originalOpen: !shown,
    onCreated: (generation, canvas) => openNewCandidate(generation, canvas, originalKey),
  });
  const edited = shown
    ? {
        canvas: shown.canvas,
        frameId: shown.editKey ?? shown.id,
        saveImage: (canvas: HTMLCanvasElement) => replaceGenerationImage({ id: shown.id }, canvas),
      }
    : original.canvas && {
        canvas: original.canvas,
        frameId: originalKey,
        saveImage: original.saveImage,
      };

  const copyOriginal = (canvas: HTMLCanvasElement) => async (to: Frame) => {
    const { generation } = await saveGeneration(canvas, {
      sheet: target,
      frame: to,
      model: HAND_DRAWN_MODEL,
      prompt: "",
    });
    return generation as Generation;
  };

  const handleDuplicateOriginal = async () => {
    if (!targetImage) return;
    const canvas = cropFrame(targetImage, frame, cell);
    try {
      openNewCandidate(await copyOriginal(canvas)(frame), canvas);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not copy the original");
    }
  };

  const handleDuplicate = async ({ id }: Generation) => {
    try {
      const copy = await copyGeneration(id, frame);
      openNewCandidate(copy, await loadCandidate(copy));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not copy the candidate");
    }
  };

  const handleFlipped = async (generation: Generation) => {
    refreshGenerations();
    onCandidateChanged();
    if (generation.id !== result?.id) return;
    const canvas = await loadCandidate(generation);
    setResult({ ...result, canvas });
  };

  const handleDeleted = ({ id }: Generation) => {
    if (id === result?.id) setResult(undefined);
    refreshGenerations();
    onCandidateChanged();
  };

  const handleDraw = async (wearable?: WearableInputs) => {
    if (!targetImage) return;
    const draw = { src: target.src, frame };
    onDrawStart(draw);
    setError("");
    try {
      const fullPrompt = wearable
        ? fillWearablePrompt(frame, prompt, wearable.layer)
        : fillPrompt(core, frame, prompt);
      const drawn = await drawFrame({
        target: targetImage,
        frame,
        /* Whatever is open is what gets redrawn, so a good draw can be refined. */
        /* A wearable works on the open candidate, or starts from nothing. */
        source: shown?.canvas ?? (wearable ? blankCanvas(cell) : undefined),
        views: wearable?.views,
        wornViews: wearable?.wornViews,
        fitBody: wearable?.body,
        hands: wearable?.hands,
        cell,
        model,
        prompt: fullPrompt,
      });
      /* Every draw is paid for, so it's kept before anyone decides what to do with it. */
      const { generation } = await saveGeneration(drawn, {
        sheet: target,
        frame,
        model,
        prompt,
        fullPrompt,
      });
      setOpenCandidate(frameKey, generation.id);
      setResult({ canvas: drawn, id: generation.id, frameKey });
      refreshGenerations();
      onCandidateChanged();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Draw failed");
    }
    onDrawEnd(draw);
  };

  return (
    <FloatingPanel
      id="draw"
      title={
        <Text sx={{ fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis" }}>
          {target.texture}
        </Text>
      }
      width={WINDOW_WIDTH}
      start={{ x: window.innerWidth - WINDOW_WIDTH - 16, y: 16 }}
      onClose={onClose}
    >
      <Flex sx={{ gap: 2, flexShrink: 0 }}>
        <PromptWindow>
          <Select label="Model" value={model} options={DRAW_MODELS} onChange={onModel} />
          <PromptFields
            core={core}
            tab={promptTab}
            onTab={onPromptTab}
            prompt={prompt}
            onPrompt={onPrompt}
          />
          <Button
            variant="wood"
            disabled={drawing || !targetImage}
            onClick={() => handleDraw()}
            sx={{ justifyContent: "center", flexShrink: 0 }}
          >
            {drawing ? "Drawing..." : "Draw"}
          </Button>
        </PromptWindow>
        {isLayer && (
          <WearableWindow
            cell={cell}
            frame={frame}
            stack={stack}
            target={target}
            source={shown?.canvas ?? blankCanvas(cell)}
            sheetTexture={wearableSheet}
            gender={getSheetGender(
              layers.find(({ layer }) => layer === "chest")?.sheet.texture ?? "",
            )}
            pending={pending}
            model={model}
            prompt={prompt}
            drawing={drawing}
            onSheet={onWearableSheet}
            onModel={onModel}
            onPrompt={onPrompt}
            onDraw={handleDraw}
          />
        )}
      </Flex>
      {error && <Text sx={{ fontSize: 1, color: "danger" }}>{error}</Text>}
      <FramePreview
        cell={cell}
        label="Preview"
        paint={(ctx) =>
          renderFrame(ctx, (target2d) => {
            if (shown) {
              target2d.drawImage(shown.canvas, 0, 0);
            } else if (targetImage) {
              const [x, y] = [frame.column * cell, frame.row * cell];
              target2d.drawImage(targetImage, x, y, cell, cell, 0, 0, cell, cell);
            }
          })
        }
      >
        {(expanded) =>
          edited && (
            <FrameEditor
              {...edited}
              active={expanded}
              renderFrame={(ctx, draw) =>
                renderFrame(ctx, (target2d) => target2d.drawImage(draw, 0, 0))
              }
              onSaved={handleEdited}
              onError={setError}
            />
          )
        }
      </FramePreview>
      <GenerationList
        generations={frameGenerations}
        selectedId={shown?.id}
        originalUrl={originalUrl}
        onSelect={handleSelect}
        onSelectOriginal={handleSelectOriginal}
        onDragStart={(generation, e, merge) =>
          onCandidateDragStart(
            {
              url: getGenerationUrl(generation),
              frame: generation.frame,
              copyTo: (to) => copyGeneration(generation.id, to),
              merge,
            },
            e,
          )
        }
        onDragOriginal={(e) => {
          if (!targetImage || !originalUrl) return;
          const canvas = cropFrame(targetImage, frame, cell);
          onCandidateDragStart({ url: originalUrl, frame, copyTo: copyOriginal(canvas) }, e);
        }}
        onDuplicateOriginal={handleDuplicateOriginal}
        onNudgeOriginal={() => setNudging(true)}
        onDuplicate={handleDuplicate}
        onFlipped={handleFlipped}
        onDeleted={handleDeleted}
        onError={setError}
      />
      {nudging && originalUrl && (
        <NudgePanel
          target={target}
          layer={layers.find(({ sheet }) => sheet.src === target.src)?.layer}
          frame={frame}
          cell={cell}
          originalUrl={originalUrl}
          onClose={() => setNudging(false)}
        />
      )}
    </FloatingPanel>
  );
};
