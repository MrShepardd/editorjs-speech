import {
  formatTimestamp,
  make,
  trimWord,
  stopEvent,
  findSelectedElement,
  unescape,
  regexStartsWith,
  regexEndsWith,
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
    const items = this.nodes.speechTag.childNodes;

    return Array.from(items)
      .reduce(this.preprocessSpeechNodes.bind(this), [])
      .filter(this.filterSpeechNode)
      .map(this.convertNodeToSpeech);
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
   * @param {boolean} addWhitespace - is need to add whitespace in word start
   * @returns {HTMLElement}
   */
  private makeSpeechWord(
    word: string,
    start = 0,
    end = 0,
    addWhitespace = true
  ): HTMLElement {
    if (!start || !end) {
      start = this.data.timestamp;
      end = this.data.timestamp;
    }

    const domProps = { innerHTML: addWhitespace ? ` ${word}` : word };
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
      anchorOffset === unescape(currentItem.textContent).length;

    if (cmdPressed) {
      this.getOutOfSpeech(event, currentItem, cursorAtEnd);
      return;
    }

    this.insertBrInSpeechText(currentItem, cursorAtEnd);
    stopEvent(event);
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
      const currentItem = (currentNode as Element).closest(
        '.' + this.CSS.speechContent
      );
      const defaultItem = document.createElement('div');

      const range = new Range();

      const anchorNode = currentItem?.firstChild?.firstChild || defaultItem;
      const focusNode = currentItem?.lastChild?.firstChild || defaultItem;

      range.setStart(anchorNode, 1);
      range.setEnd(focusNode, focusNode?.textContent?.length || 1);

      selection.removeAllRanges();
      selection.addRange(range);
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

  private splitSpeechText(
    target: Element,
    separator = /(?<=.)\s+(?=.)/
  ): Element[] {
    const targetText = unescape(target.textContent).replace(/\s+/g, ' ');

    return targetText
      .split(separator)
      .filter(word => word.length)
      .map(word =>
        this.makeSpeechWord(
          word,
          Number(target.getAttribute('data-start')),
          Number(target.getAttribute('data-end')),
          false
        )
      );
  }

  private mergeSpeechText(targetWord: Element, mergedWord: Element): Element {
    const targetText = trimWord(unescape(targetWord.textContent));
    const mergedText = trimWord(unescape(mergedWord.textContent));

    return this.makeSpeechWord(
      targetText + mergedText,
      Number(targetWord.getAttribute('data-start')),
      Number(targetWord.getAttribute('data-end'))
    );
  }

  private preprocessSpeechNodes(
    accumulator: Element[],
    currentItem: ChildNode
  ): Element[] {
    const prevItem = accumulator.at(-1);

    const hasStartWhitespace = regexStartsWith(
      currentItem.textContent || '',
      /\s/
    );
    const hasEndWhiteSpace = regexEndsWith(prevItem?.textContent || '', /\s/);

    const needMerge = prevItem && !hasStartWhitespace && !hasEndWhiteSpace;

    this.splitSpeechText(currentItem as Element).forEach((word, index) => {
      if (index === 0 && needMerge) {
        const mergedWord = prevItem
          ? this.mergeSpeechText(prevItem, word)
          : word;

        accumulator.splice(-1, 1, mergedWord);
      } else {
        accumulator.push(word);
      }
    });

    return accumulator;
  }

  private filterSpeechNode(item: Element): boolean {
    return item && !!trimWord(item.innerHTML);
  }

  private convertNodeToSpeech(item: Element): TextData {
    const word = trimWord(item.innerHTML);

    return {
      word,
      start: parseFloat(item.getAttribute('data-start') || ''),
      end: parseFloat(item.getAttribute('data-end') || ''),
    };
  }

  private listener(event: KeyboardEvent): void {
    const [ENTER, A] = [13, 65]; // key names
    const cmdPressed = event.ctrlKey || event.metaKey;

    switch (event.keyCode) {
      case ENTER:
        this.enter(event, cmdPressed);
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
}
