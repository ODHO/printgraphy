"use client";

import React, { useState, useRef } from "react";
import { CardOptions } from "./CardOptionsModal";

interface CardStudioModalProps {
  isOpen: boolean;
  cardOptions: CardOptions | null;
  onClose: () => void;
  onBack: () => void;
  onFinish?: (designData: any) => void;
}

export default function CardStudioModal({
  isOpen,
  cardOptions,
  onClose,
  onBack,
  onFinish,
}: CardStudioModalProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [rotation, setRotation] = useState<number>(0);
  const [fitMode, setFitMode] = useState<"bleed" | "safe">("bleed");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [showFinishSuccess, setShowFinishSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const cornerStyle = cardOptions?.cornerStyle || "rounded";

  // Handlers for Toolbar
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDelete = () => {
    setUploadedImage(null);
    setFileName("");
    setRotation(0);
    setFitMode("bleed");
  };

  const handleFitToBleed = () => {
    setFitMode("bleed");
  };

  const handleFitToArea = () => {
    setFitMode("safe");
  };

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setUploadedImage(data.url);
      }
    } catch (err) {
      console.error("Error uploading to S3:", err);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleTemplateDownload = (format: string) => {
    setActiveTemplate(format);
    // Create a dummy template file download
    const element = document.createElement("a");
    const file = new Blob([`Template file format for ${format}`], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `Square-Business-Card-Template.${format.toLowerCase().includes("illustrator") ? "ai" : format.toLowerCase()}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setTimeout(() => setActiveTemplate(null), 2000);
  };

  const handleFinish = () => {
    if (onFinish) {
      onFinish({
        uploadedImage,
        fileName,
        rotation,
        fitMode,
        cardOptions,
      });
    }
    window.location.href = "/customize";
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden font-sans animate-in fade-in duration-200">
      
      {/* Top Action Toolbar */}
      <header className="h-16 border-b border-zinc-200 bg-white px-6 flex items-center justify-between shrink-0 shadow-2xs">
        
        {/* Left Toolbar Tools */}
        <div className="flex items-center space-x-6 text-zinc-700">
          
          {/* Delete */}
          <button
            onClick={handleDelete}
            className="flex flex-col items-center justify-center hover:text-red-600 transition-colors group cursor-pointer"
            title="Delete design"
          >
            <svg className="w-5 h-5 text-zinc-600 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-base font-medium mt-0.5 text-zinc-600 group-hover:text-red-600">Delete</span>
          </button>

          {/* Rotate 90° */}
          <button
            onClick={handleRotate}
            className="flex flex-col items-center justify-center hover:text-[#329AD4] transition-colors group cursor-pointer"
            title="Rotate 90 degrees"
          >
            <svg className="w-5 h-5 text-zinc-600 group-hover:text-[#329AD4] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-base font-medium mt-0.5 text-zinc-600 group-hover:text-[#329AD4]">Rotate 90°</span>
          </button>

          {/* Fit To Bleed */}
          <button
            onClick={handleFitToBleed}
            className={`flex flex-col items-center justify-center transition-colors group cursor-pointer ${
              fitMode === "bleed" ? "text-[#329AD4]" : "hover:text-[#329AD4]"
            }`}
            title="Fit artwork to bleed area"
          >
            <svg className={`w-5 h-5 ${fitMode === "bleed" ? "text-[#329AD4]" : "text-zinc-600 group-hover:text-[#329AD4]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7h8M8 17h8M12 3v18" />
            </svg>
            <span className={`text-base font-medium mt-0.5 ${fitMode === "bleed" ? "text-[#329AD4]" : "text-zinc-600 group-hover:text-[#329AD4]"}`}>
              Fit To Bleed
            </span>
          </button>

          {/* Fit To Area */}
          <button
            onClick={handleFitToArea}
            className={`flex flex-col items-center justify-center transition-colors group cursor-pointer ${
              fitMode === "safe" ? "text-[#329AD4]" : "hover:text-[#329AD4]"
            }`}
            title="Fit artwork within safe zone"
          >
            <svg className={`w-5 h-5 ${fitMode === "safe" ? "text-[#329AD4]" : "text-zinc-600 group-hover:text-[#329AD4]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
            <span className={`text-base font-medium mt-0.5 ${fitMode === "safe" ? "text-[#329AD4]" : "text-zinc-600 group-hover:text-[#329AD4]"}`}>
              Fit To Area
            </span>
          </button>

        </div>

        {/* Right Navigation & Close */}
        <div className="flex items-center space-x-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 text-zinc-700 hover:text-zinc-900 text-base font-semibold cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-800 p-1.5 rounded-full hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Close Studio"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      </header>

      {/* Main Studio Body (Split into Left Workspace & Right Sidebar) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
        
        {/* Left Card Workspace (Interactive Upload & Preview Area) */}
        <div className="flex-1 bg-[#f4f4f6] p-6 lg:p-10 flex flex-col items-center justify-center overflow-y-auto">
          
          {/* Main Card Canvas Box */}
          <div className="w-full max-w-xl bg-[#f4f4f6] rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center min-h-[460px]">
            
            {/* Title above upload box */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold text-zinc-900">Upload Your Design</h2>
              <p className="text-base font-semibold text-[#329AD4] mt-0.5">Specs and templates</p>
            </div>

            {/* Dropzone / Upload Box */}
            {!uploadedImage ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full max-w-md aspect-[4/3] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 text-center bg-white shadow-sm ${
                  isDragOver ? "border-[#329AD4] bg-sky-50/50 scale-[1.01]" : "border-[#329AD4]/70 hover:border-[#329AD4]"
                }`}
              >
                {/* Cloud Upload Icon */}
                <div className="w-14 h-14 rounded-full bg-sky-50 text-[#329AD4] flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>

                <p className="text-base font-bold text-zinc-800 mb-1">
                  Choose a file or drag & drop it here.
                </p>
                <p className="text-base text-zinc-400 mb-6 max-w-xs">
                  JPEG, PNG, PDF, and MP4 formats, up to 50 MB.
                </p>

                {/* Browse Files Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-base font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Browse Files
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.svg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              /* Live Card Artwork Preview Canvas */
              <div className="w-full max-w-md flex flex-col items-center">
                
                {/* Visual Card Canvas with Bleed, Trim & Safe Area lines */}
                <div className="relative w-full aspect-square max-w-[340px] bg-white rounded-2xl shadow-xl border-2 border-red-400 p-3 overflow-hidden flex items-center justify-center">
                  
                  {/* Outer Red Line: Bleed Area Indicator */}
                  <div className="absolute inset-1 border border-red-500/40 pointer-events-none rounded-xl" />
                  
                  {/* Middle Blue Line: Trim Area */}
                  <div className="absolute inset-3 border border-blue-500/50 pointer-events-none rounded-xl" />

                  {/* Inner Dashed Line: Safe Area */}
                  <div className="absolute inset-6 border border-dashed border-zinc-400 pointer-events-none rounded-lg z-10 flex items-start justify-end p-1">
                    <span className="text-base font-bold text-zinc-400 opacity-60">Safe Area</span>
                  </div>

                  {/* Display Uploaded Design with Corner Style, Rotation and Fit Mode */}
                  <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${
                    cornerStyle === "rounded" ? "rounded-xl" : "rounded-none"
                  }`}>
                    <img
                      src={uploadedImage}
                      alt="Uploaded card artwork"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                      }}
                      className={`transition-all duration-300 ${
                        fitMode === "bleed"
                          ? "w-full h-full object-cover"
                          : "max-w-[85%] max-h-[85%] object-contain"
                      }`}
                    />
                  </div>
                </div>

                {/* Uploaded File Info & Re-upload Controls */}
                <div className="mt-4 flex items-center justify-between w-full max-w-[340px] bg-white px-4 py-2.5 rounded-xl border border-zinc-200 shadow-2xs">
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <svg className="w-4 h-4 text-[#329AD4] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-base font-semibold text-zinc-700 truncate">{fileName || "Uploaded Artwork"}</span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-base font-bold text-[#329AD4] hover:underline cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.svg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

              </div>
            )}

          </div>

        </div>

        {/* Right Sidebar: Specs and Templates */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-zinc-200 p-6 flex flex-col justify-between overflow-y-auto bg-white">
          
          <div className="space-y-6">
            
            {/* Title */}
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Specs and templates</h2>
            </div>

            {/* Template Card Bleed & Safety Overlay Diagram (Matching Image 2) */}
            <div className="relative w-full aspect-[16/10] bg-white border border-zinc-200 rounded-xl p-4 flex flex-col justify-between overflow-hidden shadow-2xs">
              
              {/* Top Right Bleed Tag */}
              <div className="absolute top-2 right-2 flex items-center space-x-1">
                <span className="bg-red-700 text-white text-base font-bold px-1.5 py-0.5 rounded">
                  Bleed Area
                </span>
              </div>

              {/* Top Left Trim Tag */}
              <div className="absolute top-6 left-16">
                <span className="bg-sky-400 text-white text-base font-bold px-1.5 py-0.5 rounded">
                  Trim Area
                </span>
              </div>

              {/* Outer Bleed Red Box */}
              <div className="w-full h-full border-2 border-red-500/80 rounded-2xl p-2 flex items-center justify-center">
                {/* Dashed Inner Safe Area Line */}
                <div className="w-full h-full border-2 border-dashed border-zinc-300 rounded-xl flex items-center justify-center">
                  <span className="text-xl font-medium text-zinc-300 tracking-wider">
                    Safe Area
                  </span>
                </div>
              </div>
            </div>

            {/* Accepted file formats */}
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900">Accepted file formats</h3>
              <p className="text-base text-zinc-400 leading-relaxed font-mono">
                .jpg, .jpeg, .jfif, .bmp, .png, .gif, .heic, .svg, .webp, .pdf, .psd, .ai, .eps, .ait, .ppt, .pptx, .tif, .tiff
              </p>
            </div>

            {/* Templates Buttons */}
            <div className="space-y-2">
              <h3 className="text-base font-bold text-zinc-900">Templates</h3>
              <div className="flex items-center gap-2">
                {["PDF", "SVG", "Adobe Illustrator (.ai)"].map((tpl) => (
                  <button
                    key={tpl}
                    onClick={() => handleTemplateDownload(tpl)}
                    className="px-3 py-1.5 border border-zinc-300 hover:border-zinc-800 text-zinc-700 text-base font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
              {activeTemplate && (
                <p className="text-base text-[#329AD4] font-medium">
                  Downloading {activeTemplate} template...
                </p>
              )}
            </div>

            {/* Title & Description */}
            <div className="space-y-1 pt-2 border-t border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900">
                {cornerStyle === "rounded" ? "Rounded Corner" : "Standard Corner"} Business Cards
              </h3>
              <p className="text-base text-zinc-500 leading-relaxed">
                To avoid white edges, extend your design to the bleed line – but keep text and images within the safety area.
              </p>
            </div>

            {/* Dimensions Table */}
            <div className="space-y-2 pt-2">
              {/* Header */}
              <div className="grid grid-cols-3 text-base font-bold text-zinc-400 border-b border-zinc-100 pb-1">
                <span></span>
                <span>Height</span>
                <span>Width</span>
              </div>

              {/* Rows */}
              <div className="space-y-2 text-base">
                {/* Bleed */}
                <div className="grid grid-cols-3 items-center">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                    <span className="font-semibold text-zinc-800">Bleed</span>
                  </div>
                  <div className="text-zinc-600 text-base">
                    <div>2.12&quot;</div>
                    <div className="text-zinc-400 text-base">53.80mm</div>
                  </div>
                  <div className="text-zinc-600 text-base">
                    <div>3.62&quot;</div>
                    <div className="text-zinc-400 text-base">91.90mm</div>
                  </div>
                </div>

                {/* Trim */}
                <div className="grid grid-cols-3 items-center pt-1 border-t border-zinc-100">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                    <span className="font-semibold text-zinc-800">Trim</span>
                  </div>
                  <div className="text-zinc-600 text-base">
                    <div>2.00&quot;</div>
                    <div className="text-zinc-400 text-base">50.80mm</div>
                  </div>
                  <div className="text-zinc-600 text-base">
                    <div>3.50&quot;</div>
                    <div className="text-zinc-400 text-base">88.90mm</div>
                  </div>
                </div>

                {/* Safety */}
                <div className="grid grid-cols-3 items-center pt-1 border-t border-zinc-100">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 inline-block" />
                    <span className="font-semibold text-zinc-800">Safety</span>
                  </div>
                  <div className="text-zinc-600 text-base">
                    <div>1.88&quot;</div>
                    <div className="text-zinc-400 text-base">47.80mm</div>
                  </div>
                  <div className="text-zinc-600 text-base">
                    <div>3.38&quot;</div>
                    <div className="text-zinc-400 text-base">85.90mm</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Download detailed guidelines link */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleTemplateDownload("Guidelines-PDF")}
                className="text-base font-semibold text-zinc-800 hover:text-[#329AD4] underline cursor-pointer"
              >
                Download detailed guidelines
              </button>
            </div>

          </div>

          {/* Finish Button at bottom */}
          <div className="pt-6 border-t border-zinc-100">
            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-3 bg-[#329AD4] hover:bg-[#2884b8] text-white font-semibold text-base rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Finish
            </button>
          </div>

        </div>

      </div>

      {/* Finish Success Confirmation Modal */}
      {showFinishSuccess && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-zinc-900">Card Design Saved!</h3>
            <p className="text-base text-zinc-600">
              Your {cardOptions?.quantity || 100} {cardOptions?.cornerStyle || "rounded"} square business cards have been added to your session.
            </p>
            <button
              onClick={() => {
                setShowFinishSuccess(false);
                onClose();
              }}
              className="w-full py-2.5 bg-[#329AD4] text-white font-semibold text-base rounded-lg hover:bg-[#2884b8] cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
