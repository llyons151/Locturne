/** The web preview's voice: the browser's own speech, so the count can be heard there too. */
export function say(text: string) {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  const line = new SpeechSynthesisUtterance(text);
  line.rate = 1.05;
  speechSynthesis.speak(line);
}

export function hush() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}
