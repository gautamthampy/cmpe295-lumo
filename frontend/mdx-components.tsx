import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface" {...props} />,
    h2: (props) => <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface" {...props} />,
    p: (props) => <p className="font-body text-base leading-7 text-on-surface-variant" {...props} />,
    ...components,
  };
}
