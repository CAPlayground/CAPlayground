
declare global {
  interface Window {
    chrome: any;
  }
}

export function isChromiumBrowser(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent.toLowerCase();

  const isChrome = /chrome/.test(userAgent) && !/edg/.test(userAgent);
  const isEdge = /edg/.test(userAgent);
  const isOpera = /opr/.test(userAgent) || /opera/.test(userAgent);

  const hasChromeObject = !!window.chrome;

  return isChrome || isEdge || isOpera || hasChromeObject;
}
