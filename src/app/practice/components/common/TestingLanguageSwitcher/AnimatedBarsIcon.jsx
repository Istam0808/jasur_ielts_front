"use client"
import { memo } from 'react'
import './style.scss'

/**
 * Performance-optimized animated bars icon component
 * Uses CSS transforms (GPU-accelerated) and React.memo for optimal performance
 */
const AnimatedBarsIcon = memo(({ className = '' }) => {
  return (
    <svg 
      className={`animated-bars-icon ${className}`.trim()} 
      width="16" 
      height="16" 
      viewBox="0 0 16 16" 
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Bar 1 */}
      <rect 
        className="animated-bar bar-1" 
        x="2" 
        y="8" 
        width="2.5" 
        height="6" 
        rx="1.25"
      />
      {/* Bar 2 */}
      <rect 
        className="animated-bar bar-2" 
        x="6.5" 
        y="6" 
        width="2.5" 
        height="8" 
        rx="1.25"
      />
      {/* Bar 3 */}
      <rect 
        className="animated-bar bar-3" 
        x="11" 
        y="4" 
        width="2.5" 
        height="10" 
        rx="1.25"
      />
    </svg>
  )
})

AnimatedBarsIcon.displayName = 'AnimatedBarsIcon'

export default AnimatedBarsIcon
