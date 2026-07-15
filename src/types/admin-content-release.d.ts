declare module "@admin-content-release" {
  const release: {
    readonly releaseId: string | null;
    readonly releaseNumber: number | null;
    readonly entries: Readonly<
      Record<
        string,
        {
          readonly kind: string;
          readonly data: Record<string, unknown>;
        }
      >
    >;
  };
  export default release;
}
