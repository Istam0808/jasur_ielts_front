"use client";

import React, { useMemo, useCallback } from "react";

const PLACEHOLDER_RE = /\{\{question:(\d+)\}\}/g;

function splitTextWithPlaceholders(text) {
  if (typeof text !== "string" || !text) return [{ type: "text", value: text ?? "" }];
  const out = [];
  let lastIndex = 0;
  for (const match of text.matchAll(PLACEHOLDER_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      out.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    out.push({ type: "placeholder", q: Number(match[1]) });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    out.push({ type: "text", value: text.slice(lastIndex) });
  }
  return out.length ? out : [{ type: "text", value: text }];
}

function isSafeTag(tag) {
  // Минимальный whitelist для контента из backend mock.
  return [
    "p",
    "b",
    "strong",
    "i",
    "em",
    "u",
    "br",
    "ul",
    "ol",
    "li",
    "span",
    "div",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
  ].includes(tag);
}

function nodeToReact(node, keyPrefix, renderPlaceholder) {
  if (!node) return null;

  if (node.nodeType === Node.TEXT_NODE) {
    const chunks = splitTextWithPlaceholders(node.textContent || "");
    return chunks.map((chunk, idx) => {
      const k = `${keyPrefix}-t-${idx}`;
      if (chunk.type === "text") return <React.Fragment key={k}>{chunk.value}</React.Fragment>;
      return <React.Fragment key={k}>{renderPlaceholder(chunk.q)}</React.Fragment>;
    });
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tag = String(node.tagName || "").toLowerCase();
  if (!isSafeTag(tag)) {
    // Пропускаем небезопасные/неожиданные теги, но рендерим их детей (чтобы не потерять текст).
    const children = Array.from(node.childNodes).map((child, idx) =>
      nodeToReact(child, `${keyPrefix}-c-${idx}`, renderPlaceholder)
    );
    return <React.Fragment key={keyPrefix}>{children}</React.Fragment>;
  }

  if (tag === "br") {
    return <br key={keyPrefix} />;
  }

  // Разрешаем только безопасные атрибуты.
  const props = { key: keyPrefix };
  if (node.getAttribute) {
    const className = node.getAttribute("class");
    if (className) props.className = className;
  }

  const children = Array.from(node.childNodes).map((child, idx) =>
    nodeToReact(child, `${keyPrefix}-${tag}-${idx}`, renderPlaceholder)
  );

  return React.createElement(tag, props, children);
}

const RawHtmlWithInputs = ({ html, userAnswers, onAnswerChange }) => {
  const normalizedHtml = typeof html === "string" ? html : "";

  const docBody = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!normalizedHtml.trim()) return null;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(normalizedHtml, "text/html");
      return doc?.body ?? null;
    } catch {
      return null;
    }
  }, [normalizedHtml]);

  const renderPlaceholder = useCallback(
    (qNumber) => {
      const num = Number(qNumber);
      if (!Number.isFinite(num) || num <= 0) {
        return <span className="raw-html-placeholder raw-html-placeholder--invalid">___</span>;
      }
      return (
        <span className="raw-html-blank">
          <input
            type="text"
            id={`raw-q-${num}`}
            name={`raw-q-${num}`}
            value={userAnswers?.[num] ?? ""}
            onChange={(e) => onAnswerChange(num, e.target.value)}
            className="blank-input raw-html-input"
            aria-label={`Question ${num}`}
            inputMode="text"
            autoComplete="off"
          />
        </span>
      );
    },
    [onAnswerChange, userAnswers]
  );

  if (!docBody) return null;

  const nodes = Array.from(docBody.childNodes);

  return (
    <div className="raw-html-content selectable-content">
      {nodes.map((node, idx) => nodeToReact(node, `raw-${idx}`, renderPlaceholder))}
    </div>
  );
};

export default RawHtmlWithInputs;

