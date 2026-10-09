import DeviceActivity
import SwiftUI
import Charts
import FamilyControls
import ManagedSettings

@main
struct LocturneReportExtension: DeviceActivityReportExtension {
  var body: some DeviceActivityReportScene {
    UsageReport(days: 7, compact: true) { CompactUsageChart(configuration: $0) }
    UsageReport(days: 30, compact: true) { CompactUsageChart(configuration: $0) }
    UsageReport(days: 90, compact: true) { CompactUsageChart(configuration: $0) }
    UsageReport(days: 180, compact: true) { CompactUsageChart(configuration: $0) }
    UsageReport(days: 1, compact: true, pill: true) { TodayPill(configuration: $0) }
    UsageReport(days: 1) { UsageChart(configuration: $0) }
    UsageReport(days: 7) { UsageChart(configuration: $0) }
    UsageReport(days: 30) { UsageChart(configuration: $0) }
  }
}

struct UsageDay: Identifiable {
  var id: Date { date }
  let date: Date
  var seconds: TimeInterval?
}

struct UsageApp: Identifiable {
  var id: Application { application }
  let application: Application
  var seconds: TimeInterval = 0
  var pickups = 0
  var notifications = 0
}

struct UsageConfiguration {
  let apps: [UsageApp]
  let days: [UsageDay]
  var reported: [UsageDay] { days.filter { $0.seconds != nil } }
  var total: TimeInterval { days.reduce(0) { $0 + ($1.seconds ?? 0) } }
  var average: TimeInterval { reported.isEmpty ? 0 : total / Double(reported.count) }
}

struct UsageReport<Content: View>: DeviceActivityReportScene {
  let days: Int
  var compact = false
  /// Home's top-row pill: today's total only.
  var pill = false
  var context: DeviceActivityReport.Context {
    .init("Locturne.\(pill ? "pill" : compact ? "compact" : "usage").\(days)")
  }
  let content: (UsageConfiguration) -> Content

  func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> UsageConfiguration {
    let calendar = Calendar.current
    let today = calendar.startOfDay(for: Date())
    var totals: [Date: TimeInterval] = [:]
    var apps: [Application: UsageApp] = [:]
    for await device in data {
      for await segment in device.activitySegments {
        let date = calendar.startOfDay(for: segment.dateInterval.start)
        totals[date, default: 0] += max(0, segment.totalActivityDuration)
        if !compact {
        for await category in segment.categories {
          for await activity in category.applications {
            let application = activity.application
            var app = apps[application] ?? UsageApp(application: application)
            app.seconds += max(0, activity.totalActivityDuration)
            app.pickups += activity.numberOfPickups
            app.notifications += activity.numberOfNotifications
            apps[application] = app
          }
        }
        }
      }
    }
    return UsageConfiguration(apps: apps.values.sorted { $0.seconds > $1.seconds }, days: (0..<days).map { index in
      let date = calendar.date(byAdding: .day, value: index + 1 - days, to: today)!
      return UsageDay(date: date, seconds: totals[date])
    })
  }
}

private func duration(_ seconds: TimeInterval) -> String {
  let minutes = Int(seconds / 60)
  return minutes >= 60 ? "\(minutes / 60)h \(minutes % 60)m" : "\(minutes)m"
}

struct UsageChart: View {
  let configuration: UsageConfiguration
  private let barColor = Color.white

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        if configuration.reported.isEmpty {
          VStack(alignment: .leading, spacing: 8) {
            Text("No Screen Time data yet").font(.headline)
            Text("Your iPhone usage will appear here when Screen Time has data to share.")
              .font(.subheadline).foregroundStyle(.secondary)
          }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        } else {
          HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
              Text(duration(configuration.total)).font(.system(.title, design: .rounded, weight: .bold))
              Text("Total screen time").font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
              Text(duration(configuration.average)).font(.system(.headline, design: .rounded))
              Text("Daily average").font(.caption).foregroundStyle(.secondary)
            }
          }.monospacedDigit()
  
          Chart {
            ForEach(configuration.days) { day in
              if let seconds = day.seconds {
                BarMark(x: .value("Day", day.date, unit: .day), y: .value("Hours", seconds / 3600))
                  .foregroundStyle(barColor.gradient)
                  .cornerRadius(2)
                  .accessibilityLabel(day.date.formatted(date: .abbreviated, time: .omitted))
                  .accessibilityValue(duration(seconds))
              }
            }
            RuleMark(y: .value("Daily average", configuration.average / 3600))
              .foregroundStyle(.white.opacity(0.7))
              .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
          }
          .chartYScale(domain: 0...max(1, ceil((configuration.days.compactMap(\.seconds).max() ?? 0) / 3600)))
          .chartXScale(domain: configuration.days.first!.date...Calendar.current.date(byAdding: .day, value: 1, to: configuration.days.last!.date)!)
          .chartYAxis {
            AxisMarks(position: .trailing, values: .automatic(desiredCount: 3)) { value in
              AxisGridLine().foregroundStyle(.white.opacity(0.1))
              AxisValueLabel { if let hours = value.as(Double.self) { Text("\(Int(hours))h") } }
            }
          }
          .chartXAxis {
            AxisMarks(values: .stride(by: .day, count: configuration.days.count <= 7 ? 1 : 7)) { value in
              AxisValueLabel(format: configuration.days.count <= 7 ? .dateTime.weekday(.narrow) : .dateTime.month(.abbreviated).day())
            }
          }
          .frame(height: 118)
          Text(configuration.days.count == 1 ? "Today so far" : "Last \(configuration.days.count) days · includes today so far")
            .font(.caption).foregroundStyle(.secondary)
          if configuration.reported.count < configuration.days.count {
            Text("Average uses \(configuration.reported.count) days with data. Missing days are left blank.")
              .font(.caption2).foregroundStyle(.secondary)
          }
          appsSection
        }
      }
      .padding(.bottom, 24)
    }
    .fontDesign(.rounded)
    .foregroundStyle(.white)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .preferredColorScheme(.dark)
  }

  private var appsSection: some View {
    LazyVStack(alignment: .leading, spacing: 20) {
      Text("All apps").font(.system(.title2, design: .rounded, weight: .bold))
        .accessibilityAddTraits(.isHeader)
      Text("Most used first · iPhone usage")
        .font(.caption).foregroundStyle(.secondary)
      if configuration.apps.isEmpty {
        Text("No app activity reported for this period.")
          .font(.subheadline).foregroundStyle(.secondary)
      }
      ForEach(configuration.apps) { app in
        VStack(alignment: .leading, spacing: 8) {
          HStack(alignment: .top, spacing: 12) {
            if let token = app.application.token {
              Label(token).labelStyle(.titleAndIcon)
            } else {
              Text(app.application.localizedDisplayName ?? "App")
            }
            Spacer(minLength: 8)
            Text(duration(app.seconds)).monospacedDigit()
          }.font(.system(.body, design: .rounded, weight: .semibold))
          ProgressView(value: min(1, app.seconds / max(1, configuration.total)))
            .tint(.white)
            .accessibilityLabel("Share of screen time")
            .accessibilityValue("\(Int(app.seconds / max(1, configuration.total) * 100)) percent")
          Text("\(app.pickups) pickups · \(app.notifications) notifications")
            .font(.caption).foregroundStyle(.secondary)
          Divider().overlay(.white.opacity(0.1))
        }
      }
      Text("Usage is reported by Screen Time. App totals may differ from total screen time, which can include website activity.")
        .font(.caption).foregroundStyle(.secondary)
    }.padding(.top, 12)
  }
}

/// A small, axis-free report matching the Home reference. Missing days stay blank.
struct CompactUsageChart: View {
  let configuration: UsageConfiguration
  @State private var selectedDate: Date?
  private let lineColor = Color(red: 207 / 255, green: 230 / 255, blue: 247 / 255)
  private let highlight = Color(red: 242 / 255, green: 248 / 255, blue: 252 / 255)

  var body: some View {
    if configuration.reported.isEmpty {
      Text("Your screen time will appear here when data is available.")
        .font(.system(.caption, design: .rounded)).foregroundStyle(.secondary)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .preferredColorScheme(.dark)
    } else {
      let ceiling = max(1, (configuration.reported.compactMap(\.seconds).max() ?? 0) * 1.55)
      Chart {
        ForEach(Array(configuration.days.enumerated()), id: \.element.id) { index, day in
          if let seconds = day.seconds {
            let segment = configuration.days.prefix(index + 1).filter { $0.seconds == nil }.count
            LineMark(x: .value("Day", day.date, unit: .day), y: .value("Screen time", seconds), series: .value("Segment", segment))
              .foregroundStyle(lineColor)
              .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
            PointMark(x: .value("Day", day.date, unit: .day), y: .value("Screen time", seconds))
              .foregroundStyle(day.date == selectedDate ? highlight : lineColor)
              .symbolSize(configuration.days.count <= 7 ? 28 : 8)
              .accessibilityLabel(day.date.formatted(date: .abbreviated, time: .omitted))
              .accessibilityValue(duration(seconds))
          }
        }
      }
      .chartYScale(domain: 0...ceiling)
      .chartXScale(domain: configuration.days.first!.date...Calendar.current.date(byAdding: .day, value: 1, to: configuration.days.last!.date)!)
      .chartXAxis {
        AxisMarks(values: configuration.days.count <= 7 ? configuration.days.map(\.date) : [configuration.days.first!.date, configuration.days[configuration.days.count / 2].date, configuration.days.last!.date]) {
          AxisValueLabel(format: configuration.days.count <= 7 ? .dateTime.weekday(.abbreviated) : .dateTime.month(.abbreviated).day())
        }
      }
      .chartOverlay { proxy in
        GeometryReader { geometry in
          let origin = geometry[proxy.plotAreaFrame].origin
          ZStack(alignment: .topLeading) {
            Rectangle().fill(.clear).contentShape(Rectangle())
              .onTapGesture { location in
                if let date: Date = proxy.value(atX: location.x - origin.x) {
                  let day = Calendar.current.startOfDay(for: date)
                  selectedDate = configuration.reported.contains(where: { $0.date == day }) ? day : nil
                } else { selectedDate = nil }
              }
              .accessibilityHidden(true)
            if let date = selectedDate,
               let day = configuration.reported.first(where: { $0.date == date }),
               let seconds = day.seconds,
               let x = proxy.position(forX: date.addingTimeInterval(12 * 3600)),
               let y = proxy.position(forY: seconds) {
              Color.clear.frame(width: 1, height: 1)
                .popover(isPresented: Binding(get: { selectedDate != nil }, set: { if !$0 { selectedDate = nil } }), arrowEdge: .bottom) {
                  VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .center) {
                      Text(Calendar.current.isDateInToday(date) ? "Today" : date.formatted(.dateTime.month(.abbreviated).day()))
                        .font(.subheadline.weight(.semibold))
                      Spacer(minLength: 16)
                      Button { selectedDate = nil } label: {
                        Image(systemName: "xmark").font(.system(size: 13, weight: .medium))
                          .frame(width: 44, height: 44)
                          .contentShape(Rectangle())
                      }.buttonStyle(.plain).accessibilityLabel("Close screen time details")
                    }
                    Text("\(duration(seconds)) of screen time on this day.")
                      .font(.subheadline).foregroundStyle(.secondary)
                  }
                  .padding(.leading, 16).padding(.trailing, 8).padding(.bottom, 16)
                  .frame(idealWidth: 240, maxWidth: 280)
                  .presentationCompactAdaptation(.popover)
                  .preferredColorScheme(.dark)
                }
                .position(x: origin.x + x, y: origin.y + y)
            }
          }
        }
      }
      .chartYAxis {
        AxisMarks(position: .trailing, values: .automatic(desiredCount: 5)) { value in
          AxisGridLine().foregroundStyle(.white.opacity(0.12))
          AxisValueLabel { if let seconds = value.as(Double.self) { Text("\(seconds / 3600, specifier: "%.0f")h") } }
        }
      }
      .chartLegend(.hidden)
      .padding(.horizontal, 8)
      .padding(.top, 16)
      .padding(.bottom, 12)
      .preferredColorScheme(.dark)
    }
  }
}

/// Home's top-row pill, "2h 18m today", drawn to match the mornings pill beside it
/// (home-screen.tsx): the app can't read the number, so the extension draws the whole pill.
/// Right-aligned in its frame, since the host can't know how wide the text will be.
struct TodayPill: View {
  let configuration: UsageConfiguration
  private let text = Color(red: 0xF2 / 255, green: 0xF8 / 255, blue: 0xFC / 255)
  private let text2 = Color(red: 0xA8 / 255, green: 0xBA / 255, blue: 0xD3 / 255)

  var body: some View {
    HStack(spacing: 6) {
      Image(systemName: "hourglass").font(.system(size: 14, weight: .semibold)).foregroundStyle(text)
      if configuration.reported.isEmpty {
        Text("No data yet").font(.system(size: 15)).foregroundStyle(text2)
      } else {
        Text(duration(configuration.total)).font(.system(size: 16, weight: .heavy)).foregroundStyle(text)
          .monospacedDigit()
        Text("today").font(.system(size: 15)).foregroundStyle(text2)
      }
    }
    .padding(.horizontal, 14)
    .frame(height: 36)
    .background(Capsule().fill(.white.opacity(0.08)))
    .accessibilityElement(children: .combine)
    .accessibilityLabel(configuration.reported.isEmpty ? "No screen time data yet" : "\(duration(configuration.total)) of screen time today")
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
    .preferredColorScheme(.dark)
  }
}
