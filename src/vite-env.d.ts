/// <reference types="vite/client" />

// Declare CSS modules
declare module '*.css' {
  const content: string;
  export default content;
}

// Declare CSS imports from node_modules
declare module 'reactflow/dist/style.css';
declare module 'reactflow/dist/base.css';
