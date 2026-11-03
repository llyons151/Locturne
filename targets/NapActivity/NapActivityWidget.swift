import ActivityKit
import SwiftUI
import UIKit
import WidgetKit

/**
 Block now's countdown outside the app: the Dynamic Island widens into a moon and the time left,
 and the Lock Screen shows the same as a banner. `Text(timerInterval:)` ticks on its own, so
 the app sends nothing while it runs. At the end the activity goes stale (`staleDate`), and the
 views say the apps are awake until the app next opens and ends it (nap-activity.ts).
 */
@main
struct NapActivityBundle: WidgetBundle {
  var body: some Widget {
    NapActivityWidget()
  }
}

// The Midnight palette (src/theme/colors.ts).
private let sky = Color(red: 6 / 255, green: 11 / 255, blue: 24 / 255)
private let ink = Color(red: 238 / 255, green: 246 / 255, blue: 251 / 255)
private let ink2 = Color(red: 159 / 255, green: 179 / 255, blue: 204 / 255)
private let appGroup = "group.com.lukelyons.locturne"

struct NapActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LocturneNapAttributes.self) { context in
      LockScreenNap(context: context)
        .activityBackgroundTint(sky)
        .activitySystemActionForegroundColor(ink)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 8) {
            Moon(file: context.attributes.moonFile, size: 26)
            Text(context.isStale ? "Apps awake" : "Apps asleep")
              .font(.system(size: 15, weight: .semibold))
              .foregroundStyle(ink)
          }
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Countdown(state: context.state, stale: context.isStale)
            .font(.system(size: 22, weight: .semibold).monospacedDigit())
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text(context.isStale ? "Block now is over." : "Awake at \(clock(context.state.end))")
            .font(.system(size: 13))
            .foregroundStyle(ink2)
        }
      } compactLeading: {
        Moon(file: context.attributes.moonFile, size: 18)
      } compactTrailing: {
        Countdown(state: context.state, stale: context.isStale)
          .font(.system(size: 14, weight: .semibold).monospacedDigit())
          // A timer text takes all the width it's offered: hold it to its digits.
          .frame(width: compactWidth(context.state))
      } minimal: {
        Moon(file: context.attributes.moonFile, size: 18)
      }
      .keylineTint(ink)
    }
  }
}

private struct LockScreenNap: View {
  let context: ActivityViewContext<LocturneNapAttributes>

  var body: some View {
    HStack(spacing: 14) {
      Moon(file: context.attributes.moonFile, size: 36)
      VStack(alignment: .leading, spacing: 2) {
        Text(context.isStale ? "Apps awake" : "Apps asleep")
          .font(.system(size: 17, weight: .semibold))
          .foregroundStyle(ink)
        Text(context.isStale ? "Block now is over." : "Awake at \(clock(context.state.end))")
          .font(.system(size: 14))
          .foregroundStyle(ink2)
      }
      Spacer(minLength: 8)
      Countdown(state: context.state, stale: context.isStale)
        .font(.system(size: 30, weight: .semibold).monospacedDigit())
        .frame(maxWidth: 130, alignment: .trailing)
    }
    .padding(.horizontal, 20)
    .padding(.vertical, 16)
  }
}

private struct Countdown: View {
  let state: LocturneNapAttributes.ContentState
  let stale: Bool

  var body: some View {
    Group {
      if stale || state.end <= Date() {
        Text("0:00")
      } else {
        Text(timerInterval: state.start...state.end, countsDown: true)
      }
    }
    .multilineTextAlignment(.trailing)
    .foregroundStyle(ink)
  }
}

/// The worn moon's flat icon, or the moon symbol when it can't be read.
private struct Moon: View {
  let file: String?
  let size: CGFloat

  var body: some View {
    if let image = moonImage(file, side: size) {
      Image(uiImage: image)
        .resizable()
        .scaledToFit()
        .frame(width: size, height: size)
    } else {
      Image(systemName: "moon.fill")
        .font(.system(size: size * 0.8, weight: .semibold))
        .foregroundStyle(ink)
        .frame(width: size, height: size)
    }
  }
}

/// Live Activity images must stay small: the icon is drawn down to the size it shows at.
private func moonImage(_ file: String?, side: CGFloat) -> UIImage? {
  guard let file,
    let folder = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup),
    let image = UIImage(contentsOfFile: folder.appendingPathComponent(file).path)
  else { return nil }
  let format = UIGraphicsImageRendererFormat()
  format.scale = 3
  let box = CGSize(width: side, height: side)
  return UIGraphicsImageRenderer(size: box, format: format).image { _ in
    image.draw(in: CGRect(origin: .zero, size: box))
  }
}

/// "1:05:00" needs more room than "45:00".
private func compactWidth(_ state: LocturneNapAttributes.ContentState) -> CGFloat {
  state.end.timeIntervalSinceNow >= 3600 ? 62 : 44
}

private func clock(_ date: Date) -> String {
  date.formatted(date: .omitted, time: .shortened)
}
