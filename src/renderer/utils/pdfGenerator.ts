import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

const pdfMakeAny = pdfMake as any;
const pdfMakeObj = pdfMakeAny.default || pdfMakeAny;
const vfsFonts = (pdfFonts as any).default || pdfFonts;

if (pdfMakeObj && vfsFonts && vfsFonts.pdfMake) {
  pdfMakeObj.vfs = vfsFonts.pdfMake.vfs;
}

interface SubSubject {
  title: string;
  content?: string;
}
interface MainSubject {
  title: string;
  subsubjects: SubSubject[];
}
interface Course {
  id: string;
  coursetitle: string;
  mainsubjects: MainSubject[];
}

/**
 * Parses bold, italic, and inline code markers into pdfmake text arrays.
 */
function parseInlineStyles(text: string): Content[] | string {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  if (parts.length === 1 && !/\*.*?\*|`.*?`/.test(text)) {
    return text;
  }

  const styledContent: Content[] = [];
  parts.forEach((part) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      styledContent.push({ text: part.slice(2, -2), bold: true });
    } else {
      const current = part;
      const subParts = current.split(/(`.*?`|\*.*?\*)/g);
      subParts.forEach((sp) => {
        if (sp.startsWith('`') && sp.endsWith('`')) {
          styledContent.push({ text: sp.slice(1, -1), background: '#f4f4f4' });
        } else if (sp.startsWith('*') && sp.endsWith('*')) {
          styledContent.push({ text: sp.slice(1, -1), italics: true });
        } else if (sp) {
          styledContent.push({ text: sp });
        }
      });
    }
  });

  return styledContent;
}

/**
 * Parses basic markdown and converts it to pdfmake Content definitions.
 */
function parseMarkdownToPdfMake(markdown: string): Content[] {
  const blocks = markdown.split(/\n{2,}/);
  const content: Content[] = [];

  blocks.forEach((block) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    // Headings
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)/);
      if (match) {
        const level = match[1].length;
        const text = parseInlineStyles(match[2]);
        content.push({
          text,
          fontSize: 16 - level * 1.5, // H1=14.5, H2=13, H3=11.5, etc.
          bold: true,
          margin: [0, 8, 0, 4],
        });
        return;
      }
    }

    // Unordered Lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items = trimmed.split('\n').map((line) => {
        const parsed = parseInlineStyles(line.replace(/^[-*]\s+/, ''));
        return Array.isArray(parsed) ? { text: parsed } : parsed;
      });
      content.push({
        ul: items,
        margin: [15, 5, 0, 10],
        alignment: 'left',
      });
      return;
    }

    // Ordered Lists
    if (/^\d+\.\s/.test(trimmed)) {
      const items = trimmed.split('\n').map((line) => {
        const parsed = parseInlineStyles(line.replace(/^\d+\.\s+/, ''));
        return Array.isArray(parsed) ? { text: parsed } : parsed;
      });
      content.push({
        ol: items,
        margin: [15, 5, 0, 10],
        alignment: 'left',
      });
      return;
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      const text = parseInlineStyles(trimmed.replace(/^>\s+/gm, ''));
      content.push({
        text,
        italics: true,
        color: '#555555',
        margin: [20, 10, 20, 10],
      });
      return;
    }

    // Code Blocks
    if (trimmed.startsWith('```')) {
      const codeContent = trimmed
        .replace(/^```[\w]*\n/, '')
        .replace(/\n```$/, '');
      content.push({
        text: codeContent,
        fontSize: 8.5,
        background: '#f4f4f4',
        margin: [0, 8, 0, 8],
        alignment: 'left',
      });
      return;
    }

    // Basic Paragraph
    content.push({
      text: parseInlineStyles(trimmed),
      margin: [0, 0, 0, 8],
      alignment: 'justify',
      lineHeight: 1.4,
    });
  });

  return content;
}

/**
 * Generates a full Course PDF and returns it as a base64 encoded string.
 */
const generateCoursePdfAsBase64 = async (course: Course): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const content: Content[] = [];

      // Title Page / Header
      content.push({
        canvas: [
          {
            type: 'rect',
            x: -50,
            y: 100,
            w: 600,
            h: 300,
            color: '#f8fafc',
          },
          {
            type: 'rect',
            x: -50,
            y: 100,
            w: 8,
            h: 300,
            color: '#6366f1',
          },
        ],
        absolutePosition: { x: 50, y: 50 },
      });

      content.push({
        text: course.coursetitle,
        fontSize: 42,
        bold: true,
        color: '#0f172a',
        margin: [20, 150, 20, 20],
        alignment: 'left',
      });

      // Subtitle line
      content.push({
        text: 'Comprehensive Course Material',
        fontSize: 16,
        italics: true,
        color: '#64748b',
        alignment: 'left',
        margin: [20, 0, 0, 60],
        pageBreak: 'after',
      });

      // Table of Contents
      content.push({
        toc: {
          title: { text: 'Table of Contents', style: 'tocTitle' },
          numberStyle: 'tocNumber',
        },
      });

      // Loop over curriculum
      if (course.mainsubjects && course.mainsubjects.length > 0) {
        course.mainsubjects.forEach((mainSubject, mIdx) => {
          content.push({
            text: `Chapter ${mIdx + 1}`.toUpperCase(),
            fontSize: 10,
            bold: true,
            color: '#888888',
            margin: [0, 12, 0, 2],
            pageBreak: 'before',
          });

          content.push({
            text: mainSubject.title,
            fontSize: 16,
            bold: true,
            margin: [0, 0, 0, 10],
            tocItem: true,
            tocMargin: [0, 10, 0, 0],
            tocStyle: 'tocChapter',
          });

          if (mainSubject.subsubjects && mainSubject.subsubjects.length > 0) {
            mainSubject.subsubjects.forEach((subSubject, sIdx) => {
              content.push({
                text: `${mIdx + 1}.${sIdx + 1}. ${subSubject.title}`,
                fontSize: 14,
                bold: true,
                margin: [0, 12, 0, 6],
                tocItem: true,
                tocMargin: [15, 5, 0, 0],
                tocStyle: 'tocTopic',
              });

              if (subSubject.content) {
                const parsedBlocks = parseMarkdownToPdfMake(subSubject.content);
                content.push(...parsedBlocks);
              } else {
                content.push({
                  text: 'Content not generated yet.',
                  italics: true,
                  color: 'gray',
                  margin: [0, 0, 0, 10],
                });
              }
            });
          }
        });
      }

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [50, 60, 50, 60],
        content,
        defaultStyle: {
          fontSize: 10.5,
          lineHeight: 1.4,
          alignment: 'justify',
        },
        footer: (currentPage: number) => {
          if (currentPage === 1) {
            return {
              columns: [
                {
                  text: 'Topic Craft Locally Generated Course',
                  style: 'coverFooter',
                },
                {
                  text: `Generated Edition\n${new Date().toLocaleDateString()}`,
                  style: 'coverFooter',
                  alignment: 'right',
                },
              ],
              margin: [70, 0, 70, 0],
            };
          }
          return {
            text: currentPage.toString(),
            alignment: 'center',
            fontSize: 9,
            margin: [0, 20, 0, 0],
          };
        },
        styles: {
          coverFooter: {
            fontSize: 10,
            color: '#94a3b8',
            bold: true,
          },
          tocTitle: {
            fontSize: 22,
            bold: true,
            margin: [0, 0, 0, 20],
            color: '#333333',
          },
          tocChapter: {
            fontSize: 12,
            bold: true,
            color: '#111827',
          },
          tocTopic: {
            fontSize: 10.5,
            italics: false,
          },
          tocNumber: {
            fontSize: 10.5,
            italics: true,
          },
        },
      };

      const pdfDocGenerator = pdfMakeObj.createPdf(docDefinition);
      pdfDocGenerator.getBase64((base64: string) => {
        resolve(base64);
      });
    } catch (error) {
      reject(error);
    }
  });
};

export default generateCoursePdfAsBase64;
