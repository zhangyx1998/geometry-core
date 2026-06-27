declare module '*.svg' {
  import { DefineComponent } from 'vue';
  const content: DefineComponent;
  export default content;
  const ownAttrs: Record<string, string>;
  const innerHTML: string;
  export { ownAttrs, innerHTML };
}
