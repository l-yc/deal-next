export type Slide = {
  content: string;
  notes: string;
}

function newSlideObject(): Slide {
  return {
    content: '',
    notes: '',
  };
}


export type AspectRatio = string;

function isAspectRatio(s: any): s is AspectRatio {
  if (typeof s !== "string") return false;
  let ab = (s as string).split(':');
  if (ab.length !== 2) return false;
  return ab.map(u => parseInt(u)).map(u => u != NaN && u != 0).reduce((a, b) => a && b, true);
}


export type Settings = {
  ratio: string;
  theme: string;
}


export { newSlideObject, isAspectRatio };