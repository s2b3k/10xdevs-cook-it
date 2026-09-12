import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps {
  icon: ReactNode;
  children: ReactNode;
}

export function SubmitButton({ icon, children }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      className="w-full rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-500"
    >
      <span className="flex items-center gap-2">
        {icon}
        {children}
      </span>
    </Button>
  );
}
