import {
  Languages,
  FileText,
  PenLine,
  GraduationCap,
  Mail,
  Lightbulb,
  Microscope,
  Code2,
  MessageSquare,
} from "lucide-react";

// Every chat mode. The backend has the matching system prompts.
export const MODES = {
  chat: {
    label: "ChatGPT",
    icon: MessageSquare,
    placeholder: "Ask anything",
  },
  deep_research: {
    label: "Deep research",
    icon: Microscope,
    placeholder: "What should I research?",
  },
  codex: {
    label: "Codex",
    icon: Code2,
    placeholder: "Describe the code you need or paste a bug",
  },
  translator: {
    label: "Translator",
    icon: Languages,
    placeholder: "Paste text and say which language, e.g. 'to Amharic: ...'",
  },
  summarizer: {
    label: "Summarizer",
    icon: FileText,
    placeholder: "Paste the text you want summarized",
  },
  writer: {
    label: "Writing helper",
    icon: PenLine,
    placeholder: "Paste a draft or describe what to write",
  },
  tutor: {
    label: "Study tutor",
    icon: GraduationCap,
    placeholder: "What do you want to learn?",
  },
  email: {
    label: "Email writer",
    icon: Mail,
    placeholder: "Who is it for and what should it say?",
  },
  brainstorm: {
    label: "Brainstorm",
    icon: Lightbulb,
    placeholder: "What do you need ideas for?",
  },
};

export const APPS = [
  { mode: "translator", description: "Translate text between languages, including Amharic." },
  { mode: "summarizer", description: "Turn long text into a short summary with key points." },
  { mode: "writer", description: "Draft, rewrite and polish any piece of writing." },
  { mode: "tutor", description: "Learn any topic step by step with examples." },
  { mode: "email", description: "Get a subject line and a ready-to-send email." },
  { mode: "brainstorm", description: "Generate and group fresh ideas quickly." },
];

export const modeOf = (mode) => MODES[mode] || MODES.chat;
