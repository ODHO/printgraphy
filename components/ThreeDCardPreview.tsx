"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { TextLayer } from "./BusinessCardStudioFlow";
import { calculateFitDimensions } from "@/lib/canvasUtils";
import { CUSTOMIZE_LAYOUT, isArtworkImage, renderCardToCanvas, type CardLayout } from "@/lib/cardRender";

function blitCanvas(target: HTMLCanvasElement, source: HTMLCanvasElement) {
  const ctx = target.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(source, 0, 0, target.width, target.height);
}

export interface DynamicCanvasConfig {
  width?: number;
  height?: number;
  unit?: string;
  orientation?: "landscape" | "portrait";
  bleed?: number;
  bleedUnit?: "mm" | "cm" | "in" | "px";
  safe_area?: number;
  safeAreaUnit?: "mm" | "cm" | "in" | "px";
  supports_back_side?: boolean;
  side_mode?: string;
  sides_count?: number;
  sides_names?: string[];
}

export interface DynamicDesignSide {
  bgColor?: string;
  bgImage?: string;
  bgFit?: "cover" | "contain";
  bgOpacity?: number;
  bgGradient?: string;
  bgGradientAngle?: number;
  objects?: any[];
}

interface ThreeDCardPreviewProps {
  bgColor?: string;
  backBgColor?: string;
  logoText?: string;
  logoImage?: string | null;
  logoPosition?: "top-left" | "top-right" | "center" | "bottom-right";
  logoX?: number;
  logoY?: number;
  backLogoX?: number;
  backLogoY?: number;
  /** Per-side logo positions for category sides (0=front, 1=back, 2+=extras). */
  sideLogoPoints?: Array<{ x: number; y: number } | undefined | null>;
  logoSize?: number;
  textLayers?: TextLayer[];
  side?: "front" | "back";
  sideIndex?: number;
  thickness?: string;
  corners?: string;
  name?: string;
  categoryName?: string;
  email?: string;
  website?: string;
  onSideChange?: (side: "front" | "back") => void;
  onSideIndexChange?: (index: number) => void;
  // Dynamic category support
  canvasConfig?: DynamicCanvasConfig;
  frontDesign?: DynamicDesignSide;
  backDesign?: DynamicDesignSide;
  extraSideDesigns?: DynamicDesignSide[];
  sideDesigns?: DynamicDesignSide[];
  previewWidth?: number;
  previewHeight?: number;
  uploadedImage?: string | null;
  imageOpacity?: number;
  imageRotation?: number;
  fitMode?: "bleed" | "safe";
  safeInset?: number;
  cardLayout?: CardLayout;
  textColor?: string;
  cornerRadius?: number;
}

export default function ThreeDCardPreview({
  bgColor = "#18181b",
  backBgColor = "#141414",
  logoText = "",
  logoImage = null,
  logoPosition = "top-right",
  logoX,
  logoY,
  backLogoX,
  backLogoY,
  sideLogoPoints,
  logoSize = 36,
  textLayers = [],
  side = "front",
  sideIndex,
  thickness = "Standard",
  corners = "Rounded",
  name = "Company",
  categoryName,
  email = "contact@company.com",
  website,
  onSideChange,
  onSideIndexChange,
  canvasConfig,
  frontDesign,
  backDesign,
  extraSideDesigns,
  sideDesigns,
  previewWidth,
  previewHeight,
  uploadedImage = null,
  imageOpacity = 100,
  imageRotation = 0,
  fitMode = "bleed",
  safeInset = 0,
  cardLayout = CUSTOMIZE_LAYOUT,
  textColor = "#ffffff",
  cornerRadius,
}: ThreeDCardPreviewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  
  // 6 Canvases & 6 Textures for 6 Box Faces:
  // Material 0: Right (+X), Material 1: Left (-X), Material 2: Top (+Y), Material 3: Bottom (-Y), Material 4: Front (+Z), Material 5: Back (-Z)
  const sideCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null, null, null, null, null]);
  const sideTextureRefs = useRef<(THREE.CanvasTexture | null)[]>([null, null, null, null, null, null]);

  // Studio Controls state
  const [autoRotate, setAutoRotate] = useState(false);
  const [studioTheme, setStudioTheme] = useState<"dark" | "light">("dark");
  const [isDragging, setIsDragging] = useState(false);

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cardMeshRef = useRef<THREE.Mesh | null>(null);

  // Active side calculation
  const activeIdx = sideIndex !== undefined ? sideIndex : side === "back" ? 1 : 0;

  // Rotation, Zoom & Drag state
  const targetRotationRef = useRef({ x: 0.15, y: side === "back" ? Math.PI : 0 });
  const currentRotationRef = useRef({ x: 0.15, y: side === "back" ? Math.PI : 0 });
  const targetCameraZRef = useRef(4.2);
  const currentCameraZRef = useRef(4.2);
  const baseCameraZRef = useRef(4.2);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const animFrameIdRef = useRef<number | null>(null);

  // Get Design Side object by editor index (0=front, 1=back, 2..=extra)
  const getSideDesign = (idx: number): DynamicDesignSide | undefined => {
    if (Array.isArray(sideDesigns) && sideDesigns.length > idx && sideDesigns[idx]) {
      return sideDesigns[idx];
    }
    if (idx === 0) return frontDesign;
    if (idx === 1) return backDesign;
    if (extraSideDesigns && extraSideDesigns[idx - 2]) return extraSideDesigns[idx - 2];
    return undefined;
  };

  const designFingerprint = JSON.stringify(
    (sideDesigns && sideDesigns.length
      ? sideDesigns
      : [frontDesign, backDesign, ...(extraSideDesigns || [])]
    ).map((d) => ({
      bg: d?.bgColor,
      img: d?.bgImage,
      grad: d?.bgGradient,
      objs: (d?.objects || []).map((o: any) => [o.id, o.type, o.text, o.x, o.y, o.width, o.height, o.src, o.fill, o.color, o.fontSize]),
    }))
  );

  // Helper to compute category aspect ratio
  const getAspect = () => {
    let w = canvasConfig?.width || 105;
    let h = canvasConfig?.height || 60;
    if (canvasConfig?.orientation === "portrait" && w > h) {
      const temp = w;
      w = h;
      h = temp;
    } else if (canvasConfig?.orientation === "landscape" && h > w) {
      const temp = w;
      w = h;
      h = temp;
    }
    return w / h;
  };

  const isBoxProduct = () => {
    const nameStr = `${categoryName || ""} ${name || ""} ${(canvasConfig as any)?.name || ""}`.toLowerCase();
    const mode = canvasConfig?.side_mode;
    const count = Number(canvasConfig?.sides_count) || 2;
    return (
      nameStr.includes("box") ||
      nameStr.includes("mailer") ||
      nameStr.includes("packag") ||
      nameStr.includes("carton") ||
      nameStr.includes("net") ||
      mode === "multi" ||
      count > 2
    );
  };

  const isCircleProduct = () => {
    const str = `${categoryName || ""} ${name || ""} ${corners || ""}`.toLowerCase();
    return str.includes("circle");
  };

  const isOvalProduct = () => {
    const str = `${categoryName || ""} ${name || ""} ${corners || ""}`.toLowerCase();
    return str.includes("oval");
  };

  // Calculate thickness value (Z dimension)
  const getThicknessVal = () => {
    if (isBoxProduct()) {
      const aspect = getAspect();
      const cardW = aspect < 1 ? 3.5 * aspect : 3.5;
      return Math.max(1.5, Math.min(2.8, cardW * 0.8));
    }
    if (isCircleProduct() || isOvalProduct()) {
      return 0.05;
    }
    if (thickness === "Premium Plus") return 0.08;
    if (thickness === "Premium") return 0.05;
    return 0.035; // Standard
  };

  // Paint all 6 box faces whenever designs or text layers update
  useEffect(() => {
    let cancelled = false;

    const paint = async () => {
      while (!cancelled && sideCanvasRefs.current.some((c) => !c)) {
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      }
      if (cancelled || sideCanvasRefs.current.some((c) => !c)) return;

      try {
        const fit = calculateFitDimensions(
          {
            width: canvasConfig?.width || 105,
            height: canvasConfig?.height || 60,
            unit: (canvasConfig?.unit as "mm" | "cm" | "in" | "px") || "mm",
            orientation: canvasConfig?.orientation,
            bleed: canvasConfig?.bleed,
            safe_area: canvasConfig?.safe_area,
          },
          520,
          420
        );
        const previewW = previewWidth || fit.renderWidth;
        const previewH = previewHeight || fit.renderHeight;
        const exportWidth = sideCanvasRefs.current[4]?.width || 1400;

        const shared = {
          textColor,
          layout: cardLayout,
          previewWidth: previewW,
          previewHeight: previewH,
          cornerRadius: 0,
          logoPosition,
          logoSize,
          website,
          email,
          name,
          supportsBack: canvasConfig?.supports_back_side !== false,
        };

        const faceHasContent = (design: DynamicDesignSide | undefined) => {
          if (!design) return false;
          const objs = (design.objects || []).filter((o: any) => o && o.isVisible !== false);
          if (objs.length > 0) return true;
          if (design.bgImage) return true;
          if (design.bgGradient) return true;
          return false;
        };

        const faceHasArtwork = (design: DynamicDesignSide | undefined) =>
          (design?.objects || []).some((o: any) => isArtworkImage(o));

        const categorySideCount = Math.max(
          1,
          Number(canvasConfig?.sides_count) ||
            (canvasConfig?.sides_names?.length || 0) ||
            2
        );

        // Render each face (0..5 material indices):
        // matIdx 0 (+X Right) -> sideIdx 2
        // matIdx 1 (-X Left)  -> sideIdx 3
        // matIdx 2 (+Y Top)   -> sideIdx 4
        // matIdx 3 (-Y Bottom)-> sideIdx 5
        // matIdx 4 (+Z Front) -> sideIdx 0
        // matIdx 5 (-Z Back)  -> sideIdx 1
        for (let matIdx = 0; matIdx < 6; matIdx++) {
          if (cancelled) return;
          const targetCanvas = sideCanvasRefs.current[matIdx];
          if (!targetCanvas) continue;

          const sideIdx =
            matIdx === 4 ? 0 : matIdx === 5 ? 1 : matIdx === 0 ? 2 : matIdx === 1 ? 3 : matIdx === 2 ? 4 : 5;
          const inCategory = sideIdx < categorySideCount;
          const sDesign = inCategory ? getSideDesign(sideIdx) : undefined;
          const hasContent = inCategory && faceHasContent(sDesign);
          const hasArtwork = faceHasArtwork(sDesign);

          const sideBg =
            sDesign?.bgColor || (sideIdx === 1 ? backBgColor : bgColor) || "#18181b";

          const pointFromProp = sideLogoPoints?.[sideIdx];
          const logoPoint =
            pointFromProp ||
            (sideIdx === 1
              ? { x: backLogoX ?? logoX ?? 70, y: backLogoY ?? logoY ?? 8 }
              : { x: logoX ?? 70, y: logoY ?? 8 });

          // Show uploaded logo on any category side that has no template artwork.
          // Do not stamp the default placeholder image on blank faces.
          const showCustomerLogo =
            inCategory && !hasArtwork && !!logoImage && !String(logoImage).includes("placeholder");

          const rendered = await renderCardToCanvas(
            {
              ...shared,
              side: sideIdx === 0 ? "front" : sideIdx === 1 ? "back" : `side_${sideIdx}`,
              logoText: showCustomerLogo ? logoText : "",
              logoImage: showCustomerLogo ? logoImage : null,
              logoX: logoPoint.x,
              logoY: logoPoint.y,
              bgColor: sideBg,
              bgImage: hasContent ? sDesign?.bgImage : undefined,
              bgFit: sDesign?.bgFit,
              bgOpacity: sDesign?.bgOpacity,
              bgGradient: hasContent ? sDesign?.bgGradient : undefined,
              bgGradientAngle: sDesign?.bgGradientAngle,
              textLayers: hasContent && sideIdx === 0 ? textLayers : [],
              objects: hasContent ? sDesign?.objects || [] : [],
              uploadedImage: hasContent && sideIdx === 0 ? uploadedImage : undefined,
              imageOpacity: sideIdx === 0 ? imageOpacity : undefined,
              rotation: sideIdx === 0 ? imageRotation : 0,
              fitMode,
              safeInset,
            },
            exportWidth
          );

          if (cancelled || !sideCanvasRefs.current[matIdx]) return;
          blitCanvas(sideCanvasRefs.current[matIdx]!, rendered);
          if (sideTextureRefs.current[matIdx]) {
            sideTextureRefs.current[matIdx]!.needsUpdate = true;
          }
        }
      } catch (err) {
        console.error("3D preview paint failed:", err);
      }
    };

    void paint();
    return () => {
      cancelled = true;
    };
  }, [
    bgColor,
    backBgColor,
    logoText,
    logoImage,
    logoPosition,
    logoX,
    logoY,
    backLogoX,
    backLogoY,
    sideLogoPoints,
    logoSize,
    textLayers,
    corners,
    name,
    email,
    website,
    textColor,
    canvasConfig,
    frontDesign,
    backDesign,
    extraSideDesigns,
    sideDesigns,
    designFingerprint,
    previewWidth,
    previewHeight,
    uploadedImage,
    imageOpacity,
    imageRotation,
    fitMode,
    safeInset,
    cornerRadius,
    cardLayout,
  ]);

  // Sync side toggle prop with 3D camera rotation angle
  useEffect(() => {
    const idx = sideIndex !== undefined ? sideIndex : side === "back" ? 1 : 0;
    if (idx === 0) {
      targetRotationRef.current = { x: 0.15, y: 0 };
    } else if (idx === 1) {
      targetRotationRef.current = { x: 0.15, y: Math.PI };
    } else if (idx === 2) {
      targetRotationRef.current = { x: 0.15, y: -Math.PI / 2 };
    } else if (idx === 3) {
      targetRotationRef.current = { x: 0.15, y: Math.PI / 2 };
    } else if (idx === 4) {
      targetRotationRef.current = { x: Math.PI / 2.2, y: 0 };
    } else if (idx === 5) {
      targetRotationRef.current = { x: -Math.PI / 2.2, y: 0 };
    }
  }, [side, sideIndex]);

  // Three.js Setup Effect
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(studioTheme === "dark" ? "#0f1115" : "#f1f5f9");

    // Dynamic Geometry Calculation
    const aspect = getAspect();
    let cardWidth = 3.5;
    let cardHeight = 3.5 / aspect;
    if (aspect < 1) {
      cardHeight = 3.5;
      cardWidth = 3.5 * aspect;
    }
    const cardDepth = getThicknessVal();
    const fov = 40;
    const tan = Math.tan((fov * Math.PI) / 360);
    const viewAspect = width / Math.max(1, height);
    const zForHeight = cardHeight / (2 * tan * 0.46);
    const zForWidth = cardWidth / (2 * tan * viewAspect * 0.72);
    const initialZ = Math.max(zForHeight, zForWidth);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(fov, viewAspect, 0.1, 100);
    camera.position.set(0, 0.28, initialZ);
    cameraRef.current = camera;
    targetCameraZRef.current = initialZ;
    currentCameraZRef.current = initialZ;
    baseCameraZRef.current = initialZ;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Create 6 Canvases & Textures for all 6 faces
    const fit = calculateFitDimensions(
      {
        width: canvasConfig?.width || 105,
        height: canvasConfig?.height || 60,
        unit: (canvasConfig?.unit as "mm" | "cm" | "in" | "px") || "mm",
        orientation: canvasConfig?.orientation,
      },
      520,
      420
    );
    const texW = Math.max(1400, Math.round((previewWidth || fit.renderWidth) * 3));
    const texH = Math.max(1, Math.round(texW * ((previewHeight || fit.renderHeight) / (previewWidth || fit.renderWidth))));
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const isBox = isBoxProduct();

    const edgeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xefefef,
      roughness: 0.8,
      metalness: 0.05,
    });

    const materials: THREE.MeshPhysicalMaterial[] = [];

    for (let matIdx = 0; matIdx < 6; matIdx++) {
      const sideCanvas = document.createElement("canvas");
      sideCanvas.width = texW;
      sideCanvas.height = texH;
      const ctx = sideCanvas.getContext("2d");
      const sideIdx =
        matIdx === 4 ? 0 : matIdx === 5 ? 1 : matIdx === 0 ? 2 : matIdx === 1 ? 3 : matIdx === 2 ? 4 : 5;
      const sDesign = getSideDesign(sideIdx);
      if (ctx) {
        ctx.fillStyle = sDesign?.bgColor || (sideIdx === 1 ? backBgColor : bgColor) || "#18181b";
        ctx.fillRect(0, 0, texW, texH);
      }
      sideCanvasRefs.current[matIdx] = sideCanvas;

      const sideTexture = new THREE.CanvasTexture(sideCanvas);
      sideTexture.colorSpace = THREE.SRGBColorSpace;
      sideTexture.anisotropy = maxAniso;
      sideTextureRefs.current[matIdx] = sideTexture;

      if (!isBox && matIdx < 4) {
        materials.push(edgeMaterial as any);
      } else {
        materials.push(
          new THREE.MeshPhysicalMaterial({
            map: sideTexture,
      roughness: 0.35,
      metalness: 0.05,
      clearcoat: 0.2,
      clearcoatRoughness: 0.15,
      reflectivity: 0.5,
          })
        );
      }
    }

    // 5. Product 3D Mesh based on shape (Box, Circle, Oval, Card)
    const isCircle = isCircleProduct();
    const isOval = isOvalProduct();

    let cardMesh: THREE.Mesh;

    if (isCircle || isOval) {
      const radius = cardWidth / 2;
      const cylGeo = new THREE.CylinderGeometry(radius, radius, cardDepth, 64);
      // Rotate cylinder so top and bottom circular caps face +Z (Front) and -Z (Back)
      cylGeo.rotateX(Math.PI / 2);
      if (isOval) {
        cylGeo.scale(1, 0.65, 1);
      }
      // Materials for cylinder: 0: Side edge, 1: Front cap (+Z), 2: Back cap (-Z)
      const cylMaterials = [
        edgeMaterial,
        materials[4] || materials[0], // Front
        materials[5] || materials[1] || materials[0], // Back
      ];
      cardMesh = new THREE.Mesh(cylGeo, cylMaterials);
    } else {
      const geometry = new THREE.BoxGeometry(cardWidth, cardHeight, cardDepth);
      cardMesh = new THREE.Mesh(geometry, materials);
    }

    cardMesh.castShadow = true;
    cardMesh.receiveShadow = true;
    scene.add(cardMesh);
    cardMeshRef.current = cardMesh;

    // 6. Floor Contact Shadow Plane
    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.ShadowMaterial({
      opacity: studioTheme === "dark" ? 0.5 : 0.25,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -1.35;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // 7. Studio Lighting
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      studioTheme === "dark" ? 1.2 : 1.6
    );
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainLight.position.set(3, 5, 4);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xffffff, 0.8, 10);
    fillLight.position.set(-2, 3, 2);
    scene.add(fillLight);

    // 8. Animation & Physics Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (cameraRef.current) {
        currentCameraZRef.current += (targetCameraZRef.current - currentCameraZRef.current) * 0.1;
        cameraRef.current.position.z = currentCameraZRef.current;
      }

      if (cardMeshRef.current) {
        if (autoRotate) {
          targetRotationRef.current.y += 0.01;
        }

        // Lerp rotation smoothly
        currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.08;
        currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.08;

        cardMeshRef.current.rotation.x = currentRotationRef.current.x;
        cardMeshRef.current.rotation.y = currentRotationRef.current.y;

        cardMeshRef.current.position.y = 0.34 + Math.sin(elapsedTime * 1.8) * 0.03;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle Window Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      cardMesh.geometry.dispose();
      materials.forEach((m) => m.dispose());
      sideTextureRefs.current.forEach((t) => t?.dispose());
      renderer.dispose();
    };
  }, [thickness, canvasConfig?.width, canvasConfig?.height, canvasConfig?.orientation, canvasConfig?.side_mode, canvasConfig?.sides_count, categoryName, name, corners]);

  // Sync Studio Theme Background
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(studioTheme === "dark" ? "#0f1115" : "#f8fafc");
    }
  }, [studioTheme]);

  // Mouse & Touch Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - mousePosRef.current.x;
    const deltaY = e.clientY - mousePosRef.current.y;

    targetRotationRef.current.y += deltaX * 0.008;
    targetRotationRef.current.x = Math.max(
      -Math.PI / 2.5,
      Math.min(Math.PI / 2.5, targetRotationRef.current.x + deltaY * 0.008)
    );

    mousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  // Zoom Handlers
  const handleWheel = (e: React.WheelEvent) => {
    targetCameraZRef.current = Math.max(2.2, Math.min(12, targetCameraZRef.current + e.deltaY * 0.004));
  };

  const handleZoomIn = () => {
    targetCameraZRef.current = Math.max(2.2, targetCameraZRef.current - 0.7);
  };

  const handleZoomOut = () => {
    targetCameraZRef.current = Math.min(12, targetCameraZRef.current + 0.7);
  };

  const sidesNames =
    canvasConfig?.sides_names && canvasConfig.sides_names.length > 0
      ? canvasConfig.sides_names
      : Array.from({ length: Math.max(2, canvasConfig?.sides_count || 2) }, (_, i) =>
          i === 0 ? "Front" : i === 1 ? "Back" : `Side ${i + 1}`
        );

  // Only the sides admin set on the category/template — not every box face.
  const totalSides = Math.max(
    1,
    Number(canvasConfig?.sides_count) || sidesNames.length || 2
  );

  // Side Navigation & Flip Action
  const handleToggleFlip = () => {
    const nextIdx = (activeIdx + 1) % Math.max(1, totalSides);
    if (onSideIndexChange) onSideIndexChange(nextIdx);
    if (onSideChange) onSideChange(nextIdx === 1 ? "back" : "front");
  };

  // Reset View Action
  const handleResetView = () => {
    targetRotationRef.current.x = 0.15;
    targetRotationRef.current.y = activeIdx === 1 ? Math.PI : 0;
    targetCameraZRef.current = baseCameraZRef.current;
    setAutoRotate(false);
  };

  return (
    <div className="group relative flex h-full w-full select-none flex-col items-center justify-between overflow-hidden">
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className={`flex h-full min-h-[420px] w-full items-center justify-center transition-cursor ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto inline-flex min-w-0 items-center gap-2 rounded-lg border border-white/15 bg-black/75 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
          <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-[#064FE0]" />
          <span className="truncate">Drag to rotate · Scroll to zoom</span>
        </div>

        <button
          type="button"
          onClick={() => setStudioTheme(studioTheme === "dark" ? "light" : "dark")}
          className="pointer-events-auto inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-black/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/90"
          title="Toggle Studio Lighting Theme"
        >
          <svg className="h-3.5 w-3.5 text-[#064FE0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {studioTheme === "dark" ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05L5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            )}
          </svg>
          {studioTheme === "dark" ? "Light" : "Dark"}
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 z-20 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-xl border border-white/15 bg-black/80 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="mr-0.5 flex items-center gap-1 border-r border-white/15 pr-1.5">
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white transition hover:bg-[#064FE0]"
            title="Zoom In (+)"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white transition hover:bg-[#064FE0]"
            title="Zoom Out (-)"
          >
            −
          </button>
        </div>

        <button
          type="button"
          onClick={handleToggleFlip}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#064FE0] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#0439A8]"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{totalSides > 2 ? "Next Side" : "Flip Card"}</span>
        </button>

        <button
          type="button"
          onClick={handleResetView}
          className="cursor-pointer rounded-lg bg-white/10 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/20"
        >
          Reset View
        </button>
      </div>
    </div>
  );
}

