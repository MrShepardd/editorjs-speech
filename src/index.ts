import styles from  './index.pcss';

import { API, BlockTool } from '@editorjs/editorjs';
import { make } from './dom';

interface TextData {
    start: number;
    end: number;
    word: string;
}

export interface SpeechData {
    /**
     * Speaker name
     */
    speaker: string;

    /**
     * Timestamp of speech
     */
    timestamp: number;

    /**
     * Note's superscript index
     */
    text: TextData[];
}

export interface SpeechConfig {
    placeholder?: string;
    shortcut?: string;
}

export default class Speech implements BlockTool {
    /**
     * Notify core that read-only mode is supported
     */
    public static isReadOnlySupported = true;

    /**
     * Allow to use native Enter behaviour
     */
    public static enableLineBreaks = true;

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
     * Tune's wrapper for tools' content
     */
    private wrapper!: HTMLElement;

    /**
     * Sanitize before saving data
     */
    public static get sanitize(): { timestamp: boolean; speaker: boolean; text: any } {
        return {
            timestamp: false, // disallow HTML
            speaker: false, // disallow HTML
            text: {}, // only tags from Inline Toolbar
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
    constructor({ data, api, readOnly }: { data?: SpeechData; api: API; readOnly?: boolean }) {
        this.api = api;
        this.readOnly = readOnly || false;

        this._data = {
            timestamp: 0,
            speaker: '',
            text: [],
        };

        this.data = data || this._data;
    }

    /**
     * Returns list tag with text
     *
     * @returns {Element}
     * @public
     */
    public render(): HTMLElement {
        this.wrapper = make('div', [this.CSS.baseBlock, this.CSS.speech], {
            contentEditable: String(!this.readOnly),
        });
        this.wrapper.appendChild(this.makeTimestampTag());
        this.wrapper.appendChild(this.makeSpeechTag());

        if (!this.readOnly) {
            // detect keydown on the last item to escape List
            this.wrapper.addEventListener(
                'keydown',
                (event) => {
                    const [ENTER, BACKSPACE] = ['Enter', 'Backspace']; // key names

                    switch (event.key) {
                        case ENTER:
                            this.stopEvent(event);
                            break;
                        case BACKSPACE:
                            this.backspace(event);
                            break;
                        default:
                            break;
                    }
                },
                false,
            );
        }

        return this.wrapper;
    }

    makeTimestampTag(): HTMLElement {
        const speechTimestamp = make('p', this.CSS.speechTimestamp, {
            contentEditable: 'false',
        });
        const speechTimestampContent = make('span', this.CSS.timestampContent);
        const timestamp = make('span', '', {
            innerHTML: this._data.timestamp.toString(),
        });
        const speakerName = make('strong', this.CSS.speakerName, {
            innerHTML: this._data.speaker,
        });

        speechTimestampContent.appendChild(speakerName);
        speechTimestampContent.appendChild(timestamp);
        speechTimestamp.appendChild(speechTimestampContent);

        return speechTimestamp;
    }

    makeSpeechTag(): HTMLElement {
        const speechContent = make('p', this.CSS.speechContent);
        // fill with data
        if (this._data.text.length) {
            this._data.text.forEach((item) => {
                const domProps = { innerHTML: item.word };
                const attributes = {
                    'data-start': item.start.toString(),
                    'data-end': item.end.toString(),
                };
                speechContent.appendChild(
                    make('span', this.CSS.speechWord, domProps, attributes),
                );
            });
        } else {
            speechContent.appendChild(make('span', this.CSS.speechWord));
        }

        return speechContent;
    }

    /**
     * Saves notes data
     */
    public save(): SpeechData {
        return this.data;
    }

    /**
     * Handle move speech block
     */
    public moved(event: Event): void {
        console.log('>> I WAS MOVED', event);
    }

    /**
     * Speech data setter
     *
     * @param {SpeechData} newSpeech
     */
    set data(newSpeech: SpeechData) {
        let speech = newSpeech;

        if (!speech) {
            speech = { speaker: '', timestamp: 0, text: [] };
        }

        this._data.speaker = speech.speaker || '';
        this._data.timestamp = speech.timestamp || 0;
        this._data.text = speech.text || [];

        const oldView = this.wrapper;

        if (oldView && oldView.parentNode) {
            oldView.parentNode.replaceChild(this.render(), oldView);
        }
    }

    /**
     * Return speech data
     *
     * @returns {speech}
     */
    get data(): SpeechData {
        this._data.text = [];

        const text = this.wrapper.querySelectorAll(`.${this.CSS.speechWord}`);

        for (let i = 0; i < text.length; i += 1) {
            const textItem = text[i];

            if (textItem) {
                this._data.text.push({
                    start: parseFloat(textItem.getAttribute('data-start') || ''),
                    end: parseFloat(textItem.getAttribute('data-end') || ''),
                    word: textItem.innerHTML,
                });
            }
        }

        return this._data;
    }

    /**
     * Styles
     *
     * @private
     */
    private get CSS() {
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
     * @param {KeyboardEvent} event
     */
    stopEvent(event: KeyboardEvent): void {
        event.preventDefault();
        event.stopPropagation();
    }

    /**
     * Handle backspace
     *
     * @param {KeyboardEvent} event
     */
    backspace(event: KeyboardEvent): void {
        const text = this.wrapper.querySelectorAll(`.${this.CSS.speechWord}`);

        /**
         * Save the last one.
         */
        if (text.length === 0) {
            this.stopEvent(event);
        }
    }
}
