// The 25 takes. Each: name, desc, open(ctx) → { w, pick, close }, apply, optional at/commit/demo/hold.
// Coordinates are the 390 × 844 phone. Moon centre (195, 535), radius 115. Gem centre (344, 784).
/* global $, wait, anim, tween, clamp, ease, glide, tap, rel, orb, Wheel, label, glass, popIn, popOut, scrim, scrimOut, orbItem, place,
   T, PAL, lerpPal, state, idx, layer, phone, home, gem, moonHit, curScene, applyTheme, livePreview, liveCommit, gemTo */

const MX = 195, MY = 535, GX = 344, GY = 784;
const hit = (host, x, y, w, h = w) => { const el = $(`<div style="position:absolute;left:${x - w / 2}px;top:${y - h / 2}px;width:${w}px;height:${h}px;border-radius:${Math.min(w, h) / 2}px;cursor:pointer;z-index:200"></div>`); host.append(el); return el; };
const ringAt = (host, x, y, s) => { const r = $(`<div class="ring" style="left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;z-index:150"></div>`); host.append(r); return r; };
const free = () => { const h = $('<div style="position:absolute;inset:0"></div>'); layer.append(h); return h; };
const wrap = (d, n = 12) => ((d + n / 2) % n + n) % n - n / 2;
const textsOff = (on) => home.querySelectorAll('.bigtime,.hstate').forEach((e) => anim(e, [{ opacity: on ? 1 : 0 }, { opacity: on ? 0 : 1 }], { duration: 260 }));
/** A temp orb flying between two points (for gem hand-offs). */
async function fly(id, from, to, s0, s1, ms = 520, pal) {
  const o = orb(id, 160); if (pal) o._pal = pal; o.style.position = 'absolute'; o.style.left = '0'; o.style.top = '0'; o.style.zIndex = 300; layer.append(o);
  await tween(ms, (e) => { const x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e - Math.sin(e * Math.PI) * 40, s = (s0 + (s1 - s0) * e) / 160; o.style.transform = `translate(${x - 80}px, ${y - 80}px) scale(${s})`; }, (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  return o;
}

const VARIANTS = [
  // 1
  { name: 'Glass capsule', apply: 'fade',
    desc: 'A pill of glass rises off the moon. Orbs slide sideways under a fixed ring; the one in the ring grows. Tap it to wear it.',
    open() {
      const g = glass('left:25px;top:290px;width:340px;height:136px;border-radius:68px;overflow:hidden');
      const w = new Wheel({ host: g, step: 78, make: (t) => orbItem(t, 64),
        layout: (el, d) => { const a = Math.abs(d); place(el, 170 + d * 78, 56, 1 - Math.min(a, 2.5) * .2); el.style.opacity = clamp(1.35 - a * .38, 0, 1); },
        onIndex: (i) => lb.set(i) });
      ringAt(g, 170, 56, 76); const lb = label(g, 'left:0;right:0;top:98px'); lb.set(w.i);
      const pk = hit(g, 170, 56, 76);
      popIn(g, 'translateY(60px) scale(.5)', 460, '50% 160%');
      return { w, pick: () => pk, close: () => popOut(g, 'translateY(40px) scale(.7)') };
    } },
  // 2
  { name: 'Drum picker', apply: 'moonset',
    desc: 'The iOS date-picker drum, in a glass card: orb and name per row, the middle row lit. Wear underneath. The old moon sets, the new one rises.',
    open() {
      const g = glass('left:45px;top:240px;width:300px;height:310px;border-radius:36px;overflow:hidden');
      g.append($('<div style="position:absolute;left:14px;right:14px;top:100px;height:52px;border-radius:16px;background:rgba(255,255,255,.12)"></div>'));
      const w = new Wheel({ host: g, axis: 'y', step: 46,
        make: (t) => { const el = $(`<div style="width:220px;height:44px;display:flex;align-items:center;gap:14px"></div>`); el.append(orb(t.id, 34)); el.append($(`<span style="font-size:19px;font-weight:600">${t.name}</span>`)); return el; },
        layout: (el, d) => { const ang = clamp(d * 21, -90, 90), rad = ang * Math.PI / 180;
          el.style.transform = `translate(46px, ${126 + Math.sin(rad) * 112 - 22}px) perspective(500px) rotateX(${-ang}deg)`; el.style.opacity = Math.abs(ang) >= 89 ? 0 : Math.pow(Math.cos(rad), 1.6); } });
      const b = $('<button class="gbtn" style="left:22px;right:22px;bottom:20px">Wear</button>'); g.append(b);
      popIn(g, 'scale(.88)', 380);
      return { w, pick: () => b, close: () => popOut(g) };
    } },
  // 3
  { name: 'Moon rim arc', apply: 'reveal', at: () => ({ x: MX, y: MY - 170 }),
    desc: 'A band of glass hugs the top of the moon. The orbs ride round it like beads; drag along the curve. The new sky opens out of the orb at the top.',
    open() {
      const h = free(), R = 170;
      const band = glass(`left:${MX - R - 40}px;top:${MY - R - 40}px;width:${2 * R + 80}px;height:${2 * R + 80}px;border-radius:50%;clip-path:inset(0 0 50% 0);-webkit-mask:radial-gradient(circle, transparent ${R - 38}px, #000 ${R - 37}px, #000 ${R + 37}px, transparent ${R + 38}px);mask:radial-gradient(circle, transparent ${R - 38}px, #000 ${R - 37}px, #000 ${R + 37}px, transparent ${R + 38}px)`);
      h.append(band);
      const w = new Wheel({ host: h, axis: 'angle', center: [MX, MY], step: 24, fingerR: R, fingerA: -55, make: (t) => orbItem(t, 54),
        layout: (el, d) => { const a = (-90 + d * 24) * Math.PI / 180, ad = Math.abs(d); place(el, MX + R * Math.cos(a), MY + R * Math.sin(a), ad < .5 ? 1.18 - ad * .36 : 1);
          el.style.opacity = ad > 3.6 ? 0 : clamp((3.6 - ad) / .8, 0, 1); },
        onIndex: (i) => lb.set(i) });
      ringAt(h, MX, MY - R, 74); const lb = label(h, `left:0;right:0;top:${MY - R - 92}px`); lb.set(w.i);
      const pk = hit(h, MX, MY - R, 74);
      popIn(h, 'scale(.7)', 520, `${MX}px ${MY}px`);
      return { w, pick: () => pk, close: () => popOut(h, 'scale(.8)') };
    } },
  // 4
  { name: 'Full dial', apply: 'fade',
    desc: 'A round glass dial over the sky, every orb on its rim. Turn it; whatever reaches the top shows big in the middle. Tap the middle to wear.',
    open() {
      const g = glass('left:35px;top:222px;width:320px;height:320px;border-radius:50%'), C = 160;
      const big = orb(null, 100); big._pal = PAL[state.theme]; big.style.cssText += `;position:absolute;left:${C - 50}px;top:${C - 62}px`; g.append(big);
      const lb = label(g, `left:0;right:0;top:${C + 44}px`);
      const w = new Wheel({ host: g, axis: 'angle', center: [195, 382], step: 30, fingerR: 128, fingerA: 0, make: (t) => orbItem(t, 42),
        layout: (el, d) => { const dd = wrap(d), a = (-90 + dd * 30) * Math.PI / 180; place(el, C + 128 * Math.cos(a), C + 128 * Math.sin(a), Math.abs(dd) < .5 ? 1.3 - Math.abs(dd) * .6 : 1); },
        onIndex: (i) => { lb.set(i); const a = big._pal; tween(260, (e) => (big._pal = lerpPal(a, PAL[T[i].id], e))); } });
      ringAt(g, C, C - 128, 62); lb.set(w.i);
      const pk = hit(g, C, C - 12, 104);
      popIn(g, 'scale(.6) rotate(-40deg)', 520);
      return { w, pick: () => pk, close: () => popOut(g, 'scale(.8) rotate(20deg)') };
    } },
  // 5
  { name: 'Cover flow', apply: 'fade',
    desc: 'A floating glass sheet with the orbs in perspective, turned like album covers, the front one facing you. Wear button underneath.',
    open() {
      const g = glass('left:10px;right:10px;bottom:10px;height:262px;border-radius:40px;overflow:hidden');
      const w = new Wheel({ host: g, step: 70, make: (t) => orbItem(t, 112),
        layout: (el, d) => { const c = clamp(d, -1, 1), a = Math.abs(d); place(el, 185 + d * 62 + c * 46, 92, a < 1 ? 1 - a * .25 : .75, `perspective(600px) rotateY(${-c * 52}deg)`);
          el.style.zIndex = 100 - Math.round(a * 10); el.style.opacity = clamp(1.5 - a * .3, 0, 1); },
        onIndex: (i) => lb.set(i) });
      const lb = label(g, 'left:0;right:0;top:160px'); lb.set(w.i);
      const b = $('<button class="gbtn" style="left:22px;right:22px;bottom:18px">Wear</button>'); g.append(b);
      anim(g, [{ transform: 'translateY(110%)' }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.32,.72,0,1)' });
      return { w, pick: () => b, close: () => anim(g, [{ transform: 'none' }, { transform: 'translateY(110%)' }], { duration: 320, easing: 'cubic-bezier(.4,0,.8,.4)' }).then(() => g.remove()) };
    } },
  // 6
  { name: 'Dock', apply: 'pour',
    desc: 'A glass dock above the tabs with every orb small. Slide a finger along it and the orbs swell under it like the Mac dock; let go to wear. The theme pours up from the gem.',
    open() {
      const g = glass('left:16px;right:16px;top:664px;height:72px;border-radius:28px'), X0 = 35.5 - 16;
      let active = false;
      const tip = glass('left:0;top:584px;height:40px;padding:0 16px;border-radius:20px;display:flex;align-items:center;font-size:15px;font-weight:600;opacity:0;transition:opacity .15s');
      const w = new Wheel({ host: g, axis: 'point', make: (t) => orbItem(t, 64),
        map: (x) => (x - 16 - X0) / 29, at: (p) => ({ x: 16 + X0 + p * 29, y: 700 }),
        layout: (el, d, i) => { const s = active ? 1 + 1.3 * Math.exp(-d * d / 1.4) : 1; place(el, X0 + i * 29 + (active ? 20 * Math.tanh(d / 1.2) : 0), 36 - (s - 1) * 24, .4 * s); el.style.zIndex = Math.round(s * 10); },
        onPos: (p) => { if (!active) return; tip.textContent = T[clamp(Math.round(p), 0, 11)].name; tip.style.left = clamp(16 + X0 + p * 29 - tip.offsetWidth / 2, 12, 378 - tip.offsetWidth) + 'px'; } });
      w.snap = false;
      g.addEventListener('pointerdown', () => { active = true; tip.style.opacity = 1; });
      w.onRelease = () => { active = false; tip.style.opacity = 0; w.render(); };
      w._act = (on) => { active = on; tip.style.opacity = on ? 1 : 0; w.render(); };
      anim(g, [{ transform: 'translateY(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.32,1.2,.5,1)' });
      return { w, pick: () => null, close: async () => { tip.remove(); await popOut(g, 'translateY(30px)'); } };
    },
    async demo(ctx, open) {
      await tap(moonHit()); await open(); await wait(600);
      const w = ctx.ui.w; w._act(true);
      const at = (p) => w.at(p);
      await glide((e) => at(2 * e), 700, (e) => w.set(2 * e), { lift: false });
      await wait(300);
      await glide((e) => at(2 + 3 * e), 700, (e) => w.set(2 + 3 * e), { lift: false, press: false });
      await wait(300);
      await glide((e) => at(5 - e), 400, (e) => w.set(5 - e), { lift: false, press: false });
      await wait(400); finger.classList.remove('down', 'on'); w.pos = 4; w._act(false); await wait(150);
      await ctx.ui.commit();
    } },
  // 7
  { name: 'Gem lifts out', apply: 'pour',
    desc: 'The gem itself leaves the tab bar and grows in the middle of the screen on a glass disc. Swipe it to the next orb. Tap to wear: it shrinks back into its slot and the new theme pours up from there.',
    open() {
      const g = glass('left:77px;top:242px;width:236px;height:236px;border-radius:50%');
      const h = free();
      const w = new Wheel({ host: h, step: 120, finger: { x: 195, y: 360 }, make: (t) => orbItem(t, 168),
        layout: (el, d) => { const a = Math.abs(d); place(el, MX + d * 150, 360, 1 - Math.min(a, 1) * .55); el.style.opacity = clamp(1.6 - a * .7, 0, 1); },
        onIndex: (i) => lb.set(i) });
      const lb = label(h, 'left:0;right:0;top:496px'); lb.set(w.i);
      const pk = hit(h, MX, 360, 168);
      h.style.opacity = 0; g.style.opacity = 0;
      return (async () => {
        gem().style.opacity = 0;
        anim(g, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.32,1.2,.5,1)', delay: 120 });
        const o = await fly(null, { x: GX, y: GY }, { x: MX, y: 360 }, 52, 168, 560, PAL[state.theme]);
        h.style.opacity = 1; o.remove();
        return { w, pick: () => pk, g, h, close: () => {} };
      })();
    },
    async commit(ui, id) {
      const el = ui.w.els[ui.w.i]; el.style.opacity = 0;
      ui.h.querySelectorAll('.witem').forEach((e) => anim(e, [{ opacity: e.style.opacity || 1 }, { opacity: 0 }], { duration: 200 }));
      popOut(ui.g, 'scale(.4)', 360);
      const o = await fly(id, { x: MX, y: 360 }, { x: GX, y: GY }, 168, 52, 560);
      gem()._pal = PAL[id]; gem().style.opacity = ''; o.remove(); ui.h.remove();
      state.theme = 'x'; await applyTheme(id, 'pour');
    } },
  // 8
  { name: 'Compact sheet', apply: 'fade',
    desc: 'A content-sized glass sheet like the Sleep sheet: title, a wheel of named orbs, Wear, and Not now under it.',
    open() {
      const s = scrim(.2);
      const g = glass('left:10px;right:10px;bottom:10px;height:318px;border-radius:42px;overflow:hidden');
      g.append($('<div style="position:absolute;top:8px;left:50%;width:36px;height:5px;margin-left:-18px;border-radius:3px;background:rgba(255,255,255,.35)"></div><div style="position:absolute;top:28px;left:0;right:0;text-align:center;font-size:18px;font-weight:700">Theme</div>'));
      const w = new Wheel({ host: g, step: 96, make: (t) => orbItem(t, 72, { name: true }),
        layout: (el, d) => { const a = Math.abs(d); place(el, 185 + d * 96, 112, a < 1 ? 1.12 - a * .2 : .92); el.style.opacity = clamp(1.6 - a * .45, 0, 1); } });
      ringAt(g, 185, 112, 90);
      const b = $('<button class="gbtn" style="left:24px;right:24px;top:196px">Wear</button>'); g.append(b);
      const later = $('<button class="glink" style="left:0;right:0;top:256px">Not now</button>'); g.append(later);
      anim(g, [{ transform: 'translateY(110%)' }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.32,.72,0,1)' });
      return { w, pick: () => b, close: async () => { scrimOut(s); await anim(g, [{ transform: 'none' }, { transform: 'translateY(110%)' }], { duration: 320, easing: 'cubic-bezier(.4,0,.8,.4)' }); g.remove(); } };
    } },
  // 9
  { name: 'Loupe', apply: 'wipe', at: () => ({ dir: 1 }),
    desc: 'A slim glass rail of small orbs, with a lens fixed in the middle. Slide the rail; the orb under the lens swells to fill it. The new sky wipes in from the side you swiped toward.',
    open() {
      const g = glass('left:30px;right:30px;top:332px;height:62px;border-radius:31px');
      const lens = $('<div style="position:absolute;left:149px;top:-15px;width:92px;height:92px;border-radius:50%;border:1.5px solid rgba(255,255,255,.7);box-shadow:inset 0 2px 0 rgba(255,255,255,.45), 0 8px 20px rgba(0,0,0,.35);z-index:50;pointer-events:none"></div>');
      const w = new Wheel({ host: g, step: 40, make: (t) => orbItem(t, 76),
        layout: (el, d) => { const a = Math.abs(d), s = .34 * (1 + 1.85 * Math.max(0, 1 - a * 1.25)); place(el, 165 + d * 40 + Math.sign(d) * Math.min(a, 1) * 18, 31, s); el.style.zIndex = a < .5 ? 60 : 10; el.style.opacity = clamp(1.8 - a * .3, 0, 1); },
        onIndex: (i) => lb.set(i) });
      g.append(lens); g.style.overflow = 'visible';
      const lb = label(layer, 'left:0;right:0;top:420px'); lb.set(w.i);
      const pk = hit(g, 195, 31, 92);
      popIn(g, 'scaleX(.3)', 420);
      return { w, pick: () => pk, close: async () => { lb.el.remove(); await popOut(g, 'scaleX(.4)'); } };
    } },
  // 10
  { name: 'Stack', apply: 'fade',
    desc: 'Orbs stacked like Wallet cards in a glass card, the next ones peeking behind. Flick the front one down and the next comes forward.',
    open() {
      const g = glass('left:55px;top:200px;width:280px;height:350px;border-radius:38px;overflow:hidden');
      const w = new Wheel({ host: g, axis: 'y', sign: -1, step: 110, finger: { x: 195, y: 330 }, make: (t) => orbItem(t, 150),
        layout: (el, d) => { if (d >= 0) { place(el, 140, 150 - d * 22, 1 - d * .1); el.style.opacity = d > 3 ? 0 : 1 - d * .22; el.style.zIndex = 50 - Math.round(d * 10); }
          else { place(el, 140, 150 - d * 300, 1); el.style.opacity = clamp(1 + d * 1.3, 0, 1); el.style.zIndex = 60; } },
        onIndex: (i) => lb.set(i) });
      const lb = label(g, 'left:0;right:0;top:268px'); lb.set(w.i);
      const pk = hit(g, 140, 150, 150);
      popIn(g, 'translateY(40px) scale(.9)', 420);
      return { w, pick: () => pk, close: () => popOut(g, 'translateY(30px) scale(.92)') };
    } },
  // 11
  { name: 'Fan', apply: 'moonset',
    desc: 'Glass cards fan out above the moon like a hand of cards, each with its orb and name. Sweep the fan; the top card lifts. Tap it: the moon sets and the new one rises.',
    open() {
      const h = free(), R = 236;
      const w = new Wheel({ host: h, axis: 'angle', center: [MX, MY], step: 21, fingerR: R, fingerA: -62,
        make: (t) => { const el = $(`<div class="glass" style="position:absolute;width:74px;height:104px;border-radius:22px;overflow:hidden"></div>`); const o = orb(t.id, 52); o.style.cssText += ';position:absolute;left:11px;top:13px'; el.append(o); el.append($(`<div style="position:absolute;left:4px;right:4px;top:74px;text-align:center;font-size:10.5px;font-weight:600;line-height:1.15">${t.name}</div>`)); return el; },
        layout: (el, d) => { const ad = Math.abs(d), a = (-90 + d * 21) * Math.PI / 180, r = R + Math.max(0, 1 - ad) * 18;
          place(el, MX + r * Math.cos(a), MY + r * Math.sin(a), ad < 1 ? 1.14 - ad * .14 : 1, `rotate(${d * 21}deg)`); el.style.opacity = ad > 3.4 ? 0 : clamp((3.4 - ad) / .7, 0, 1); el.style.zIndex = 50 - Math.round(ad * 5); } });
      const pk = hit(h, MX, MY - R - 16, 90, 120);
      popIn(h, 'translateY(120px) scale(.6)', 560, `${MX}px ${MY}px`);
      return { w, pick: () => pk, close: () => popOut(h, 'translateY(80px) scale(.7)') };
    } },
  // 12
  { name: 'Preview orb', apply: 'fade',
    desc: 'A glass card with one big orb on top that changes colour as you slide the strip of small orbs underneath. Tap the big orb to wear.',
    open() {
      const g = glass('left:40px;top:200px;width:310px;height:340px;border-radius:38px;overflow:hidden');
      const big = orb(null, 150); big._pal = PAL[state.theme]; big.style.cssText += ';position:absolute;left:80px;top:28px'; g.append(big);
      const lb = label(g, 'left:0;right:0;top:192px');
      const strip = $('<div style="position:absolute;left:0;right:0;top:250px;height:70px"></div>'); g.append(strip);
      const w = new Wheel({ host: strip, step: 46, make: (t) => orbItem(t, 30),
        layout: (el, d) => { const a = Math.abs(d); place(el, 155 + d * 46, 35, a < .5 ? 1.25 : 1); el.style.opacity = clamp(1.9 - a * .3, 0, 1); },
        onIndex: (i) => { lb.set(i); const a = big._pal; tween(320, (e) => (big._pal = lerpPal(a, PAL[T[i].id], e))); } });
      ringAt(strip, 155, 35, 46); lb.set(w.i);
      const pk = hit(g, 155, 103, 150);
      popIn(g, 'scale(.85)', 400);
      return { w, pick: () => pk, close: () => popOut(g) };
    } },
  // 13
  { name: 'Live sky', apply: 'live',
    desc: 'A glass capsule up top where the time was. As you slide, the whole Home (sky, moon, gem) changes under your thumb in real time. Done keeps it.',
    open() {
      textsOff(true);
      const g = glass('left:20px;right:20px;top:66px;height:86px;border-radius:43px;overflow:hidden');
      const w = new Wheel({ host: g, step: 68, make: (t) => orbItem(t, 54),
        layout: (el, d) => { const a = Math.abs(d); place(el, 175 + d * 68, 43, a < .5 ? 1.12 : .9); el.style.opacity = clamp(1.4 - a * .3, 0, 1); },
        onPos: (p) => livePreview(p), onIndex: (i) => lb.set(i) });
      ringAt(g, 175, 43, 66);
      const lb = label(layer, 'left:0;right:0;top:166px'); lb.set(w.i);
      const done = $('<button class="glass" style="left:145px;top:224px;width:100px;height:42px;border-radius:21px;font-size:16px;font-weight:650">Done</button>'); layer.append(done);
      popIn(g, 'translateY(-30px) scale(.8)', 420);
      return { w, pick: () => done, close: async () => { lb.el.remove(); popOut(done); await popOut(g, 'translateY(-20px) scale(.9)'); textsOff(false); } };
    } },
  // 14
  { name: 'Orbit', apply: 'reveal',
    desc: 'The orbs circle the moon on a tilted glass ring, like planets. Drag sideways to spin the orbit; the closest orb is the pick. The new sky opens out of it.',
    at: () => ({ x: MX, y: 566 }),
    open() {
      const h = free(), CY = 520, RX = 168, RY = 46;
      const plate = glass(`left:${MX - RX - 30}px;top:${CY - RY - 30}px;width:${2 * RX + 60}px;height:${2 * RY + 60}px;border-radius:50%`, 'clear'); h.append(plate);
      const w = new Wheel({ host: h, step: 52, finger: { x: 260, y: 566 }, make: (t) => orbItem(t, 60),
        layout: (el, d) => { const a = wrap(d) * 30 * Math.PI / 180, z = Math.cos(a); place(el, MX + RX * Math.sin(a), CY + RY * z, .55 + .5 * (z + 1) / 2); el.style.zIndex = 100 + Math.round(z * 50); el.style.opacity = .5 + .5 * (z + 1) / 2; },
        onIndex: (i) => lb.set(i) });
      const lb = label(h, 'left:0;right:0;top:394px'); lb.set(w.i);
      const pk = hit(h, MX, CY + RY, 64);
      popIn(h, 'scaleY(.2)', 520, `${MX}px ${CY}px`);
      return { w, pick: () => pk, close: () => popOut(h, 'scaleY(.3)') };
    } },
  // 15
  { name: 'Side rail', apply: 'pour',
    desc: 'A tall glass rail grows up out of the gem on the right. Scroll it up and down; the name sits beside it. Tap the middle orb and it drops down the rail into the gem slot.',
    open() {
      const g = glass('right:14px;width:74px;top:316px;height:420px;border-radius:37px;overflow:hidden');
      const w = new Wheel({ host: g, axis: 'y', step: 62, make: (t) => orbItem(t, 50),
        layout: (el, d) => { const a = Math.abs(d); place(el, 37, 210 + d * 62, a < .5 ? 1.15 : .9); el.style.opacity = clamp(1.7 - a * .35, 0, 1); },
        onIndex: (i) => { pill.textContent = T[i].name; } });
      ringAt(g, 37, 210, 66);
      const pill = $('<div class="glass" style="right:100px;top:506px;height:40px;padding:0 16px;border-radius:20px;display:flex;align-items:center;font-size:15px;font-weight:650"></div>'); layer.append(pill); pill.textContent = T[w.i].name;
      const pk = hit(g, 37, 210, 66);
      anim(g, [{ clipPath: 'inset(100% 0 0 0 round 37px)' }, { clipPath: 'inset(0 0 0 0 round 37px)' }], { duration: 520, easing: 'cubic-bezier(.32,.72,0,1)' });
      popIn(pill, 'translateX(20px)', 380);
      return { w, g, pill, pick: () => pk, close: () => {} };
    },
    async commit(ui, id) {
      ui.w.els[ui.w.i].style.opacity = 0; popOut(ui.pill);
      const anims = anim(ui.g, [{ clipPath: 'inset(0 0 0 0 round 37px)' }, { clipPath: 'inset(100% 0 0 0 round 37px)' }], { duration: 520, easing: 'cubic-bezier(.4,0,.6,1)' });
      const o = await fly(id, { x: 339, y: 526 }, { x: GX, y: GY }, 58, 52, 520); o.remove(); await anims;
      state.theme = 'x'; await applyTheme(id, 'pour');
    } },
  // 16
  { name: 'Click wheel', apply: 'fade',
    desc: 'An iPod click wheel made of glass. The orbs stay put round the rim and a ring follows your thumb as you circle it. The middle shows the pick big.',
    open() {
      const g = glass('left:55px;top:240px;width:280px;height:280px;border-radius:50%'), C = 140;
      const big = orb(null, 92); big._pal = PAL[state.theme]; big.style.cssText += `;position:absolute;left:${C - 46}px;top:${C - 46}px`; g.append(big);
      const ring = ringAt(g, 0, 0, 52); ring.style.left = ring.style.top = '0';
      const w = new Wheel({ host: g, axis: 'angle', sign: -1, center: [195, 380], step: 30, fingerR: 112, fingerA: -90, snap: true, make: (t) => orbItem(t, 38),
        layout: (el, d, i) => { const a = (-90 + i * 30) * Math.PI / 180; place(el, C + 112 * Math.cos(a), C + 112 * Math.sin(a), 1 + .22 * Math.max(0, 1 - Math.abs(d))); },
        onPos: (p) => { const a = (-90 + p * 30) * Math.PI / 180; ring.style.transform = `translate(${C + 112 * Math.cos(a) - 26}px, ${C + 112 * Math.sin(a) - 26}px)`; },
        onIndex: (i) => { pill.textContent = T[i].name; const a = big._pal; tween(260, (e) => (big._pal = lerpPal(a, PAL[T[i].id], e))); } });
      const pill = $('<div class="glass" style="left:50%;transform:translateX(-50%);top:536px;height:40px;padding:0 18px;border-radius:20px;display:flex;align-items:center;font-size:15px;font-weight:650;white-space:nowrap"></div>'); layer.append(pill); pill.textContent = T[w.i].name;
      const pk = hit(g, C, C, 92);
      popIn(g, 'scale(.7)', 460);
      return { w, pick: () => pk, close: async () => { pill.remove(); await popOut(g, 'scale(.85)'); } };
    } },
  // 17
  { name: 'Pager', apply: 'moonset',
    desc: 'One big orb per page in a glass card, with its name, what it is, and page dots. Swipe page to page. Tap the orb: the moon sets and the new one rises.',
    open() {
      const g = glass('left:30px;top:186px;width:330px;height:390px;border-radius:42px;overflow:hidden');
      const w = new Wheel({ host: g, step: 150, make: (t) => orbItem(t, 176),
        layout: (el, d) => { place(el, 165 + d * 330, 150, 1 - Math.min(Math.abs(d), 1) * .2); },
        onIndex: (i) => { lb.set(i); dots.forEach((dt, j) => { dt.style.width = j === i ? '18px' : '6px'; dt.style.background = j === i ? '#fff' : 'rgba(255,255,255,.35)'; }); } });
      const lb = label(g, 'left:0;right:0;top:262px');
      const row = $('<div style="position:absolute;left:0;right:0;top:350px;display:flex;justify-content:center;gap:6px"></div>'); g.append(row);
      const dots = T.map(() => { const dt = $('<i style="display:block;height:6px;width:6px;border-radius:3px;transition:width .2s, background .2s"></i>'); row.append(dt); return dt; });
      w.last = -1; w.render();
      const pk = hit(g, 165, 150, 176);
      popIn(g, 'scale(.9) translateY(30px)', 420);
      return { w, pick: () => pk, close: () => popOut(g) };
    } },
  // 18
  { name: 'Bottom capsule + reveal', apply: 'reveal',
    desc: 'The capsule sits low, just above the tabs, under your thumb. Tap the orb in the ring and the new sky opens out of that exact orb in a circle.',
    at: () => ({ x: MX, y: 694 }),
    open() {
      const g = glass('left:16px;right:16px;top:652px;height:84px;border-radius:42px;overflow:hidden');
      const w = new Wheel({ host: g, step: 68, make: (t) => orbItem(t, 56),
        layout: (el, d) => { const a = Math.abs(d); place(el, 179 + d * 68, 42, a < .5 ? 1.1 : .86); el.style.opacity = clamp(1.4 - a * .28, 0, 1); },
        onIndex: (i) => lb.set(i) });
      ringAt(g, 179, 42, 70);
      const lb = label(layer, 'left:0;right:0;top:598px'); lb.set(w.i);
      const pk = hit(g, 179, 42, 70);
      popIn(g, 'translateY(40px)', 420);
      return { w, pick: () => pk, close: async () => { lb.el.remove(); await popOut(g, 'translateY(30px)'); } };
    } },
  // 19
  { name: 'Grows from the gem', apply: 'pour',
    desc: 'Tap the moon and a glass bubble grows out of the gem, bottom right. Slide the orbs; tap one and it drops into the gem, and the theme pours up from there.',
    open() {
      gem()._press = 1; setTimeout(() => (gem()._press = 0), 220);
      const g = glass('right:12px;top:578px;width:300px;height:156px;border-radius:34px;overflow:hidden');
      const w = new Wheel({ host: g, step: 74, make: (t) => orbItem(t, 60),
        layout: (el, d) => { const a = Math.abs(d); place(el, 150 + d * 74, 62, a < .5 ? 1.12 : .85); el.style.opacity = clamp(1.4 - a * .35, 0, 1); },
        onIndex: (i) => lb.set(i) });
      ringAt(g, 150, 62, 76); const lb = label(g, 'left:0;right:0;top:110px'); lb.set(w.i);
      const pk = hit(g, 150, 62, 76);
      popIn(g, 'scale(.12)', 520, '86% 130%');
      return { w, g, pick: () => pk, close: () => {} };
    },
    async commit(ui, id) {
      ui.w.els[ui.w.i].style.opacity = 0;
      const shut = anim(ui.g, [{ transform: 'none', opacity: 1 }, { transform: 'scale(.12)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.4,0,.8,.4)', delay: 120 });
      const o = await fly(id, { x: 228, y: 640 }, { x: GX, y: GY }, 68, 52, 520); o.remove(); await shut;
      state.theme = 'x'; await applyTheme(id, 'pour');
    } },
  // 20
  { name: 'Moon pop-over', apply: 'fade',
    desc: 'The smallest take: a glass pop-over with a tail pointing at the moon, five orbs showing, the name above. Nothing else moves.',
    open() {
      const g = glass('left:65px;top:296px;width:260px;height:108px;border-radius:30px;overflow:visible');
      const tail = $('<div class="glass" style="left:121px;top:99px;width:18px;height:18px;border-radius:3px;transform:rotate(45deg);clip-path:polygon(100% 0,100% 100%,0 100%)"></div>'); g.append(tail);
      const inner = $('<div style="position:absolute;inset:0;overflow:hidden;border-radius:30px"></div>'); g.append(inner);
      const w = new Wheel({ host: inner, dragHost: g, step: 54, make: (t) => orbItem(t, 44),
        layout: (el, d) => { const a = Math.abs(d); place(el, 130 + d * 54, 66, a < .5 ? 1.1 : .82); el.style.opacity = clamp((2.5 - a) / .6, 0, 1); },
        onIndex: (i) => { nm.textContent = T[i].name; } });
      const nm = $('<div class="wname" style="position:absolute;left:0;right:0;top:12px;font-size:14px"></div>'); inner.append(nm); nm.textContent = T[w.i].name;
      ringAt(inner, 130, 66, 56);
      const pk = hit(g, 130, 66, 56);
      popIn(g, 'scale(.3)', 420, '50% 115%');
      return { w, pick: () => pk, close: () => popOut(g, 'scale(.6)', 220) };
    } },
  // 21
  { name: 'Scrubber', apply: 'wipe', at: () => ({ dir: 1 }),
    desc: 'A glass slider. Every theme is a tick on the track; the thumb is a big orb that takes on the colour of whatever it is over. Let go to wear.',
    open() {
      const g = glass('left:24px;right:24px;top:330px;height:64px;border-radius:32px'), X0 = 30, DX = 25.6;
      const thumb = orb(null, 54); thumb._pal = PAL[state.theme]; thumb.style.cssText += ';position:absolute;left:0;top:5px;z-index:20';
      const tip = $('<div class="glass" style="top:276px;height:40px;padding:0 16px;border-radius:20px;display:flex;align-items:center;font-size:15px;font-weight:650;white-space:nowrap"></div>'); layer.append(tip);
      const w = new Wheel({ host: g, axis: 'point', make: (t) => orbItem(t, 14),
        map: (x) => (x - 24 - X0) / DX, at: (p) => ({ x: 24 + X0 + p * DX, y: 362 }),
        layout: (el, d, i) => { place(el, X0 + i * DX, 32, 1); el.style.opacity = clamp(Math.abs(d) * 1.2 - .2, 0, 1); },
        onPos: (p) => { const f = clamp(p, 0, 11), i0 = Math.floor(f), i1 = Math.min(11, i0 + 1); thumb._pal = lerpPal(PAL[T[i0].id], PAL[T[i1].id], f - i0);
          thumb.style.transform = `translateX(${X0 + f * DX - 27}px)`; tip.textContent = T[clamp(Math.round(p), 0, 11)].name; tip.style.left = clamp(24 + X0 + f * DX - tip.offsetWidth / 2, 12, 378 - tip.offsetWidth) + 'px'; } });
      g.append(thumb);
      w.render();
      popIn(g, 'scaleX(.4)', 420); popIn(tip, 'translateY(10px)', 360);
      return { w, pick: () => null, close: async () => { popOut(tip); await popOut(g, 'scaleX(.5)'); } };
    } },
  // 22
  { name: 'Ferris wheel', apply: 'fade',
    desc: 'A giant glass wheel half off the right edge. Drag along its rim and it turns; the orb at nine o’clock is the pick, its name beside it.',
    open() {
      const h = free(), CX = 470, CY = 410, R = 180;
      const disc = glass(`left:${CX - 236}px;top:${CY - 236}px;width:472px;height:472px;border-radius:50%`, 'clear'); h.append(disc);
      const w = new Wheel({ host: h, axis: 'angle', center: [CX, CY], step: 24, fingerR: R, fingerA: 200, make: (t) => orbItem(t, 56),
        layout: (el, d) => { const ad = Math.abs(d), a = (180 + d * 24) * Math.PI / 180; place(el, CX + R * Math.cos(a), CY + R * Math.sin(a), ad < .5 ? 1.22 - ad * .4 : 1); el.style.opacity = ad > 3.4 ? 0 : clamp((3.4 - ad) / .7, 0, 1); },
        onIndex: (i) => lb.set(i) });
      ringAt(h, CX - R, CY, 80);
      const lb = label(h, `left:20px;width:220px;top:${CY + 50}px`); lb.el.querySelectorAll('div').forEach((x) => (x.style.textAlign = 'center')); lb.set(w.i);
      const pk = hit(h, CX - R, CY, 80);
      popIn(h, 'translateX(200px) rotate(-30deg)', 560, `${CX}px ${CY}px`);
      return { w, pick: () => pk, close: () => popOut(h, 'translateX(160px) rotate(20deg)', 320) };
    } },
  // 23
  { name: 'Wheel, pull up for all', apply: 'fade',
    desc: 'The capsule wheel for quick swaps; pull its handle up and it opens into a glass grid of every orb, for when the collection gets big.',
    open() {
      const g = glass('left:25px;top:290px;width:340px;height:136px;border-radius:68px;overflow:hidden');
      const handle = $('<div style="position:absolute;left:50%;top:438px;width:40px;height:5px;margin-left:-20px;border-radius:3px;background:rgba(255,255,255,.55)"></div>'); layer.append(handle);
      let grid = false;
      const w = new Wheel({ host: g, step: 78, make: (t) => orbItem(t, 64),
        layout: (el, d, i) => { if (grid) return; const a = Math.abs(d); place(el, 170 + d * 78, 56, 1 - Math.min(a, 2.5) * .2); el.style.opacity = clamp(1.35 - a * .38, 0, 1); },
        onIndex: (i) => lb.set(i) });
      const ring = ringAt(g, 170, 56, 76); const lb = label(g, 'left:0;right:0;top:98px'); lb.set(w.i);
      const pk = hit(g, 170, 56, 76);
      const ui = { w, pick: () => pk, close: async () => { handle.remove(); await popOut(g, grid ? 'scale(.92)' : 'translateY(40px) scale(.7)'); } };
      ui.expand = async () => {
        grid = true; w.locked = true; ring.remove(); lb.el.remove(); pk.remove(); anim(handle, [{ opacity: 1 }, { opacity: 0 }], { duration: 150 });
        g.append($('<div style="position:absolute;top:22px;left:0;right:0;text-align:center;font-size:18px;font-weight:700;opacity:0" class="gt">Themes</div>'));
        const from = { left: 25, top: 290, width: 340, height: 136, r: 68 }, to = { left: 25, top: 160, width: 340, height: 480, r: 40 };
        const starts = w.els.map((el) => el.style.transform);
        w.els.forEach((el, i) => { el.style.transition = 'transform .5s cubic-bezier(.32,.72,0,1), opacity .4s'; el.style.opacity = 1;
          const c = i % 4, r = Math.floor(i / 4); place(el, 49 + c * 81, 98 + r * 124, .8); el.append($(`<div class="gn" style="position:absolute;left:50%;top:72px;transform:translateX(-50%) scale(1.25);transform-origin:top;font-size:12px;white-space:nowrap;opacity:0;transition:opacity .3s .25s">${T[i].name}</div>`));
          el.style.cursor = 'pointer'; el.addEventListener('click', () => { w.pos = i; ui.commit(); }); });
        requestAnimationFrame(() => g.querySelectorAll('.gn').forEach((n) => (n.style.opacity = 1)));
        anim(g.querySelector('.gt'), [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 200 });
        await tween(500, (e) => { g.style.left = from.left + (to.left - from.left) * e + 'px'; g.style.top = from.top + (to.top - from.top) * e + 'px'; g.style.width = from.width + (to.width - from.width) * e + 'px'; g.style.height = from.height + (to.height - from.height) * e + 'px'; g.style.borderRadius = from.r + (to.r - from.r) * e + 'px'; });
        void starts;
      };
      handle.style.pointerEvents = 'auto'; handle.style.cursor = 'pointer'; handle.addEventListener('click', () => ui.expand());
      popIn(g, 'translateY(60px) scale(.5)', 460, '50% 160%');
      return ui;
    },
    async demo(ctx, open) {
      await tap(moonHit()); await open(); await wait(600);
      await ctx.ui.w.spin(2, 760); await wait(500);
      const exp = ctx.ui.expand;
      await glide((e) => ({ x: 195, y: 440 - 130 * e }), 420, null);
      await exp(); await wait(900);
      const el = ctx.ui.w.els[4]; await tap(el);
    } },
  // 24
  { name: 'Moon turns into the orb', apply: 'fade',
    desc: 'Tap the moon and it melts into its own orb, right where it was, on a glass band. Swipe the band; the neighbours slide in from the sides. Tap: the orb melts back into the new moon.',
    open() {
      const sm = curScene().querySelector('.moon');
      const band = glass('left:12px;right:12px;top:475px;height:120px;border-radius:60px', 'clear');
      const h = free();
      const w = new Wheel({ host: h, step: 120, finger: { x: 260, y: MY }, make: (t) => orbItem(t, 230),
        layout: (el, d) => { const a = Math.abs(d); place(el, MX + d * 150, MY, 1 - Math.min(a, 1) * .7); el.style.opacity = clamp((1.7 - a) / .5, 0, 1); el.style.zIndex = a < .5 ? 10 : 5; },
        onIndex: (i) => lb.set(i) });
      const lb = label(h, 'left:0;right:0;top:372px'); lb.set(w.i);
      const pk = hit(h, MX, MY, 200);
      anim(sm, [{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
      anim(h, [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 500 });
      anim(band, [{ opacity: 0, transform: 'scaleX(.4)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.32,1.2,.5,1)', delay: 200 });
      return { w, h, band, pick: () => pk, close: () => {} };
    },
    async commit(ui, id) {
      popOut(ui.band, 'scaleX(.5)', 300); ui.h.querySelectorAll('.witem').forEach((e, i) => { if (i !== ui.w.i) anim(e, [{ opacity: e.style.opacity }, { opacity: 0 }], { duration: 250 }); });
      const nu = applyTheme(id, 'fade');
      await anim(ui.h, [{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 150 });
      await nu;
    } },
  // 25
  { name: 'Hold and slide', apply: 'live',
    desc: 'One gesture. Press and hold the moon: a glass capsule appears above your thumb. Slide left and right without letting go, and Home changes live. Let go to keep it.',
    hold(ctx, ev, open) {
      const p = phone.getBoundingClientRect(), x0 = ev.clientX - p.left, y0 = ev.clientY - p.top;
      let timer = setTimeout(async () => { timer = null; ctx.x0 = x0; ctx.y0 = y0; await open(); }, 280);
      const move = (e) => { if (ctx.ui && !timer) ctx.ui.w.set(ctx.ui.p0 + (e.clientX - p.left - x0) / 62); };
      const up = () => { if (timer) clearTimeout(timer); phone.removeEventListener('pointermove', move); if (ctx.ui) ctx.ui.w.snapTo(ctx.ui.w.i, 200).then(() => ctx.ui.commit()); };
      phone.addEventListener('pointermove', move); phone.addEventListener('pointerup', up, { once: true });
    },
    open(ctx) {
      const y = (ctx.y0 ?? MY) - 120, x = ctx.x0 ?? MX;
      const g = glass(`left:20px;right:20px;top:${y - 40}px;height:80px;border-radius:40px;overflow:hidden`);
      const w = new Wheel({ host: g, drag: false, step: 62, make: (t) => orbItem(t, 50),
        layout: (el, d) => { const a = Math.abs(d); place(el, x - 20 + d * 62, 40, a < .5 ? 1.15 : .88); el.style.opacity = clamp(1.4 - a * .3, 0, 1); },
        onPos: (pp) => livePreview(pp), onIndex: (i) => lb.set(i) });
      ringAt(g, x - 20, 40, 64);
      const lb = label(layer, `left:0;right:0;top:${y - 96}px`); lb.set(w.i);
      popIn(g, 'scale(.4)', 360, `${x - 20}px 140%`);
      return { w, p0: w.pos, pick: () => null, close: async () => { lb.el.remove(); await popOut(g, 'scale(.6)', 220); } };
    },
    async demo(ctx, open) {
      const x0 = MX, y0 = MY;
      finger.style.left = x0 + 'px'; finger.style.top = y0 + 'px'; finger.classList.add('on'); await wait(240); finger.classList.add('down');
      await wait(300); ctx.x0 = x0; ctx.y0 = y0; await open(); await wait(450);
      const w = ctx.ui.w;
      const go = async (from, to, ms) => glide((e) => ({ x: x0 + (from + (to - from) * e) * 62, y: y0 }), ms, (e) => w.set(from + (to - from) * e), { lift: false, press: false });
      await go(0, 2, 700); await wait(350); await go(2, 5, 700); await wait(300); await go(5, 4, 400); await wait(500);
      finger.classList.remove('down'); await wait(80); finger.classList.remove('on');
      await w.snapTo(4, 160); await ctx.ui.commit();
    } },
];
