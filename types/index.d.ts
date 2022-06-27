import { BlockTool, BlockToolData } from "@editorjs/editorjs";

export interface TextData {
    start: number;
    end: number;
    word: string;
}

export interface SpeechData {
    /**
     * Identifier of the speech
     */
    id: number
    /**
     * Speaker name
     */
    speaker: SpeakerData;

    /**
     * Timestamp of speech
     */
    timestamp: number;

    /**
     * Does it mean that the block was split into two parts
     */
    wasSplit: boolean;

    /**
     * Note's superscript index
     */
    text: TextData[];
}

export interface SpeakerData {
    /**
     * Identifier of the speaker
     */
    id: number
    /**
     * Speaker's name
     */
    name: string;

    /**
     * Speaker's icon
     */
    icon: string | null;
}

export interface SpeechToolConfig {
    speakerList?: SpeakerData[];
}

declare class Speech implements BlockTool {
    render(): HTMLElement;
    save(): BlockToolData<SpeechData>;
}

export default Speech;