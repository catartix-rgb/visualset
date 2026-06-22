"use client";
import dynamic from "next/dynamic";

// The entire experience is WebGL + media-stream heavy, so render it client-only.
const App = dynamic(() => import("@/components/App"), { ssr: false });

export default function Page() {
  return <App />;
}
