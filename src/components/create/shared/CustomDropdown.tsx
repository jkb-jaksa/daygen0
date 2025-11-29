import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { glass } from "../../../styles/designSystem";
import { useDropdownScrollLock } from "../../../hooks/useDropdownScrollLock";

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({ value, onChange, options, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const {
    setScrollableRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDropdownScrollLock<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full min-h-[38px] px-2.5 py-1.5 rounded-lg text-theme-white font-raleway text-sm focus:outline-none focus:border-theme-white transition-colors duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${glass.promptDark}`}
      >
        <span className={selectedOption ? "text-theme-white" : "text-theme-white/50"}>
          {selectedOption?.label || placeholder || "Select..."}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={node => {
              dropdownRef.current = node;
              setScrollableRef(node);
            }}
            className={`fixed rounded-lg shadow-lg z-[9999] ${glass.promptDark}`}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: '384px',
              overflowY: 'auto',
            }}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 text-left text-sm font-raleway rounded-lg border transition-all duration-0 ${
                  option.value === value
                    ? "bg-white border-0 shadow-lg shadow-white/30 text-theme-black"
                    : "bg-transparent hover:bg-theme-text/20 border-0 text-theme-white hover:text-theme-text"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

