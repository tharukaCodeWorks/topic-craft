import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface Comment {
  id: string;
  text: string;
  author: 'user' | 'ai';
  timestamp: number;
}

export interface SubSubject {
  title: string;
  content?: string;
  comments?: Comment[];
}

export interface MainSubject {
  title: string;
  subsubjects: SubSubject[];
}

export interface Course {
  id: string;
  coursetitle: string;
  mainsubjects: MainSubject[];
}

const getStorePath = () => path.join(app.getPath('userData'), 'courses.json');

export const readCourses = (): Course[] => {
  try {
    const dataPath = getStorePath();
    if (!fs.existsSync(dataPath)) {
      return [];
    }
    const data = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read courses from local store:', err);
    return [];
  }
};

export const writeCourses = (courses: Course[]): void => {
  try {
    const dataPath = getStorePath();
    fs.writeFileSync(dataPath, JSON.stringify(courses, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write courses to local store:', err);
  }
};

export const getCourseById = (id: string): Course | undefined => {
  const courses = readCourses();
  return courses.find((c) => c.id === id);
};

export const updateCourse = (
  id: string,
  updates: Partial<Course>,
): Course | undefined => {
  const courses = readCourses();
  const index = courses.findIndex((c) => c.id === id);
  if (index === -1) return undefined;

  courses[index] = { ...courses[index], ...updates };
  writeCourses(courses);
  return courses[index];
};
