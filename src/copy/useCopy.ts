import { useCopyContext } from "@/copy/CopyProvider";

export function useCopyValue(copyKey: string, defaultValue: string) {
  const { get } = useCopyContext();
  return get(copyKey, defaultValue);
}
