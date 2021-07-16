export type Slide = {
  content: string;
  notes: string;
}

export type Settings = {
  ratio: string;
  theme: string;
}

function newSlideObject(): Slide {
  return {
    content: '',
    notes: '',
  };
}

export { newSlideObject };