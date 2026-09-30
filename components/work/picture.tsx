import type { MediaView } from "@/lib/media";

// Responsive image: AVIF first, WebP fallback, cropped around the focal point.
export function Picture({
  media,
  sizes,
  className,
  imgClassName,
  priority,
  alt,
}: {
  media: MediaView;
  sizes: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  alt?: string;
}) {
  const position = `${media.focalX * 100}% ${media.focalY * 100}%`;
  return (
    <picture className={className}>
      {media.srcSetAvif ? <source type="image/avif" srcSet={media.srcSetAvif} sizes={sizes} /> : null}
      {media.srcSet ? <source type="image/webp" srcSet={media.srcSet} sizes={sizes} /> : null}
      <img
        src={media.largest ?? media.url}
        alt={alt ?? media.alt}
        width={media.width ?? undefined}
        height={media.height ?? undefined}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={imgClassName}
        style={{ objectPosition: position }}
      />
    </picture>
  );
}

/** Striped stand-in, shown only in preview so editors can see what's missing. */
export function MissingMedia({ label, className }: { label: string; className?: string }) {
  return (
    <div className={`media-missing ${className ?? ""}`}>
      <span>{label}</span>
    </div>
  );
}
