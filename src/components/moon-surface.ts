import { createContext, useContext } from 'react';

/**
 * True while a page sits on the risen quiz moon. Text centres there, like the moon's
 * list questions, and gray text turns white so it reads on the moon's blue.
 */
const OnMoon = createContext(false);
export const MoonSurface = OnMoon.Provider;
export const useOnMoon = () => useContext(OnMoon);
