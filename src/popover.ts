import { make } from './utils';
import { API } from '@editorjs/editorjs';
import { SpeechData, SpeechToolConfig } from '../types';

/**
 *
 */
export default class Popover {
  /**
   * popover node
   */
  public node: HTMLElement = make('div', this.CSS.popover);

  /**
   * Editable area of popover
   */
  public speakerList: HTMLButtonElement[] = [];

  /**
   * Current speech to edit
   */
  private currentSpeech: SpeechData | null = null;

  /**
   * Last opened speech
   *
   * @private
   */
  private lastSpeech: SpeechData | null = null;

  /**
   * Editor.js API
   */
  private readonly api: API;

  /**
   * ReadOnly state
   *
   * @private
   */
  private readonly readOnly: boolean;

  /**
   * Tool's config
   */
  private config: SpeechToolConfig;

  /**
   * Callback for
   *
   * @private
   */
  private readonly onEditSpeaker!: (speaker: string) => void;

  /**
   * @param onEditSpeaker - callback
   * @param api - Editor.js API
   * @param config - tool's config
   */
  constructor(
    onEditSpeaker: (speaker: string) => void,
    api: API,
    config: SpeechToolConfig
  ) {
    this.api = api;
    this.config = config;
    this.onEditSpeaker = onEditSpeaker;
    this.readOnly = api.readOnly.isEnabled;

    this.makeUI();
    this.onClickOutside = this.onClickOutside.bind(this);
    this.onClickSpeaker = this.onClickSpeaker.bind(this);
  }

  /**
   * Styles
   *
   * @private
   */
  get CSS(): { [key: string]: string } {
    return {
      popover: 'popover',
      speakersWrapper: 'speakers__wrapper',
      speakerItem: 'speaker__item',
      speakerName: 'speaker__name',
      speakerIcon: 'speaker__icon',
      speakerSelected: 'speaker__selected',
      popoverOpened: 'popover--opened',
      popoverButtons: 'popover__buttons',
      popoverButton: 'popover__button',
    };
  }

  /**
   * Opens popover
   *
   * @param toolData - speech to edit
   */
  public open(toolData: SpeechData): void {
    this.currentSpeech = toolData;

    document.addEventListener('click', this.onClickOutside, true);

    this.speakerList.forEach(element => {
      const speakerName = element.children[1].getAttribute('data-speaker-name');
      if (speakerName === toolData.speaker) {
        element.classList.add(this.CSS.speakerSelected);
      }
      element.addEventListener('click', this.onClickSpeaker, true);
    });

    this.node.classList.add(this.CSS.popoverOpened);
  }

  /**
   * Closes popover and saves speech's content
   *
   */
  public close(): void {
    document.removeEventListener('click', this.onClickOutside, true);

    this.speakerList.forEach(element => {
      element.classList.remove(this.CSS.speakerSelected);
      element.removeEventListener('click', this.onClickSpeaker, true);
    });

    this.node.classList.remove(this.CSS.popoverOpened);

    if (!this.currentSpeech) {
      return;
    }

    this.currentSpeech = null;
  }

  /**
   * Creates popover DOM tree
   *
   * @private
   */
  private makeUI(): void {
    const speakersWrapper = make('div', this.CSS.speakersWrapper);

    const speakers = this.config.speakerList || [];
    this.speakerList = speakers.map(speaker => {
      const button = make<HTMLButtonElement>('div', this.CSS.speakerItem);
      const speakerName = make(
        'div',
        this.CSS.speakerName,
        {},
        { 'data-speaker-name': speaker }
      );
      const speakerIcon = make<HTMLImageElement>(
        'div',
        this.CSS.speakerIcon,
        {},
        { 'data-speaker-icon': '' }
      );

      button.append(speakerIcon);
      button.append(speakerName);
      return button;
    });
    this.speakerList.forEach(element => speakersWrapper.append(element));

    this.node.append(speakersWrapper);

    if (this.readOnly) {
      return;
    }
  }

  /**
   * Click outside handler to close the popover
   *
   * @param e - MouseEvent
   */
  private onClickOutside(e: MouseEvent): void {
    const isClickedInside =
      (e.target as HTMLElement).closest(`.${this.CSS.popover}`) !== null;
    const isClickedOnInlineToolbar =
      (e.target as HTMLElement).closest(`.ce-inline-toolbar`) !== null;

    if (isClickedInside || isClickedOnInlineToolbar) {
      return;
    }

    this.lastSpeech = null;
    this.close();
  }

  private onClickSpeaker(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    if (!this.readOnly && target.parentElement) {
      const speaker = target.parentElement.children[1].getAttribute('data-speaker-name');
      if (speaker) {
        this.onEditSpeaker(speaker);

        this.lastSpeech = null;
        this.close();
      }
    }
  }
}