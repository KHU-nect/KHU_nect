import { apiRequest } from "./client";

export type CourseSummary = {
  id: number;
  courseCode: string;
  courseName: string;
  professorName: string;
  departmentName: string;
  scheduleText: string;
  classroom: string;
  semesterYear: number;
  semesterTerm: string;
  sourceType: string;
};

type CourseSearchResponse = {
  content: CourseSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

export type CourseSearchType = "course_name" | "professor";

async function searchCoursesPaged(keyword: string, page = 0, size = 20) {
  const q = new URLSearchParams();
  if (keyword.trim()) q.set("keyword", keyword.trim());
  q.set("page", String(page));
  q.set("size", String(size));
  return apiRequest<CourseSearchResponse>(`/api/courses?${q.toString()}`, {
    auth: false,
  });
}

async function searchCoursesByType(type: CourseSearchType, keyword: string) {
  const q = new URLSearchParams();
  q.set("type", type);
  q.set("keyword", keyword.trim());
  return apiRequest<CourseSummary[]>(`/api/courses/search?${q.toString()}`, {
    auth: false,
  });
}

function toPagedResponse(content: CourseSummary[], size: number): CourseSearchResponse {
  return {
    content,
    page: 0,
    size,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    hasNext: false,
  };
}

export async function searchCourses(keyword: string, page = 0, size = 20) {
  const normalized = keyword.trim();
  if (normalized.length > 0) {
    try {
      const [byName, byProfessor] = await Promise.all([
        searchCoursesByType("course_name", normalized),
        searchCoursesByType("professor", normalized),
      ]);
      const merged = new Map<number, CourseSummary>();
      [...byName, ...byProfessor].forEach((course) => {
        merged.set(course.id, course);
      });
      return toPagedResponse(Array.from(merged.values()), size);
    } catch {
      return searchCoursesPaged(normalized, page, size);
    }
  }
  return searchCoursesPaged(normalized, page, size);
}

