// A photo that fades in once it has decoded (styles/motion.css, .esy-img),
// rather than snapping in line by line. One already in the browser's cache
// is marked at once, so it never fades from nothing.
//
//   <img className="esy-img" ref={markIfComplete} onLoad={markLoaded} … />
export const markLoaded = (e) => {
  e.currentTarget.dataset.loaded = '';
};

export const markIfComplete = (img) => {
  if (img && img.complete && img.naturalWidth > 0) img.dataset.loaded = '';
};
