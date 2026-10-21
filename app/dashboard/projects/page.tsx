"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CustomerSidebar from "@/components/CustomerSidebar";
import DraftCardPreview from "@/components/DraftCardPreview";

interface ProjectItem {
  id: string;
  name: string;
  category: string;
  thumbnail?: string;
  side: "front" | "back";
  specs: {
    shape: string;
    backside: string;
    finish: string;
    orientation: string;
    paperStock: string;
    thickness: string;
    corners: string;
  };
  designData?: any;
}

const DEFAULT_PROJECTS: ProjectItem[] = [
  {
    id: "proj-1",
    name: "Standard Business Cards",
    category: "Business Cards",
    side: "front",
    specs: {
      shape: "Standard",
      backside: "Blank",
      finish: "None",
      orientation: "Horizontal",
      paperStock: "Glossy",
      thickness: "Standard",
      corners: "Rounded",
    },
  },
  {
    id: "proj-2",
    name: "Standard Business Cards",
    category: "Business Cards",
    side: "front",
    specs: {
      shape: "Standard",
      backside: "Blank",
      finish: "None",
      orientation: "Horizontal",
      paperStock: "Glossy",
      thickness: "Standard",
      corners: "Rounded",
    },
  },
  {
    id: "proj-3",
    name: "Standard Business Cards",
    category: "Business Cards",
    side: "front",
    specs: {
      shape: "Standard",
      backside: "Blank",
      finish: "None",
      orientation: "Horizontal",
      paperStock: "Glossy",
      thickness: "Standard",
      corners: "Rounded",
    },
  },
];

export default function RecentProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>(DEFAULT_PROJECTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/designs")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.designs) && data.designs.length > 0) {
          const liveProjects: ProjectItem[] = data.designs.map((d: any, idx: number) => {
            const rawSpecs = (d.designData as any)?.specs || {};
            return {
              id: d._id || `proj-${idx + 1}`,
              name: d.name || "Standard Business Cards",
              category: (d.designData as any)?.category || "Business Cards",
              thumbnail: d.thumbnail,
              side: "front",
              specs: {
                shape: rawSpecs.shape || "Standard",
                backside: rawSpecs.backside || "Blank",
                finish: rawSpecs.finish || "None",
                orientation: rawSpecs.orientation || "Horizontal",
                paperStock: rawSpecs.paperStock || "Glossy",
                thickness: rawSpecs.thickness || "Standard",
                corners: rawSpecs.corners || "Rounded",
              },
              designData: d.designData,
            };
          });

          // If fewer than 3, pad with the default items to maintain the reference UI density
          const combined = [...liveProjects];
          while (combined.length < 3) {
            combined.push({
              id: `default-${combined.length + 1}`,
              name: "Standard Business Cards",
              category: "Business Cards",
              side: "front",
              specs: {
                shape: "Standard",
                backside: "Blank",
                finish: "None",
                orientation: "Horizontal",
                paperStock: "Glossy",
                thickness: "Standard",
                corners: "Rounded",
              },
            });
          }
          setProjects(combined);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleSide = (id: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, side: p.side === "front" ? "back" : "front" } : p))
    );
  };

  return (
    <div className="w-full bg-white min-h-[calc(100vh-160px)] font-sans">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col md:flex-row items-start gap-8 lg:gap-12">
          {/* Uniform Left Customer Sidebar */}
          <CustomerSidebar activeItem="Recent Projects" />

          {/* Right Main Content */}
          <main className="flex-1 w-full min-w-0">
            <h1 className="text-2xl sm:text-[32px] font-extrabold text-zinc-900 tracking-tight mb-6 sm:mb-8">
              Your Recent Projects
            </h1>

            {/* List of Recent Project Cards */}
            <div className="space-y-6">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="bg-white rounded-2xl border border-zinc-300/80 p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 transition-all hover:border-zinc-400/80"
                >
                  {/* Left: Card Frame Preview with Slider Arrows */}
                  <div className="relative w-64 sm:w-72 h-44 sm:h-48 rounded-xl bg-[#E2E2E2] flex items-center justify-center p-3 flex-shrink-0 select-none overflow-hidden group">
                    {/* Left Carousel Arrow */}
                    <button
                      type="button"
                      onClick={() => toggleSide(proj.id)}
                      aria-label="Previous side"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-lg bg-white/95 hover:bg-white border border-zinc-300 text-zinc-500 hover:text-zinc-900 flex items-center justify-center shadow-xs transition-all cursor-pointer"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    {/* Card Inner Rect */}
                    <div className="w-44 sm:w-48 h-28 sm:h-30 bg-white rounded-md shadow-md border border-zinc-200/60 flex items-center justify-center p-3 relative transition-all duration-300">
                      {proj.side === "front" ? (
                        <div className="w-full h-full flex flex-col justify-between border border-dashed border-zinc-200/80 rounded p-2 bg-gradient-to-br from-white to-zinc-50/50">
                          <div className="w-8 h-1.5 bg-zinc-300 rounded" />
                          <div className="space-y-1">
                            <div className="w-16 h-2 bg-zinc-400 rounded" />
                            <div className="w-24 h-1.5 bg-zinc-200 rounded" />
                          </div>
                          <div className="w-12 h-1 bg-zinc-200 rounded self-end" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center border border-dashed border-zinc-200/80 rounded bg-zinc-50/60">
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                            Back Side
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right Carousel Arrow */}
                    <button
                      type="button"
                      onClick={() => toggleSide(proj.id)}
                      aria-label="Next side"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-lg bg-white/95 hover:bg-white border border-zinc-300 text-zinc-500 hover:text-zinc-900 flex items-center justify-center shadow-xs transition-all cursor-pointer"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Right: Project Title & Specifications */}
                  <div className="flex-1 w-full min-w-0">
                    <h2 className="text-xl sm:text-[22px] font-bold text-zinc-900 mb-1 leading-snug">
                      {proj.name}
                    </h2>

                    <p className="text-sm sm:text-base font-bold text-zinc-800 mb-3">
                      Your Preference Selection
                    </p>

                    {/* Specs List */}
                    <div className="text-xs sm:text-[13px] text-zinc-500 space-y-1 leading-relaxed">
                      <p>Shape: {proj.specs.shape}</p>
                      <p>Backside: {proj.specs.backside}</p>
                      <p>Finish: {proj.specs.finish}</p>
                      <p>Orientation: {proj.specs.orientation}</p>
                      <p>Paper Stock: {proj.specs.paperStock}</p>
                      <p>Paper Thickness: {proj.specs.thickness}</p>
                      <p>Corners: {proj.specs.corners}</p>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex items-center gap-3">
                      <Link
                        href={
                          proj.id.startsWith("proj-") || proj.id.startsWith("default-")
                            ? "/browsedesigns"
                            : `/browsedesigns?designId=${proj.id}`
                        }
                        className="px-6 py-2.5 bg-[#2196D2] hover:bg-[#1B85BD] text-white font-semibold text-xs sm:text-sm rounded-full shadow-sm transition-all"
                      >
                        Open in Editor →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
