"use client"
import "./style.scss"
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import useScrollLock from "@/hooks/useScrollLock";
import { useFocusTrap } from "@/hooks/useKeyboardNavigation";

function Modal(props) {
    const {
        children,
        onClose,
        title,
        description,
        buttons,
        closeOnClickOutside = true,
        closeOnEscape = true,
        padding = true,
        showCloseButton = true,
        wrapperClassName = "",
        contentClassName = ""
    } = props;

    const [isClosing, setIsClosing] = useState(false);
    const [mounted, setMounted] = useState(false);
    const closeButtonRef = useRef(null);

    // Lock scroll when modal is open
    useScrollLock(mounted && !isClosing);

    // Focus trap for accessibility
    const { containerRef } = useFocusTrap({
        isOpen: mounted && !isClosing,
        onClose: handleCloseModal,
        autoFocus: true
    });

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    function handleCloseModal() {
        setIsClosing(true);
        setTimeout(() => {
            if (onClose) {
                onClose();
            }
            setIsClosing(false);
        }, 300); // Match this with the animation duration in SCSS
    }

    function handleKeyDown(event) {
        if (closeOnEscape && event.key === "Escape") {
            handleCloseModal();
        }
    }

    function handleWrapperClick(event) {
        if (closeOnClickOutside && event.target === event.currentTarget) {
            handleCloseModal();
        }
    }

    useEffect(() => {
        if (closeOnEscape) {
            document.addEventListener("keydown", handleKeyDown);
            return () => {
                document.removeEventListener("keydown", handleKeyDown);
            }
        }
    }, [closeOnEscape]);

    // Add cleanup effect to reset closing state when modal is unmounted
    useEffect(() => {
        return () => {
            setIsClosing(false);
        };
    }, []);

    const modalContent = (
        <section 
            className={`modal-wrapper ${isClosing ? 'closing' : ''} ${wrapperClassName}`.trim()} 
            onClick={handleWrapperClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            aria-describedby={description ? "modal-description" : undefined}
        >
            {showCloseButton && (
                <span 
                    id="close-modal" 
                    onClick={handleCloseModal}
                    ref={closeButtonRef}
                    role="button"
                    tabIndex={0}
                    aria-label="Close modal"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCloseModal();
                        }
                    }}
                >
                    &times;
                </span>
            )}
            <div 
                className={`modal-content ${contentClassName}`.trim()} 
                style={{ padding: padding ? '40px' : '0px' }}
                ref={containerRef}
            >
                {/* Render title, description, body, and buttons */}
                {title && <h1 id="modal-title" className="modal-title">{title}</h1>}
                {description && <p id="modal-description" className="modal-description">{description}</p>}
                {children}
                {buttons && (
                    <div className="modal-buttons">
                        {buttons.map((button, index) => (
                            button.button || (
                                <button
                                    key={index + "-modal-button"}
                                    className={button.className}
                                    onClick={button.onClick}
                                    aria-label={button.ariaLabel || button.text}
                                >
                                    {button.text}
                                </button>
                            )
                        ))}
                    </div>
                )}
            </div>
        </section>
    );

    // Only render the portal on the client side
    if (!mounted) return null;

    return createPortal(modalContent, document.body);
}

export default Modal; 