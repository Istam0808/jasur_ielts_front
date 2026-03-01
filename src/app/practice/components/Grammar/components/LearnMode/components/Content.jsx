"use client";

export const LearnModeContent = ({ containerRef, title, render }) => {
    return (
        <main ref={containerRef} className="lm-content">
            <div className="lm-slide lm-slide-mobile-optimized">
                <h3 className="lm-slide-title">{title}</h3>
                <div className="lm-slide-body">
                    {typeof render === 'function' ? render() : null}
                </div>
            </div>
        </main>
    );
};


