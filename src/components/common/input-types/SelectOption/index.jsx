"use client";

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import styles from "./style.module.scss";
import Portal from "@/components/common/Portal";

export default function SelectOption({
  label,
  hint,
  error,
  name,
  options = [],
  value = null,
  onChange,
  placeholder = "Select...",
  disabled = false,
  required = false,
  clearable = false,
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const lastCoordsRef = useRef({ top: 0, left: 0, width: 0 });
  const [placement, setPlacement] = useState("bottom"); // 'bottom' | 'top'
  const lastPlacementRef = useRef("bottom");
  const [panelMaxHeight, setPanelMaxHeight] = useState(undefined);
  const lastMaxHeightRef = useRef(undefined);
  const rafRef = useRef(0);
  const scrollParentsRef = useRef([]);
  const resizeObserverRef = useRef(null);

  const describedBy = error
    ? `${id}-error`
    : hint
    ? `${id}-hint`
    : undefined;

  const getLabel = (val) => {
    const found = options.find((o) => (typeof o === "string" ? o : o.value) === val);
    if (!found) return "";
    return typeof found === "string" ? found : found.label;
  };

  const toggle = () => !disabled && setOpen((o) => !o);
  const close = () => setOpen(false);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target) &&
        listRef.current &&
        !listRef.current.contains(e.target)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Compute dropdown coordinates relative to viewport to avoid clipping
  const updatePosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth || document.documentElement.clientWidth;
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const gap = 6;
    const margin = 8;

    // Desired width equals trigger width but clamp to viewport to avoid overflow
    const desiredWidth = Math.round(rect.width);
    const maxAllowedWidth = Math.max(120, viewportW - margin * 2);
    const clampedWidth = Math.min(desiredWidth, maxAllowedWidth);

    // Clamp left within viewport
    const unclampedLeft = Math.round(rect.left);
    const maxLeft = viewportW - clampedWidth - margin;
    const clampedLeft = Math.max(margin, Math.min(unclampedLeft, maxLeft));

    // Measure menu natural height if available
    const listEl = listRef.current;
    const naturalHeight = listEl ? listEl.scrollHeight : Math.round(viewportH * 0.4);

    const spaceBelow = viewportH - rect.bottom - margin;
    const spaceAbove = rect.top - margin;

    // Decide placement: prefer bottom; flip to top if below space is insufficient and above has more room
    let nextPlacement = "bottom";
    const desiredHeight = Math.min(naturalHeight, Math.round(viewportH * 0.9));
    if (spaceBelow < Math.min(desiredHeight, 240) && spaceAbove > spaceBelow) {
      nextPlacement = "top";
    }

    // Compute top and max height based on placement
    let nextTop;
    let nextMaxHeight;
    if (nextPlacement === "bottom") {
      nextTop = Math.min(Math.round(rect.bottom + gap), viewportH - margin);
      nextMaxHeight = Math.max(120, Math.min(desiredHeight, spaceBelow));
    } else {
      nextMaxHeight = Math.max(120, Math.min(desiredHeight, spaceAbove));
      nextTop = Math.round(rect.top - gap - nextMaxHeight);
    }

    // Apply updates only if changed
    const prevCoords = lastCoordsRef.current;
    const nextCoords = { top: nextTop, left: clampedLeft, width: clampedWidth };
    if (
      prevCoords.top !== nextCoords.top ||
      prevCoords.left !== nextCoords.left ||
      prevCoords.width !== nextCoords.width
    ) {
      lastCoordsRef.current = nextCoords;
      setCoords(nextCoords);
    }

    if (lastPlacementRef.current !== nextPlacement) {
      lastPlacementRef.current = nextPlacement;
      setPlacement(nextPlacement);
    }

    if (lastMaxHeightRef.current !== nextMaxHeight) {
      lastMaxHeightRef.current = nextMaxHeight;
      setPanelMaxHeight(nextMaxHeight);
    }
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();

    // Attach scroll listeners only to scrollable ancestors to minimize work
    const getScrollableAncestors = (el) => {
      const parents = [];
      let node = el?.parentElement;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        const overflowY = style.overflowY;
        const canScroll = (overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight;
        if (canScroll) parents.push(node);
        node = node.parentElement;
      }
      parents.push(window);
      return parents;
    };

    const tick = () => {
      rafRef.current = 0;
      updatePosition();
    };
    const requestTick = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    };

    const onScroll = () => requestTick();
    const onResize = () => requestTick();

    scrollParentsRef.current = getScrollableAncestors(buttonRef.current);
    scrollParentsRef.current.forEach((p) => p.addEventListener("scroll", onScroll, { passive: true }));
    window.addEventListener("resize", onResize, { passive: true });

    // Observe trigger size changes
    resizeObserverRef.current = new ResizeObserver(() => requestTick());
    if (buttonRef.current) resizeObserverRef.current.observe(buttonRef.current);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      scrollParentsRef.current.forEach((p) => p.removeEventListener("scroll", onScroll));
      window.removeEventListener("resize", onResize);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, [open]);

  const currentIndex = options.findIndex(
    (o) => (typeof o === "string" ? o : o.value) === value
  );

  useEffect(() => {
    if (open) {
      let initialIndex = Math.max(0, currentIndex);
      // If the current index is disabled, find the next available option
      while (initialIndex < options.length) {
        const opt = options[initialIndex];
        const isDisabled = typeof opt === "string" ? false : (opt.disabled || false);
        if (!isDisabled) break;
        initialIndex++;
      }
      // If no available options found, start from the beginning
      if (initialIndex >= options.length) {
        initialIndex = 0;
        while (initialIndex < options.length) {
          const opt = options[initialIndex];
          const isDisabled = typeof opt === "string" ? false : (opt.disabled || false);
          if (!isDisabled) break;
          initialIndex++;
        }
      }
      setFocusedIndex(initialIndex < options.length ? initialIndex : -1);
    }
  }, [open, currentIndex, options]);

  const handleKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      let nextIndex = focusedIndex + 1;
      // Skip disabled options
      while (nextIndex < options.length) {
        const opt = options[nextIndex];
        const isDisabled = typeof opt === "string" ? false : (opt.disabled || false);
        if (!isDisabled) break;
        nextIndex++;
      }
      if (nextIndex < options.length) {
        setFocusedIndex(nextIndex);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      let prevIndex = focusedIndex - 1;
      // Skip disabled options
      while (prevIndex >= 0) {
        const opt = options[prevIndex];
        const isDisabled = typeof opt === "string" ? false : (opt.disabled || false);
        if (!isDisabled) break;
        prevIndex--;
      }
      if (prevIndex >= 0) {
        setFocusedIndex(prevIndex);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[focusedIndex];
      if (!opt) return;
      const optValue = typeof opt === "string" ? opt : opt.value;
      const isDisabled = typeof opt === "string" ? false : (opt.disabled || false);
      if (!isDisabled) {
        onChange && onChange(optValue);
        close();
      }
    }
  };

  return (
    <div className={styles.wrapper}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
          {required ? <span className={styles.required}>*</span> : null}
        </label>
      )}

      <button
        id={id}
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-describedby={describedBy}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        data-open={open || undefined}
      >
        <span className={styles.valueText} data-placeholder={!value || undefined}>
          {value ? getLabel(value) : placeholder}
        </span>
        {clearable && value ? (
          <span
            className={styles.clear}
            role="button"
            aria-label="Clear selection"
            onClick={(e) => {
              e.stopPropagation();
              onChange && onChange(null);
            }}
          >
            ×
          </span>
        ) : null}
        <FiChevronDown className={styles.chevron} aria-hidden />
      </button>

      {open && (
        <Portal>
          <ul
            id={`${id}-list`}
            ref={listRef}
            role="listbox"
            className={styles.list}
            tabIndex={-1}
            aria-activedescendant={
              focusedIndex >= 0 ? `${id}-opt-${focusedIndex}` : undefined
            }
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              right: "auto",
              width: `${coords.width}px`,
              zIndex: 10002,
              maxHeight: panelMaxHeight ? `${panelMaxHeight}px` : undefined,
              overflow: "auto",
            }}
          >
            {options.map((opt, idx) => {
              const optValue = typeof opt === "string" ? opt : opt.value;
              const optLabel = typeof opt === "string" ? opt : opt.label;
              const isOptionDisabled = typeof opt === "string" ? false : (opt.disabled || false);
              const selected = value === optValue;
              return (
                <li
                  id={`${id}-opt-${idx}`}
                  key={`${id}-${optValue}`}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={isOptionDisabled}
                  className={`${styles.option} ${isOptionDisabled ? styles.optionDisabled : ''}`}
                  data-selected={selected || undefined}
                  data-focused={focusedIndex === idx || undefined}
                  data-disabled={isOptionDisabled || undefined}
                  onMouseEnter={() => !isOptionDisabled && setFocusedIndex(idx)}
                  onClick={() => {
                    if (!isOptionDisabled) {
                      onChange && onChange(optValue);
                      close();
                    }
                  }}
                >
                  <span className={styles.optionLabel}>{optLabel}</span>
                  {selected ? (
                    <FiCheck className={styles.optionIcon} aria-hidden />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Portal>
      )}

      {hint && !error && (
        <div id={`${id}-hint`} className={styles.hint}>
          {hint}
        </div>
      )}
      {error && (
        <div id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}


