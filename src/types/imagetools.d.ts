/* vite-imagetools query imports ending in `&as=picture` return a Picture. */
declare module '*&as=picture' {
  const picture: {
    sources: Record<string, string>;
    img: { src: string; w: number; h: number };
  };
  export default picture;
}
