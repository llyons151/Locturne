//
//  LocturneShieldRing.swift
//  ShieldConfiguration
//
//  Shield 100's "Method ring" (user, 2026-11-28). At night: a ring around the worn moon that
//  fills as the block runs out, and "Asleep for 6h 12m more." ahead of the subtitle. Both are
//  worked out here, each time iOS asks for the shield, from the block's start and end as
//  minutes of the day in the config (`ringFromMinutes`, `ringUntilMinutes`, written by
//  screen-time.ts). Outside that span, or without it, the shield is the plain moon and words.
//  In the morning (`methodRing`): the method's symbol in a dark disc, ringed by the steps so far
//  on a step morning (`ringDone`, written by I'm up's `locturneShowMorningProgress`).
//

import Foundation
import UIKit

/// Minutes left and how much of the block has passed (0...1), or nil when `now` is outside it.
func locturneRingProgress(config: [String: Any], now: Date = Date()) -> (left: Int, done: Double)? {
  guard let from = (config["ringFromMinutes"] as? NSNumber)?.intValue,
    let until = (config["ringUntilMinutes"] as? NSNumber)?.intValue
  else { return nil }
  let parts = Calendar.current.dateComponents([.hour, .minute], from: now)
  let minute = (parts.hour ?? 0) * 60 + (parts.minute ?? 0)
  let wrap = { (m: Int) in ((m % 1440) + 1440) % 1440 }
  let span = until > from ? until - from : wrap(until - from)
  let passed = wrap(minute - from)
  guard span > 0, passed < span else { return nil }
  return (span - passed, Double(passed) / Double(span))
}

/// "Asleep for 6h 12m more." / "Asleep for 48m more."
func locturneTimeLeftLine(minutes: Int) -> String {
  locturneText("shield.asleepFor", "Asleep for {time} more.", ["time": locturneDuration(minutes: max(minutes, 1))])
}

/// The shield's icon: the morning's method disc, the moon ring while a block runs, or the picture.
func locturneShieldIcon(config: [String: Any], ring: (left: Int, done: Double)?, picture: UIImage?) -> UIImage? {
  if let kind = config["methodRing"] as? String {
    let done = (config["ringDone"] as? NSNumber)?.doubleValue ?? 0
    return locturneMethodIcon(symbol: picture, done: kind == "steps" ? done : nil) ?? picture
  }
  return ring.flatMap { locturneRingIcon(moon: picture, done: $0.done) } ?? picture
}

/// The morning's method symbol in a dark disc, inside a ring of steps filled to `done` when there
/// is one (a step morning), or the disc alone.
func locturneMethodIcon(symbol: UIImage?, done: Double?) -> UIImage? {
  #if os(iOS)
    let side: CGFloat = 180
    let format = UIGraphicsImageRendererFormat()
    format.scale = 3
    format.opaque = false
    return UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format).image { context in
      let cg = context.cgContext
      let line: CGFloat = 7
      let center = CGPoint(x: side / 2, y: side / 2)
      if let done {
        let radius = side / 2 - line / 2
        cg.setLineWidth(line)
        cg.setLineCap(.round)
        cg.setStrokeColor(UIColor(white: 1, alpha: 0.18).cgColor)
        cg.addArc(center: center, radius: radius, startAngle: 0, endAngle: .pi * 2, clockwise: false)
        cg.strokePath()
        let fraction = CGFloat(min(max(done, 0), 1))
        if fraction > 0.005 {
          cg.setStrokeColor(UIColor.white.cgColor)
          let start = -CGFloat.pi / 2
          cg.addArc(center: center, radius: radius, startAngle: start, endAngle: start + fraction * .pi * 2, clockwise: false)
          cg.strokePath()
        }
      }
      let disc = side * (done == nil ? 0.92 : 0.74)
      cg.setFillColor(UIColor(red: 29 / 255, green: 29 / 255, blue: 32 / 255, alpha: 1).cgColor)
      cg.fillEllipse(in: CGRect(x: (side - disc) / 2, y: (side - disc) / 2, width: disc, height: disc))
      if let symbol = symbol {
        let inner = disc * 0.5
        let size = symbol.size.width > 0 && symbol.size.height > 0 ? symbol.size : CGSize(width: inner, height: inner)
        let fit = min(inner / size.width, inner / size.height)
        let w = size.width * fit
        let h = size.height * fit
        symbol.draw(in: CGRect(x: (side - w) / 2, y: (side - h) / 2, width: w, height: h))
      }
    }
  #else
    return symbol
  #endif
}

/// The worn moon inside a ring filled to `done`, starting at the top and going clockwise.
func locturneRingIcon(moon: UIImage?, done: Double) -> UIImage? {
  #if os(iOS)
    let side: CGFloat = 180
    let format = UIGraphicsImageRendererFormat()
    format.scale = 3
    format.opaque = false
    return UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format).image { context in
      let cg = context.cgContext
      let line: CGFloat = 7
      let center = CGPoint(x: side / 2, y: side / 2)
      let radius = side / 2 - line / 2
      cg.setLineWidth(line)
      cg.setLineCap(.round)
      cg.setStrokeColor(UIColor(white: 1, alpha: 0.18).cgColor)
      cg.addArc(center: center, radius: radius, startAngle: 0, endAngle: .pi * 2, clockwise: false)
      cg.strokePath()
      let fraction = CGFloat(min(max(done, 0), 1))
      if fraction > 0.005 {
        cg.setStrokeColor(UIColor.white.cgColor)
        let start = -CGFloat.pi / 2
        cg.addArc(center: center, radius: radius, startAngle: start, endAngle: start + fraction * .pi * 2, clockwise: false)
        cg.strokePath()
      }
      if let moon = moon {
        let inner = side * 0.6
        let size = moon.size.width > 0 && moon.size.height > 0 ? moon.size : CGSize(width: inner, height: inner)
        let fit = min(inner / size.width, inner / size.height)
        let w = size.width * fit
        let h = size.height * fit
        moon.draw(in: CGRect(x: (side - w) / 2, y: (side - h) / 2, width: w, height: h))
      }
    }
  #else
    return moon
  #endif
}
