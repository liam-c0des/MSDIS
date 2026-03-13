import React from 'react'

function LoadingAnimation({ isLoading }) {
  if (!isLoading) return null

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 backdrop-blur-sm pointer-events-none">
      <div className="flex flex-col items-center gap-4 pointer-events-auto">
        <div className="w-64 h-64 flex items-center justify-center">
          <video
            width="256"
            height="256"
            autoPlay
            loop
            muted
            className="w-64 h-64"
          >
            <source src="/loading-animation.webm" type="video/webm" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  )
}

export default LoadingAnimation
