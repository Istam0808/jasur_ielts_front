"use client";

import React, { useState, useMemo, useCallback } from "react";
import ShadowingLibrary from "./components/ShadowingLibrary";
import ShadowingPlayer from "./components/ShadowingPlayer";
import ErrorBoundary from "./components/ErrorBoundary";

// Import all data files
import beginnerData from '@/store/data/practice/language/english/listening/shadowing/beginner.json';
import intermediateData from '@/store/data/practice/language/english/listening/shadowing/intermediate.json';
import advancedData from '@/store/data/practice/language/english/listening/shadowing/advanced.json';

// ============================================
// PRE-PROCESS DATA IMMEDIATELY AT MODULE LOAD
// This runs ONCE when imported, just like lessonsBySubject
// ============================================

function flattenAllShadowingData() {
  console.log('📦 Flattening shadowing data...');
  const startTime = performance.now();
  
  const allVideos = [];
  
  // Process beginner
  if (beginnerData?.[0]) {
    Object.entries(beginnerData[0]).forEach(([category, videos]) => {
      if (Array.isArray(videos)) {
        videos.forEach(video => {
          allVideos.push({
            ...video,
            category,
            difficulty: 'Beginner'
          });
        });
      }
    });
  }
  
  // Process intermediate
  if (intermediateData?.[0]) {
    Object.entries(intermediateData[0]).forEach(([category, videos]) => {
      if (Array.isArray(videos)) {
        videos.forEach(video => {
          allVideos.push({
            ...video,
            category,
            difficulty: 'Intermediate'
          });
        });
      }
    });
  }
  
  // Process advanced
  if (advancedData?.[0]) {
    Object.entries(advancedData[0]).forEach(([category, videos]) => {
      if (Array.isArray(videos)) {
        videos.forEach(video => {
          allVideos.push({
            ...video,
            category,
            difficulty: 'Advanced'
          });
        });
      }
    });
  }
  
  const endTime = performance.now();
  console.log(`✅ Flattened ${allVideos.length} videos in ${(endTime - startTime).toFixed(2)}ms`);
  console.log(allVideos);
  
  return allVideos;
}



// Pre-flatten ONCE at module load (runs immediately when file is imported)
const FLATTENED_SHADOWING_DATA = flattenAllShadowingData();

// Group by category for library (also pre-calculated)
const GROUPED_SHADOWING_DATA = (() => {
  const grouped = {};
  FLATTENED_SHADOWING_DATA.forEach(video => {
    if (!grouped[video.category]) {
      grouped[video.category] = [];
    }
    grouped[video.category].push(video);
  });
  return [grouped];
})();

console.log('📊 Data ready:', {
  totalVideos: FLATTENED_SHADOWING_DATA.length,
  categories: Object.keys(GROUPED_SHADOWING_DATA[0])
});

// ============================================
// MAIN COMPONENT
// ============================================
function Shadowing({ difficulty = 'Intermediate', onBack }) {
  const [activeItem, setActiveItem] = useState(null);

  const handleOpen = useCallback((item) => {
    setActiveItem(item);
  }, []);

  const handleBack = useCallback(() => {
    setActiveItem(null);
  }, []);

  // Data is ALREADY ready - no loading needed!
  // Just pass the pre-processed data directly
  
  return (
    <ErrorBoundary fallbackMessage="An error occurred while loading the shadowing exercise.">   
      {!activeItem ? (
        <ShadowingLibrary 
          data={GROUPED_SHADOWING_DATA}
          flatData={FLATTENED_SHADOWING_DATA}
          onOpen={handleOpen}
          onBack={onBack}
        />
      ) : (
        <ShadowingPlayer 
          item={activeItem}
          onBack={handleBack}
        />
      )}
    </ErrorBoundary>
  );
}

export default React.memo(Shadowing);