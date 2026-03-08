import crypto from 'crypto';
import {
  readCourses,
  writeCourses,
  getCourseById,
  updateCourse,
  Course,
  MainSubject,
  SubSubject,
} from '../store';

const GEMINI_HEADERS = {
  'X-API-KEY': 'your_api_key_here',
  'Content-Type': 'application/json',
};

export class CoursesService {
  async getCourses(): Promise<Course[]> {
    return readCourses();
  }

  async getCourse(id: string): Promise<Course | undefined> {
    return getCourseById(id);
  }

  async createCourse(coursetitle: string): Promise<Course> {
    const newCourse: Course = {
      id: crypto.randomUUID(),
      coursetitle,
      mainsubjects: [],
    };

    const courses = readCourses();
    courses.push(newCourse);
    writeCourses(courses);

    // Call background curriculum fetcher
    setImmediate(() => {
      this.fetchCurriculum(newCourse.id, coursetitle);
    });

    return newCourse;
  }

  async deleteCourse(id: string): Promise<void> {
    const courses = readCourses();
    const filtered = courses.filter((c) => c.id !== id);
    writeCourses(filtered);
  }

  private async fetchCurriculum(courseId: string, coursetitle: string) {
    try {
      console.log(`[Gemini API] Fetching curriculum for "${coursetitle}" from http://localhost:8000/gemini/learning-path...`);
      const response = await fetch(
        'http://localhost:8000/gemini/learning-path',
        {
          method: 'POST',
          headers: GEMINI_HEADERS,
          body: JSON.stringify({ topic: coursetitle }),
        },
      );

      console.log(`[Gemini API] Received response for curriculum fetch. Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        console.error(`[Gemini API] API error for curriculum fetch:`, { status: response.status, statusText: response.statusText });
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      console.log(`[Gemini API] Parsed response data for curriculum fetch:`, JSON.stringify(data).substring(0, 150) + '...');
      
      const rawArray: any[] =
        data.main_subjects ??
        data.mainsubjects ??
        data.subjects ??
        data.topics ??
        [];

      if (!rawArray || !Array.isArray(rawArray) || rawArray.length === 0) {
        console.warn(`[Gemini API] Warning: returned no curriculum for "${coursetitle}". Raw array was empty or invalid. Data received:`, data);
        return;
      }

      const mainsubjects: MainSubject[] = rawArray.map((s: any) => ({
        title: s.title,
        subsubjects: (s.sub_subjects ?? s.subsubjects ?? []).map(
          (t: string | any) =>
            typeof t === 'string'
              ? { title: t, content: '' }
              : { title: t.title, content: t.content ?? '' },
        ),
      }));

      updateCourse(courseId, { mainsubjects });
      console.log(`Curriculum saved for "${coursetitle}"`);

      // Start generating content in background
      this.generateAllContent(courseId, coursetitle, mainsubjects);
    } catch (err) {
      console.error(`Curriculum fetch failed for ${courseId}:`, err);
    }
  }

  private async generateAllContent(
    courseId: string,
    coursetitle: string,
    mainsubjects: MainSubject[],
  ) {
    for (let mIdx = 0; mIdx < mainsubjects.length; mIdx++) {
      const mainSubject = mainsubjects[mIdx];
      for (let sIdx = 0; sIdx < mainSubject.subsubjects.length; sIdx++) {
        const sub = mainSubject.subsubjects[sIdx];
        if (sub.content) continue; // Already generated

        try {
          console.log(
            `[Gemini API] Generating content: [${mIdx + 1}/${mainsubjects.length}] "${mainSubject.title}" > "${sub.title}" from http://localhost:8000/gemini/sub-subject-content`,
          );
          const res = await fetch(
            'http://localhost:8000/gemini/sub-subject-content',
            {
              method: 'POST',
              headers: GEMINI_HEADERS,
              body: JSON.stringify({
                topic: coursetitle,
                main_subject: mainSubject.title,
                sub_subject: sub.title,
              }),
            },
          );

          console.log(`[Gemini API] Received response for content generation. Status: ${res.status} ${res.statusText}`);

          if (!res.ok) {
            console.error(`[Gemini API] API error for content generation:`, { status: res.status, statusText: res.statusText });
            throw new Error(`Gemini API error: ${res.statusText}`);
          }

          const data: any = await res.json();
          console.log(`[Gemini API] Parsed response data for content:`, typeof data === 'object' ? JSON.stringify(data).substring(0, 150) + '...' : String(data).substring(0, 150));
          if (data?.success && data?.content) {
            const fresh = getCourseById(courseId);
            if (
              fresh?.mainsubjects?.[mIdx]?.subsubjects?.[sIdx] !== undefined
            ) {
              fresh.mainsubjects[mIdx].subsubjects[sIdx].content = data.content;
              updateCourse(courseId, { mainsubjects: fresh.mainsubjects });
              console.log(`Content saved: "${sub.title}"`);
            }
          }
        } catch (err) {
          console.error(`Content gen failed for "${sub.title}":`, err);
        }
      }
    }
    console.log(`All content generation complete for course ${courseId}`);
  }

  async regenerateSubSubjectContent(
    courseId: string,
    mainIdx: number,
    subIdx: number,
  ): Promise<{ message: string }> {
    const course = await this.getCourse(courseId);
    if (!course) return { message: 'Course not found' };

    const mainSubject = course.mainsubjects?.[mainIdx];
    const sub = mainSubject?.subsubjects?.[subIdx];
    if (!mainSubject || !sub) return { message: 'Sub-subject not found' };

    course.mainsubjects[mainIdx].subsubjects[subIdx].content = '';
    updateCourse(courseId, { mainsubjects: course.mainsubjects });

    setImmediate(async () => {
      try {
        console.log(`[Gemini API] Regenerating: "${mainSubject.title}" > "${sub.title}" from http://localhost:8000/gemini/sub-subject-content`);
        const res = await fetch(
          'http://localhost:8000/gemini/sub-subject-content',
          {
            method: 'POST',
            headers: GEMINI_HEADERS,
            body: JSON.stringify({
              topic: course.coursetitle,
              main_subject: mainSubject.title,
              sub_subject: sub.title,
            }),
          },
        );

        console.log(`[Gemini API] Received response for regeneration. Status: ${res.status} ${res.statusText}`);

        if (!res.ok) {
          console.error(`[Gemini API] API error for regeneration:`, { status: res.status, statusText: res.statusText });
          throw new Error(`API error: ${res.statusText}`);
        }
        
        const data: any = await res.json();
        console.log(`[Gemini API] Parsed response data for regeneration:`, typeof data === 'object' ? JSON.stringify(data).substring(0, 150) + '...' : String(data).substring(0, 150));

        if (data?.success && data?.content) {
          const fresh = getCourseById(courseId);
          if (
            fresh?.mainsubjects?.[mainIdx]?.subsubjects?.[subIdx] !== undefined
          ) {
            fresh.mainsubjects[mainIdx].subsubjects[subIdx].content =
              data.content;
            updateCourse(courseId, { mainsubjects: fresh.mainsubjects });
            console.log(`Regeneration done: "${sub.title}"`);
          }
        }
      } catch (err) {
        console.error(`Regeneration failed for "${sub.title}":`, err);
      }
    });

    return { message: `Regenerating content for "${sub.title}"` };
  }
}

export const coursesService = new CoursesService();
