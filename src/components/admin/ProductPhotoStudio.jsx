import { useEffect, useRef, useState } from "react";
import {
  Download,
  ImagePlus,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const IMAGE_BUCKET = "product-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const PODIUMS = [
  { id: "cylinder", label: "Cylinder" },
  { id: "square", label: "Square pedestal" },
  { id: "two-tier", label: "Two tier" },
];

const BACKGROUNDS = [
  { id: "soft-white", label: "Soft white", color: "#F8F6F2" },
  { id: "cream", label: "Cream", color: "#F1E7D8" },
  { id: "warm-beige", label: "Warm beige", color: "#DCC8AF" },
  { id: "soft-charcoal", label: "Soft charcoal", color: "#343238" },
  { id: "deep-brown", label: "Deep brown", color: "#39312E" },
];

const DEFAULT_SCENE = {
  podium: "cylinder",
  background: "cream",
  scale: 100,
  horizontal: 0,
  vertical: 0,
};

function makeGradient(context, x1, y1, x2, y2, stops) {
  const gradient = context.createLinearGradient(x1, y1, x2, y2);
  stops.forEach(([position, color]) => gradient.addColorStop(position, color));
  return gradient;
}

function drawEllipse(context, x, y, radiusX, radiusY, color) {
  context.beginPath();
  context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
}

function drawCylinder(context, top, bottom, width, tones) {
  const center = 600;
  const radiusX = width / 2;
  const radiusY = Math.max(34, width * 0.13);

  context.fillStyle = makeGradient(context, center - width, 0, center + width, 0, [
    [0, tones.side],
    [0.45, tones.front],
    [1, tones.dark],
  ]);
  context.fillRect(center - radiusX, top, width, bottom - top);
  drawEllipse(context, center, bottom, radiusX, radiusY, tones.dark);
  const topGradient = makeGradient(context, center - radiusX, top, center + radiusX, top, [
    [0, tones.top],
    [0.5, tones.front],
    [1, tones.side],
  ]);
  context.beginPath();
  context.ellipse(center, top, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fillStyle = topGradient;
  context.fill();
  context.strokeStyle = tones.highlight;
  context.lineWidth = 2;
  context.stroke();
}

function getPodiumTones(backgroundId) {
  if (backgroundId === "soft-charcoal" || backgroundId === "deep-brown") {
    return {
      top: "#918B87",
      front: "#716B68",
      side: "#565250",
      dark: "#454240",
      highlight: "rgba(255,255,255,0.22)",
    };
  }
  if (backgroundId === "warm-beige") {
    return {
      top: "#F0E5D4",
      front: "#D6C2A9",
      side: "#BDA78E",
      dark: "#A58E75",
      highlight: "rgba(255,255,255,0.5)",
    };
  }
  return {
    top: "#FFFDF9",
    front: "#E9E2D9",
    side: "#CEC4B7",
    dark: "#B9AD9F",
    highlight: "rgba(255,255,255,0.75)",
  };
}

function drawPodium(context, style, backgroundId) {
  const tones = getPodiumTones(backgroundId);
  const shadow = context.createRadialGradient(600, 875, 30, 600, 875, 370);
  shadow.addColorStop(0, "rgba(34, 25, 20, 0.25)");
  shadow.addColorStop(1, "rgba(34, 25, 20, 0)");
  drawEllipse(context, 600, 874, 360, 66, shadow);

  if (style === "square") {
    const side = context.createLinearGradient(780, 650, 980, 870);
    side.addColorStop(0, tones.side);
    side.addColorStop(1, tones.dark);
    context.beginPath();
    context.moveTo(840, 700);
    context.lineTo(920, 645);
    context.lineTo(902, 834);
    context.lineTo(840, 875);
    context.closePath();
    context.fillStyle = side;
    context.fill();

    const front = context.createLinearGradient(0, 690, 0, 875);
    front.addColorStop(0, tones.front);
    front.addColorStop(1, tones.side);
    context.beginPath();
    context.moveTo(280, 700);
    context.lineTo(840, 700);
    context.lineTo(840, 875);
    context.lineTo(300, 875);
    context.closePath();
    context.fillStyle = front;
    context.fill();

    const top = context.createLinearGradient(320, 640, 850, 730);
    top.addColorStop(0, tones.top);
    top.addColorStop(1, tones.front);
    context.beginPath();
    context.moveTo(280, 700);
    context.lineTo(365, 642);
    context.lineTo(920, 645);
    context.lineTo(840, 700);
    context.closePath();
    context.fillStyle = top;
    context.fill();
    context.strokeStyle = tones.highlight;
    context.lineWidth = 2;
    context.stroke();
    return;
  }

  if (style === "two-tier") {
    drawCylinder(context, 770, 882, 620, tones);
    drawCylinder(context, 630, 782, 440, tones);
    return;
  }

  drawCylinder(context, 690, 880, 470, tones);
}

function drawScene(canvas, productImage, scene) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const background = BACKGROUNDS.find((option) => option.id === scene.background) || BACKGROUNDS[1];
  const dark = scene.background === "soft-charcoal" || scene.background === "deep-brown";
  canvas.width = 1200;
  canvas.height = 1200;
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = background.color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const light = context.createRadialGradient(600, 320, 50, 600, 360, 820);
  light.addColorStop(0, dark ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.56)");
  light.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = light;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const floor = makeGradient(context, 0, 720, 0, 1200, [
    [0, dark ? "rgba(0,0,0,0.05)" : "rgba(116,91,68,0.035)"],
    [1, dark ? "rgba(0,0,0,0.16)" : "rgba(116,91,68,0.075)"],
  ]);
  context.fillStyle = floor;
  context.fillRect(0, 720, 1200, 480);

  drawPodium(context, scene.podium, scene.background);

  const maxWidth = 525;
  const maxHeight = 565;
  const fit = Math.min(maxWidth / productImage.naturalWidth, maxHeight / productImage.naturalHeight);
  let width = productImage.naturalWidth * fit * (scene.scale / 100);
  let height = productImage.naturalHeight * fit * (scene.scale / 100);
  const centerX = 600 + scene.horizontal * 4;
  const podiumTop = scene.podium === "two-tier" ? 630 : scene.podium === "square" ? 660 : 680;
  const baseY = podiumTop + 8 + scene.vertical * 3;
  const maxVisibleHeight = Math.max(80, baseY - 32);
  if (height > maxVisibleHeight) {
    const fitWithinCanvas = maxVisibleHeight / height;
    width *= fitWithinCanvas;
    height = maxVisibleHeight;
  }

  const contactShadow = context.createRadialGradient(centerX, baseY + 8, 4, centerX, baseY + 8, Math.max(100, width * 0.35));
  contactShadow.addColorStop(0, "rgba(29, 23, 19, 0.26)");
  contactShadow.addColorStop(1, "rgba(29, 23, 19, 0)");
  drawEllipse(context, centerX, baseY + 8, Math.max(100, width * 0.35), 25, contactShadow);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(productImage, centerX - width / 2, baseY - height, width, height);
}

function getImageFileError(file) {
  if (!file || !IMAGE_EXTENSIONS[file.type]) {
    return "Choose a JPEG, PNG, WebP, or AVIF image.";
  }
  if (file.size === 0) return "That photo is empty. Choose another image.";
  if (file.size > MAX_IMAGE_BYTES) return "Product photos must be 5 MB or smaller.";
  return "";
}

async function sourceToFile(source) {
  if (source?.file) {
    const fileError = getImageFileError(source.file);
    if (fileError) throw new Error(fileError);
    return source.file;
  }
  if (!source?.url) throw new Error("Choose a product photo first.");

  let response;
  try {
    response = await fetch(source.url, { mode: "cors", credentials: "omit", cache: "no-store" });
  } catch {
    throw new Error("This image host does not allow the studio to read the photo. Download it and upload the file instead.");
  }
  if (!response.ok) throw new Error("The selected image could not be downloaded. Upload the photo from your device instead.");
  const blob = await response.blob();
  const type = blob.type.split(";")[0].toLowerCase();
  const extension = IMAGE_EXTENSIONS[type];
  if (!extension) throw new Error("The selected image is not a supported JPEG, PNG, WebP, or AVIF file.");
  const file = new File([blob], `product-source.${extension}`, { type });
  const fileError = getImageFileError(file);
  if (fileError) throw new Error(fileError);
  return file;
}

async function prepareFileForBackgroundRemoval(file) {
  if (file.type !== "image/avif") return file;

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("This browser could not read the AVIF photo. Upload a JPEG, PNG, or WebP instead."));
      element.src = url;
    });
    if (image.naturalWidth * image.naturalHeight > 25_000_000) {
      throw new Error("This photo is too large to process. Use an image under 25 megapixels.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the photo for background removal.");
    context.drawImage(image, 0, 0);
    const jpeg = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("This browser could not prepare the AVIF photo. Upload a JPEG, PNG, or WebP instead."));
      }, "image/jpeg", 0.88);
    });
    const convertedFile = new File([jpeg], "product-photo.jpg", { type: "image/jpeg" });
    const fileError = getImageFileError(convertedFile);
    if (fileError) throw new Error(fileError);
    return convertedFile;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function getFunctionError(error) {
  const response = error?.context;
  if (response && typeof response.json === "function") {
    try {
      const body = await response.clone().json();
      if (body?.error) return body.error;
    } catch {
      // The Edge Function may return a plain-text gateway error.
    }
  }
  return error?.message || "Background removal failed. Please try again.";
}

function canvasToProductFile(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The finished image could not be generated. Try adjusting the photo and retry."));
        return;
      }
      if (blob.size > MAX_IMAGE_BYTES) {
        reject(new Error("The finished image is larger than the product-image limit. Reduce the product size and try again."));
        return;
      }
      resolve(new File([blob], `product-studio-${crypto.randomUUID()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  });
}

export default function ProductPhotoStudio({
  sources = [],
  initialSourceId = "",
  productId = null,
  productName = "product",
  onClose,
  onImageSaved,
  onUseInForm,
}) {
  const initialSource = sources.find((source) => source.id === initialSourceId) || sources[0] || null;
  const [selectedSource, setSelectedSource] = useState(initialSource);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [processedUrl, setProcessedUrl] = useState("");
  const [scene, setScene] = useState(DEFAULT_SCENE);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saveTarget, setSaveTarget] = useState("main");
  const canvasRef = useRef(null);
  const isBusy = processing || saving;

  const sourcePreview = selectedUpload?.url || selectedSource?.url || "";
  const sourceFile = selectedUpload?.file || selectedSource?.file || null;
  useEffect(() => {
    if (selectedUpload?.url) return () => URL.revokeObjectURL(selectedUpload.url);
    return undefined;
  }, [selectedUpload]);

  useEffect(() => {
    if (!processedUrl || !canvasRef.current) {
      setSceneReady(false);
      return undefined;
    }
    setSceneReady(false);
    const image = new Image();
    image.onload = () => {
      if (canvasRef.current) {
        drawScene(canvasRef.current, image, scene);
        setSceneReady(true);
      }
    };
    image.onerror = () => setError("The transparent product preview could not be loaded. Reprocess the background and try again.");
    image.src = processedUrl;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [processedUrl, scene]);

  useEffect(() => {
    if (!processedUrl) return undefined;
    return () => URL.revokeObjectURL(processedUrl);
  }, [processedUrl]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !isBusy) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBusy, onClose]);

  function setSceneField(field, value) {
    setScene((current) => ({ ...current, [field]: value }));
  }

  function chooseSource(source) {
    setSelectedUpload(null);
    setSelectedSource(source);
    setProcessedUrl("");
    setError("");
    setNotice("");
  }

  function handleUpload(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const fileError = getImageFileError(file);
    if (fileError) {
      setError(fileError);
      return;
    }
    setSelectedUpload({ file, url: URL.createObjectURL(file), label: file.name });
    setSelectedSource(null);
    setProcessedUrl("");
    setError("");
    setNotice("");
  }

  async function removeBackground() {
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      const sourceFile = await sourceToFile(selectedUpload || selectedSource);
      const file = await prepareFileForBackgroundRemoval(sourceFile);
      const body = new FormData();
      body.append("file", file, file.name);
      const { data, error: invokeError } = await supabase.functions.invoke("remove-product-background", { body });
      if (invokeError) throw new Error(await getFunctionError(invokeError));
      if (!(data instanceof Blob) || data.size === 0) {
        throw new Error("The background service returned an invalid image. The original photo has been kept.");
      }

      const png = new Blob([data], { type: "image/png" });
      const signature = new Uint8Array(await png.slice(0, 8).arrayBuffer());
      if (signature.length !== 8 || signature[0] !== 0x89 || signature[1] !== 0x50 || signature[2] !== 0x4e || signature[3] !== 0x47) {
        throw new Error("The background service did not return a transparent PNG. The original photo has been kept.");
      }
      const nextUrl = URL.createObjectURL(png);
      setProcessedUrl(nextUrl);
      setNotice("Background removed. Review the cutout carefully before saving it to the product.");
    } catch (removeError) {
      setError(removeError.message || "Background removal failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  async function useTransparentImage() {
    setProcessing(true);
    setError("");
    setNotice("");
    let previewUrl = "";
    try {
      const file = await sourceToFile(selectedUpload || selectedSource);
      previewUrl = URL.createObjectURL(file);
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("The selected image could not be opened."));
        element.src = previewUrl;
      });
      const sample = document.createElement("canvas");
      sample.width = 96;
      sample.height = 96;
      const context = sample.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Your browser could not inspect the image transparency.");
      context.drawImage(image, 0, 0, sample.width, sample.height);
      const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
      let transparentSamples = 0;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] < 24) transparentSamples += 1;
      }
      if (transparentSamples / (sample.width * sample.height) < 0.02) {
        throw new Error("This image does not appear to have a transparent background. Use Remove Background or choose an existing transparent PNG/WebP.");
      }

      setProcessedUrl(previewUrl);
      previewUrl = "";
      setNotice("Existing transparency detected. You can compose this cutout locally without an API request.");
    } catch (transparentError) {
      setError(transparentError.message || "The transparent image could not be used.");
    } finally {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setProcessing(false);
    }
  }

  async function getFinalFile() {
    if (!canvasRef.current || !processedUrl || !sceneReady) throw new Error("Wait for the final scene preview to finish rendering.");
    return canvasToProductFile(canvasRef.current);
  }

  async function downloadImage() {
    setError("");
    try {
      const file = await getFinalFile();
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(productName || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product"}-studio.jpg`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError.message || "The image could not be downloaded.");
    }
  }

  async function saveToProduct() {
    setSaving(true);
    setError("");
    setNotice("");
    let uploadedPath = "";
    try {
      const file = await getFinalFile();
      if (!productId) {
        await onUseInForm({ file, target: saveTarget });
        setNotice(saveTarget === "main"
          ? "Studio image added as the new product's main photo. Save the product to finish."
          : "Studio image queued for the new product gallery. Save the product to finish.");
        onClose();
        return;
      }

      uploadedPath = `products/studio-${crypto.randomUUID()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(uploadedPath, file, {
          cacheControl: "3600",
          contentType: "image/jpeg",
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message || "The edited image could not be uploaded.");
      uploadedPath = uploadData?.path || uploadedPath;

      const publicUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
      if (!publicUrl) throw new Error("The uploaded image URL could not be created.");

      let updateResult;
      if (saveTarget === "main") {
        updateResult = await supabase
          .from("products")
          .update({ image_url: publicUrl })
          .eq("id", productId)
          .select("id")
          .maybeSingle();
      } else {
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("additional_images")
          .eq("id", productId)
          .single();
        if (productError) throw productError;
        const currentImages = Array.isArray(product?.additional_images) ? product.additional_images : [];
        updateResult = await supabase
          .from("products")
          .update({ additional_images: [...currentImages, publicUrl] })
          .eq("id", productId)
          .select("id")
          .maybeSingle();
      }

      if (updateResult.error) throw updateResult.error;
      if (!updateResult.data?.id) throw new Error("The product was not updated. Check your admin access and try again.");
      uploadedPath = "";
      onImageSaved({ url: publicUrl, target: saveTarget });
      onClose();
    } catch (saveError) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from(IMAGE_BUCKET).remove([uploadedPath]);
        if (cleanupError) console.error("Could not remove an unused photo-studio upload.", cleanupError);
      }
      setError(saveError.message || "The product photo could not be saved. The existing photo was kept.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-black/55 p-2 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-photo-studio-title"
        className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-[#faf9f7] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-black/[0.08] bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff1f8f]">Product Photo Studio</p>
            <h2 id="product-photo-studio-title" className="mt-1 text-xl font-bold text-[#171615] sm:text-2xl">Create a polished product photo</h2>
            <p className="mt-1 text-sm text-black/50">Automatic removal sends the chosen photo to remove.bg through the store’s secured service. You can also use a cutout that already has transparency.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isBusy} aria-label="Close Product Photo Studio" className="rounded-lg p-2 text-black/55 hover:bg-black/5 hover:text-black disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 p-4 sm:p-7">
          <section className="rounded-xl border border-black/[0.08] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff1f8f]">Step 1</p>
                <h3 className="mt-1 font-semibold">Choose a product image</h3>
                <p className="mt-1 text-xs text-black/45">JPEG, PNG, WebP, or AVIF up to 5 MB.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold hover:border-[#ff1f8f] hover:text-[#ff1f8f]">
                <ImagePlus className="h-4 w-4" /> Upload photo
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={handleUpload} />
              </label>
            </div>
            {sources.length > 0 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1" role="group" aria-label="Existing product photos">
                {sources.map((source) => (
                  <button
                    type="button"
                    key={source.id}
                    onClick={() => chooseSource(source)}
                    aria-pressed={!selectedUpload && selectedSource?.id === source.id}
                    className={`w-28 shrink-0 rounded-lg border p-2 text-left transition ${!selectedUpload && selectedSource?.id === source.id ? "border-[#ff1f8f] ring-2 ring-[#ff1f8f]/15" : "border-black/10 hover:border-black/25"}`}
                  >
                    <img src={source.url} alt="" className="h-20 w-full rounded-md bg-[#f3f1ed] object-contain" />
                    <span className="mt-2 block truncate text-xs font-medium">{source.label}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedUpload && <p className="mt-3 truncate text-sm text-black/60">Selected upload: {selectedUpload.label}</p>}
            {sourcePreview && (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/45">Original</p>
                  <div className="flex h-56 items-center justify-center overflow-hidden rounded-xl border border-black/[0.07] bg-[#f4f2ef] p-3">
                    <img src={sourcePreview} alt="Original product" className="max-h-full max-w-full object-contain" />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/45">Transparent cutout</p>
                  <div className="flex h-56 items-center justify-center overflow-hidden rounded-xl border border-black/[0.07] p-3" style={{ backgroundImage: "linear-gradient(45deg,#e9e7e3 25%,transparent 25%),linear-gradient(-45deg,#e9e7e3 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e9e7e3 75%),linear-gradient(-45deg,transparent 75%,#e9e7e3 75%)", backgroundSize: "20px 20px", backgroundPosition: "0 0,0 10px,10px -10px,-10px 0" }}>
                    {processedUrl ? <img src={processedUrl} alt="Background-removed product" className="max-h-full max-w-full object-contain" /> : <p className="px-4 text-center text-sm text-black/40">The background-removed product preview will appear here.</p>}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={removeBackground} disabled={!sourcePreview || isBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#171615] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ff1f8f] disabled:cursor-not-allowed disabled:opacity-50">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {processing ? "Removing background…" : processedUrl ? "Reprocess Background" : "Remove Background"}
              </button>
              <button type="button" onClick={useTransparentImage} disabled={!sourcePreview || isBusy} className="min-h-11 rounded-lg border border-black/10 px-4 py-2.5 text-sm font-semibold hover:border-[#ff1f8f] disabled:cursor-not-allowed disabled:opacity-50">
                Use existing transparent image
              </button>
              {processing && <span role="status" className="text-sm text-black/50">Processing securely. This may take a few seconds.</span>}
            </div>
          </section>

          <section className="rounded-xl border border-black/[0.08] bg-white p-4 sm:p-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff1f8f]">Step 2</p>
              <h3 className="mt-1 font-semibold">Style the studio scene</h3>
              <p className="mt-1 text-xs text-black/45">A clean, deterministic composition keeps the product pixels intact.</p>
            </div>

            {processedUrl ? (
              <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-[#f1efec]">
                  <canvas ref={canvasRef} aria-label="Final product photo preview" className="block h-auto w-full" />
                </div>
                <div className="space-y-5">
                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold">Podium style</legend>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
                      {PODIUMS.map((podium) => (
                        <button type="button" key={podium.id} aria-pressed={scene.podium === podium.id} onClick={() => setSceneField("podium", podium.id)} className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium ${scene.podium === podium.id ? "border-[#ff1f8f] bg-[#fff5fa] text-[#bd0065]" : "border-black/10 hover:border-black/30"}`}>
                          {podium.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className="block text-sm font-semibold" htmlFor="photo-studio-background">Background colour
                    <select id="photo-studio-background" value={scene.background} onChange={(event) => setSceneField("background", event.target.value)} className="admin-input mt-2">
                      {BACKGROUNDS.map((background) => <option key={background.id} value={background.id}>{background.label}</option>)}
                    </select>
                  </label>

                  <label className="block text-sm font-semibold" htmlFor="photo-studio-scale">Product size <span className="font-normal text-black/45">{scene.scale}%</span>
                    <input id="photo-studio-scale" type="range" min="70" max="135" value={scene.scale} onChange={(event) => setSceneField("scale", Number(event.target.value))} className="mt-3 w-full accent-[#ff1f8f]" />
                  </label>

                  <label className="block text-sm font-semibold" htmlFor="photo-studio-horizontal">Left / right position
                    <input id="photo-studio-horizontal" type="range" min="-20" max="20" value={scene.horizontal} onChange={(event) => setSceneField("horizontal", Number(event.target.value))} className="mt-3 w-full accent-[#ff1f8f]" />
                  </label>

                  <label className="block text-sm font-semibold" htmlFor="photo-studio-vertical">Up / down position
                    <input id="photo-studio-vertical" type="range" min="-15" max="15" value={scene.vertical} onChange={(event) => setSceneField("vertical", Number(event.target.value))} className="mt-3 w-full accent-[#ff1f8f]" />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setScene((current) => ({ ...current, horizontal: 0, vertical: 0 }))} className="inline-flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold hover:border-[#ff1f8f]">
                      <RotateCcw className="h-4 w-4" /> Recenter product
                    </button>
                    <button type="button" onClick={() => setScene(DEFAULT_SCENE)} className="rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold hover:border-[#ff1f8f]">Reset edits</button>
                  </div>

                  <label className="block text-sm font-semibold" htmlFor="photo-studio-save-target">Use finished photo as
                    <select id="photo-studio-save-target" value={saveTarget} onChange={(event) => setSaveTarget(event.target.value)} className="admin-input mt-2">
                      <option value="main">Main product image</option>
                      <option value="additional">Additional gallery image</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-black/15 bg-[#faf9f7] p-8 text-center text-sm text-black/45">Remove the background to preview podium and lighting options.</div>
            )}
          </section>

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

          <footer className="flex flex-col-reverse justify-between gap-3 border-t border-black/[0.08] pt-4 sm:flex-row sm:items-center">
            <p className="max-w-xl text-xs leading-5 text-black/45">The finished scene is composed locally from the processed cutout. The original product image stays untouched unless saving the new image succeeds.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={downloadImage} disabled={!processedUrl || !sceneReady || isBusy} className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold hover:border-[#ff1f8f] disabled:cursor-not-allowed disabled:opacity-50">
                <Download className="h-4 w-4" /> Download Image
              </button>
              <button type="button" onClick={saveToProduct} disabled={!processedUrl || !sceneReady || isBusy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff1f8f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e60078] disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving photo…" : productId ? "Save to Product" : "Use in Product"}
              </button>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
