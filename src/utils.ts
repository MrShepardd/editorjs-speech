import Color from 'color';

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
export function trimWord(word: string | null, trimStart = true): string {
  word = word || '';
  return trimStart
    ? word.replace(/&nbsp;|\s/gi, ' ').trim()
    : word.replace(/&nbsp;|\s/gi, ' ').trimEnd();
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
export function findSelectedElement(selector: string): {
  node: Element | null;
  anchorOffset: number;
  isCollapsed: boolean;
  isAllTextSelected: boolean;
} {
  const defaultResult = {
    node: null,
    anchorOffset: 0,
    isCollapsed: false,
    isAllTextSelected: false,
  };

  const selection = window.getSelection();
  let anchorNode = selection?.anchorNode;
  let focusNode = selection?.focusNode;

  if (!selection || !anchorNode || !focusNode) {
    return defaultResult;
  }

  if (anchorNode.nodeType !== Node.ELEMENT_NODE) {
    anchorNode = anchorNode.parentNode;
    focusNode = focusNode.parentNode;
  }

  anchorNode = (anchorNode as Element).closest(`.${selector}`);
  focusNode = (focusNode as Element).closest(`.${selector}`);

  const isAllTextSelected =
    anchorNode === anchorNode?.parentNode?.firstChild &&
    focusNode === anchorNode?.parentNode?.lastChild &&
    selection.anchorOffset === 1 &&
    selection.focusOffset === focusNode?.textContent?.length;

  return {
    node: anchorNode as Element,
    anchorOffset: selection.anchorOffset,
    isCollapsed: selection.isCollapsed,
    isAllTextSelected,
  };
}

/**
 * The base implementation of `_.propertyOf` without support for deep paths.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Function} Returns the new accessor function.
 */
function basePropertyOf(object: { [key: string]: string }) {
  return function (key: string) {
    return object[key];
  };
}

const htmlUnescapes = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

const unescapeHtmlChar = basePropertyOf(htmlUnescapes);
const reEscapedHtml = /&(?:amp|lt|gt|quot|#39|nbsp);/g,
    reHasEscapedHtml = RegExp(reEscapedHtml.source);

/**
 * Converts the HTML entities
 * `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#39;` in `string` to
 * their corresponding characters.
 *
 * @param {string} html The string to unescape.
 * @returns {string} Returns the unescaped string.
 * @example
 */
export function unescape(html: string | null): string {
  html = html || '';
  return html && reHasEscapedHtml.test(html)
    ? html.replace(reEscapedHtml, unescapeHtmlChar)
    : html;
}

/**
 * @param {string} str
 * @param {RegExp} search
 * @returns {boolean}
 */
export function regexStartsWith(str: string, search: RegExp): boolean {
  let source = search.source;
  if (!source.startsWith('^')) source = '^' + source;

  const reg = new RegExp(source);
  return reg.test(str);
}

/**
 * @param {string} str
 * @param {RegExp} search
 * @returns {boolean}
 */
export function regexEndsWith(str: string, search: RegExp): boolean {
  let source = search.source;
  if (!source.endsWith('$')) source = source + '$';

  const reg = new RegExp(source);
  return reg.test(str);
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

/**
 * @description Determines whether the provided color is dark or not.
 * @param {String} color
 */
export const isDarkColor = (color: string): boolean => Color(color).isDark();