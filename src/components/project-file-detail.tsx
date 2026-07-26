"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { InlineMessage } from "@/components/inline-message";
import { ProjectFileBlockGrid } from "@/components/project-file-block-grid";
import { ProjectFileReviewButton } from "@/components/project-file-review-button";
import {
  PROJECT_FILE_DAILY_RECOMMENDED_COLOR,
  PROJECT_FILE_WEEKLY_RECOMMENDED_COLOR,
  buildProjectFileJson,
  calculateProjectFileProgress,
  formatProjectFileRequirement,
  isPartialProjectFileRequirement,
  getReadableTextColor,
  resolveProjectFileProject,
  toggleProjectFileBlock,
  type ProjectFile,
  type ProjectFileRecommendationMode,
} from "@/lib/project-files";
import { getActiveProjects } from "@/lib/settings";
import type { ProjectRecord } from "@/types/canvas";

type ProjectFileDetailProps = {
  projectFile: ProjectFile | null;
  projects: ProjectRecord[];
  recommendationMode: ProjectFileRecommendationMode;
  onRecommendationModeChange?: (
    recommendationMode: ProjectFileRecommendationMode,
  ) => void;
  onUpdateProjectFile: (projectFile: ProjectFile) => void;
  onDeleteProjectFile: (projectFileId: string) => void;
};

const actionButtonClass =
  "min-h-11 border-2 border-[#1A1A1A] bg-[#2F5FBF] px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_#FFD91A] transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-[#6FB6FF]";

export function ProjectFileDetail({
  projectFile,
  projects,
  recommendationMode,
  onRecommendationModeChange,
  onUpdateProjectFile,
  onDeleteProjectFile,
}: ProjectFileDetailProps) {
  const [targetDate, setTargetDate] = useState(projectFile?.targetDate ?? "");
  const [notes, setNotes] = useState(projectFile?.notes ?? "");
  const [saved, setSaved] = useState(false);
  const progress = useMemo(
    () => (projectFile ? calculateProjectFileProgress(projectFile) : null),
    [projectFile],
  );
  const linkedProject = useMemo(
    () => (projectFile ? resolveProjectFileProject(projectFile, projects) : null),
    [projectFile, projects],
  );
  const selectableProjects = useMemo(() => {
    if (!projectFile) {
      return getActiveProjects(projects);
    }

    const activeProjects = getActiveProjects(projects);
    const currentProject = projectFile.projectId
      ? projects.find((project) => project.id === projectFile.projectId)
      : undefined;

    if (
      currentProject &&
      !activeProjects.some((project) => project.id === currentProject.id)
    ) {
      return [...activeProjects, currentProject];
    }

    return activeProjects;
  }, [projectFile, projects]);

  useEffect(() => {
    setTargetDate(projectFile?.targetDate ?? "");
    setNotes(projectFile?.notes ?? "");
    setSaved(false);
  }, [projectFile?.id, projectFile?.targetDate, projectFile?.notes]);

  if (!projectFile || !progress || !linkedProject) {
    return (
      <section className="rounded-lg border-2 border-[#1A1A1A] bg-white p-6 shadow-[4px_4px_0_#1A1A1A]">
        <p className="text-xs font-black uppercase text-[#2F5FBF]">
          Project File
        </p>
        <h2 className="mt-1 text-2xl font-black">Select a project file</h2>
        <p className="mt-2 text-sm font-bold text-[#4a4a4a]">
          Create or import a project file, then use the block grid to track
          long-term progress.
        </p>
      </section>
    );
  }

  function handleToggleBlock(blockIndex: number) {
    if (!projectFile) {
      return;
    }

    const nextProjectFile = toggleProjectFileBlock(projectFile, blockIndex);

    if (nextProjectFile === projectFile) {
      return;
    }

    onUpdateProjectFile(nextProjectFile);
  }

  function handleSavePlanning(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!projectFile) {
      return;
    }

    onUpdateProjectFile({
      ...projectFile,
      targetDate,
      notes: notes.trim() || undefined,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  function handleProjectChange(projectId: string) {
    if (!projectFile) {
      return;
    }

    onUpdateProjectFile({
      ...projectFile,
      projectId: projectId || undefined,
    });
  }

  const linkedTextColor = getReadableTextColor(linkedProject.color);
  const requiredRecommendation =
    recommendationMode === "weekly"
      ? progress.requiredThisWeek
      : progress.requiredToday;
  const targetRecommendation =
    recommendationMode === "weekly"
      ? progress.weeklyTargetBase
      : progress.todayTargetBase;
  const completedRecommendation =
    recommendationMode === "weekly"
      ? progress.completedThisWeek
      : progress.completedToday;
  const requiredRecommendationValue =
    formatProjectFileRequirement(requiredRecommendation);
  const recommendationPeriodLabel =
    recommendationMode === "weekly" ? "weekly" : "today";
  const recommendationPeriodNoun =
    recommendationMode === "weekly" ? "week" : "today";

  return (
    <div className="grid min-w-0 gap-4">
      <section className="rounded-lg border-2 border-[#1A1A1A] bg-white p-5 shadow-[5px_5px_0_#1A1A1A]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-[#2F5FBF]">
              Active Project File
            </p>
            <h1 className="mt-1 break-words text-3xl font-black sm:text-4xl">
              {projectFile.projectName}
            </h1>
            <LinkedProjectBadge
              name={linkedProject.name}
              color={linkedProject.color}
              textColor={linkedTextColor}
              archived={linkedProject.archived}
              snapshotName={linkedProject.snapshotName}
            />
            {projectFile.notes ? (
              <p className="mt-2 break-words text-sm font-bold text-[#4a4a4a]">
                {projectFile.notes}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <RecommendationModeButton
              label="Daily"
              active={recommendationMode === "daily"}
              onClick={() => onRecommendationModeChange?.("daily")}
            />
            <RecommendationModeButton
              label="Weekly"
              active={recommendationMode === "weekly"}
              onClick={() => onRecommendationModeChange?.("weekly")}
            />
            <ProjectFileReviewButton
              projectFile={projectFile}
              projects={projects}
              className={actionButtonClass}
            />
            <button
              type="button"
              onClick={() => downloadProjectFileJson(projectFile, projects)}
              className="min-h-11 border-2 border-[#1A1A1A] bg-[#FFD91A] px-4 py-2 text-sm font-black shadow-[3px_3px_0_#1A1A1A] transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-[#6FB6FF]"
            >
              Export JSON
            </button>
          </div>
        </div>

        <div className="mt-5 h-5 border-2 border-[#1A1A1A] bg-[#FBFBF7]">
          <div
            className="h-full transition-[width]"
            style={{
              width: `${progress.percentComplete}%`,
              backgroundColor: linkedProject.color,
            }}
            aria-hidden="true"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label={`Required ${recommendationPeriodLabel}`}
            value={formatProjectFileRequirement(requiredRecommendation)}
            detail={
              progress.remaining === 0
                ? "Completed."
                : `Target ${formatProjectFileRequirement(targetRecommendation)}`
            }
          />
          <MetricCard
            label={`Completed ${recommendationPeriodNoun}`}
            value={String(completedRecommendation)}
            detail={projectFile.unitName}
          />
          <MetricCard
            label="Remaining"
            value={String(progress.remaining)}
            detail={projectFile.unitName}
          />
          <MetricCard
            label="Days left"
            value={String(progress.daysLeftInclusive)}
            detail={`Target ${projectFile.targetDate}`}
          />
          <MetricCard
            label="Progress"
            value={`${progress.percentComplete}%`}
            detail={`${progress.completed}/${projectFile.totalTarget}`}
          />
        </div>

        {progress.remaining === 0 ? (
          <InlineMessage type="info" className="mt-4">
            Completed.
          </InlineMessage>
        ) : progress.targetDatePassed ? (
          <InlineMessage type="warning" className="mt-4">
            Target date has passed.{" "}
            {recommendationMode === "weekly"
              ? "Weekly required work uses 1 week"
              : "Today’s required work uses 1 day"}{" "}
            so the number stays practical.
          </InlineMessage>
        ) : requiredRecommendation > 0 ? (
          <InlineMessage type="info" className="mt-4">
            Do{" "}
            {isPartialProjectFileRequirement(requiredRecommendation)
              ? requiredRecommendationValue
              : `${requiredRecommendationValue} more ${projectFile.unitName}`}{" "}
            {recommendationMode === "weekly" ? "this week" : "today"} to match
            this plan.
          </InlineMessage>
        ) : (
          <InlineMessage type="info" className="mt-4">
            {recommendationMode === "weekly" ? "This week’s" : "Today’s"}{" "}
            recommended work is covered.
          </InlineMessage>
        )}
      </section>

      <ProjectFileBlockGrid
        projectFile={projectFile}
        progress={progress}
        recommendationMode={recommendationMode}
        onToggleBlock={handleToggleBlock}
      />

      <details>
        <summary className="min-h-12 cursor-pointer border-2 border-[#1A1A1A] bg-white px-4 py-3 text-base font-black shadow-[4px_4px_0_#1A1A1A] focus:outline-none focus:ring-4 focus:ring-[#6FB6FF]">
          Project File Settings
        </summary>
        <div className="mt-4 grid gap-4 rounded-lg border-2 border-[#1A1A1A] bg-white p-4 shadow-[4px_4px_0_#1A1A1A]">
          <form
            onSubmit={handleSavePlanning}
            className="grid gap-4 md:grid-cols-2"
          >
            <label className="block md:col-span-2">
              <span className="text-sm font-black uppercase text-[#2F5FBF]">
                Linked project
              </span>
              <select
                value={projectFile.projectId ?? ""}
                onChange={(event) =>
                  handleProjectChange(event.currentTarget.value)
                }
                className="mt-2 min-h-11 w-full border-2 border-[#1A1A1A] bg-white px-3 py-2 text-base font-bold transition focus:outline-none focus:ring-4 focus:ring-[#6FB6FF]"
              >
                <option value="">No linked project</option>
                {selectableProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                    {project.archived ? " / archived" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-black uppercase text-[#2F5FBF]">
                Target date
              </span>
              <input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.currentTarget.value)}
                className="mt-2 min-h-11 w-full border-2 border-[#1A1A1A] bg-white px-3 py-2 text-base font-bold transition focus:outline-none focus:ring-4 focus:ring-[#6FB6FF]"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-black uppercase text-[#2F5FBF]">
                Notes
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.currentTarget.value)}
                rows={3}
                className="mt-2 w-full resize-none border-2 border-[#1A1A1A] bg-white px-3 py-2 text-base font-bold transition focus:outline-none focus:ring-4 focus:ring-[#6FB6FF]"
              />
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button type="submit" className={actionButtonClass}>
                Save Project File
              </button>
              <button
                type="button"
                onClick={() => onDeleteProjectFile(projectFile.id)}
                className="min-h-11 border-2 border-[#1A1A1A] bg-[#D62828] px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_#1A1A1A] transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-[#6FB6FF]"
              >
                Delete Project File
              </button>
            </div>
          </form>

          {saved ? (
            <InlineMessage type="info">
              Project file saved.
            </InlineMessage>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function LinkedProjectBadge({
  name,
  color,
  textColor,
  archived,
  snapshotName,
}: {
  name: string;
  color: string;
  textColor: string;
  archived: boolean;
  snapshotName?: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span
        className="inline-flex min-h-8 max-w-full items-center gap-2 border-2 border-[#1A1A1A] px-3 py-1 text-sm font-black"
        style={{ backgroundColor: color, color: textColor }}
        title={
          snapshotName && name === "Unlinked project"
            ? `Previously linked to ${snapshotName}`
            : name
        }
      >
        <span
          className="h-3 w-3 shrink-0 rounded-full border border-current bg-current"
          aria-hidden="true"
        />
        <span className="min-w-0 break-words">{name}</span>
      </span>
      {archived ? (
        <span className="border-2 border-[#1A1A1A] bg-[#EFEDE4] px-2 py-1 text-xs font-black">
          Archived
        </span>
      ) : null}
    </div>
  );
}

function RecommendationModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const activeColor =
    label === "Weekly"
      ? PROJECT_FILE_WEEKLY_RECOMMENDED_COLOR
      : PROJECT_FILE_DAILY_RECOMMENDED_COLOR;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 border-2 border-[#1A1A1A] px-4 py-2 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-[#6FB6FF] ${
        active
          ? "shadow-[3px_3px_0_#1A1A1A]"
          : "bg-white hover:bg-[#F7F8F3]"
      }`}
      style={active ? { backgroundColor: activeColor } : undefined}
    >
      {label}
    </button>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border-2 border-[#1A1A1A] bg-[#FBFBF7] p-3">
      <p className="text-xs font-black uppercase text-[#2F5FBF]">{label}</p>
      <p className="mt-1 break-words text-2xl font-black">{value}</p>
      <p className="mt-1 break-words text-xs font-bold text-[#4a4a4a]">
        {detail}
      </p>
    </div>
  );
}

function downloadProjectFileJson(
  projectFile: ProjectFile,
  projects: ProjectRecord[],
) {
  const json = buildProjectFileJson(projectFile, projects);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `canvas-ratio-project-file-${slugify(
    projectFile.projectName,
  )}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "project-file"
  );
}
