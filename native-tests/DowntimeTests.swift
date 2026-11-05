// Step away (`downtime`, src/lib/wake/downtime.ts) with Locturne closed: a few steps start a timer
// from when they were really reached (the pedometer history, searched), and the timer's own
// one-off window wakes the bedtime apps at its end. Bedtime wins; 200 steps don't skip the timer.
import Foundation

/// A morning walk whose steps from the morning start reach `total` at `reached`, and `before` until then.
func walkReached(_ reached: Date, before: Int = 20, total: Int = 80) -> (Date, Date) -> Int {
  { _, to in to >= reached ? total : before }
}

func downtimeRecord() -> [String: Any]? { get(LOCTURNE_DOWNTIME_KEY) as? [String: Any] }
func downtimeMs(_ key: String) -> Double? { (downtimeRecord()?[key] as? NSNumber)?.doubleValue }

func registerDowntimeTests() {
  test("step away: short of its steps, the shield says how many, starts nothing and opens nothing") {
    closedNight(method: "downtime")
    at("2026-10-06 07:25")
    expectEqual(tap("tiktok", .data(steps: 30), after: 0.05), [.defer])
    expectStillAsleep()
    expect(downtimeRecord() == nil, "no timer")
    expectEqual(drawn("tiktok").subtitle, "30 of 50 steps. 20 more, then tap I’m up to start your timer.")
    expect(sentTaps().isEmpty, "never sends the open-Locturne notification")
  }

  test("step away: I'm up at 7:25 times it from 7:10, when the steps were really reached, and hands iOS its end") {
    closedNight(method: "downtime")
    PedometerScript.history = walkReached(local("2026-10-06 07:10"))
    at("2026-10-06 07:25")
    expectEqual(tap("tiktok", .data(steps: 80), after: 0.05), [.defer])
    expectStillAsleep()
    let reached = downtimeMs("reachedAt") ?? 0
    expect(reached >= ms(local("2026-10-06 07:10")) && reached <= ms(local("2026-10-06 07:11")), "reached within the minute it happened, never before")
    expectEqual(downtimeMs("endsAt"), reached + 60 * 60_000, "an hour from then")
    expectEqual(downtimeRecord()?["morningKey"] as? String, "2026-10-06")
    let name = DeviceActivityName(LOCTURNE_DOWNTIME_ACTIVITY)
    expect(DeviceActivityCenter.monitored.contains(name), "the end is a window iOS runs")
    let end = DeviceActivityCenter.schedules[name]?.intervalEnd
    expectEqual(end?.hour, 8, "ends at 8:10 or so")
    expect((end?.minute ?? 0) >= 10 && (end?.minute ?? 0) <= 11, "at the minute")
    expectEqual(DeviceActivityCenter.schedules[name]?.repeats, false)
    expect(drawn("tiktok").subtitle?.hasPrefix("Timer’s running. They wake at 8:1") == true, "says when: \(drawn("tiktok").subtitle ?? "")")
    expect(sentTaps().isEmpty, "never opens Locturne")
    // Tapping again changes nothing: the timer is saved, never restarted.
    at("2026-10-06 07:40")
    tap("tiktok", .data(steps: 400), after: 0.05)
    expectEqual(downtimeMs("reachedAt"), reached, "a second tap keeps the timer")
    expectStillAsleep()
  }

  test("step away: the window's end wakes the bedtime apps with Locturne closed, proved by the timer") {
    closedNight(method: "downtime")
    PedometerScript.history = walkReached(local("2026-10-06 07:10"))
    at("2026-10-06 07:25")
    tap("tiktok", .data(steps: 80), after: 0.05)
    harnessClock = Date(timeIntervalSince1970: (downtimeMs("endsAt") ?? 0) / 1000)
    end(LOCTURNE_DOWNTIME_ACTIVITY)
    expectWoke("downtime")
  }

  test("step away: iOS ending the window two minutes early still wakes; ten minutes early doesn't") {
    closedNight(method: "downtime")
    PedometerScript.history = walkReached(local("2026-10-06 07:10"))
    at("2026-10-06 07:25")
    tap("tiktok", .data(steps: 80), after: 0.05)
    let ends = (downtimeMs("endsAt") ?? 0) / 1000
    harnessClock = Date(timeIntervalSince1970: ends - 600)
    end(LOCTURNE_DOWNTIME_ACTIVITY)
    expectStillAsleep()
    harnessClock = Date(timeIntervalSince1970: ends - 100)
    end(LOCTURNE_DOWNTIME_ACTIVITY)
    expectWoke("downtime")
  }

  test("step away: walked an hour ago, I'm up now: the timer is already over, and the same tap wakes them") {
    closedNight(method: "downtime", extra: ["downtimeMinutes": 15])
    PedometerScript.history = walkReached(local("2026-10-06 07:05"))
    at("2026-10-06 07:40")
    tap("tiktok", .data(steps: 80), after: 0.05)
    expectWoke("downtime")
  }

  test("step away: 300 steps on the shield start the timer, they don't skip it") {
    closedNight(method: "downtime")
    at("2026-10-06 07:25")
    tap("tiktok", .data(steps: 300), after: 0.05)
    expectStillAsleep()
    expect(downtimeRecord() != nil, "the timer started")
  }

  test("step away: a timer that runs past bedtime never wakes them in the night") {
    closedNight(method: "downtime")
    PedometerScript.history = walkReached(local("2026-10-06 22:30"))
    at("2026-10-06 22:40")
    tap("tiktok", .data(steps: 80), after: 0.05)
    expectEqual(drawn("tiktok").subtitle, "Your timer runs past bedtime, so they sleep through to tomorrow.")
    at("2026-10-06 23:31")
    end(LOCTURNE_DOWNTIME_ACTIVITY)
    expect(nightHeld(), "still held")
    expect(morningProofs().isEmpty, "nothing recorded")
  }

  test("step away: yesterday's timer is no timer this morning") {
    closedNight(method: "downtime")
    set(LOCTURNE_DOWNTIME_KEY, [
      "morningKey": "2026-10-05", "reachedAt": ms(local("2026-10-05 07:10")), "endsAt": ms(local("2026-10-05 08:10")),
    ] as [String: Any])
    at("2026-10-06 07:25")
    end(LOCTURNE_DOWNTIME_ACTIVITY)
    expectStillAsleep()
    tap("tiktok", .data(steps: 10), after: 0.05)
    expectStillAsleep()
  }

  test("step away: a search the pedometer can't finish in time times it from the tap, the safe side") {
    closedNight(method: "downtime")
    PedometerScript.history = walkReached(local("2026-10-06 07:10"))
    at("2026-10-06 07:25")
    tap("tiktok", .data(steps: 80), after: 1.5)
    let reached = downtimeMs("reachedAt") ?? 0
    expect(reached >= ms(local("2026-10-06 07:10")), "never earlier than the steps")
    expectStillAsleep()
  }

  test("squats are gone: a routine still saved with them walks, so the shield's 200 steps wake it") {
    closedNight(method: "squats")
    at("2026-10-06 07:25")
    tap("tiktok", .data(steps: 240), after: 0.05)
    expectWoke("steps")
  }

  test("threshold search: finds the minute, and a failed query answers with what it had confirmed") {
    let from = local("2026-10-06 07:00")
    let to = local("2026-10-06 09:00")
    let reached = local("2026-10-06 07:42")
    var found: Date?
    var asked = 0
    locturneFindThreshold(from: from, to: to, goal: 50, query: { _, end, answer in
      asked += 1
      answer(end >= reached ? 60 : 10)
    }, done: { found = $0 })
    expect(found.map { $0 >= reached && $0.timeIntervalSince(reached) <= 60 } == true, "within the minute after: \(String(describing: found))")
    expect(asked <= 8, "a handful of queries (\(asked))")
    var fallback: Date?
    locturneFindThreshold(from: from, to: to, goal: 50, query: { _, _, answer in answer(nil) }, done: { fallback = $0 })
    expectEqual(fallback, to, "nothing confirmed earlier: the end it was asked about")
  }
}
