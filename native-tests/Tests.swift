// Scenarios for the monitor extension's Locturne code, run against the real extension and
// library sources. Each one is something that otherwise only a night on a real iPhone shows.
// 2026-10-05 is a Monday; days in routines are `Date.getDay()` numbers (0 Sunday … 6 Saturday).
import Foundation

func registerTests() {

  // MARK: Bedtime

  test("a bedtime window shields the bedtime list and the always list, and holds the night") {
    pick("night", ["tiktok", "instagram"])
    pick("always", ["reddit"])
    saveRoutine(routine())
    armNight()
    shieldWords("locturne-night", title: "Bedtime words")
    at("2026-10-05 23:00")
    start("night-0")
    expectEqual(shielded(), ["tiktok", "instagram", "reddit"])
    expect(nightHeld(), "night held")
    expectEqual(shieldTitle(forList: "night"), "Bedtime words", "bedtime words on the bedtime apps")
  }

  test("a later window re-shields an app the person somehow got back") {
    pick("night", ["tiktok"])
    saveRoutine(routine())
    armNight()
    at("2026-10-05 23:00")
    start("night-0")
    appUnshields("night")
    expectEqual(shielded(), [])
    at("2026-10-06 01:40")
    start("night-1")
    expectEqual(shielded(), ["tiktok"])
  }

  test("an off night shields nothing extra, and a hold left from an unproven morning ends") {
    pick("night", ["tiktok"])
    pick("always", ["reddit"])
    saveRoutine(routine(nights: [0, 1, 2, 3, 4]))  // Friday and Saturday evenings off
    armNight()
    set(LOCTURNE_NIGHT_HELD_KEY, true)
    appShields("night")  // Thursday's morning was never proven
    at("2026-10-09 23:00")  // Friday
    start("night-0")
    expectEqual(shielded(), ["reddit"])
    expect(!nightHeld(), "hold ended")
  }

  test("a window after midnight belongs to the evening before") {
    pick("night", ["tiktok"])
    saveRoutine(routine(nights: [0, 1, 2, 3, 4]))  // Friday evening off, Saturday 01:00 is still Friday's night
    armNight()
    at("2026-10-10 01:40")
    start("night-1")
    expectEqual(shielded(), [])
    // And Sunday evening is on, so Monday 01:40 is a locked night.
    at("2026-10-12 01:40")
    start("night-1")
    expectEqual(shielded(), ["tiktok"])
  }

  test("a routine edit due at bedtime counts, even when iOS starts the window a minute early") {
    pick("night", ["tiktok"])
    saveRoutine(routine(), pending: (routine(nights: [1, 2, 3, 4, 5]), local("2026-10-11 23:00")))  // Sunday off from Sunday bedtime
    armNight()
    at("2026-10-11 22:59")
    start("night-0")
    expectEqual(shielded(), [], "Sunday is off under the edit")
    resetWorld()
    pick("night", ["tiktok"])
    saveRoutine(routine(), pending: (routine(nights: [1, 2, 3, 4, 5]), local("2026-10-12 23:00")))  // due a day later
    armNight()
    at("2026-10-11 23:00")
    start("night-0")
    expectEqual(shielded(), ["tiktok"], "an edit not due yet doesn't count")
  }

  test("no routine saved, or one that can't be read, never skips a lock") {
    pick("night", ["tiktok"])
    armNight()
    at("2026-10-09 23:00")
    start("night-0")
    expectEqual(shielded(), ["tiktok"], "no routine")
    resetWorld()
    pick("night", ["tiktok"])
    set(LOCTURNE_ROUTINE_KEY, ["active": ["morningStart": "seven"]])
    armNight()
    at("2026-10-09 23:00")
    start("night-0")
    expectEqual(shielded(), ["tiktok"], "unreadable routine")
  }

  test("a shift worker's day-time night uses the right evening") {
    pick("night", ["tiktok"])
    // Bed 08:00, morning 16:00. Monday's 08:00 window leads into Monday 16:00, whose evening
    // before is Sunday (`getLockState`). Sunday off, Monday on.
    saveRoutine(routine(bedtime: 8 * 60, morningStart: 16 * 60, nights: [1, 2, 3, 4, 5, 6]))
    armNight(bedtime: 8 * 60, morningStart: 16 * 60)
    at("2026-10-05 08:00")
    start("night-0")
    expectEqual(shielded(), [], "Monday 08:00 belongs to Sunday evening, which is off")
    at("2026-10-06 08:00")
    start("night-0")
    expectEqual(shielded(), ["tiktok"], "Tuesday 08:00 belongs to Monday evening")
  }

  // MARK: Morning

  test("the last window's end puts the morning words and tap on the held bedtime apps") {
    pick("night", ["tiktok"])
    saveRoutine(routine())
    armNight()
    shieldWords("locturne-night", title: "Bedtime words")
    shieldWords("locturne-morning", title: "Morning words", tap: ["title": "Walk", "body": "Open Locturne"])
    at("2026-10-05 23:00")
    start("night-0")
    at("2026-10-06 07:00")
    end("night-2")
    expectEqual(shielded(), ["tiktok"], "still asleep until the proof")
    expectEqual(shieldTitle(forList: "night"), "Morning words")
    let actions = get("\(SHIELD_ACTIONS_FOR_SELECTION_PREFIX)_night") as? [String: Any]
    let primary = actions?["primary"] as? [String: Any]
    let tap = (primary?["actions"] as? [[String: Any]])?.first
    expectEqual(tap?["type"] as? String, "sendNotification", "the button sends the open-Locturne notification")
  }

  test("an earlier window's end, or an unheld night, keeps the bedtime words") {
    pick("night", ["tiktok"])
    saveRoutine(routine())
    armNight()
    shieldWords("locturne-night", title: "Bedtime words")
    shieldWords("locturne-morning", title: "Morning words")
    at("2026-10-05 23:00")
    start("night-0")
    at("2026-10-06 01:40")
    end("night-0")
    expectEqual(shieldTitle(forList: "night"), "Bedtime words", "01:40 isn't morning")
    set(LOCTURNE_NIGHT_HELD_KEY, false)  // emergency
    at("2026-10-06 07:00")
    end("night-2")
    expectEqual(shieldTitle(forList: "night"), "Bedtime words", "not held: no morning words")
  }

  test("the morning shield allows iOS ending the window a little late or early") {
    for (time, expected) in [("06:56", true), ("07:29", true), ("07:31", false), ("06:50", false)] {
      resetWorld()
      pick("night", ["tiktok"])
      armNight()
      set(LOCTURNE_NIGHT_HELD_KEY, true)
      shieldWords("locturne-night", title: "Bedtime words")
      shieldWords("locturne-morning", title: "Morning words")
      updateShield(shieldId: "locturne-night", triggeredBy: "test", activitySelectionId: "night")
      at("2026-10-06 \(time)")
      end("night-2")
      expectEqual(shieldTitle(forList: "night") == "Morning words", expected, "end at \(time)")
    }
  }

  // MARK: Overlaps: one blocklist for the whole app

  test("a nap ending keeps its apps that the bedtime list still holds") {
    pick("night", ["tiktok"])
    pick("block", ["tiktok", "youtube"])
    saveRoutine(routine())
    armNight()
    at("2026-10-05 22:30")
    startNap(list: "block", minutes: 60)
    appShields("block")
    at("2026-10-05 23:00")
    start("night-0")
    at("2026-10-05 23:30")
    end(LOCTURNE_NAP_ACTIVITY)
    expectEqual(shielded(), ["tiktok"], "youtube wakes, tiktok stays asleep for the night")
    expect(get(LOCTURNE_NAP_KEY) == nil, "nap forgotten")
  }

  test("a nap end that iOS delivers a few seconds early still wakes the nap's apps") {
    pick("block", ["youtube"])
    at("2026-10-05 14:00")
    startNap(list: "block", minutes: 30)
    appShields("block")
    harnessClock = local("2026-10-05 14:30").addingTimeInterval(-5)
    end(LOCTURNE_NAP_ACTIVITY)
    expectEqual(shielded(), [])
  }

  test("a limit used up shields its apps until midnight; midnight's start lifts it but not the always list") {
    pick("always", ["reddit"])
    pick("limit-0", ["reddit", "youtube"])
    set(LOCTURNE_LIMITS_KEY, [["id": "limit-0", "minutes": 30]])
    armLimit("limit-0")
    at("2026-10-05 15:00")
    threshold("limit-0")
    expectEqual(shielded(), ["reddit", "youtube"])
    expectEqual(get("\(LOCTURNE_LIMIT_REACHED_PREFIX)limit-0") as? String, "2026-10-05", "used-up day")
    at("2026-10-06 00:00")
    start("limit-0")
    expectEqual(shielded(), ["reddit"], "youtube wakes; reddit is always blocked")
  }

  test("a nap ending keeps a limit used up today, and the bedtime list held") {
    pick("night", ["tiktok"])
    pick("limit-0", ["youtube"])
    pick("block", ["tiktok", "youtube", "x"])
    set(LOCTURNE_LIMITS_KEY, [["id": "limit-0", "minutes": 30]])
    armLimit("limit-0")
    saveRoutine(routine())
    armNight()
    at("2026-10-05 15:00")
    threshold("limit-0")
    at("2026-10-05 22:45")
    startNap(list: "block", minutes: 30)
    appShields("block")
    at("2026-10-05 23:00")
    start("night-0")
    at("2026-10-05 23:15")
    end(LOCTURNE_NAP_ACTIVITY)
    expectEqual(shielded(), ["tiktok", "youtube"])
  }

  test("a limit lifting at midnight keeps its apps that the night holds") {
    pick("night", ["tiktok"])
    pick("limit-0", ["tiktok", "youtube"])
    set(LOCTURNE_LIMITS_KEY, [["id": "limit-0", "minutes": 30]])
    armLimit("limit-0")
    saveRoutine(routine())
    armNight()
    at("2026-10-05 20:00")
    threshold("limit-0")
    at("2026-10-05 23:00")
    start("night-0")
    at("2026-10-06 00:00")
    start("limit-0")
    expectEqual(shielded(), ["tiktok"])
  }

  // MARK: Edits that wait for bedtime

  test("removing an app takes effect at bedtime with the app closed") {
    pick("night", ["tiktok", "instagram"])
    pick("night-next", ["tiktok"])
    saveRoutine(routine())
    armNight()
    set(LOCTURNE_PENDING_LISTS_KEY, ["night": ["from": ms(local("2026-10-05 23:00"))]])
    at("2026-10-05 15:00")
    appShields("night")  // a morning never proven: still asleep under the old list
    at("2026-10-05 23:00")
    start("night-0")
    expectEqual(shielded(), ["tiktok"], "instagram really wakes")
    expectEqual(picks("night"), ["tiktok"])
    expect(picks("night-next") == nil, "draft gone")
    expect((get(LOCTURNE_PENDING_LISTS_KEY) as? [String: Any])?["night"] == nil, "pending entry gone")
  }

  test("an edit removing every app empties the list at bedtime") {
    pick("night", ["tiktok"])
    saveRoutine(routine())
    armNight()
    set(LOCTURNE_PENDING_LISTS_KEY, ["night": ["from": ms(local("2026-10-05 23:00")), "empty": true]])
    appShields("night")
    at("2026-10-05 23:00")
    start("night-0")
    expectEqual(shielded(), [])
    expect(picks("night") == nil, "list emptied")
  }

  test("a missing draft without `empty` means the app already settled: the list is kept") {
    pick("night", ["tiktok"])
    saveRoutine(routine())
    armNight()
    set(LOCTURNE_PENDING_LISTS_KEY, ["night": ["from": ms(local("2026-10-05 23:00"))]])
    at("2026-10-05 23:00")
    start("night-0")
    expectEqual(picks("night"), ["tiktok"])
    expectEqual(shielded(), ["tiktok"])
  }

  test("an edit not due yet waits") {
    pick("night", ["tiktok", "instagram"])
    pick("night-next", ["tiktok"])
    saveRoutine(routine())
    armNight()
    set(LOCTURNE_PENDING_LISTS_KEY, ["night": ["from": ms(local("2026-10-06 23:00"))]])
    at("2026-10-05 23:00")
    start("night-0")
    expectEqual(shielded(), ["tiktok", "instagram"])
  }

  // MARK: Emergency unlock (`pauseNightUntil` in screen-time.ts)

  test("an emergency unlock wakes the bedtime apps for the rest of tonight, and they sleep again next bedtime") {
    pick("night", ["tiktok"])
    pick("always", ["reddit"])
    saveRoutine(routine())
    armNight()
    at("2026-10-05 23:00")
    start("night-0")
    // 00:30: the app parks the picks in the draft, empties the list and lets go of the night.
    at("2026-10-06 00:30")
    pick("night-next", ["tiktok"])
    appUnshields("night")
    removeFamilyActivitySelectionById(id: "night")
    set(LOCTURNE_PENDING_LISTS_KEY, ["night": ["from": ms(local("2026-10-06 23:00"))]])
    set(LOCTURNE_NIGHT_HELD_KEY, false)
    // The rest of tonight's windows, with the app closed.
    at("2026-10-06 01:40")
    start("night-1")
    at("2026-10-06 04:20")
    start("night-2")
    expectEqual(shielded(), ["reddit"], "bedtime apps stay awake tonight")
    at("2026-10-06 07:00")
    end("night-2")
    expectEqual(shielded(), ["reddit"])
    // Next bedtime, app still closed.
    at("2026-10-06 23:00")
    start("night-0")
    expectEqual(shielded(), ["tiktok", "reddit"], "next bedtime locks as usual")
    expectEqual(picks("night"), ["tiktok"])
  }

  test("after an emergency, a nap ending in the day doesn't put the bedtime apps back to sleep") {
    pick("night", ["tiktok"])
    pick("block", ["youtube"])
    saveRoutine(routine())
    armNight()
    at("2026-10-06 00:30")
    pick("night-next", ["tiktok"])
    removeFamilyActivitySelectionById(id: "night")
    set(LOCTURNE_PENDING_LISTS_KEY, ["night": ["from": ms(local("2026-10-06 23:00"))]])
    at("2026-10-06 01:40")
    start("night-1")  // marks the night held, with an empty list
    at("2026-10-06 14:00")
    startNap(list: "block", minutes: 30)
    appShields("block")
    at("2026-10-06 14:30")
    end(LOCTURNE_NAP_ACTIVITY)
    expectEqual(shielded(), [], "tiktok stays awake until 23:00")
  }

  // MARK: No subscription

  test("stood down: no re-shield from any event") {
    pick("night", ["tiktok"])
    pick("always", ["reddit"])
    pick("limit-0", ["youtube"])
    set(LOCTURNE_LIMITS_KEY, [["id": "limit-0", "minutes": 30]])
    set(LOCTURNE_STOOD_DOWN_KEY, true)
    set(LOCTURNE_NIGHT_HELD_KEY, true)
    set("\(LOCTURNE_LIMIT_REACHED_PREFIX)limit-0", "2026-10-05")
    pick("block", ["x"])
    at("2026-10-05 14:00")
    startNap(list: "block", minutes: 15)
    at("2026-10-05 14:15")
    end(LOCTURNE_NAP_ACTIVITY)
    expectEqual(shielded(), [])
  }

  // MARK: Heartbeat

  test("the heartbeat records each callback, says whether the bedtime list has apps, and keeps 100") {
    pick("always", ["reddit"])
    saveRoutine(routine())
    armNight()
    at("2026-10-05 23:00")
    start("night-0")
    var log = heartbeats()
    expectEqual(log.count, 1)
    expectEqual(log.first?["activity"] as? String, "night-0")
    expectEqual(log.first?["callback"] as? String, "intervalDidStart")
    expectEqual(log.first?["shielded"] as? Bool, true, "always list is up")
    expectEqual(log.first?["nightPicked"] as? Bool, false, "an empty bedtime list is flagged")
    expectEqual(log.first?["at"] as? Double, ms(local("2026-10-05 23:00")))
    for _ in 0..<120 { start("night-1") }
    log = heartbeats()
    expectEqual(log.count, LOCTURNE_HEARTBEAT_KEEP)
  }

  // MARK: Day key

  test("the used-up day key is Gregorian and local, whatever the phone's calendar") {
    expectEqual(locturneDayKey(local("2026-10-05 00:00")), "2026-10-05")
    expectEqual(locturneDayKey(local("2026-10-05 23:59")), "2026-10-05")
    expectEqual(locturneDayKey(local("2026-01-01 00:00")), "2026-01-01")
  }
}
