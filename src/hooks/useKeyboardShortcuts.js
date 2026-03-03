import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Global keyboard shortcuts for DreamPlanner.
 * / — Focus search
 * n — New dream
 * h — Go home
 * c — Calendar
 * m — Messages
 * s — Social
 * p — Profile
 * ? — Show shortcuts help (dispatches event)
 */
export default function useKeyboardShortcuts() {
  var navigate = useNavigate();

  useEffect(function () {
    function handler(e) {
      // Skip if typing in an input/textarea or if modifier keys are held
      var tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case "/":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("dp-open-search"));
          break;
        case "n":
          e.preventDefault();
          navigate("/dream/create");
          break;
        case "h":
          e.preventDefault();
          navigate("/");
          break;
        case "c":
          e.preventDefault();
          navigate("/calendar");
          break;
        case "m":
          e.preventDefault();
          navigate("/conversations");
          break;
        case "s":
          e.preventDefault();
          navigate("/social");
          break;
        case "p":
          e.preventDefault();
          navigate("/profile");
          break;
        case "?":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("dp-show-shortcuts"));
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handler);
    return function () { window.removeEventListener("keydown", handler); };
  }, [navigate]);
}
