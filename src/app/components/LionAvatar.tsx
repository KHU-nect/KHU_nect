interface LionAvatarProps {
  department: string;
  size?: "xs" | "sm" | "md" | "lg";
  accessories?: {
    hat?: string;
    glasses?: string;
    background?: string;
  };
}

const departmentColors: Record<string, string> = {
  경영학과: "#3B82F6",
  컴퓨터공학과: "#8B5CF6",
  국제학과: "#10B981",
  산업경영공학과: "#F59E0B",
  전자공학과: "#EF4444",
  음악학과: "#EC4899",
  응용수학과: "#14B8A6",
  건축학과: "#6366F1",
  생명과학과: "#22C55E",
  한의학과: "#84CC16",
  도예학과: "#A71930",
  기계공학과: "#64748B",
  영어학과: "#06B6D4",
  화학과: "#8B5CF6",
  물리학과: "#0EA5E9",
  체육학과: "#F97316",
  경제학과: "#14B8A6",
  사회학과: "#A855F7",
  법학과: "#1E293B",
  심리학과: "#FB923C",
};

const sizeClasses = {
  xs: "w-7 h-7 text-base",
  sm: "w-9 h-9 text-xl",
  md: "w-12 h-12 text-2xl",
  lg: "w-16 h-16 text-3xl",
};

const accessorySizes = {
  xs: { hat: "text-sm -top-1", glasses: "text-xs", bg: "text-xl" },
  sm: { hat: "text-base -top-1", glasses: "text-sm", bg: "text-2xl" },
  md: { hat: "text-xl -top-2", glasses: "text-lg", bg: "text-4xl" },
  lg: { hat: "text-3xl -top-3", glasses: "text-2xl", bg: "text-6xl" },
};

export function LionAvatar({ department, size = "md", accessories }: LionAvatarProps) {
  const color = departmentColors[department] || "#9CA3AF";
  const accessorySize = accessorySizes[size];

  return (
    <div className="relative inline-block">
      {/* Background Effect */}
      {accessories?.background && (
        <div className={`absolute inset-0 flex items-center justify-center ${accessorySize.bg} opacity-20 pointer-events-none`}>
          {accessories.background}
        </div>
      )}
      
      {/* Main Avatar */}
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center relative z-10`}
        style={{ backgroundColor: color }}
      >
        <span className="select-none">🦁</span>
        
        {/* Glasses */}
        {accessories?.glasses && (
          <div className={`absolute ${accessorySize.glasses} z-20`}>
            {accessories.glasses}
          </div>
        )}
      </div>

      {/* Hat */}
      {accessories?.hat && (
        <div className={`absolute left-1/2 -translate-x-1/2 ${accessorySize.hat} z-20`}>
          {accessories.hat}
        </div>
      )}
    </div>
  );
}