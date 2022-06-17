import {
  formatTimestamp,
  make,
  trimWord,
  stopEvent,
  findSelectedElement,
  splitAt,
  setSelectionAt,
  unescape,
} from './utils';
import { API } from '@editorjs/editorjs';
import { SpeechData, TextData } from '../types';

/**
 * Class for working with UI:
 *  - rendering base structure
 */
export default class Ui {
  /**
   * Editor.js API
   */
  private readonly api: API;

  /**
   * Readonly property
   *
   * @private
   */
  private readonly readOnly: boolean;

  /**
   * Callback for
   *
   * @private
   */
  private readonly onSplitSpeech!: (blockIndex: number) => void;

  /**
   * Wrapper for tools' content
   */
  private nodes!: { [key: string]: HTMLElement };

  /**
   * Speech's data
   */
  private speechData!: SpeechData;

  /**
   * @param {object} ui - speech tool Ui module
   * @param {object} ui.api - Editor.js API
   * @param {Function} ui.onSplitSpeech - callback on split
   * @param {boolean} ui.readOnly - read-only mode flag
   */
  constructor({
    api,
    onSplitSpeech,
    readOnly,
  }: {
    api: API;
    onSplitSpeech: (blockIndex: number) => void;
    readOnly: boolean;
  }) {
    this.api = api;
    this.readOnly = readOnly;
    this.onSplitSpeech = onSplitSpeech;
    this.nodes = {
      wrapper: make('div', [this.CSS.baseClass, this.CSS.wrapper]),
      speechTag: make('p', [this.CSS.speechContent]),
      timestampTag: make('p', [this.CSS.speechTimestamp]),
    };

    this.listener = this.listener.bind(this);
  }

  /**
   * CSS classes
   *
   * @returns {object}
   */
  get CSS(): { [key: string]: string } {
    return {
      baseClass: this.api.styles.block,
      loading: this.api.styles.loader,
      input: this.api.styles.input,
      button: this.api.styles.button,

      /**
       * Tool's classes
       */
      wrapper: 'speech',
      speechTimestamp: 'speech-timestamp',
      timestampContent: 'speech-timestamp-content',
      speakerName: 'speaker-name',
      speechContent: 'speech-content',
      speechWord: 'speech-word',
    };
  }

  get data(): SpeechData {
    return this.speechData;
  }

  set data(toolData: SpeechData) {
    this.speechData = { ...toolData };
  }

  /**
   * Return actually speech text:
   *
   * @returns {TextData}
   */
  get speechText(): TextData[] {
    const speechText: TextData[] = [];

    const items = this.nodes.wrapper.querySelectorAll(
      `.${this.CSS.speechWord}`
    );

    for (let i = 0; i < items.length; i += 1) {
      const textItem = items[i];
      const word = trimWord(textItem.innerHTML);

      if (textItem && word) {
        speechText.push({
          word,
          start: parseFloat(textItem.getAttribute('data-start') || ''),
          end: parseFloat(textItem.getAttribute('data-end') || ''),
        });
      }
    }

    return speechText;
  }

  listener(event: KeyboardEvent): void {
    const [ENTER, BACKSPACE, WHITESPACE, DELETE, A] = [13, 8, 32, 46, 65]; // key names
    const cmdPressed = event.ctrlKey || event.metaKey;

    switch (event.keyCode) {
      case ENTER:
        this.enter(event, cmdPressed);
        break;
      case BACKSPACE:
        this.backspace(event);
        break;
      case WHITESPACE:
        this.whitespace(event);
        break;
      case DELETE:
        this.delete(event);
        break;
      case A:
        if (cmdPressed) {
          this.selectItem(event);
        }
        break;
      default:
        break;
    }
  }

  /**
   * Renders tool UI
   *
   * @param {SpeechData} toolData - saved tool data
   * @returns {Element}
   */
  render(toolData: SpeechData): HTMLElement {
    this.data = toolData;

    this.nodes.speechTag = this.makeSpeechTag();
    this.nodes.timestampTag = this.makeTimestampTag();

    this.nodes.wrapper.innerHTML = '';
    this.nodes.wrapper.appendChild(this.nodes.speechTag);
    this.nodes.wrapper.appendChild(this.nodes.timestampTag);

    if (!this.readOnly) {
      this.nodes.wrapper.addEventListener('keydown', this.listener, false);
    }

    return this.nodes.wrapper;
  }

  /**
   * Replace speech text inside speech
   *
   * @param {HTMLElement} newNode - new tool data
   */
  replaceSpeechNode(newNode: HTMLElement): void {
    const oldView = this.nodes.wrapper;

    if (oldView && oldView.parentNode) {
      oldView.parentNode.replaceChild(newNode, oldView);
    }
  }

  /**
   * Returns timestamp element for speech
   *
   * @returns {HTMLElement}
   */
  private makeTimestampTag(): HTMLElement {
    const speechTimestamp = make('p', this.CSS.speechTimestamp);

    speechTimestamp.appendChild(
      make(
        'span',
        this.CSS.timestampContent,
        {},
        {
          'data-speaker': this.data.speaker,
          'data-timestamp': formatTimestamp(this.data.timestamp),
        }
      )
    );

    return speechTimestamp;
  }

  /**
   * Returns content element for speech
   *
   * @returns {HTMLElement}
   * TODO: ** Get rid of duplicate code **
   */
  private makeSpeechTag(): HTMLElement {
    const speechContent = make('p', this.CSS.speechContent, {
      contentEditable: String(!this.readOnly),
    });

    if (this.data.text.length) {
      this.data.text.forEach(item => {
        const { word, start, end } = item;
        speechContent.appendChild(this.makeSpeechWord(word, start, end));
      });
    } else {
      speechContent.appendChild(this.makeSpeechWord('&nbsp;'));
    }

    return speechContent;
  }

  /**
   * Returns content element for speech word
   *
   * @param {string} word - text content
   * @param {number} start - start timestamp for word
   * @param {number} end - end timestamp for word
   * @returns {HTMLElement}
   */
  private makeSpeechWord(word: string, start = 0, end = 0): HTMLElement {
    if (!start || !end) {
      start = this.data.timestamp;
      end = this.data.timestamp;
    }

    const domProps = { innerHTML: ` ${word}` };
    const attributes = {
      'data-start': start.toString(),
      'data-end': end.toString(),
    };

    return make('span', this.CSS.speechWord, domProps, attributes);
  }

  /**
   * Get out from speech
   * by Enter on the empty last item
   *
   * @param {KeyboardEvent} event - keyboard event
   * @param {Element} currentItem - current selected item
   * @param {boolean} cursorAtEnd - is block at end
   */
  private getOutOfSpeech(
    event: KeyboardEvent,
    currentItem: Element,
    cursorAtEnd: boolean
  ): void {
    const text = this.nodes.wrapper.querySelectorAll(`.${this.CSS.speechWord}`);
    /**
     * Save the last one.
     */
    if (text.length < 2) {
      stopEvent(event);
      return;
    }

    const searchedItem = cursorAtEnd ? currentItem.nextSibling : currentItem;
    const currentIndex = Array.from(text).findIndex(
      node => node === searchedItem
    );

    this.onSplitSpeech(currentIndex);
    stopEvent(event);
  }

  /**
   * Handle Enter pressed
   *
   * @param {KeyboardEvent} event - keyboard event
   * @param {boolean} cmdPressed - is cmd pressed
   */
  private enter(event: KeyboardEvent, cmdPressed: boolean): void {
    const { node: currentItem, anchorOffset } = findSelectedElement(
      this.CSS.speechWord
    );

    if (!currentItem) {
      stopEvent(event);
      return;
    }

    const cursorAtEnd =
      anchorOffset === trimWord(currentItem.innerHTML, false).length;

    if (cmdPressed) {
      this.getOutOfSpeech(event, currentItem, cursorAtEnd);
      return;
    }

    this.insertBrInSpeechText(currentItem, cursorAtEnd);
    stopEvent(event);
  }

  /**
   * Handle backspace
   *
   * @param {KeyboardEvent} event - Keyboard event on backspace.
   */
  private backspace(event: KeyboardEvent): void {
    const {
      node: currentItem,
      anchorOffset,
      isCollapsed,
    } = findSelectedElement(this.CSS.speechWord);
    const text = this.nodes.wrapper.querySelectorAll(`.${this.CSS.speechWord}`);
    const isFirstElement =
      Array.from(text).findIndex(n => n === currentItem) < 1;

    if (!currentItem || text.length === 0) {
      stopEvent(event);
      return;
    }

    if (anchorOffset === 1 && !isFirstElement && isCollapsed) {
      this.mergeSpeechText(currentItem, true);
      stopEvent(event);
    }
  }

  /**
   * Handle delete
   *
   * @param {KeyboardEvent} event - Keyboard event on delete.
   */
  private delete(event: KeyboardEvent): void {
    const { node: currentItem, anchorOffset } = findSelectedElement(
      this.CSS.speechWord
    );

    if (!currentItem) {
      stopEvent(event);
      return;
    }

    const text = this.nodes.wrapper.querySelectorAll(`.${this.CSS.speechWord}`);
    const cursorAtEnd =
      anchorOffset === trimWord(currentItem.innerHTML, false).length;
    const isLastElement =
      Array.from(text).findIndex(n => n === currentItem) === text.length - 1;

    if (cursorAtEnd && !isLastElement) {
      this.mergeSpeechText(currentItem, false);
      stopEvent(event);
    }
  }

  /**
   * Handle whitespace
   *
   * @param {KeyboardEvent} event - Keyboard event on whitespace.
   */
  private whitespace(event: KeyboardEvent): void {
    const { node: currentItem, anchorOffset } = findSelectedElement(
      this.CSS.speechWord
    );
    if (!currentItem) {
      stopEvent(event);
      return;
    }

    const currentText = unescape(currentItem.innerHTML);
    const cursorAtEnd = anchorOffset === currentText.length;

    if (!cursorAtEnd) {
      this.splitSpeechText(currentItem, anchorOffset);
      stopEvent(event);
    }
  }

  private insertBrInSpeechText(target: Element, insertAfter: boolean): void {
    const word = this.makeSpeechWord(
      '<br>',
      Number(target.getAttribute('data-start')),
      Number(target.getAttribute('data-end'))
    );

    target.parentElement?.insertBefore(
      word,
      insertAfter ? target.nextSibling : target
    );
  }

  private splitSpeechText(target: Element, anchorOffset: number): void {
    const targetText = unescape(target.innerHTML);

    const [word1, word2] = splitAt(anchorOffset)(targetText).map(word =>
      this.makeSpeechWord(
        word,
        Number(target.getAttribute('data-start')),
        Number(target.getAttribute('data-end'))
      )
    );

    target.parentElement?.insertBefore(word1, target);
    target.parentElement?.insertBefore(word2, target);
    target.parentElement?.removeChild(target);

    setSelectionAt(word2, 1);
  }

  private mergeSpeechText(target: Element, mergePrevious: boolean): void {
    const speechText = this.nodes.wrapper.querySelectorAll(
      `.${this.CSS.speechWord}`
    );

    const targetIndex = Array.from(speechText).findIndex(n => n === target);
    const mergedIndex = mergePrevious ? targetIndex - 1 : targetIndex + 1;
    const mergedItem = speechText[mergedIndex];

    const word = this.makeSpeechWord(
      mergePrevious
        ? trimWord(mergedItem.innerHTML) + trimWord(target.innerHTML)
        : trimWord(target.innerHTML) + trimWord(mergedItem.innerHTML),
      Number(target.getAttribute('data-start')),
      Number(target.getAttribute('data-end'))
    );

    target.parentElement?.insertBefore(word, target);
    target.parentElement?.removeChild(mergedItem);
    target.parentElement?.removeChild(target);

    const position = mergePrevious
      ? mergedItem.innerHTML.length
      : target.innerHTML.length;

    setSelectionAt(word, position);
  }

  /**
   * Select speech content by CMD+A
   *
   * @param {KeyboardEvent} event - KeyboardEvent on Cmd + A pressed
   */
  private selectItem(event: KeyboardEvent): void {
    event.preventDefault();

    const selection = window.getSelection();
    const currentNode = selection?.anchorNode?.parentNode;

    if (selection && currentNode) {
      const currentItem = (currentNode as Element).closest('.' + this.CSS.speechContent);
      const defaultItem = document.createElement('div');

      const range = new Range();

      range.setStart(currentItem?.firstChild || defaultItem, 0);
      range.setEnd(currentItem?.lastChild || defaultItem, 1);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}
