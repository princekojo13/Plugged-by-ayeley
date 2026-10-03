import * as React from "react";
import { cn } from "@/lib/utils";

const FALLBACK_IMAGE_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23f3f4f6'/%3E%3Cpath d='M240 430l120-140 90 100 70-80 140 120H240z' fill='%23d1d5db'/%3E%3Ccircle cx='520' cy='220' r='45' fill='%23d1d5db'/%3E%3C/svg%3E";

const Image = React.forwardRef(
  (
    {
      src,
      alt = "",
      fittingType = "fill",
      className,
      style,
      onError,
      onLoad,
      ...props
    },
    ref
  ) => {
    const [imageSrc, setImageSrc] = React.useState(src || FALLBACK_IMAGE_URL);
    const [failed, setFailed] = React.useState(false);

    React.useEffect(() => {
      setImageSrc(src || FALLBACK_IMAGE_URL);
      setFailed(false);
    }, [src]);

    const handleError = (event) => {
      if (!failed && imageSrc !== FALLBACK_IMAGE_URL) {
        setFailed(true);
        setImageSrc(FALLBACK_IMAGE_URL);
      }

      onError?.(event);
    };

    return (
      <img
        ref={ref}
        src={imageSrc}
        alt={alt}
        loading="lazy"
        className={cn(
          "max-w-full",
          fittingType === "fit" ? "object-contain" : "object-cover",
          className
        )}
        style={style}
        onLoad={onLoad}
        onError={handleError}
        {...props}
      />
    );
  }
);

Image.displayName = "Image";

export { Image };