import { Composition } from 'remotion';
import { AlarmReel, ALARM_REEL_FRAMES } from './AlarmReel';
import { FiveMinutes, FIVE_FPS, FIVE_FRAMES } from './five/FiveMinutes';
import { PhoneGate, GATE_FPS, GATE_FRAMES } from './gate/PhoneGate';
import { JustChecking, JC_FPS, JC_FRAMES } from './alarms/JustChecking';
import { OneMoreVideo, OMV_FPS, OMV_FRAMES } from './night/OneMoreVideo';

export const Root = () => (
  <>
    <Composition id="PhoneGate" component={PhoneGate} durationInFrames={GATE_FRAMES} fps={GATE_FPS} width={1080} height={1920} />
    <Composition id="JustChecking" component={JustChecking} durationInFrames={JC_FRAMES} fps={JC_FPS} width={1080} height={1920} />
    <Composition id="OneMoreVideo" component={OneMoreVideo} durationInFrames={OMV_FRAMES} fps={OMV_FPS} width={1080} height={1920} />
    <Composition id="FiveMinutes" component={FiveMinutes} durationInFrames={FIVE_FRAMES} fps={FIVE_FPS} width={1080} height={1920} />
    <Composition id="AlarmReel" component={AlarmReel} durationInFrames={ALARM_REEL_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
