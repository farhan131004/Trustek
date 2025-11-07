declare module 'react-tiny-link' {
  import * as React from 'react';

  export type CardSize = 'small' | 'large';

  export interface ReactTinyLinkProps {
    url: string;
    cardSize?: CardSize;
    maxLine?: number;
    minLine?: number;
    showGraphic?: boolean;
    proxyUrl?: string;
    header?: string;
    description?: string;
    defaultMedia?: string;
    className?: string;
    autoPlay?: boolean;
  }

  export const ReactTinyLink: React.FC<ReactTinyLinkProps>;
}
