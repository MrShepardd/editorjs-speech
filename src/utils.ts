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

export const splitAt = (index: number) => (x: string) =>
  [x.slice(0, index), x.slice(index)];

/**
 * Sets cursor to the end of element's content
 *
 * @param element - element to set selection in
 */
export function setSelectionAt(element: HTMLElement, position: number): void {
  const selection = window.getSelection();
  const range = new Range();

  range.setStart(element.childNodes[0], position);
  range.collapse(true);

  selection?.removeAllRanges();
  selection?.addRange(range);
}

/**
 * Stop event propagation:
 *
 * @param {Event} event - event.
 */
export function stopEvent(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}

/**
 * Returns current selected element and caret position
 *
 * @param {string} selector - selector name
 * @returns {[Element, number] | [null, number]}
 */
export function findSelectedElement(
  selector: string
): [Element, number] | [null, number] {
  const selection = window.getSelection();

  let currentNode = selection?.anchorNode;

  if (!selection || !currentNode) {
    return [null, 0];
  }

  if (currentNode.nodeType !== Node.ELEMENT_NODE) {
    currentNode = currentNode.parentNode;
  }

  return (
    [
      (currentNode as Element).closest(`.${selector}`),
      selection.anchorOffset,
    ] || [null, 0]
  );
}

/**
 * @description Converts a string variable to hex code.
 * @param {String} str
 * @note Used from ChakraUI
 * @returns {String}
 */
export function string2Hex (str: string): string {
  let hash = 0;
  if (str.length === 0) return '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  let color = '#';
  for (let j = 0; j < 3; j++) {
    const value = (hash >> (j * 8)) & 255;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}

/**
 * @description Generate Avatar initials from name string
 * @param {String} name
 * @returns {String} Avatar Initials
 */
export function getInitials(name: string): string {
  const [firstName, lastName] = name.split(' ');

  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  } else {
    return firstName.charAt(0);
  }
}