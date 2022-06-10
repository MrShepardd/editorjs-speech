/**
 * Build styles
 */
require('./index.css').toString();

import { API, BlockTool } from '@editorjs/editorjs';
import { make, formatTimestamp, trimWord, splitAt, setSelectionAtStart } from './utils';
import { SpeechData } from '../types';

/**
 * Speech tool implements of Editor.JS Block
 */
export default class Speech implements BlockTool {
  /**
   * Default placeholder for Paragraph Tool
   *
   * @returns {SpeechData}
   * @static
   */
  static get DEFAULT_SPEECH(): SpeechData {
    return {
      id: Number.NaN,
      timestamp: 0.0,
      wasSplit: false,
      speaker: 'Unknown Speaker',
      text: [],
    };
  }

  /**
   * Notify core that read-only mode is supported
   */
  public static isReadOnlySupported = true;

  /**
   * Allow to use native Enter behaviour
   */
  public static enableLineBreaks = false;

  /**
   * Data passed on render
   */
  private readonly _data: SpeechData;

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
   * Wrapper for tools' content
   */
  private wrapper!: HTMLElement;

  /**
   * Sanitize before saving data
   */
  public static get sanitize(): { [key: string]: boolean | unknown } {
    return {
      id: false, // disallow HTML
      timestamp: false, // disallow HTML
      speaker: false, // disallow HTML
      wasSplit: false, // disallow HTML
      text: {
        br: true,
      },
    };
  }

  /**
   * @class
   *
   * @param {object} params - tool constructor options
   * @param {SpeechData} params.data - data passed on render
   * @param {API} params.api - Editor.js API
   * @param {boolean} params.readOnly - Readonly property
   */
  constructor({
    data,
    api,
    readOnly,
  }: {
    data?: SpeechData;
    api: API;
    readOnly?: boolean;
  }) {
    this.api = api;
    this.readOnly = readOnly || false;

    this._data = Speech.DEFAULT_SPEECH;
    this.data = data || this._data;
  }

  /**
   * Returns list tag with text
   *
   * @returns {Element}
   * @public
   */
  public render(): HTMLElement {
    this.wrapper = make('div', [this.CSS.baseBlock, this.CSS.speech]);
    this.wrapper.appendChild(this.makeSpeechTag());
    this.wrapper.appendChild(this.makeTimestampTag());

    if (!this.readOnly) {
      // detect keydown on the last item to escape List
      this.wrapper.addEventListener('keydown', event => {
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
      });
    }

    return this.wrapper;
  }

  /**
   * Saves notes data
   */
  public save(): SpeechData {
    return this.data;
  }

  /**
   * Handle move speech block
   *
   * @param {Event} event - Target event
   */
  public moved(event: Event): void {
    console.log('>> I WAS MOVED', event);
  }

  /**
   * Select speech content by CMD+A
   *
   * @param {KeyboardEvent} event - KeyboardEvent on Cmd + A pressed
   */
  public selectItem(event: KeyboardEvent): void {
    event.preventDefault();

    const selection = window.getSelection();
    const currentNode = selection?.anchorNode?.parentNode;

    if (selection && currentNode) {
      const currentItem = (currentNode as Element).closest(
        '.' + this.CSS.speechContent
      );
      const defaultItem = document.createElement('div');

      const range = new Range();

      range.selectNodeContents(currentItem || defaultItem);
      selection.removeAllRanges();
      selection.addRange(range);
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
          'data-speaker': this._data.speaker,
          'data-timestamp': formatTimestamp(this._data.timestamp),
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

    if (this._data.text.length) {
      this._data.text.forEach(item => {
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
      start = this._data.timestamp;
      end = this._data.timestamp;
    }

    const domProps = { innerHTML: ` ${word}` };
    const attributes = {
      'data-start': start.toString(),
      'data-end': end.toString(),
    };

    return make('span', this.CSS.speechWord, domProps, attributes);
  }

  /**
   * Speech data setter
   *
   * @param {SpeechData} newSpeech - speech object to modify
   */
  set data(newSpeech: SpeechData) {
    this._data.id = newSpeech.id || Speech.DEFAULT_SPEECH.id;
    this._data.speaker = newSpeech.speaker || Speech.DEFAULT_SPEECH.speaker;
    this._data.timestamp =
      newSpeech.timestamp || Speech.DEFAULT_SPEECH.timestamp;
    this._data.wasSplit = newSpeech.wasSplit || Speech.DEFAULT_SPEECH.wasSplit;
    this._data.text = newSpeech.text || Speech.DEFAULT_SPEECH.text;

    const oldView = this.wrapper;

    if (oldView && oldView.parentNode) {
      oldView.parentNode.replaceChild(this.render(), oldView);
    }
  }

  /**
   * Return speech data
   *
   * @returns {SpeechData}
   */
  get data(): SpeechData {
    this._data.text = [];

    const text = this.wrapper.querySelectorAll(`.${this.CSS.speechWord}`);

    for (let i = 0; i < text.length; i += 1) {
      const textItem = text[i];
      const word = trimWord(textItem.innerHTML);

      if (textItem && word) {
        this._data.text.push({
          word,
          start: parseFloat(textItem.getAttribute('data-start') || ''),
          end: parseFloat(textItem.getAttribute('data-end') || ''),
        });
      }
    }

    return this._data;
  }

  /**
   * Icon and title for displaying at the Toolbox
   *
   * @returns {{icon: string, title: string}}
   */
  static get toolbox(): { icon: string; title: string } {
    return {
      icon: require('./toolbox-icon.svg').default,
      title: 'Speech',
    };
  }

  /**
   * Styles
   *
   * @private
   */
  private get CSS(): { [key: string]: string } {
    return {
      baseBlock: this.api.styles.block,
      speech: 'speech',
      speechTimestamp: 'speech-timestamp',
      timestampContent: 'speech-timestamp-content',
      speakerName: 'speaker-name',
      speechContent: 'speech-content',
      speechWord: 'speech-word',
    };
  }

  /**
   * Temporary solution to stop processing of this keys:
   * Enter
   *
   * @param {Event} event - event.
   */
  private stopEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Returns current Speech item and caret position
   *
   * @returns {[Element, number] | [null, number]}
   */
  get currentItem(): [Element, number] | [null, number] {
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
        (currentNode as Element).closest(`.${this.CSS.speechWord}`),
        selection.anchorOffset,
      ] || [null, 0]
    );
  }

  /**
   * Get out from speech
   * by Enter on the empty last item
   *
   * @param {KeyboardEvent} event
   * @param {Element} currentItem
   * @param {boolean} cursorAtEnd
   */
  private getOutOfSpeech(
    event: KeyboardEvent,
    currentItem: Element,
    cursorAtEnd: boolean
  ): void {
    const text = this.wrapper.querySelectorAll(`.${this.CSS.speechWord}`);
    /**
     * Save the last one.
     */
    if (text.length < 2) {
      this.stopEvent(event);
      return;
    }

    const speechText = this._data.text;
    const searchedItem = cursorAtEnd ? currentItem.nextSibling : currentItem;
    const currentIndex = Array.from(text).findIndex(
      node => node === searchedItem
    );

    /** Update Current Block */
    this.data = {
      ...this._data,
      wasSplit: true,
      text: speechText.slice(0, currentIndex),
    };

    /** Prevent Default speech generation if item is empty */
    const block = this.api.blocks.getBlockByIndex(
      this.api.blocks.getCurrentBlockIndex()
    );

    if (block && currentIndex !== speechText.length) {
      /** Insert New Block */
      this.api.blocks.insert(block.name, {
        ...Speech.DEFAULT_SPEECH,
        wasSplit: true,
        text: speechText.slice(currentIndex),
      });
      this.api.caret.setToBlock(this.api.blocks.getCurrentBlockIndex());

      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Handle Enter pressed
   *
   * @param {KeyboardEvent} event
   * @param {boolean} cmdPressed
   */
  private enter(event: KeyboardEvent, cmdPressed: boolean): void {
    const [currentItem, anchorOffset] = this.currentItem;

    if (!currentItem) {
      this.stopEvent(event);
      return;
    }

    const cursorAtEnd =
      anchorOffset === trimWord(currentItem.innerHTML, false).length;

    if (cmdPressed) {
      this.getOutOfSpeech(event, currentItem, cursorAtEnd);
      return;
    }

    currentItem.parentElement?.insertBefore(
      this.makeSpeechWord('<br>'),
      cursorAtEnd ? currentItem.nextSibling : currentItem
    );

    this.stopEvent(event);
  }

  /**
   * Handle backspace
   *
   * @param {KeyboardEvent} event - Keyboard event on backspace.
   */
  private backspace(event: KeyboardEvent): void {
    const [currentItem, anchorOffset] = this.currentItem;
    const text = this.wrapper.querySelectorAll(`.${this.CSS.speechWord}`);

    if (!currentItem || text.length === 0) {
      this.stopEvent(event);
      return;
    }

    if (anchorOffset === 1) {
      const currentIndex = Array.from(text).findIndex(
        node => node === currentItem
      );
      const prevItem = text[currentIndex - 1];
      const mergedText =
        trimWord(prevItem.innerHTML) + trimWord(currentItem.innerHTML);

      const word = this.makeSpeechWord(
        mergedText,
        Number(currentItem.getAttribute('data-start')),
        Number(currentItem.getAttribute('data-end'))
      );

      currentItem.parentElement?.insertBefore(word, currentItem);
      currentItem.parentElement?.removeChild(prevItem);
      currentItem.parentElement?.removeChild(text[currentIndex]);

      this.stopEvent(event);
    }
  }

  /**
   * Handle delete
   *
   * @param {KeyboardEvent} event - Keyboard event on delete.
   */
  private delete(event: KeyboardEvent): void {
    const [currentItem, anchorOffset] = this.currentItem;

    if (!currentItem) {
      this.stopEvent(event);
      return;
    }

    const cursorAtEnd =
      anchorOffset === trimWord(currentItem.innerHTML, false).length;

    if (cursorAtEnd) {
      const text = this.wrapper.querySelectorAll(`.${this.CSS.speechWord}`);
      const currentIndex = Array.from(text).findIndex(
        node => node === currentItem
      );
      const nextItem = text[currentIndex + 1];
      const mergedText =
        trimWord(currentItem.innerHTML) + trimWord(nextItem.innerHTML);

      const word = this.makeSpeechWord(
        mergedText,
        Number(currentItem.getAttribute('data-start')),
        Number(currentItem.getAttribute('data-end'))
      );

      currentItem.parentElement?.insertBefore(word, currentItem);
      currentItem.parentElement?.removeChild(nextItem);
      currentItem.parentElement?.removeChild(currentItem);

      this.stopEvent(event);
    }
  }

  /**
   * Handle whitespace
   *
   * @param {KeyboardEvent} event - Keyboard event on whitespace.
   */
  private whitespace(event: KeyboardEvent): void {
    const [currentItem, anchorOffset] = this.currentItem;

    if (!currentItem) {
      this.stopEvent(event);
      return;
    }

    const currentText = currentItem.innerHTML.replace(/&nbsp;|\s/gi, ' ');
    const cursorAtEnd = anchorOffset === currentText.length;

    if (!cursorAtEnd) {
      splitAt(anchorOffset)(currentText).forEach(item => {
        const word = this.makeSpeechWord(
          item,
          Number(currentItem.getAttribute('data-start')),
          Number(currentItem.getAttribute('data-end'))
        );

        currentItem.parentElement?.insertBefore(word, currentItem);
        setSelectionAtStart(word);
      });

      currentItem.parentElement?.removeChild(currentItem);
      this.stopEvent(event);
    }
  }
}
