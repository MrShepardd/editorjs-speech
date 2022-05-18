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

declare class Speech implements BlockTool {
    render(): HTMLElement;
    save(): BlockToolData<SpeechData>;
}

export default Speech;