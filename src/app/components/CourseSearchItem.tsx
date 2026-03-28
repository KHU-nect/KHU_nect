import { Plus } from "lucide-react";
import type { CatalogCourse } from "../mocks/availableCourses";

export function CourseSearchItem({
  course,
  onAdd,
  isAdded,
}: {
  course: CatalogCourse;
  onAdd: (course: CatalogCourse) => void;
  isAdded: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-800 text-sm mb-1 truncate">{course.name}</h3>
        <p className="text-xs text-gray-500 mb-1">{course.professor} 교수님</p>
        <p className="text-xs text-gray-400">
          {course.time} · {course.room}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onAdd(course)}
        disabled={isAdded}
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
        style={{
          backgroundColor: isAdded ? "#E5E7EB" : "#FDF5E6",
          color: isAdded ? "#9CA3AF" : "#A71930",
        }}
      >
        <Plus className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
