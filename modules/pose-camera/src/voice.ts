import { requireOptionalNativeModule } from 'expo';

type Voice = { say: (text: string) => Promise<void>; hush: () => Promise<void> };

const Native = requireOptionalNativeModule<Voice>('PoseCamera');

/** Loc says a short line out loud: the system voice, on the phone. Silent on an older build. */
export const say = (text: string) => void Native?.say(text).catch(() => {});

export const hush = () => void Native?.hush().catch(() => {});
