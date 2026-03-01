"use client";

import React from "react";

export const createIcon = (name) => {
  const Icon = ({ size = 20, color = "currentColor", ...props }) => (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <title>{name}</title>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );

  Icon.displayName = name;
  return Icon;
};
