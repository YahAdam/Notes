import type { IconProps } from "../../types";
import { BaseIcon } from "../BaseIcon";

export function TrashIcon({
  size = 20,
  color = "currentColor",
  ...props
}: IconProps) {
  return (
    <BaseIcon viewBox="0 0 24 24" size={size} color={color} {...props}>
      <path
        fill="currentColor"
        d="M9 3a2 2 0 0 0-2 2v1H4a1 1 0 1 0 0 2h1v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8h1a1 1 0 1 0 0-2h-3V5a2 2 0 0 0-2-2H9Zm6 3H9V5h6v1ZM7 8h10v11H7V8Zm2 2a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-5a1 1 0 0 1 1-1Zm6 0a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-5a1 1 0 0 1 1-1Zm-3 0a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-5a1 1 0 0 1 1-1Z"
      />
    </BaseIcon>
  );
}
