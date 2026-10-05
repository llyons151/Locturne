// Scenarios for the monitor extension's Locturne code, run against the real extension and
// library sources. Each one is something that otherwise only a night on a real iPhone shows.
// 2026-10-05 is a Monday; days in routines are `Date.getDay()` numbers (0 Sunday … 6 Saturday).
import Foundation

func registerTests() {

  test("native night partitions cover every supported duration within the activity budget") {
    for bedtime in [0, 1, 59, 480, 1380, 1439] {
      for length in 0..<1440 {
        let morning = (bedtime + length) % 1440
        let edges = locturneNightEdges(bedtime: bedtime, morningStart: morning)
        if length < 15 {
          expect(edges.isEmpty, "unsupported short night")
          continue
        }
        expect(!edges.isEmpty && edges.count <= 16, "activity budget")
        expectEqual(edges.first?.start, bedtime)
        expectEqual(edges.last?.end, morning)
        var total = 0
        for (index, edge) in edges.enumerated() {
          let duration = (edge.end - edge.start + 1440) % 1440
          expect(duration >= 15, "iOS minimum duration")
          if length <= 720 { expect(duration <= 45, "ordinary-night recovery interval") }
          if index > 0 { expectEqual(edges[index - 1].end, edge.start, "no gaps") }
          total += duration
        }
        expectEqual(total, length, "each minute covered once")
      }
    }
  }

  test("a delayed prior nap end cannot finish its replacement nap") {
    pick("block", ["youtube"])
    pick("always", ["reddit"]); appShields("always")
    at("2026-10-06 14:00"); startNap(list: "block", minutes: 15); appShields("block")
    // The app tidies the expired first nap, then starts another before iOS delivers its end.
    at("2026-10-06 14:15"); appUnshields("block"); set(LOCTURNE_NAP_KEY, nil)
    harnessClock = harnessNow().addingTimeInterval(1)
    startNap(list: "block", minutes: 15); appShields("block")
    let replacementEnd = (get(LOCTURNE_NAP_KEY) as? [String: Any])?["end"] as? NSNumber
    harnessClock = harnessNow().addingTimeInterval(1)
    end(LOCTURNE_NAP_ACTIVITY)
    expectEqual(shielded(), ["reddit", "youtube"], "old end must not wake the new nap")
    expectEqual((get(LOCTURNE_NAP_KEY) as? [String: Any])?["end"] as? NSNumber, replacementEnd)
    at("2026-10-06 14:30")
    end(LOCTURNE_NAP_ACTIVITY)
    expectEqual(shielded(), ["reddit"], "the replacement still ends at its own deadline")
    expect(get(LOCTURNE_NAP_KEY) == nil, "finished nap is removed")
  }

  test("native handoff schedules a disjoint night and ignores obsolete callbacks") {
    pick("night", ["tiktok"]); pick("always", ["reddit"])
    saveRoutine(routine(bedtime: 480, morningStart: 960), pending: (routine(), local("2026-10-06 08:00")))
    armNight(bedtime: 480, morningStart: 960)
    at("2026-10-06 08:00")
    start("night-0")
    expectEqual(shielded(), ["reddit"], "the replacement names a morning no night ran into")
    let record = get(LOCTURNE_ARMED_KEY) as? [String: Any]
    expectEqual((record?["bedtime"] as? NSNumber)?.intValue, 1380)
    expectEqual(DeviceActivityCenter.schedules.count, 11)
    expect(DeviceActivityCenter.schedules.values.allSatisfy { $0.repeats }, "repeating windows")
    let prefix = record?["nativeWindowPrefix"] as? String ?? "missing"
    expect(DeviceActivityCenter.monitored.allSatisfy { $0.rawValue.hasPrefix(prefix) }, "only new generation remains")
    start("night-1"); end("night-0")
    expectEqual(shielded(), ["reddit"], "queued callbacks from the old schedule do nothing")
    at("2026-10-06 23:00")
    start("\(prefix)0")
    expectEqual(shielded(), ["reddit", "tiktok"], "replacement bedtime runs without opening the app")
  }

  test("a skipped window delivered after handoff cannot lock an unrun morning") {
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 180, morningStart: 660), pending: (routine(bedtime: 1140, morningStart: 180), local("2026-03-08 03:00")))
    armNight(bedtime: 180, morningStart: 660)
    at("2026-03-08 03:00")
    start("night-0")
    expectEqual(shielded(), [], "neither routine ran a night into this morning")
    let prefix = (get(LOCTURNE_ARMED_KEY) as? [String: Any])?["nativeWindowPrefix"] as? String ?? "missing"
    // The spring gap can deliver the new generation's 02:16 start at 03:00.
    harnessClock = harnessNow().addingTimeInterval(0.234)
    start("\(prefix)10")
    expectEqual(shielded(), [], "a callback outside the replacement night preserves the handoff")
    expect(!nightHeld(), "no phantom morning hold")
  }

  test("native handoff preserves an unproven morning from the preceding routine") {
    pick("night", ["tiktok"])
    saveRoutine(routine(), pending: (routine(bedtime: 480, morningStart: 960), local("2026-10-06 23:00")))
    armNight(); set(LOCTURNE_NIGHT_HELD_KEY, true); appShields("night")
    at("2026-10-06 23:00")
    start("night-0")
    expectEqual(shielded(), ["tiktok"])
    expect(nightHeld(), "yesterday's unproven morning still holds")
    expectEqual((get(LOCTURNE_ARMED_KEY) as? [String: Any])?["bedtime"] as? NSNumber, NSNumber(value: 480))
  }

  test("native handoff with every new night off releases only the unrun morning") {
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 480, morningStart: 960), pending: (routine(nights: []), local("2026-10-06 08:00")))
    armNight(bedtime: 480, morningStart: 960)
    set(LOCTURNE_NIGHT_HELD_KEY, true); appShields("night")
    at("2026-10-06 08:00"); start("night-0")
    expectEqual(shielded(), [], "the replacement names a morning no night ran into")

    resetWorld(); pick("night", ["tiktok"])
    saveRoutine(routine(), pending: (routine(bedtime: 480, morningStart: 960, nights: []), local("2026-10-06 23:00")))
    armNight(); set(LOCTURNE_NIGHT_HELD_KEY, true); appShields("night")
    at("2026-10-06 23:00"); start("night-0")
    expectEqual(shielded(), ["tiktok"], "the preceding routine's morning still needs proof")
    let prefix = (get(LOCTURNE_ARMED_KEY) as? [String: Any])?["nativeWindowPrefix"] as? String ?? "missing"
    at("2026-10-07 08:00"); start("\(prefix)0")
    expectEqual(shielded(), [], "the replacement's first off bedtime releases that morning")
  }

  test("native handoff refuses a future edit and yields to app registration") {
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 480, morningStart: 960), pending: (routine(), local("2026-10-07 08:00")))
    armNight(bedtime: 480, morningStart: 960)
    at("2026-10-06 08:00"); start("night-0")
    expectEqual(DeviceActivityCenter.starts, 0, "edit not due")
    at("2026-10-07 08:00"); set("locturne.nightArmingAt", ms(harnessNow())); start("night-0")
    expectEqual(DeviceActivityCenter.starts, 0, "app owns the registration")
  }

  test("native handoff rolls back failed registration using a fresh generation") {
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 480, morningStart: 960), pending: (routine(), local("2026-10-06 08:00")))
    armNight(bedtime: 480, morningStart: 960)
    DeviceActivityCenter.refusedStarts = [3]
    at("2026-10-06 08:00"); start("night-0")
    let record = get(LOCTURNE_ARMED_KEY) as? [String: Any]
    expectEqual((record?["bedtime"] as? NSNumber)?.intValue, 480, "old times restored")
    let prefix = record?["nativeWindowPrefix"] as? String ?? "missing"
    expect(DeviceActivityCenter.monitored.allSatisfy { $0.rawValue.hasPrefix(prefix) }, "no partial target generation")
    expectEqual(DeviceActivityCenter.schedules.count, 11)
    expectEqual(shielded(), ["tiktok"], "rollback still protects the old night")
    expect(get("locturne.nativeNightArmingError") != nil, "failure recorded")
  }

  test("native handoff keeps the activity budget and suppresses immediate callbacks") {
    pick("night", ["tiktok"])
    // A 12-hour replacement uses every reserved night slot.
    saveRoutine(routine(bedtime: 480, morningStart: 960), pending: (routine(bedtime: 1200, morningStart: 480), local("2026-10-06 08:00")))
    armNight(bedtime: 480, morningStart: 960)
    for name in ["limit-0", "limit-1", "limit-2", "locturne-nap", "locturne-settle"] {
      DeviceActivityCenter.monitored.append(DeviceActivityName(name))
    }
    DeviceActivityCenter.onStart = { activity in
      start(activity.rawValue)
      end("night-0")
    }
    at("2026-10-06 08:00"); start("night-0")
    expectEqual(DeviceActivityCenter.monitored.count, 20)
    expect(DeviceActivityCenter.peakActivities <= 20, "never transiently exceeds the cap")
    expect(!DeviceActivityCenter.monitored.contains(DeviceActivityName("locturne-settle")), "optional settle yields its slot")
    expectEqual(shielded(), [], "immediate starts cannot apply a phantom night")
  }

  test("native handoff cannot restore protection after a concurrent stand down") {
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 480, morningStart: 960), pending: (routine(), local("2026-10-06 08:00")))
    armNight(bedtime: 480, morningStart: 960)
    DeviceActivityCenter.onStart = { _ in set(LOCTURNE_STOOD_DOWN_KEY, true); set(LOCTURNE_ARMED_KEY, nil) }
    at("2026-10-06 08:00"); start("night-0")
    expectEqual(DeviceActivityCenter.monitored.count, 0)
    expect(get(LOCTURNE_ARMED_KEY) == nil, "cancelled record stays removed")
    expectEqual(shielded(), [])
  }

  test("native handoff preserves a cancelled registration across immediate renewal") {
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 480, morningStart: 960), pending: (routine(), local("2026-10-06 08:00")))
    armNight(bedtime: 480, morningStart: 960)
    DeviceActivityCenter.onStart = { _ in
      set(LOCTURNE_STOOD_DOWN_KEY, true); set(LOCTURNE_ARMED_KEY, nil)
      set(LOCTURNE_STOOD_DOWN_KEY, false)
    }
    at("2026-10-06 08:00"); start("night-0")
    expectEqual(DeviceActivityCenter.monitored.count, 0)
    expect(get(LOCTURNE_ARMED_KEY) == nil, "renewal cannot resurrect an abandoned registration")
    expectEqual(shielded(), [])
  }

  test("native handoff keeps a held night when both registration and rollback fail") {
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 480, morningStart: 960), pending: (routine(), local("2026-10-06 08:00")))
    armNight(bedtime: 480, morningStart: 960)
    DeviceActivityCenter.refusedStarts = [2, 4]
    at("2026-10-06 08:00"); start("night-0")
    expectEqual(DeviceActivityCenter.monitored.count, 0, "no half-installed generation")
    expectEqual((get(LOCTURNE_ARMED_KEY) as? [String: Any])?["bedtime"] as? NSNumber, NSNumber(value: 480))
    expectEqual(shielded(), ["tiktok"], "failure cannot wake the old held night")
    expect(get("locturne.nativeNightArmingError") != nil, "app can diagnose/retry missing windows")
  }

  test("native handoff rollback cannot resurrect a concurrent disarm") {
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 480, morningStart: 960), pending: (routine(), local("2026-10-06 08:00")))
    armNight(bedtime: 480, morningStart: 960)
    DeviceActivityCenter.refusedStarts = [2]
    DeviceActivityCenter.onStart = { _ in
      if DeviceActivityCenter.starts >= 3 { set(LOCTURNE_ARMED_KEY, nil) }
    }
    at("2026-10-06 08:00"); start("night-0")
    expectEqual(DeviceActivityCenter.monitored.count, 0)
    expect(get(LOCTURNE_ARMED_KEY) == nil, "rollback must yield to the concurrent disarm too")
    expectEqual(shielded(), [])
  }

  test("native handoff works after the app has promoted the pending routine") {
    pick("night", ["tiktok"])
    let old = routine(bedtime: 480, morningStart: 960)
    set(LOCTURNE_ROUTINE_KEY, ["active": routine(), "prior": old, "since": ms(local("2026-10-06 08:00"))])
    armNight(bedtime: 480, morningStart: 960)
    // App ISO dates include fractional seconds.
    at("2026-10-06 08:00"); start("night-0")
    expectEqual((get(LOCTURNE_ARMED_KEY) as? [String: Any])?["bedtime"] as? NSNumber, NSNumber(value: 1380))
    expectEqual(shielded(), [])
  }

  test("native handoff callbacks yield to an app rollback using ordinary names") {
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 480, morningStart: 960), pending: (routine(), local("2026-10-06 08:00")))
    armNight(bedtime: 480, morningStart: 960)
    at("2026-10-06 08:00"); start("night-0")
    let prefix = (get(LOCTURNE_ARMED_KEY) as? [String: Any])?["nativeWindowPrefix"] as? String ?? "missing"
    at("2026-10-06 23:00")
    set("locturne.nightArmingAt", ms(harnessNow()))
    start("\(prefix)0")
    expectEqual(shielded(), [], "obsolete native start is suppressed while app registers")
    armNight() // app rollback strips the old nativeWindowPrefix
    set("locturne.nightArmingAt", nil)
    start("night-0")
    expectEqual(shielded(), ["tiktok"], "ordinary callback works after app rollback")
    set(LOCTURNE_NIGHT_HELD_KEY, false); appUnshields("night")
    start("\(prefix)1")
    expectEqual(shielded(), [], "retired native generation stays retired")
  }

  test("an early after-midnight bedtime window uses the previous evening") {
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 60, morningStart: 420, nights: [1]))
    armNight(bedtime: 60, morningStart: 420)
    at("2026-10-06 00:59")
    start("night-0")
    expectEqual(shielded(), ["tiktok"], "Tuesday's early window belongs to Monday evening")
    resetWorld()
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 60, morningStart: 420, nights: [2]))
    armNight(bedtime: 60, morningStart: 420)
    at("2026-10-06 00:59")
    start("night-0")
    expectEqual(shielded(), [], "Monday evening off cannot borrow Tuesday's active night")
  }

  test("early bedtime attribution works across midnight and for daytime sleepers") {
    for (bedtime, morning, time, evening) in [
      (0, 420, "2026-10-05 23:59", "2026-10-05"),
      (1, 420, "2026-10-05 23:59", "2026-10-05"),
      (1, 420, "2026-10-06 00:00", "2026-10-05"),
      (480, 960, "2026-10-06 07:59", "2026-10-05"),
      (1380, 420, "2026-10-05 22:59", "2026-10-05")
    ] {
      armNight(bedtime: bedtime, morningStart: morning)
      at(time)
      expectEqual(locturneDayKey(locturneWindowNight().evening), evening, time)
    }
  }

  // MARK: Bedtime

  test("a limit's picks wait for the app: the extension doesn't swap them at bedtime") {
    pick("limit-0", ["instagram", "tiktok"]) // live: the union while TikTok's removal waits
    pick("limit-0-next", ["instagram"])
    set(LOCTURNE_LIMITS_KEY, [["id": "limit-0", "minutes": 30]])
    armLimit("limit-0")
    set(LOCTURNE_PENDING_LISTS_KEY, ["limit-0": ["from": ms(local("2026-10-05 23:00"))]])
    at("2026-10-06 00:00")
    start("limit-0") // the limit's own start settles lists too
    expectEqual(picks("limit-0"), Set(["instagram", "tiktok"]), "still the union iOS counts")
    at("2026-10-06 14:00")
    threshold("limit-0")
    expectEqual(shielded(), ["instagram", "tiktok"], "a real threshold on what iOS counts holds")
  }

  test("the used-up moment decides today: a mark from a clock set days forward doesn't hold the apps") {
    pick("limit-0", ["youtube"])
    set(LOCTURNE_LIMITS_KEY, [["id": "limit-0", "minutes": 30]])
    armLimit("limit-0")
    at("2026-10-05 15:00")
    threshold("limit-0")
    expectEqual(shielded(), ["youtube"], "used up today: asleep")
    // Back to normal time, but the mark says three days ahead (a clock set forward, then back).
    set("\(LOCTURNE_LIMIT_REACHED_AT_PREFIX)limit-0", ms(local("2026-10-08 15:00")))
    set("\(LOCTURNE_LIMIT_REACHED_PREFIX)limit-0", "2026-10-08")
    at("2026-10-06 00:00")
    start("limit-0")
    expectEqual(shielded(), [], "not today's: awake")
  }

  test("a limit's day starting a few seconds before midnight still wakes yesterday's used-up apps") {
    pick("limit-0", ["youtube"])
    set(LOCTURNE_LIMITS_KEY, [["id": "limit-0", "minutes": 30]])
    armLimit("limit-0")
    at("2026-10-05 22:00")
    threshold("limit-0")
    expectEqual(shielded(), ["youtube"])
    harnessClock = local("2026-10-06 00:00").addingTimeInterval(-3)
    start("limit-0")
    at("2026-10-06 09:00")
    expectEqual(shielded(), [], "awake on the new day")
  }

  test("an emergency after the last window starts: the next day shows the day's words too") {
    pick("night", ["tiktok"]); pick("always", ["reddit"])
    saveRoutine(routine()); armNight(); appWritesNamed()
    at("2026-10-05 23:00"); start("night-0")
    at("2026-10-06 01:40"); start("night-1")
    at("2026-10-06 04:20"); start("night-2")
    at("2026-10-06 05:00") // no window starts after this to set the hold again
    pick("night-next", ["tiktok"]); appUnshields("night"); removeFamilyActivitySelectionById(id: "night")
    set(LOCTURNE_PENDING_LISTS_KEY, ["night": ["from": ms(local("2026-10-06 23:00"))]])
    set(LOCTURNE_NIGHT_HELD_KEY, false)
    appSetShieldText("Shh. I’m sleeping.")
    at("2026-10-06 07:00"); end("night-2")
    at("2026-10-06 12:00")
    expectEqual(shown("reddit").title, "Always words", "the always app the next day")
  }

  test("after an emergency-paused night, the next day shows the day's words, not the night's") {
    pick("night", ["tiktok"]); pick("always", ["reddit"])
    saveRoutine(routine()); armNight(); appWritesNamed()
    at("2026-10-05 23:00"); start("night-0")
    at("2026-10-05 23:30")
    pick("night-next", ["tiktok"]); appUnshields("night"); removeFamilyActivitySelectionById(id: "night")
    set(LOCTURNE_PENDING_LISTS_KEY, ["night": ["from": ms(local("2026-10-06 23:00"))]])
    set(LOCTURNE_NIGHT_HELD_KEY, false)
    // The app now writes the day's words for a paused night (`applyShieldText`); a build from
    // before that wrote the night's, and the extension must still let them go by itself.
    appSetShieldText("Shh. I’m sleeping.")
    at("2026-10-06 01:40"); start("night-1")
    at("2026-10-06 04:20"); start("night-2")
    at("2026-10-06 07:00"); end("night-2")
    at("2026-10-06 12:00")
    expectEqual(shown("reddit").title, "Always words", "the always app the next day")
    expect(!nightHeld(), "the hold the paused windows set is let go")
  }

  test("a nap ending with the app closed: an always app also on the bedtime list loses the nap's words") {
    pick("night", ["insta"]); pick("always", ["insta", "reddit"]); pick("block", ["youtube"])
    saveRoutine(routine()); armNight(); appWritesNamed()
    at("2026-10-05 14:00")
    startNap(list: "block", minutes: 60); appShields("block"); appShields("always")
    appSetShieldText("Tucked in. Napping until 3 pm.")   // syncLock, then app closed
    at("2026-10-05 15:00"); end(LOCTURNE_NAP_ACTIVITY)
    expectEqual(shown("reddit").title, "Always words", "always-only app")
    expect(shielded().contains("insta"), "insta still asleep (always)")
    expectEqual(shown("insta").title, "Always words", "always+night app after the nap")
  }

  test("an unproven morning then a night off: an always app also on the bedtime list loses 'prove it' and its tap") {
    pick("night", ["insta"]); pick("always", ["insta", "reddit"])
    saveRoutine(routine(nights: [1])); armNight(); appWritesNamed()   // Monday night on, Tuesday off
    appSetShieldText("Always words")
    at("2026-10-05 23:00"); start("night-0")
    at("2026-10-06 07:00"); end("night-2")
    expectEqual(shown("insta").title, "Morning words", "morning, unproven")
    at("2026-10-06 23:00"); start("night-0")   // Tuesday: off
    expect(!nightHeld(), "night released")
    expectEqual(shown("reddit").title, "Always words", "always-only app")
    expect(shielded().contains("insta"), "insta still asleep (always)")
    let s = shown("insta")
    expectEqual(s.title, "Always words", "always+night app on the night off")
    expect(!s.tap, "and no 'prove it' tap")
  }

  test("a nap ending on a day a limit is used up shows the limit's words, not the nap's") {
    pick("block", ["youtube"])
    pick("limit-0", ["tiktok"])
    pick("always", ["reddit"])
    set(LOCTURNE_LIMITS_KEY, [["id": "limit-0", "minutes": 30]])
    armLimit("limit-0")
    shieldWords("locturne-always", title: "Always words")
    shieldWords("locturne-limit", title: "Limit words")
    at("2026-10-06 10:00")
    threshold("limit-0")
    at("2026-10-06 13:00")
    startNap(list: "block", minutes: 60)
    appShields("block")
    set(FALLBACK_SHIELD_CONFIGURATION_KEY, ["title": "Tucked in. Do not perceive me."])
    at("2026-10-06 14:00")
    end(LOCTURNE_NAP_ACTIVITY)
    expectEqual(shieldTitle(forList: "always"), "Limit words", "the nap is over; the limit is still used up")
  }

  test("a limit's day starts at midnight: yesterday's used-up words go") {
    pick("limit-0", ["tiktok"])
    pick("always", ["reddit"])
    set(LOCTURNE_LIMITS_KEY, [["id": "limit-0", "minutes": 30]])
    armLimit("limit-0")
    shieldWords("locturne-always", title: "Always words")
    at("2026-10-06 10:00")
    threshold("limit-0")
    set(FALLBACK_SHIELD_CONFIGURATION_KEY, ["title": "That’s today’s lot."])
    at("2026-10-07 00:00")
    start("limit-0")
    expectEqual(shieldTitle(forList: "always"), "Always words", "a new day")
  }

  test("a limit armed mid-day doesn't take another used-up limit's words") {
    pick("limit-0", ["tiktok"])
    pick("limit-1", ["youtube"])
    pick("always", ["reddit"])
    set(LOCTURNE_LIMITS_KEY, [["id": "limit-0", "minutes": 30], ["id": "limit-1", "minutes": 30]])
    armLimit("limit-0")
    armLimit("limit-1")
    shieldWords("locturne-always", title: "Always words")
    shieldWords("locturne-limit", title: "Limit words")
    at("2026-10-06 10:00")
    threshold("limit-1")
    set(FALLBACK_SHIELD_CONFIGURATION_KEY, ["title": "That’s today’s lot."])
    at("2026-10-06 14:00")
    start("limit-0") // iOS starts a limit registered while its day is open
    expectEqual(shieldTitle(forList: "always"), "Limit words", "limit-1 is still used up today")
  }

  test("a limit's midnight during a running nap leaves the nap's words") {
    pick("block", ["youtube"])
    pick("always", ["reddit"])
    pick("limit-0", ["tiktok"])
    set(LOCTURNE_LIMITS_KEY, [["id": "limit-0", "minutes": 30]])
    armLimit("limit-0")
    shieldWords("locturne-always", title: "Always words")
    at("2026-10-06 23:30")
    startNap(list: "block", minutes: 60)
    appShields("block")
    set(FALLBACK_SHIELD_CONFIGURATION_KEY, ["title": "Tucked in. Do not perceive me."])
    at("2026-10-07 00:00")
    start("limit-0")
    expectEqual(shieldTitle(forList: "block"), "Tucked in. Do not perceive me.", "the nap is still on")
    at("2026-10-07 00:30")
    end(LOCTURNE_NAP_ACTIVITY)
    expectEqual(shieldTitle(forList: "always"), "Always words", "and its words go when it ends")
  }

  test("an emergency-paused night: no morning words at morning start, that morning is already unlocked") {
    pick("night", ["tiktok"])
    pick("always", ["reddit"])
    saveRoutine(routine())
    armNight()
    shieldWords("locturne-night", title: "Bedtime words")
    shieldWords("locturne-morning", title: "Morning words", tap: ["title": "Up already?", "body": "Tap here and prove it."])
    at("2026-10-05 23:00")
    start("night-0")
    // 00:30, the emergency unlock (`pauseNightUntil`): the picks wait in the draft until bedtime.
    at("2026-10-06 00:30")
    pick("night-next", ["tiktok"])
    appUnshields("night")
    removeFamilyActivitySelectionById(id: "night")
    set(LOCTURNE_PENDING_LISTS_KEY, ["night": ["from": ms(local("2026-10-06 23:00"))]])
    set(LOCTURNE_NIGHT_HELD_KEY, false)
    at("2026-10-06 01:40")
    start("night-1")
    at("2026-10-06 04:20")
    start("night-2")
    at("2026-10-06 07:00")
    end("night-2")
    expectEqual(shieldTitle(forList: "always") == "Morning words", false, "an unlocked morning shows no morning words")
  }

  test("a Block now ending with the app closed takes its words off the always list") {
    pick("night", ["tiktok"])
    pick("block", ["youtube"])
    pick("always", ["reddit"])
    saveRoutine(routine())
    armNight()
    shieldWords("locturne-always", title: "Always words")
    at("2026-10-06 14:00")
    startNap(list: "block", minutes: 60)
    appShields("block")
    set(FALLBACK_SHIELD_CONFIGURATION_KEY, ["title": "Tucked in. Do not perceive me.", "subtitle": "Napping until 3 pm."])
    at("2026-10-06 15:00")
    end(LOCTURNE_NAP_ACTIVITY)
    expectEqual(shieldTitle(forList: "always"), "Always words", "the nap is over")
  }

  test("a night off after an unproven morning takes the morning words off the always list") {
    pick("night", ["tiktok"])
    pick("always", ["reddit"])
    saveRoutine(routine(nights: [0, 1, 3, 4, 5, 6])) // Tuesday evening off
    armNight()
    shieldWords("locturne-night", title: "Bedtime words")
    shieldWords("locturne-morning", title: "Morning words", tap: ["title": "Up already?", "body": "x"])
    shieldWords("locturne-always", title: "Always words")
    at("2026-10-05 23:00"); start("night-0")
    at("2026-10-06 01:40"); start("night-1")
    at("2026-10-06 04:20"); start("night-2")
    at("2026-10-06 07:00"); end("night-2")
    at("2026-10-06 23:00"); start("night-0")
    expectEqual(shieldTitle(forList: "always"), "Always words", "a night off: no morning to prove")
  }

  test("a limit threshold from yesterday, delivered just after midnight, is ignored") {
    pick("limit-0", ["youtube"])
    set(LOCTURNE_LIMITS_KEY, [["id": "limit-0", "minutes": 30]])
    armLimit("limit-0")
    at("2026-10-06 00:00")
    start("limit-0")
    at("2026-10-06 00:01")
    threshold("limit-0")
    expectEqual(shielded(), [], "30 min can't be used in the first minute of the day")
    expectEqual(get("\(LOCTURNE_LIMIT_REACHED_PREFIX)limit-0") as? String, nil, "no used-up day")
    at("2026-10-06 09:00")
    threshold("limit-0")
    expectEqual(shielded(), ["youtube"], "a real one later in the day still shields")
  }

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

  // MARK: Windows outside their night, stale windows, a lapse with the app closed

  test("a window the spring clock change pushes past morning start changes nothing") {
    // Bed 00:00, morning 03:00; Saturday evening off. On the spring change the 02:15 window
    // starts at 03:15. It belongs to Saturday's night (off), not Sunday's (on).
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 0, morningStart: 180, nights: [0, 1, 2, 3]))
    armNight(windows: 4, bedtime: 0, morningStart: 180)
    at("2026-10-11 03:15")  // a Sunday
    start("night-3")
    expectEqual(shielded(), [], "an off night's free morning stays free")
    expect(!nightHeld(), "no hold")
    // On a night that's on, a proof at 03:05 is not undone by the late window.
    resetWorld()
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 0, morningStart: 180))
    armNight(windows: 4, bedtime: 0, morningStart: 180)
    at("2026-10-11 00:00")
    start("night-0")
    at("2026-10-11 03:05")
    appUnshields("night")
    set(LOCTURNE_NIGHT_HELD_KEY, false)
    at("2026-10-11 03:15")
    start("night-3")
    expectEqual(shielded(), [], "no re-shield after the proof")
    expect(!nightHeld(), "still released")
  }

  test("a night whose only window the spring change pushed past morning start still locks") {
    // Bed 02:30, morning 03:00, one window. On the spring change 02:30 doesn't exist and the
    // window starts at 03:30. No other window of that night ran, so it is that night's lock.
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 150, morningStart: 180))
    armNight(windows: 1, bedtime: 150, morningStart: 180)
    at("2026-10-11 03:30")
    start("night-0")
    expectEqual(shielded(), ["tiktok"])
    expect(nightHeld(), "held")
  }

  test("an old window at the old bedtime doesn't end a morning the new routine still holds") {
    // Armed 22:30 to 06:00. The routine in force since tonight is 01:30 to 07:00 with Friday
    // evening off. Friday's unproven morning lasts until 01:30, so the old 22:30 window must
    // not release it; the first window inside the new night does.
    pick("night", ["tiktok"])
    saveRoutine(
      routine(bedtime: 22 * 60 + 30, morningStart: 6 * 60, nights: [0, 1, 4]),
      pending: (routine(bedtime: 90, morningStart: 7 * 60, nights: [0, 1, 4]), local("2026-10-09 22:30")))
    armNight(windows: 10, bedtime: 22 * 60 + 30, morningStart: 6 * 60)
    set(LOCTURNE_NIGHT_HELD_KEY, true)
    appShields("night")
    at("2026-10-09 22:30")
    start("night-0")
    expectEqual(shielded(), ["tiktok"], "still Friday's morning")
    expect(nightHeld(), "still held")
    at("2026-10-10 01:30")
    start("night-4")
    expectEqual(shielded(), [], "Friday evening is off: released inside the new night")
    expect(!nightHeld(), "released")
  }

  test("a window iOS starts a minute before bedtime still counts as tonight's") {
    pick("night", ["tiktok"])
    saveRoutine(routine(nights: [1]))  // Monday only
    armNight()
    at("2026-10-05 22:59")
    start("night-0")
    expectEqual(shielded(), ["tiktok"])
  }

  test("old windows still armed after an edit are judged by the times they were laid out for") {
    // Armed 23:00 to 07:00. The routine is now 22:00 to 06:00 with Tuesday evening off, and
    // the app hasn't re-armed. The old 06:15 window on Tuesday belongs to Monday's night (on):
    // it must not skip and wake an unproven morning.
    pick("night", ["tiktok"])
    saveRoutine(routine(bedtime: 22 * 60, morningStart: 6 * 60, nights: [0, 1, 3, 4, 5, 6]))
    armNight(windows: 11)
    at("2026-10-05 23:00")
    start("night-0")
    at("2026-10-06 06:15")
    start("night-10")
    expectEqual(shielded(), ["tiktok"])
    expect(nightHeld(), "still held")
  }

  test("after the subscription ends, only the night under way locks, even with the app closed") {
    pick("night", ["tiktok"])
    saveRoutine(routine())
    armNight()
    set("locturne.subscriptionEnded", ms(local("2026-10-05 12:00")))
    set("locturne.subscriptionEndedMorning", "2026-10-06")  // found ended on the day before this night's morning
    at("2026-10-05 23:00")
    start("night-0")
    expectEqual(shielded(), ["tiktok"], "the night leading into the recorded morning finishes")
    at("2026-10-06 23:00")
    start("night-0")
    expectEqual(shielded(), [], "the next night doesn't lock")
    expect(!nightHeld(), "and the unproven morning's hold ends")
  }

  test("an ended subscription recorded without its morning skips nothing") {
    pick("night", ["tiktok"])
    saveRoutine(routine())
    armNight()
    set("locturne.subscriptionEnded", ms(local("2026-10-01 12:00")))
    at("2026-10-05 23:00")
    start("night-0")
    expectEqual(shielded(), ["tiktok"])
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

  test("a removed limit's delayed threshold cannot poison its reused slot") {
    set(LOCTURNE_LIMITS_KEY, [])
    at("2026-10-05 14:00")
    threshold("limit-0")
    expect(get("\(LOCTURNE_LIMIT_REACHED_PREFIX)limit-0") == nil, "removed limit stays forgotten")
    pick("limit-0", ["youtube"])
    set(LOCTURNE_LIMITS_KEY, [["id": "limit-0", "minutes": 60]])
    reapplyLocturneBlocks(triggeredBy: "newLimit")
    expectEqual(shielded(), [], "new picks have not used their new allowance")
  }

  test("a delayed limit threshold while stood down cannot poison a renewal") {
    pick("limit-0", ["youtube"])
    set(LOCTURNE_LIMITS_KEY, [["id": "limit-0", "minutes": 30]])
    set(LOCTURNE_STOOD_DOWN_KEY, true)
    at("2026-10-05 14:00")
    // standDown has already removed actions and marks; the stopped activity's
    // queued callback must not recreate its old usage state.
    threshold("limit-0")
    expect(get("\(LOCTURNE_LIMIT_REACHED_PREFIX)limit-0") == nil, "no stale usage mark")
    set(LOCTURNE_STOOD_DOWN_KEY, nil)
    reapplyLocturneBlocks(triggeredBy: "renewal")
    expectEqual(shielded(), [], "renewal waits for the newly registered allowance")
  }

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

  test("stood down: a stray bedtime window holds nothing for when the subscription comes back") {
    pick("night", ["tiktok"])
    saveRoutine(routine())
    armNight()
    set(LOCTURNE_STOOD_DOWN_KEY, true)
    at("2026-10-05 23:00")
    start("night-0")
    expectEqual(shielded(), [])
    expect(!nightHeld(), "no hold")
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
