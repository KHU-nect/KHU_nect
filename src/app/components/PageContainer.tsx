import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className = "" }: Props) {
  return (
    <div
      className={`min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto md:max-w-2xl lg:max-w-3xl ${className}`}
    >
      {children}
    </div>
  );
}

