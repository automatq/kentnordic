import { getPicture } from '@/lib/photos';

interface PicProps {
  photoKey: string | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
}

/**
 * Renders a registry photo as <picture> with AVIF/WebP sources and a JPEG
 * fallback. `className` lands on the inner <img>, so existing image styles
 * (object-fit, aspect, hover zoom) keep working unchanged.
 */
export default function Pic({ photoKey, alt, className, sizes = '100vw', loading = 'lazy', fetchPriority }: PicProps) {
  const picture = getPicture(photoKey);
  return (
    <picture>
      {Object.entries(picture.sources).map(([format, srcSet]) => (
        <source key={format} type={`image/${format}`} srcSet={srcSet} sizes={sizes} />
      ))}
      <img
        src={picture.img.src}
        width={picture.img.w}
        height={picture.img.h}
        alt={alt}
        className={className}
        sizes={sizes}
        loading={loading}
        fetchPriority={fetchPriority}
      />
    </picture>
  );
}
