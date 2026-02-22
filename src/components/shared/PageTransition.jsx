import { useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

export default function PageTransition({ children }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState("enter");
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      setTransitionStage("exit");
      const timeout = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionStage("enter");
        prevPath.current = location.pathname;
      }, 150); // exit duration
      return () => clearTimeout(timeout);
    } else {
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  return (
    <div
      style={{
        transition: "opacity 0.15s ease-out, transform 0.15s ease-out",
        opacity: transitionStage === "exit" ? 0 : 1,
        transform: transitionStage === "exit" ? "translateY(6px)" : "translateY(0)",
        minHeight: "100vh",
      }}
    >
      {displayChildren}
    </div>
  );
}
