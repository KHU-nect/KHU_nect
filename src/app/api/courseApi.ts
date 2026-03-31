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

export async function searchCourses(keyword: string, page = 0, size = 20) {
  const q = new URLSearchParams();
  if (keyword.trim()) q.set("keyword", keyword.trim());
  q.set("page", String(page));
  q.set("size", String(size));
  return apiRequest<CourseSearchResponse>(`/api/courses?${q.toString()}`, {
    auth: false,
  });
}

