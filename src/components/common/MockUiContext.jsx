"use client";

import { createContext, useContext, useMemo, useState } from "react";

const MockUiContext = createContext(null);

const DEFAULT_TEXT_SIZE = "regular";

export function MockUiProvider({ children }) {
    const [textSize, setTextSize] = useState(DEFAULT_TEXT_SIZE);

    const value = useMemo(
        () => ({
            textSize,
            setTextSize,
            resetTextSize: () => setTextSize(DEFAULT_TEXT_SIZE),
        }),
        [textSize]
    );

    return <MockUiContext.Provider value={value}>{children}</MockUiContext.Provider>;
}

export function useMockUi() {
    const context = useContext(MockUiContext);

    if (context) {
        return context;
    }

    return {
        textSize: DEFAULT_TEXT_SIZE,
        setTextSize: () => {},
        resetTextSize: () => {},
    };
}
