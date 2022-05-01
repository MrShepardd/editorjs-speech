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
    attributes: Record<string, string> = {},

): E {
    const el = document.createElement(tagName) as E;

    if (Array.isArray(classNames)) {
        el.classList.add(...classNames);
    } else if (classNames) {
        el.classList.add(classNames);
    }

    Object.entries(properties).forEach(([propName, value]) => {
        el[propName] = value;
    });

    Object.entries(attributes).forEach(([attrName, value]) => {
        el.setAttribute(attrName, value);
    });

    return el;
}
