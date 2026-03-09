import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import { getResolvedEnv } from './cli';
import {
  readCourses,
  writeCourses,
  getCourseById,
  updateCourse,
  Course,
  MainSubject,
  SubSubject,
  Comment,
} from '../store';

const execAsync = promisify(exec);

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
      console.log(`[Gemini CLI] Generating curriculum for "${coursetitle}"...`);
      const env = await getResolvedEnv();
      
      const learningPathPrompt = `You must return ONLY valid JSON.
Do not include markdown.
Do not include explanations.
Do not include extra text.

Return the response in this exact format:

{
  "course_title": string,
  "main_subjects": [
    {
      "title": string,
      "sub_subjects": [string]
    }
  ]
}

Create a detailed learning path for ${coursetitle}
Break it into main subjects and sub subjects.`;

      const { stdout } = await execAsync(`gemini run "${learningPathPrompt.replace(/"/g, '\\"')}"`, { 
        env,
        maxBuffer: 1024 * 1024 * 10 // 10MB
      });

      let raw = stdout.trim();
      // Strip markdown code fences if present (e.g. ```json ... ```)
      raw = raw.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();

      const data = JSON.parse(raw);
      console.log(`[Gemini CLI] Parsed curriculum data:`, JSON.stringify(data).substring(0, 150) + '...');
      
      const rawArray: any[] = data.main_subjects ?? [];

      if (!rawArray || !Array.isArray(rawArray) || rawArray.length === 0) {
        console.warn(`[Gemini CLI] Warning: returned no curriculum for "${coursetitle}". Raw array was empty or invalid.`);
        return;
      }

      const mainsubjects: MainSubject[] = rawArray.map((s: any) => ({
        title: s.title,
        subsubjects: (s.sub_subjects ?? []).map((t: string | any) =>
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
      console.error(`Curriculum generation failed for ${courseId}:`, err);
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
            `[Gemini CLI] Generating content: [${mIdx + 1}/${mainsubjects.length}] "${mainSubject.title}" > "${sub.title}"`,
          );
          
          await this.generateSubSubjectContentInternal(courseId, coursetitle, mainSubject.title, sub.title, mIdx, sIdx);
        } catch (err) {
          console.error(`Content gen failed for "${sub.title}":`, err);
        }
      }
    }
    console.log(`All content generation complete for course ${courseId}`);
  }

  private async generateSubSubjectContentInternal(
    courseId: string,
    coursetitle: string,
    mainSubjectTitle: string,
    subSubjectTitle: string,
    mIdx: number,
    sIdx: number
  ) {
    const env = await getResolvedEnv();
    const contentPrompt = `
Write a complete structured lesson for:

Topic: ${coursetitle}
Main Subject: ${mainSubjectTitle}
Sub Subject: ${subSubjectTitle}

Structure the response like this:

# ${subSubjectTitle}

## Overview
Clear explanation.

## Key Concepts
Bullet points.

## Detailed Explanation
In-depth explanation.

## Examples
Include practical examples. 
STRICT RULE: Add code or pseudo-code ONLY if the Topic, Main Subject, or Sub Subject is strictly related to programming. If the topic is not related to programming, DO NOT include any code or pseudo-code in the examples or anywhere else in the lesson.

## Practice Exercises
Add 3–5 exercises.

Do NOT return JSON.
Do NOT include extra commentary.
Just return the lesson content.
`;

    const { stdout } = await execAsync(`gemini run "${contentPrompt.replace(/"/g, '\\"')}"`, { 
      env,
      maxBuffer: 1024 * 1024 * 10 // 10MB
    });

    const content = stdout.trim();
    if (content) {
      const fresh = getCourseById(courseId);
      if (fresh?.mainsubjects?.[mIdx]?.subsubjects?.[sIdx] !== undefined) {
        fresh.mainsubjects[mIdx].subsubjects[sIdx].content = content;
        updateCourse(courseId, { mainsubjects: fresh.mainsubjects });
        console.log(`Content saved: "${subSubjectTitle}"`);
      }
    }
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
        console.log(`[Gemini CLI] Regenerating: "${mainSubject.title}" > "${sub.title}"`);
        await this.generateSubSubjectContentInternal(
          courseId, 
          course.coursetitle, 
          mainSubject.title, 
          sub.title, 
          mainIdx, 
          subIdx
        );
      } catch (err) {
        console.error(`Regeneration failed for "${sub.title}":`, err);
      }
    });

    return { message: `Regenerating content for "${sub.title}"` };
  }

  async addComment(
    courseId: string,
    mainIdx: number,
    subIdx: number,
    text: string,
  ): Promise<Comment> {
    const course = getCourseById(courseId);
    if (!course) throw new Error('Course not found');

    const sub = course.mainsubjects?.[mainIdx]?.subsubjects?.[subIdx];
    if (!sub) throw new Error('Sub-subject not found');

    const userComment: Comment = {
      id: crypto.randomUUID(),
      text,
      author: 'user',
      timestamp: Date.now(),
    };

    if (!sub.comments) sub.comments = [];
    sub.comments.push(userComment);
    updateCourse(courseId, { mainsubjects: course.mainsubjects });

    // Generate AI response in background
    setImmediate(() => {
      this.generateCommentResponse(
        courseId,
        mainIdx,
        subIdx,
        text,
        course.coursetitle,
        sub.title,
        sub.content,
      );
    });

    return userComment;
  }

  private async generateCommentResponse(
    courseId: string,
    mainIdx: number,
    subIdx: number,
    userQuestion: string,
    courseTitle: string,
    subSubjectTitle: string,
    subSubjectContent?: string,
  ) {
    try {
      const env = await getResolvedEnv();
      const prompt = `
You are an expert tutor answering a student's question about a specific topic in a course.

Course: ${courseTitle}
Topic: ${subSubjectTitle}
Lesson Content for Context:
${subSubjectContent || 'No specific lesson content provided.'}

Student Question: ${userQuestion}

Provide a helpful, clear, and accurate answer to the student's question based on the Lesson Content and course context.
Use Markdown formatting for your answer.

CRITICAL: Provide ONLY the direct answer. Do not include any internal reasoning, search plans, or meta-talk about how you are generating the answer.
`;

      const { stdout } = await execAsync(`gemini run "${prompt.replace(/"/g, '\\"')}"`, { 
        env,
        maxBuffer: 1024 * 1024 * 10 // 10MB
      });

      const aiText = stdout.trim();
      if (aiText) {
        const fresh = getCourseById(courseId);
        const sub = fresh?.mainsubjects?.[mainIdx]?.subsubjects?.[subIdx];
        if (sub) {
          const aiComment: Comment = {
            id: crypto.randomUUID(),
            text: aiText,
            author: 'ai',
            timestamp: Date.now(),
          };
          if (!sub.comments) sub.comments = [];
          sub.comments.push(aiComment);
          updateCourse(courseId, { mainsubjects: fresh!.mainsubjects });
        }
      }
    } catch (err) {
      console.error('Failed to generate AI comment response:', err);
    }
  }

  async addMainSubject(courseId: string, title: string): Promise<MainSubject> {
    const course = getCourseById(courseId);
    if (!course) throw new Error('Course not found');

    const newMain: MainSubject = {
      title,
      subsubjects: [],
    };

    if (!course.mainsubjects) course.mainsubjects = [];
    course.mainsubjects.push(newMain);
    updateCourse(courseId, { mainsubjects: course.mainsubjects });

    return newMain;
  }

  async addSubSubject(
    courseId: string,
    mainIdx: number,
    title: string,
  ): Promise<SubSubject> {
    const course = getCourseById(courseId);
    if (!course) throw new Error('Course not found');

    const mainSubject = course.mainsubjects?.[mainIdx];
    if (!mainSubject) throw new Error('Main subject not found');

    const newSub: SubSubject = {
      title,
      content: '',
    };

    if (!mainSubject.subsubjects) mainSubject.subsubjects = [];
    mainSubject.subsubjects.push(newSub);
    const subIdx = mainSubject.subsubjects.length - 1;

    updateCourse(courseId, { mainsubjects: course.mainsubjects });

    // Trigger content generation in background
    setImmediate(() => {
      this.generateSubSubjectContentInternal(
        courseId,
        course.coursetitle,
        mainSubject.title,
        title,
        mainIdx,
        subIdx,
      );
    });

    return newSub;
  }
}

export const coursesService = new CoursesService();
