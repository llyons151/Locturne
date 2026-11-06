import Foundation

// The moon ring's time left (LocturneShieldRing.swift), worked out when iOS asks for the shield.
func registerShieldRingTests() {
  let night: [String: Any] = ["ringFromMinutes": 23 * 60, "ringUntilMinutes": 7 * 60]

  test("moon ring: 00:48 into an 11 pm to 7 am night is 6h 12m left, a fifth done") {
    let ring = locturneRingProgress(config: night, now: local("2026-10-06 00:48"))
    expectEqual(ring?.left, 372)
    expect(abs((ring?.done ?? 0) - 108.0 / 480.0) < 0.0001, "108 of 480 minutes done")
    expectEqual(locturneTimeLeftLine(minutes: 372), "Asleep for 6h 12m more.")
  }

  test("moon ring: outside the night, or with no times, there's no ring") {
    expect(locturneRingProgress(config: night, now: local("2026-10-06 07:00")) == nil, "at the wake time")
    expect(locturneRingProgress(config: night, now: local("2026-10-06 15:00")) == nil, "in the afternoon")
    expect(locturneRingProgress(config: [:], now: local("2026-10-06 00:48")) == nil, "no times")
  }

  test("moon ring: a used-up limit runs midnight to midnight") {
    let ring = locturneRingProgress(config: ["ringFromMinutes": 0, "ringUntilMinutes": 1440], now: local("2026-10-06 14:14"))
    expectEqual(ring?.left, 586)
    expectEqual(locturneTimeLeftLine(minutes: 586), "Asleep for 9h 46m more.")
    expectEqual(locturneTimeLeftLine(minutes: 48), "Asleep for 48m more.")
    expectEqual(locturneTimeLeftLine(minutes: 120), "Asleep for 2h more.")
  }
}
