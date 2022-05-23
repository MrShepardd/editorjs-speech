/**
 * Helper for making Elements with attributes
 *
 * @param  {string} tagName           - new Element tag name
 * @param  {Array|string} classNames  - list or name of CSS classname(s)
 * @param  {object} properties        - any properties
 * @param  {object} attributes        - any attributes
 * @returns {Element}
 */
export function make<E extends HTMLElement = HTMLElement>(
  tagName: string,
  classNames: string | string[] = '',
  properties: Partial<E> = {},
  attributes: Record<string, string> = {}
): E {
  const el = document.createElement(tagName) as E;

  if (Array.isArray(classNames)) {
    el.classList.add(...classNames);
  } else if (classNames) {
    el.classList.add(classNames);
  }

  Object.entries(properties).forEach(([propName, value]) => {
    el[propName as keyof typeof el] = value;
  });

  Object.entries(attributes).forEach(([attrName, value]) => {
    el.setAttribute(attrName, value);
  });

  return el;
}

/**
 * Get UTC Date from timestamp
 *
 * @param  {number} timestamp - timestamp
 * @returns {Date}
 */
function getUTCDateFromTimestamp(timestamp: number): Date {
  const date = new Date(timestamp * 1000);
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
}

/**
 * Formatter for timestamp
 *
 * @param  {number} timestamp - original timestamp
 * @returns {string}
 */
export function formatTimestamp(timestamp: number): string {
  const utcDate = getUTCDateFromTimestamp(timestamp);

  const hours = timestamp > 3600 ? utcDate.getHours() + ':' : '';
  const minutes = '0' + utcDate.getMinutes();
  const seconds = '0' + utcDate.getSeconds();

  return hours + minutes.substr(-2) + ':' + seconds.substr(-2);
}

/**
 * Clear word from &nbsp; and spaces
 *
 * @param  {string} word - word from speech
 * @param {boolean} trimStart - should trim space from start of word
 * @returns {string}
 */
export function trimWord(word: string, trimStart = true): string {
  return trimStart
    ? word.replace(/&nbsp;|\s/gi, ' ').trim()
    : word.replace(/&nbsp;|\s/gi, ' ').trimEnd();
}
