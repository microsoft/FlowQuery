import React, { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { cypherLanguage } from "./cypher-lang";

interface CypherEditorProps {
    value: string;
    onChange: (value: string) => void;
    onShiftEnter?: () => void;
    placeholder?: string;
}

export const CypherEditor: React.FC<CypherEditorProps> = ({
    value,
    onChange,
    onShiftEnter,
    placeholder,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const onShiftEnterRef = useRef(onShiftEnter);

    onChangeRef.current = onChange;
    onShiftEnterRef.current = onShiftEnter;

    useEffect(() => {
        if (!containerRef.current) return;

        const shiftEnterKeymap = keymap.of([
            {
                key: "Shift-Enter",
                run: () => {
                    onShiftEnterRef.current?.();
                    return true;
                },
            },
        ]);

        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                onChangeRef.current(update.state.doc.toString());
            }
        });

        const theme = EditorView.theme({
            "&": {
                fontFamily: "monospace",
                fontSize: "14px",
                border: "1px solid #d1d1d1",
                borderRadius: "4px",
                minHeight: "120px",
                maxHeight: "40vh",
            },
            "&.cm-focused": {
                outline: "2px solid #0078d4",
                outlineOffset: "-1px",
            },
            ".cm-content": {
                padding: "8px 12px",
            },
            ".cm-scroller": {
                overflow: "auto",
            },
        });

        const state = EditorState.create({
            doc: value,
            extensions: [
                shiftEnterKeymap,
                history(),
                closeBrackets(),
                bracketMatching(),
                highlightSelectionMatches(),
                cypherLanguage,
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                keymap.of([
                    ...closeBracketsKeymap,
                    ...defaultKeymap,
                    ...searchKeymap,
                    ...historyKeymap,
                ]),
                updateListener,
                theme,
                ...(placeholder ? [cmPlaceholder(placeholder)] : []),
                EditorView.lineWrapping,
            ],
        });

        const view = new EditorView({
            state,
            parent: containerRef.current,
        });

        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync external value changes into the editor
    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        const current = view.state.doc.toString();
        if (current !== value) {
            view.dispatch({
                changes: { from: 0, to: current.length, insert: value },
            });
        }
    }, [value]);

    return <div ref={containerRef} style={{ width: "100%" }} />;
};
