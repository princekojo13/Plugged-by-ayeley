import * as React from "react";
import fallbackImage from "@/assets/product-placeholder.svg";
import { cn } from "@/lib/utils";

const FALLBACK_IMAGE_URL = fallbackImage;

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
