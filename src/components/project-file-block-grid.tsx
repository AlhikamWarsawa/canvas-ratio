"use client";

import type {
  ProjectFile,
  ProjectFileProgress,
} from "@/lib/project-files";
import {
  PROJECT_FILE_COMPLETED_COLOR,
  PROJECT_FILE_DAILY_RECOMMENDED_COLOR,
  PROJECT_FILE_WEEKLY_RECOMMENDED_COLOR,
  getReadableTextColor,
  type ProjectFileRecommendationMode,
} from "@/lib/project-files";

type ProjectFileBlockGridProps = {
  projectFile: ProjectFile;
  progress: ProjectFileProgress;
  recommendationMode: ProjectFileRecommendationMode;
  onToggleBlock: (blockIndex: number) => void;
};

export function ProjectFileBlockGrid({
  projectFile,
  progress,
  recommendationMode,
  onToggleBlock,
}: ProjectFileBlockGridProps) {
  const recommendedIndexes =
    recommendationMode === "weekly"
      ? progress.weekRecommendedBlockIndexes
      : progress.todayRecommendedBlockIndexes;
  const recommendedBlocks = new Set(recommendedIndexes);
  const recommendedColor =
    recommendationMode === "weekly"
      ? PROJECT_FILE_WEEKLY_RECOMMENDED_COLOR
      : PROJECT_FILE_DAILY_RECOMMENDED_COLOR;
  const recommendedLabel =
    recommendationMode === "weekly" ? "Recommended weekly" : "Recommended today";
  const completedTextColor = getReadableTextColor(PROJECT_FILE_COMPLETED_COLOR);

  return (
    <section className="rounded-lg border-2 border-[#1A1A1A] bg-white p-4 shadow-[4px_4px_0_#1A1A1A]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-[#2F5FBF]">
            Progress Blocks
          </p>
          <h2 className="mt-1 text-2xl font-black">
            {projectFile.totalTarget} {projectFile.unitName}
          </h2>
        </div>
        <span
          className="w-fit border-2 border-[#1A1A1A] px-3 py-1 text-sm font-black"
          style={{ backgroundColor: recommendedColor }}
        >
          Tap to complete
        </span>
      </div>

      <div
        className="mt-4 grid gap-2"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(2.25rem, 1fr))",
        }}
      >
        {projectFile.blocks.map((block) => {
          const recommended = recommendedBlocks.has(block.index);

          return (
            <button
              key={block.index}
              type="button"
              aria-pressed={block.completed}
              aria-label={`${projectFile.unitName} ${block.index + 1}, ${
                block.completed ? "completed" : "incomplete"
              }`}
              title={
                block.completed
                  ? `${projectFile.unitName} ${block.index + 1} completed`
                  : `${projectFile.unitName} ${block.index + 1}`
              }
              disabled={block.completed}
              onClick={() => onToggleBlock(block.index)}
              className="aspect-square min-h-9 border-2 border-[#1A1A1A] text-[10px] font-black leading-none transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1A1A1A] focus:outline-none focus:ring-4 focus:ring-[#6FB6FF] disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              style={{
                backgroundColor: block.completed
                  ? PROJECT_FILE_COMPLETED_COLOR
                  : recommended
                    ? recommendedColor
                    : "#FFFFFF",
                color: block.completed ? completedTextColor : "#1A1A1A",
              }}
            >
              {block.index + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
        <LegendChip color={PROJECT_FILE_COMPLETED_COLOR} label="Completed" />
        <LegendChip color={recommendedColor} label={recommendedLabel} />
        <LegendChip color="#FFFFFF" label="Remaining" />
      </div>
    </section>
  );
}

function LegendChip({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 border-2 border-[#1A1A1A] bg-[#FBFBF7] px-2 py-1">
      <span
        className="h-3 w-3 border-2 border-[#1A1A1A]"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
