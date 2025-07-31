import React from 'react';

import { ScreenHeaderLeftSlot, ScreenHeaderRightSlot } from './ScreenHeader';

type Slot = ({ children }: { children: React.ReactNode }) => React.ReactElement;
export const isSlot = (child: React.ReactNode) =>
    React.isValidElement(child) &&
    typeof child === 'object' &&
    'type' in child &&
    [ScreenHeaderLeftSlot, ScreenHeaderRightSlot].includes(child.type as Slot);
