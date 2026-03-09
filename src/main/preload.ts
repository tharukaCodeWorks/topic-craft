// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  windowControls: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    openDevTools: () => ipcRenderer.send('window-open-dev-tools'),
    close: () => ipcRenderer.send('window-close'),
    savePdf: (title?: string, base64Data?: string) =>
      ipcRenderer.invoke('window-save-pdf', title, base64Data),
  },
  courses: {
    getCourses: () => ipcRenderer.invoke('courses:getCourses'),
    getCourse: (id: string) => ipcRenderer.invoke('courses:getCourse', id),
    createCourse: (title: string) =>
      ipcRenderer.invoke('courses:createCourse', title),
    deleteCourse: (id: string) =>
      ipcRenderer.invoke('courses:deleteCourse', id),
    regenerateSubSubjectContent: (
      courseId: string,
      mainIdx: number,
      subIdx: number,
    ) =>
      ipcRenderer.invoke(
        'courses:regenerateSubSubjectContent',
        courseId,
        mainIdx,
        subIdx,
      ),
    addComment: (
      courseId: string,
      mainIdx: number,
      subIdx: number,
      text: string,
    ) =>
      ipcRenderer.invoke('courses:addComment', courseId, mainIdx, subIdx, text),
    addMainSubject: (courseId: string, title: string) =>
      ipcRenderer.invoke('courses:addMainSubject', courseId, title),
    addSubSubject: (courseId: string, mainIdx: number, title: string) =>
      ipcRenderer.invoke('courses:addSubSubject', courseId, mainIdx, title),
  },
  cli: {
    checkNode: () => ipcRenderer.invoke('cli:checkNode'),
    checkInstallation: () => ipcRenderer.invoke('cli:checkInstallation'),
    checkAuth: () => ipcRenderer.invoke('cli:checkAuth'),
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
