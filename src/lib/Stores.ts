import { writable } from 'svelte/store';
import type { Meta, Settings, Slide } from "./DataTypes";

// config
export const meta = writable({
  title: "Untitled",
  author: "Anonymous",
} as Meta);

export const settings = writable({
  ratio: "4:3",
  theme: "default",
} as Settings);

export const slides = writable([
  { content: "", notes: "" }
] as Slide[]);

//for (let i = 0; i < 5; ++i) slides.push({ content: "# " + i, notes: ""});
