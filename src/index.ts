/**
 * Build styles
 */
require('./index.css').toString();

import { API, BlockTool } from '@editorjs/editorjs';
import { SpeechData } from '../types';
import Ui from './ui';

/**
 * Speech tool implements of Editor.JS Block
 */
export default class Speech implements BlockTool {
  /**
   * Notify core that read-only mode is supported
   */
  public static isReadOnlySupported = true;

  /**
   * Allow using native Enter behaviour
   */
  public static enableLineBreaks = false;

  /**
   * Default placeholder for Paragraph Tool
   *
   * @returns {SpeechData}
   * @static
   */
  public static get DEFAULT_SPEECH(): SpeechData {
    return {
      id: Number.NaN,
      timestamp: 0.0,
      wasSplit: false,
      speaker: 'Unknown Speaker',
      text: [],
    };
  }

  /**
   * Icon and title for displaying at the Toolbox
   *
   * @returns {{icon: string, title: string}}
   */
  public static get toolbox(): { icon: string; title: string } {
    return {
      icon: require('./toolbox-icon.svg').default,
      title: 'Speech',
    };
  }

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
   * Editor.js API
   */
  private readonly api: API;

  /**
   * Data passed on render
   */
  private readonly _data: SpeechData;

  /**
   * Readonly property
   *
   * @private
   */
  private readonly readOnly: boolean;

  /**
   * ui for speech
   */
  private readonly ui: Ui;

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

    /**
     * Module for working with UI
     */
    this.ui = new Ui({
      api,
      onSplitSpeech: blockIndex => {
        this.onSplitSpeech(blockIndex);
      },
      readOnly: this.readOnly,
    });

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
    this._data.text = this._data.text.map(item => ({
      ...item,
      word: this.api.sanitizer.clean(item.word, { br: true })
    }));
    return this.ui.render(this._data);
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

    const newNode = this.ui.render(this._data);
    this.ui.replaceSpeechNode(newNode);
  }

  /**
   * Return speech data
   *
   * @returns {SpeechData}
   */
  get data(): SpeechData {
    this._data.text = [...this.ui.speechText];

    return this._data;
  }

  private onSplitSpeech(wordIndex: number): void {
    const speechText = this._data.text;

    /** Update Current Block */
    this.data = {
      ...this._data,
      wasSplit: true,
      text: speechText.slice(0, wordIndex),
    };

    /** Prevent Default speech generation if item is empty */
    const block = this.api.blocks.getBlockByIndex(
      this.api.blocks.getCurrentBlockIndex()
    );

    if (block && wordIndex !== speechText.length) {
      /** Insert New Block */
      this.api.blocks.insert(block.name, {
        ...Speech.DEFAULT_SPEECH,
        wasSplit: true,
        text: speechText.slice(wordIndex),
      });
      this.api.caret.setToBlock(this.api.blocks.getCurrentBlockIndex());
    }
  }
}
